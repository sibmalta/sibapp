import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// AUTH EMAILS (welcome, verification, password reset, password changed) are
// handled by Supabase GoTrue's built-in mailer via Custom SMTP (Resend SMTP).
// This edge function handles ONLY app transactional emails.

type EmailType =
  | 'order_confirmed'
  | 'payment_confirmed'
  | 'item_shipped'
  | 'item_delivered'
  | 'refund_confirmed'
  | 'dispute_opened'
  | 'item_sold'
  | 'shipping_reminder'
  | 'payout_released'
  | 'suspicious_activity'
  | 'moderation_notice'
  | 'offer_received'
  | 'offer_accepted'
  | 'counter_offer_accepted'
  | 'offer_declined'
  | 'offer_countered'
  | 'order_cancelled'
  | 'order_cancelled_seller'
  | 'dispute_resolved'
  | 'dispute_message'
  | 'message_received'
  | 'bundle_offer_received'
  | 'bundle_offer_accepted'
  | 'bundle_offer_declined'
  | 'bundle_offer_countered'

interface EmailPayload {
  type: EmailType
  to?: string | null
  data?: Record<string, any>
  meta?: Record<string, any>
  related_entity_type?: string
  related_entity_id?: string
}

type EmailLogStatus = 'success' | 'failed'

const PRODUCTION_APP_URL = 'https://sibmalta.com'
const LOGO_URL = 'https://sibmalta.com/assets/sib-3.png'

function getAppOrigin() {
  const configuredUrl = Deno.env.get('APP_URL')?.trim()
  if (!configuredUrl) return PRODUCTION_APP_URL

  try {
    const parsed = new URL(configuredUrl)
    const hostname = parsed.hostname.toLowerCase()
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
    const isNativeScheme = parsed.protocol === 'sib:' || parsed.protocol === 'app:'
    const isSibDomain = hostname === 'sibmalta.com' || hostname === 'www.sibmalta.com'

    if (parsed.protocol !== 'https:' || isLocalhost || isNativeScheme || !isSibDomain) {
      console.warn('[send-email] Ignoring unsafe APP_URL for email links:', configuredUrl)
      return PRODUCTION_APP_URL
    }

    return PRODUCTION_APP_URL
  } catch {
    console.warn('[send-email] Ignoring malformed APP_URL for email links:', configuredUrl)
    return PRODUCTION_APP_URL
  }
}

// All transactional email CTAs must be absolute browser-safe HTTPS URLs.
// Never pass raw relative paths, native app schemes, or localhost URLs to email clients.
function buildAppUrl(path = '/') {
  const origin = getAppOrigin()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return new URL(normalizedPath, origin).toString()
}

function withQuery(path: string, params: Record<string, any>) {
  const url = new URL(buildAppUrl(path))
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}

function getServiceRoleClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[send-email] Email logging unavailable: missing SUPABASE_URL or SERVICE_ROLE_KEY')
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

async function resolveRecipientIfNeeded(payload: EmailPayload) {
  if (payload.to) return payload.to

  const sellerId = payload.meta?.sellerId
  if (payload.type === 'item_sold' && sellerId) {
    const supabase = getServiceRoleClient()
    if (!supabase) {
      console.error('[send-email] Cannot resolve seller recipient: service role client unavailable')
      return null
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', sellerId)
      .single()

    if (error) {
      console.error('[send-email] Failed to resolve seller email for item_sold:', error.message)
      return null
    }

    const resolvedEmail = data?.email?.trim()
    if (!resolvedEmail) {
      console.error('[send-email] Seller email missing on profile for item_sold', { sellerId })
      return null
    }

    console.log('[send-email] Resolved seller recipient for item_sold', { sellerId, emailFound: true })
    payload.to = resolvedEmail
    return resolvedEmail
  }

  return null
}

// Helper: log email send attempt to email_logs table (fire-and-forget)
async function logEmail(payload: { type: string; to?: string | null; data?: Record<string, any>; meta?: Record<string, any>; related_entity_type?: string; related_entity_id?: string }, subject: string, status: EmailLogStatus, resendId?: string, errorMessage?: string) {
  try {
    const supabase = getServiceRoleClient()
    if (!supabase) return

    const row = {
      email_type: payload.type,
      recipient: payload.to || 'unresolved',
      subject,
      resend_id: resendId || null,
      status,
      error_message: errorMessage || null,
      related_entity_type: payload.related_entity_type || payload.meta?.related_entity_type || payload.meta?.relatedEntityType || null,
      related_entity_id: payload.related_entity_id || payload.meta?.related_entity_id || payload.meta?.relatedEntityId || null,
      payload: {
        data: payload.data || {},
        meta: payload.meta || {},
      },
      sent_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('email_logs').insert(row)
    if (error) {
      // Older DBs may not have sent_at yet; retry without it so logging still works.
      if (error.message?.includes('sent_at') || error.message?.includes('related_entity_')) {
        const fallbackRow = { ...row }
        delete fallbackRow.sent_at
        delete fallbackRow.related_entity_type
        delete fallbackRow.related_entity_id
        const { error: fallbackError } = await supabase.from('email_logs').insert(fallbackRow)
        if (fallbackError) throw fallbackError
        return
      }
      throw error
    }
  } catch (e) {
    console.error('[send-email] Failed to log email:', e)
  }
}

// Strip HTML to plain text for multipart emails (improves deliverability)
function stripHtmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&euro;/g, 'EUR ')
    .replace(/&middot;/g, '·')
    .replace(/&ndash;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&copy;/g, '(c)')
    .replace(/&#?[a-z0-9]+;/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function buildEmail(payload: EmailPayload): { subject: string; html: string; preheader: string } {
  const { type } = payload
  const data = payload.data || {}

  const appUrl = buildAppUrl('/')
  const logoUrl = LOGO_URL
  const orderUrl = (id?: string | null) => id ? buildAppUrl(`/orders/${id}`) : buildAppUrl('/orders')
  const messageUrl = (conversationId?: string | null) =>
    conversationId ? buildAppUrl(`/messages/${conversationId}`) : buildAppUrl('/messages')
  const conversationUrl = () => messageUrl(payload.meta?.conversationId || payload.meta?.conversation_id || payload.related_entity_id)
  const offerThreadUrl = () => {
    const conversationId = payload.meta?.conversationId || payload.meta?.conversation_id
    const params = {
      offer: payload.meta?.offerId || payload.meta?.offer_id || payload.related_entity_id,
      listing: payload.meta?.listingId || payload.meta?.listing_id,
      buyer: payload.meta?.buyerId || payload.meta?.buyer_id,
      seller: payload.meta?.sellerId || payload.meta?.seller_id,
      price: data.offerPrice || data.counterPrice || data.acceptedPrice,
      buyerName: data.buyerName,
      itemTitle: data.itemTitle,
    }

    if (!conversationId) {
      console.error('[send-email] Offer email missing conversationId; falling back to Messages list with offer metadata', {
        type,
        offerId: params.offer || null,
        listingId: params.listing || null,
      })
      const fallbackUrl = withQuery('/messages', params)
      console.log(`[send-email] ${type} CTA View Offer URL: ${fallbackUrl}`)
      return fallbackUrl
    }

    const url = withQuery(`/messages/${conversationId}`, params)
    console.log(`[send-email] ${type} CTA View Offer URL: ${url}`)
    return url
  }
  const checkoutUrl = (listingId?: string | null, offerId?: string | null) =>
    listingId ? withQuery(`/checkout/${listingId}`, { offer: offerId }) : buildAppUrl('/messages')

  const header = `
    <div style="text-align:center;padding:24px 0 16px;">
      <a href="${appUrl}" style="display:inline-block;text-decoration:none;">
        <img
          src="${logoUrl}"
          alt="Sib"
          width="104"
          style="display:block;width:104px;height:auto;border:0;outline:none;text-decoration:none;margin:0 auto;"
        />
      </a>
      <div style="font-size:0;line-height:0;max-height:0;overflow:hidden;mso-hide:all;">Sib</div>
    </div>`

  const footer = `
    <div style="text-align:center;padding:20px 0 8px;border-top:1px solid #F3F4F6;margin-top:28px;">
      <p style="font-size:11px;color:#9CA3AF;margin:0;">Sib — Malta's second-hand marketplace</p>
      <p style="font-size:11px;color:#9CA3AF;margin:4px 0 0;">This is a transactional email related to your Sib account activity.</p>
      <p style="font-size:11px;color:#9CA3AF;margin:4px 0 0;">Questions? Contact info@sibmalta.com</p>
      <p style="font-size:11px;color:#9CA3AF;margin:4px 0 0;">(c) ${new Date().getFullYear()} Sib, Malta</p>
    </div>`

  const preheaderBlock = (text: string) =>
    `<div style="display:none;font-size:1px;color:#f9fafb;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${text}</div>`

  const wrap = (preheader: string, content: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
  <title>Sib</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheaderBlock(preheader)}
  <div style="max-width:480px;margin:0 auto;padding:16px;">
    <div style="background:#FFFFFF;border-radius:12px;padding:24px;">
      ${header}
      ${content}
      ${footer}
    </div>
  </div>
</body>
</html>`

  const btn = (text: string, url: string) => {
    let safeUrl = buildAppUrl('/')
    try {
      const parsed = new URL(url, buildAppUrl('/'))
      safeUrl = parsed.origin === getAppOrigin() ? parsed.toString() : buildAppUrl('/')
    } catch {
      safeUrl = buildAppUrl(url)
    }
    return (
    `<div style="text-align:center;margin:20px 0;">
      <a href="${safeUrl}" style="display:inline-block;padding:12px 28px;background:#C75B2A;color:#FFFFFF;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;">${text}</a>
    </div>`
    )
  }

  const infoBox = (bgColor: string, content: string) =>
    `<div style="background:${bgColor};border-radius:8px;padding:14px;margin:14px 0;">${content}</div>`

  const priceTag = (amount: string | number, color = '#1F2937') =>
    `<p style="font-size:18px;color:${color};font-weight:700;margin:6px 0 0;">EUR ${amount}</p>`

  switch (type) {
    // ── BUYER EMAILS ──────────────────────────────────────────
    case 'order_confirmed': {
      const { buyerName, orderRef, itemTitle, totalPrice, deliveryMethod } = data
      const ph = `Your order ${orderRef} has been placed on Sib.`
      return {
        subject: `Order confirmed — ${orderRef}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Order Confirmed</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
            Hi ${buyerName || 'there'}, your order has been placed successfully.
          </p>
          ${infoBox('#F0F9FF', `
            <p style="font-size:12px;color:#6B7280;margin:0 0 6px;font-family:monospace;">${orderRef}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Delivery:</strong> ${deliveryMethod || 'Sib Delivery'}</p>
            ${priceTag(totalPrice)}
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            Your item is reserved and will be shipped shortly. You'll receive updates when it's on the way.
          </p>
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            Your payment is held safely by Sib until you confirm delivery.
          </p>
          ${btn('View Order', orderUrl(payload.meta?.orderId))}
        `),
      }
    }

    case 'payment_confirmed': {
      const { buyerName, orderRef, totalPrice } = data
      const ph = `Payment of EUR ${totalPrice} received for order ${orderRef}.`
      return {
        subject: `Payment received — ${orderRef}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Payment Confirmed</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
            Hi ${buyerName || 'there'}, we received your payment of EUR ${totalPrice}.
          </p>
          ${infoBox('#ECFDF5', `
            <p style="font-size:14px;color:#065F46;margin:0;text-align:center;">
              <strong>Order:</strong> ${orderRef}
            </p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            Your funds are protected by Sib until you confirm delivery.
          </p>
          ${btn('View Order', orderUrl(payload.meta?.orderId))}
        `),
      }
    }

    case 'item_shipped': {
      const { buyerName, itemTitle, orderRef, sellerName } = data
      const ph = `${sellerName || 'The seller'} has shipped your item for order ${orderRef}.`
      return {
        subject: `Item shipped — ${orderRef}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Your Item Has Shipped</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
            Hi ${buyerName || 'there'}, @${sellerName} has shipped your item.
          </p>
          ${infoBox('#EFF6FF', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:14px;color:#4B5563;margin:0;"><strong>Order:</strong> ${orderRef}</p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            You will have 48 hours after delivery to confirm everything is OK.
          </p>
          ${btn('Track Order', orderUrl(payload.meta?.orderId))}
        `),
      }
    }

    case 'item_delivered': {
      const { buyerName, itemTitle, orderRef } = data
      const ph = `Your order ${orderRef} has been delivered. Please confirm.`
      return {
        subject: `Delivered — ${orderRef}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Item Delivered</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
            Hi ${buyerName || 'there'}, your order ${orderRef} has been delivered.
          </p>
          ${infoBox('#ECFDF5', `
            <p style="font-size:14px;color:#065F46;margin:0 0 4px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:13px;color:#065F46;margin:0;">Please confirm everything looks good.</p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            If something is wrong, you have 48 hours to report an issue.
          </p>
          ${btn('Confirm Delivery', orderUrl(payload.meta?.orderId))}
        `),
      }
    }

    case 'refund_confirmed': {
      const { buyerName, orderRef, refundAmount, itemTitle } = data
      const ph = `Your refund of EUR ${refundAmount} for order ${orderRef} has been processed.`
      return {
        subject: `Refund processed — ${orderRef}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Refund Confirmed</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
            Hi ${buyerName || 'there'}, your refund has been processed.
          </p>
          ${infoBox('#F0F9FF', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Order:</strong> ${orderRef}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Item:</strong> ${itemTitle || 'N/A'}</p>
            ${priceTag(refundAmount, '#059669')}
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            The refund will appear in your original payment method within 5-10 business days.
          </p>
        `),
      }
    }

    case 'dispute_opened': {
      const { buyerName, recipientName, orderRef, reason, role = 'buyer' } = data
      const name = recipientName || buyerName || 'there'
      const isSellerNotice = role === 'seller'
      const ph = isSellerNotice
        ? `A dispute was opened on order ${orderRef}.`
        : `We received your dispute for order ${orderRef}.`
      return {
        subject: isSellerNotice ? `Dispute opened — ${orderRef}` : `Dispute received — ${orderRef}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">${isSellerNotice ? 'Dispute Opened' : 'Dispute Received'}</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
            ${isSellerNotice ? `Hi ${name}, a dispute was opened on order ${orderRef}.` : `Hi ${name}, we received your dispute for order ${orderRef}.`}
          </p>
          ${infoBox('#FFF7ED', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Reason:</strong> ${reason || 'Issue reported'}</p>
            <p style="font-size:13px;color:#6B7280;margin:0;">${isSellerNotice ? 'Your payout remains on hold while we review the order.' : 'Your payment remains protected while we review.'}</p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            ${isSellerNotice ? 'Our team will review and contact both parties as soon as possible.' : 'Our team will review and respond as soon as possible.'}
          </p>
          ${btn('View Order', orderUrl(payload.meta?.orderId))}
        `),
      }
    }

   // SELLER EMAILS
case 'item_sold': {
  const { sellerName, itemTitle, orderRef, salePrice, buyerName } = data

  const orderId =
    payload.meta?.orderId ||
    payload.related_entity_id ||
    payload.meta?.related_entity_id

  const saleUrl = orderId
    ? orderUrl(orderId)
    : orderUrl()

  const ph = `Your item "${itemTitle}" has sold on Sib.`

  return {
    subject: `Item sold - "${itemTitle}"`,
    preheader: ph,
    html: wrap(
      ph,
      `
      <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Your item has sold</h2>
      <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
        Hi ${sellerName || 'there'}, ${
        buyerName
          ? `@${buyerName} purchased your item.`
          : 'your item has been purchased.'
      }
      </p>
      ${infoBox(
        '#ECFDF5',
        `
        <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Item:</strong> ${itemTitle}</p>
        <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Order:</strong> ${orderRef}</p>
        ${priceTag(salePrice, '#059669')}
      `
      )}
      <p style="font-size:13px;color:#6B7280;text-align:center;">
        Please prepare it for shipment and check Sib for delivery instructions. Buyer contact details are kept private.
      </p>
      ${btn('View Sale', saleUrl)}
    `
    ),
  }
}

    case 'shipping_reminder': {
      const { sellerName, itemTitle, orderRef, daysSinceOrder } = data
      const ph = `Reminder: please ship "${itemTitle}" for order ${orderRef}.`
      return {
        subject: `Shipping reminder — ${orderRef}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Shipping Reminder</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
            Hi ${sellerName || 'there'}, your buyer is waiting for their item.
          </p>
          ${infoBox('#FEF3C7', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Order:</strong> ${orderRef}</p>
            <p style="font-size:13px;color:#92400E;margin:6px 0 0;">
              It has been ${daysSinceOrder || 'a few'} day(s) since the order was placed.
            </p>
          `)}
          ${btn('Mark as Shipped', buildAppUrl('/seller'))}
        `),
      }
    }

    case 'payout_released': {
      const { sellerName, orderRef, payoutAmount, itemTitle } = data
      const ph = `Your payout of EUR ${payoutAmount} for order ${orderRef} has been released.`
      return {
        subject: `Payout released — EUR ${payoutAmount}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Payout Released</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
            Hi ${sellerName || 'there'}, your payout has been released.
          </p>
          ${infoBox('#ECFDF5', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Item:</strong> ${itemTitle || 'N/A'}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Order:</strong> ${orderRef}</p>
            ${priceTag(payoutAmount, '#059669')}
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            The payout will arrive via your configured payout method on the next payout day.
          </p>
          ${btn('View Payout', buildAppUrl('/seller'))}
        `),
      }
    }

    // ── TRUST & SAFETY EMAILS ─────────────────────────────────
    case 'suspicious_activity': {
      const { userName } = data
      const ph = 'A reminder about safe transactions on Sib.'
      return {
        subject: 'Safety notice — Sib',
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Safety Notice</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
            Hi ${userName || 'there'}, we detected activity that may involve off-platform transactions.
          </p>
          ${infoBox('#FEE2E2', `
            <p style="font-size:13px;color:#991B1B;margin:0;">
              Sharing contact details or requesting payment outside Sib removes buyer protection. All transactions should go through the Sib checkout.
            </p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            Repeated violations may result in account restrictions.
          </p>
        `),
      }
    }

    case 'moderation_notice': {
      const { userName, action, reason, details } = data
      const actionLabels: Record<string, string> = {
        warning: 'Account Warning',
        suspended: 'Account Suspended',
        listing_removed: 'Listing Removed',
        banned: 'Account Banned',
        restored: 'Account Restored',
      }
      const ph = `Account notice: ${actionLabels[action] || action}.`
      return {
        subject: `Account notice — ${actionLabels[action] || action}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">${actionLabels[action] || 'Account Notice'}</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
            Hi ${userName || 'there'}, our team has reviewed your account activity.
          </p>
          ${infoBox(action === 'restored' ? '#ECFDF5' : '#FEF3C7', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Action:</strong> ${actionLabels[action] || action}</p>
            ${reason ? `<p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Reason:</strong> ${reason}</p>` : ''}
            ${details ? `<p style="font-size:13px;color:#6B7280;margin:6px 0 0;">${details}</p>` : ''}
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            If you believe this was a mistake, contact info@sibmalta.com.
          </p>
        `),
      }
    }

    // ── OFFER EMAILS ──────────────────────────────────────────
    case 'offer_received': {
      const { itemTitle, offerPrice, buyerName } = data
      const ph = `@${buyerName} made an offer of EUR ${offerPrice} on "${itemTitle}".`
      return {
        subject: `New offer on "${itemTitle}" — EUR ${offerPrice}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">You Received an Offer</h2>
          ${infoBox('#FFF7ED', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>From:</strong> @${buyerName}</p>
            ${priceTag(offerPrice, '#C75B2A')}
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">You can accept, decline, or counter this offer.</p>
          ${btn('View Offer', offerThreadUrl())}
        `),
      }
    }

    case 'offer_accepted': {
      const { itemTitle, acceptedPrice, sellerName } = data
      const ph = `Your offer of EUR ${acceptedPrice} on "${itemTitle}" was accepted.`
      return {
        subject: `Offer accepted — "${itemTitle}"`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Your Offer Was Accepted</h2>
          ${infoBox('#ECFDF5', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Seller:</strong> @${sellerName}</p>
            ${priceTag(acceptedPrice, '#059669')}
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">Complete your purchase now before the offer expires.</p>
          ${btn('Go to Checkout', checkoutUrl(payload.meta?.listingId, payload.meta?.offerId || payload.related_entity_id))}
        `),
      }
    }

    // ── OFFER DECLINE / COUNTER EMAILS ────────────────────────
    case 'counter_offer_accepted': {
      const { itemTitle, acceptedPrice, buyerName } = data
      const ph = `@${buyerName || 'buyer'} accepted your counter offer of EUR ${acceptedPrice} on "${itemTitle}".`
      return {
        subject: `Your counter offer was accepted — "${itemTitle}"`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Your Counter Offer Was Accepted</h2>
          ${infoBox('#ECFDF5', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Buyer:</strong> @${buyerName || 'buyer'}</p>
            ${priceTag(acceptedPrice, '#059669')}
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            Continue in Messages to keep the offer and checkout conversation in one place.
          </p>
          ${btn('View Conversation', offerThreadUrl())}
        `),
      }
    }

    case 'offer_declined': {
      const { itemTitle, declinedPrice, sellerName } = data
      const ph = `Your offer of EUR ${declinedPrice} on "${itemTitle}" was declined.`
      return {
        subject: `Offer declined — "${itemTitle}"`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Offer Declined</h2>
          ${infoBox('#FEF3C7', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Seller:</strong> @${sellerName}</p>
            <p style="font-size:14px;color:#92400E;margin:6px 0 0;">EUR ${declinedPrice} — declined</p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            You can browse similar items or make a new offer at a different price.
          </p>
          ${btn('Browse Items', buildAppUrl('/browse'))}
        `),
      }
    }

    case 'offer_countered': {
      const { itemTitle, originalPrice, counterPrice, sellerName } = data
      const ph = `@${sellerName} countered your offer with EUR ${counterPrice} on "${itemTitle}".`
      return {
        subject: `Counter offer — EUR ${counterPrice} on "${itemTitle}"`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Counter Offer Received</h2>
          ${infoBox('#FFF7ED', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Seller:</strong> @${sellerName}</p>
            <p style="font-size:13px;color:#6B7280;margin:0 0 4px;">Your offer: EUR ${originalPrice}</p>
            ${priceTag(counterPrice, '#C75B2A')}
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            You can accept, decline, or let it expire. Valid for 24 hours.
          </p>
          ${btn('View Offer', offerThreadUrl())}
        `),
      }
    }

    // ── ORDER CANCELLED EMAIL ─────────────────────────────────
    case 'order_cancelled': {
      const { buyerName, orderRef, itemTitle, refundAmount } = data
      const ph = `Your order ${orderRef} has been cancelled.`
      return {
        subject: `Order cancelled — ${orderRef}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Order Cancelled</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
            Hi ${buyerName || 'there'}, your order ${orderRef} has been cancelled.
          </p>
          ${infoBox('#FEE2E2', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Item:</strong> ${itemTitle || 'N/A'}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Order:</strong> ${orderRef}</p>
            ${refundAmount ? `<p style="font-size:14px;color:#059669;margin:6px 0 0;">EUR ${refundAmount} refund issued</p>` : ''}
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            If a refund was issued, it will appear in your payment method within 5-10 business days.
          </p>
          ${btn('Browse Items', buildAppUrl('/browse'))}
        `),
      }
    }

    // ── ORDER CANCELLED (SELLER) EMAIL ─────────────────────────
    case 'order_cancelled_seller': {
      const { sellerName, orderRef, itemTitle } = data
      const ph = `Order ${orderRef} has been cancelled.`
      return {
        subject: `Order cancelled — ${orderRef}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Order Cancelled</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
            Hi ${sellerName || 'there'}, order ${orderRef} has been cancelled.
          </p>
          ${infoBox('#FEE2E2', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Item:</strong> ${itemTitle || 'N/A'}</p>
            <p style="font-size:14px;color:#4B5563;margin:0;"><strong>Order:</strong> ${orderRef}</p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            The buyer has been refunded. No further action is required from you.
          </p>
          ${btn('View Sale', orderUrl(payload.meta?.orderId || payload.related_entity_id))}
        `),
      }
    }

    // ── DISPUTE RESOLUTION EMAILS ─────────────────────────────
    case 'dispute_resolved': {
      const { userName, orderRef, resolution } = data
      const resolutionLabels: Record<string, string> = {
        refunded: 'Refund issued to buyer',
        seller_payout: 'Payout released to seller',
        partial_refund: 'Partial refund issued',
        dismissed: 'Dispute dismissed',
      }
      const ph = `The dispute for order ${orderRef} has been resolved.`
      return {
        subject: `Dispute resolved — ${orderRef}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Dispute Resolved</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
            Hi ${userName || 'there'}, the dispute for order ${orderRef} has been resolved.
          </p>
          ${infoBox('#ECFDF5', `
            <p style="font-size:14px;color:#065F46;margin:0;text-align:center;">
              <strong>Resolution:</strong> ${resolutionLabels[resolution] || resolution || 'Resolved'}
            </p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            Questions? Contact info@sibmalta.com.
          </p>
          ${btn('View Order', orderUrl(payload.meta?.orderId))}
        `),
      }
    }

    case 'dispute_message': {
      const { userName, orderRef, messagePreview } = data
      const ph = `New message on your dispute for order ${orderRef}.`
      return {
        subject: `Dispute update — ${orderRef}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Dispute Update</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
            Hi ${userName || 'there'}, there is a new message on the dispute for order ${orderRef}.
          </p>
          ${messagePreview ? infoBox('#F0F9FF', `
            <p style="font-size:13px;color:#4B5563;margin:0;font-style:italic;">"${messagePreview.slice(0, 150)}${messagePreview.length > 150 ? '...' : ''}"</p>
          `) : ''}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            View the full message and respond in the app.
          </p>
          ${btn('View Dispute', orderUrl(payload.meta?.orderId))}
        `),
      }
    }

    case 'message_received': {
      const { userName, senderName, messagePreview, itemTitle } = data
      const ph = `@${senderName || 'Someone'} sent you a message on Sib.`
      const url = conversationUrl()
      console.log(`[send-email] message_received CTA URL: ${url}`)
      return {
        subject: `New message from @${senderName || 'someone'}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">New Message</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 14px;">
            Hi ${userName || 'there'}, @${senderName || 'someone'} sent you a message${itemTitle ? ` about "${itemTitle}"` : ''}.
          </p>
          ${infoBox('#F0F9FF', `
            <p style="font-size:13px;color:#4B5563;margin:0;font-style:italic;">"${String(messagePreview || '').slice(0, 180)}${String(messagePreview || '').length > 180 ? '...' : ''}"</p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            Reply in Sib Messages to keep your conversation and Buyer Protection in one place.
          </p>
          ${btn('View Message', url)}
        `),
      }
    }

    // ── BUNDLE OFFER EMAILS ───────────────────────────────────
    case 'bundle_offer_received': {
      const { itemCount, offerPrice, originalTotal, buyerName } = data
      const ph = `@${buyerName} offered EUR ${offerPrice} for ${itemCount} of your items.`
      return {
        subject: `Bundle offer — EUR ${offerPrice} for ${itemCount} items`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Bundle Offer Received</h2>
          ${infoBox('#FFF7ED', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Items:</strong> ${itemCount} items</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>From:</strong> @${buyerName}</p>
            <p style="font-size:13px;color:#6B7280;margin:0 0 4px;">Original total: EUR ${originalTotal}</p>
            ${priceTag(offerPrice, '#C75B2A')}
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">You can accept, decline, or counter this bundle offer.</p>
          ${btn('View Offer', offerThreadUrl())}
        `),
      }
    }

    case 'bundle_offer_accepted': {
      const { itemCount, acceptedPrice, sellerName } = data
      const ph = `Your bundle offer of EUR ${acceptedPrice} for ${itemCount} items was accepted.`
      return {
        subject: `Bundle offer accepted — EUR ${acceptedPrice}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Bundle Offer Accepted</h2>
          ${infoBox('#ECFDF5', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Items:</strong> ${itemCount} items</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Seller:</strong> @${sellerName}</p>
            ${priceTag(acceptedPrice, '#059669')}
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">Complete your purchase now before the offer expires.</p>
          ${btn('Go to Checkout', withQuery('/bundle/checkout', { offer: payload.meta?.offerId || payload.related_entity_id }))}
        `),
      }
    }

    case 'bundle_offer_declined': {
      const { itemCount, declinedPrice, sellerName } = data
      const ph = `Your bundle offer of EUR ${declinedPrice} was declined.`
      return {
        subject: `Bundle offer declined`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Bundle Offer Declined</h2>
          ${infoBox('#FEF3C7', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Items:</strong> ${itemCount} items</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Seller:</strong> @${sellerName}</p>
            <p style="font-size:14px;color:#92400E;margin:6px 0 0;">EUR ${declinedPrice} — declined</p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            You can try a different price or browse other items.
          </p>
          ${btn('Browse Items', buildAppUrl('/browse'))}
        `),
      }
    }

    case 'bundle_offer_countered': {
      const { itemCount, originalPrice, counterPrice, sellerName } = data
      const ph = `Counter offer of EUR ${counterPrice} on your ${itemCount}-item bundle.`
      return {
        subject: `Bundle counter offer — EUR ${counterPrice}`,
        preheader: ph,
        html: wrap(ph, `
          <h2 style="font-size:18px;color:#1F2937;text-align:center;margin:14px 0 8px;">Bundle Counter Offer</h2>
          ${infoBox('#FFF7ED', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Items:</strong> ${itemCount} items</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 4px;"><strong>Seller:</strong> @${sellerName}</p>
            <p style="font-size:13px;color:#6B7280;margin:0 0 4px;">Your offer: EUR ${originalPrice}</p>
            ${priceTag(counterPrice, '#C75B2A')}
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            Accept, decline, or let it expire. Valid for 24 hours.
          </p>
          ${btn('View Offer', offerThreadUrl())}
        `),
      }
    }

    default: {
      const ph = 'You have a new notification on Sib.'
      return {
        subject: 'Notification from Sib',
        preheader: ph,
        html: wrap(ph, '<p style="font-size:14px;color:#4B5563;text-align:center;">You have a new notification on Sib.</p>'),
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let payload: EmailPayload | null = null
  let subject = '(unknown)'

  try {
    payload = await req.json()
    console.log('[send-email] incoming payload', {
      type: payload?.type || null,
      to: payload?.to || null,
      meta: payload?.meta || {},
      related_entity_type: payload?.related_entity_type || payload?.meta?.related_entity_type || null,
      related_entity_id: payload?.related_entity_id || payload?.meta?.related_entity_id || null,
      dataKeys: payload?.data ? Object.keys(payload.data) : [],
    })

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.error('[send-email] RESEND_API_KEY not configured')
      if (payload?.to && payload?.type) {
        await logEmail(payload, `(${payload.type})`, 'failed', undefined, 'RESEND_API_KEY not configured')
      }
      return new Response(
        JSON.stringify({
          success: false,
          emailSent: false,
          error: 'RESEND_API_KEY not configured. Add it in Environment Variables.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Canonical sender — must match verified Resend domain
    const emailFrom = 'Sib <no-reply@sibmalta.com>'

    const resolvedRecipient = await resolveRecipientIfNeeded(payload)

    if (!payload.to || !payload.type) {
      if (payload?.type || payload?.to) {
        await logEmail({
          type: payload?.type || 'invalid_request',
          to: payload?.to || resolvedRecipient || 'unknown',
          data: payload?.data || {},
          meta: payload?.meta || {},
          related_entity_type: payload?.related_entity_type,
          related_entity_id: payload?.related_entity_id,
        }, '(invalid payload)', 'failed', undefined, 'Missing required fields: to, type')
      }
      return new Response(
        JSON.stringify({
          success: false,
          emailSent: false,
          error: 'Missing required fields: to, type',
          type: payload?.type || null,
          to: payload?.to || resolvedRecipient || null,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const builtEmail = buildEmail(payload)
    subject = builtEmail.subject
    const { html, preheader } = builtEmail

    // Plain-text fallback — critical for deliverability (multipart/alternative)
    const textBody = stripHtmlToText(html)

    const resendBody = JSON.stringify({
      from: emailFrom,
      to: [payload.to],
      reply_to: 'info@sibmalta.com',
      subject,
      html,
      text: textBody,
      headers: {
        'List-Unsubscribe': '<mailto:info@sibmalta.com?subject=unsubscribe>',
        'X-Entity-Ref-ID': `sib-${payload.type}-${Date.now()}`,
      },
      tags: [
        { name: 'email_type', value: payload.type },
        { name: 'app', value: 'sib' },
      ],
    })

    console.log('[send-email] sending via Resend', {
      type: payload.type,
      to: payload.to,
      subject,
      related_entity_type: payload.related_entity_type || payload.meta?.related_entity_type || null,
      related_entity_id: payload.related_entity_id || payload.meta?.related_entity_id || null,
    })

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: resendBody,
    })

    let resendData: Record<string, any> = {}
    try {
      resendData = await resendResponse.json()
    } catch (parseError) {
      const parseMessage = parseError instanceof Error ? parseError.message : String(parseError)
      console.error('[send-email] Failed to parse Resend response JSON', {
        status: resendResponse.status,
        error: parseMessage,
      })
      resendData = { parseError: parseMessage || 'Failed to parse Resend response' }
    }

    if (!resendResponse.ok) {
      console.error('[send-email] Resend send failed', {
        type: payload.type,
        to: payload.to,
        status: resendResponse.status,
        response: resendData,
      })
      await logEmail(payload, subject, 'failed', undefined, JSON.stringify(resendData))
      return new Response(
        JSON.stringify({
          success: false,
          emailSent: false,
          error: 'Email send failed',
          details: resendData,
          type: payload.type,
          to: payload.to,
        }),
        { status: resendResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[send-email] Resend send succeeded', {
      type: payload.type,
      to: payload.to,
      resendId: resendData.id || null,
      subject,
      response: resendData,
    })
    await logEmail(payload, subject, 'success', resendData.id)

    return new Response(
      JSON.stringify({
        success: true,
        emailSent: true,
        id: resendData.id,
        subject,
        type: payload.type,
        to: payload.to,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[send-email] ERROR:', error)
    if (payload?.to && payload?.type) {
      await logEmail(payload, subject || `(${payload.type})`, 'failed', undefined, error.message || 'Unknown error')
    }
    return new Response(
      JSON.stringify({
        success: false,
        emailSent: false,
        error: error.message || 'Unknown error',
        type: payload?.type || null,
        to: payload?.to || null,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
