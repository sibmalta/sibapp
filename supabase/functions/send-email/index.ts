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

interface EmailPayload {
  type: EmailType
  to: string
  data: Record<string, any>
}

function buildEmail(payload: EmailPayload): { subject: string; html: string } {
  const { type, data } = payload

  const logoUrl = `${Deno.env.get('APP_URL') || 'https://sibmalta.com'}/assets/sib-3.png`

  const header = `
    <div style="text-align:center;padding:24px 0 16px;">
      <img src="${logoUrl}" alt="Sib" width="72" height="72" style="display:inline-block;width:72px;height:auto;" />
      <div style="font-size:11px;color:#9CA3AF;margin-top:2px;">Malta's Second-Hand Marketplace</div>
    </div>`

  const footer = `
    <div style="text-align:center;padding:24px 0 8px;border-top:1px solid #F3F4F6;margin-top:32px;">
      <p style="font-size:11px;color:#9CA3AF;margin:0;">You're receiving this because you have a Sib account.</p>
      <p style="font-size:11px;color:#9CA3AF;margin:4px 0 0;">All transactions on Sib are protected by Sib Buyer Protection.</p>
      <p style="font-size:11px;color:#9CA3AF;margin:4px 0 0;">&copy; ${new Date().getFullYear()} Sib &middot; Malta</p>
    </div>`

  const wrap = (content: string) => `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:0 auto;padding:16px;">
        <div style="background:#FFFFFF;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          ${header}
          ${content}
          ${footer}
        </div>
      </div>
    </body></html>`

  const btn = (text: string, url: string) =>
    `<div style="text-align:center;margin:24px 0;">
      <a href="${url}" style="display:inline-block;padding:14px 32px;background:#C75B2A;color:#FFFFFF;font-weight:700;font-size:14px;text-decoration:none;border-radius:12px;">${text}</a>
    </div>`

  const infoBox = (bgColor: string, content: string) =>
    `<div style="background:${bgColor};border-radius:12px;padding:16px;margin:16px 0;">${content}</div>`

  const appUrl = Deno.env.get('APP_URL') || 'https://sibmalta.com'

  switch (type) {
    // ── BUYER EMAILS ──────────────────────────────────────────
    case 'order_confirmed': {
      const { buyerName, orderRef, itemTitle, totalPrice, deliveryMethod } = data
      return {
        subject: `Order confirmed: ${orderRef}`,
        html: wrap(`
          <h2 style="font-size:20px;color:#1F2937;text-align:center;margin:16px 0 8px;">Order Confirmed</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 16px;">
            Thanks ${buyerName || 'there'}, your order has been placed successfully.
          </p>
          ${infoBox('#F0F9FF', `
            <p style="font-size:12px;color:#6B7280;margin:0 0 8px;font-family:monospace;">${orderRef}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Delivery:</strong> ${deliveryMethod || 'Sib Delivery'}</p>
            <p style="font-size:22px;color:#1F2937;font-weight:800;margin:8px 0 0;">&euro;${totalPrice}</p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            Your payment is held safely by Sib. The seller will be paid only after you confirm delivery.
          </p>
          ${btn('Track Order', `${appUrl}/orders`)}
        `),
      }
    }

    case 'payment_confirmed': {
      const { buyerName, orderRef, totalPrice } = data
      return {
        subject: `Payment received: ${orderRef}`,
        html: wrap(`
          <h2 style="font-size:20px;color:#1F2937;text-align:center;margin:16px 0 8px;">Payment Confirmed</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 16px;">
            Hi ${buyerName || 'there'}, we've received your payment of <strong>&euro;${totalPrice}</strong>.
          </p>
          ${infoBox('#ECFDF5', `
            <p style="font-size:14px;color:#065F46;margin:0;text-align:center;">
              <strong>Order:</strong> ${orderRef}
            </p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            Your money is protected by Sib Buyer Protection until you confirm delivery is OK.
          </p>
          ${btn('View Order', `${appUrl}/orders`)}
        `),
      }
    }

    case 'item_shipped': {
      const { buyerName, itemTitle, orderRef, sellerName } = data
      return {
        subject: `Your item is on the way: ${orderRef}`,
        html: wrap(`
          <h2 style="font-size:20px;color:#1F2937;text-align:center;margin:16px 0 8px;">Your Item Has Shipped</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 16px;">
            Hi ${buyerName || 'there'}, <strong>@${sellerName}</strong> has shipped your item.
          </p>
          ${infoBox('#EFF6FF', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:14px;color:#4B5563;margin:0;"><strong>Order:</strong> ${orderRef}</p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            You'll receive a delivery notification when it arrives. You'll have 48 hours to confirm everything is OK.
          </p>
          ${btn('Track Order', `${appUrl}/orders`)}
        `),
      }
    }

    case 'item_delivered': {
      const { buyerName, itemTitle, orderRef } = data
      return {
        subject: `Delivered: ${orderRef}`,
        html: wrap(`
          <h2 style="font-size:20px;color:#1F2937;text-align:center;margin:16px 0 8px;">Item Delivered</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 16px;">
            Hi ${buyerName || 'there'}, your order <strong>${orderRef}</strong> has been delivered.
          </p>
          ${infoBox('#ECFDF5', `
            <p style="font-size:14px;color:#065F46;margin:0 0 6px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:13px;color:#065F46;margin:0;">Please confirm everything looks good.</p>
          `)}
          ${infoBox('#FEF3C7', `
            <p style="font-size:13px;color:#92400E;margin:0;text-align:center;">
              <strong>Something wrong?</strong> You have 48 hours to report an issue and your money will stay protected.
            </p>
          `)}
          ${btn('Confirm Delivery', `${appUrl}/orders`)}
        `),
      }
    }

    case 'refund_confirmed': {
      const { buyerName, orderRef, refundAmount, itemTitle } = data
      return {
        subject: `Refund processed: ${orderRef}`,
        html: wrap(`
          <h2 style="font-size:20px;color:#1F2937;text-align:center;margin:16px 0 8px;">Refund Confirmed</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 16px;">
            Hi ${buyerName || 'there'}, your refund has been approved and processed.
          </p>
          ${infoBox('#F0F9FF', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Order:</strong> ${orderRef}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Item:</strong> ${itemTitle || 'N/A'}</p>
            <p style="font-size:22px;color:#059669;font-weight:800;margin:8px 0 0;">&euro;${refundAmount} refunded</p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            The refund will appear in your original payment method within 5&ndash;10 business days.
          </p>
        `),
      }
    }

    case 'dispute_opened': {
      const { buyerName, orderRef, reason } = data
      return {
        subject: `Dispute received: ${orderRef}`,
        html: wrap(`
          <h2 style="font-size:20px;color:#1F2937;text-align:center;margin:16px 0 8px;">Dispute Received</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 16px;">
            Hi ${buyerName || 'there'}, we've received your dispute for order <strong>${orderRef}</strong>.
          </p>
          ${infoBox('#FFF7ED', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Reason:</strong> ${reason || 'Issue reported'}</p>
            <p style="font-size:13px;color:#6B7280;margin:0;">Your payment remains fully protected while we review.</p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            Our team will review your case and get back to you as soon as possible.
          </p>
          ${btn('View Order', `${appUrl}/orders`)}
        `),
      }
    }

    // ── SELLER EMAILS ─────────────────────────────────────────
    case 'item_sold': {
      const { sellerName, itemTitle, orderRef, salePrice, buyerName } = data
      return {
        subject: `Item sold: "${itemTitle}"`,
        html: wrap(`
          <h2 style="font-size:20px;color:#1F2937;text-align:center;margin:16px 0 8px;">Your Item Sold!</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 16px;">
            Congrats ${sellerName || 'there'}, <strong>@${buyerName}</strong> purchased your item.
          </p>
          ${infoBox('#ECFDF5', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Order:</strong> ${orderRef}</p>
            <p style="font-size:22px;color:#059669;font-weight:800;margin:8px 0 0;">&euro;${salePrice}</p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            <strong>Next step:</strong> Package the item carefully and ship it as soon as possible.
            Mark it as shipped in the app once you drop it off.
          </p>
          ${btn('View Sale', `${appUrl}/seller`)}
        `),
      }
    }

    case 'shipping_reminder': {
      const { sellerName, itemTitle, orderRef, daysSinceOrder } = data
      return {
        subject: `Reminder: Ship "${itemTitle}" soon`,
        html: wrap(`
          <h2 style="font-size:20px;color:#1F2937;text-align:center;margin:16px 0 8px;">Shipping Reminder</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 16px;">
            Hi ${sellerName || 'there'}, your buyer is waiting for their item.
          </p>
          ${infoBox('#FEF3C7', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Order:</strong> ${orderRef}</p>
            <p style="font-size:13px;color:#92400E;margin:8px 0 0;">
              It's been ${daysSinceOrder || 'a few'} day(s) since the order was placed. Please ship promptly to keep your seller rating high.
            </p>
          `)}
          ${btn('Mark as Shipped', `${appUrl}/seller`)}
        `),
      }
    }

    case 'payout_released': {
      const { sellerName, orderRef, payoutAmount, itemTitle } = data
      return {
        subject: `Payout released: \u20AC${payoutAmount}`,
        html: wrap(`
          <h2 style="font-size:20px;color:#1F2937;text-align:center;margin:16px 0 8px;">Payout Released</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 16px;">
            Hi ${sellerName || 'there'}, your payout has been released.
          </p>
          ${infoBox('#ECFDF5', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Item:</strong> ${itemTitle || 'N/A'}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Order:</strong> ${orderRef}</p>
            <p style="font-size:22px;color:#059669;font-weight:800;margin:8px 0 0;">&euro;${payoutAmount}</p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            The payout will be sent to your configured payout method on the next payout day.
          </p>
          ${btn('View Payout', `${appUrl}/seller`)}
        `),
      }
    }

    // ── TRUST & SAFETY EMAILS ─────────────────────────────────
    case 'suspicious_activity': {
      const { userName } = data
      return {
        subject: 'Important: Stay safe on Sib',
        html: wrap(`
          <h2 style="font-size:20px;color:#1F2937;text-align:center;margin:16px 0 8px;">Safety Notice</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 16px;">
            Hi ${userName || 'there'}, we detected activity in your messages that may involve off-platform transactions.
          </p>
          ${infoBox('#FEE2E2', `
            <p style="font-size:13px;color:#991B1B;margin:0;">
              <strong>Reminder:</strong> Sharing phone numbers, email addresses, or requesting payment outside of Sib is against our terms.
              Transactions outside Sib are <strong>not protected</strong> by Sib Buyer Protection.
            </p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            Always complete purchases through the Sib checkout to ensure tracked delivery and buyer protection. Repeated violations may result in account restrictions.
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
      return {
        subject: `Account notice: ${actionLabels[action] || action}`,
        html: wrap(`
          <h2 style="font-size:20px;color:#1F2937;text-align:center;margin:16px 0 8px;">${actionLabels[action] || 'Account Notice'}</h2>
          <p style="font-size:14px;color:#4B5563;text-align:center;margin:0 0 16px;">
            Hi ${userName || 'there'}, our team has reviewed your account activity.
          </p>
          ${infoBox(action === 'restored' ? '#ECFDF5' : '#FEF3C7', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Action:</strong> ${actionLabels[action] || action}</p>
            ${reason ? `<p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Reason:</strong> ${reason}</p>` : ''}
            ${details ? `<p style="font-size:13px;color:#6B7280;margin:8px 0 0;">${details}</p>` : ''}
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">
            If you believe this was a mistake, contact our support team at support@sibmalta.com.
          </p>
        `),
      }
    }

    // ── OFFER EMAILS ──────────────────────────────────────────
    case 'offer_received': {
      const { itemTitle, offerPrice, buyerName } = data
      return {
        subject: `New offer: \u20AC${offerPrice} on "${itemTitle}"`,
        html: wrap(`
          <h2 style="font-size:20px;color:#1F2937;text-align:center;margin:16px 0 8px;">You've received an offer</h2>
          ${infoBox('#FFF7ED', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>From:</strong> @${buyerName}</p>
            <p style="font-size:22px;color:#C75B2A;font-weight:800;margin:8px 0 0;">&euro;${offerPrice}</p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">You can accept, decline, or counter this offer.</p>
          ${btn('View Offer', `${appUrl}/offers`)}
        `),
      }
    }

    case 'offer_accepted': {
      const { itemTitle, acceptedPrice, sellerName } = data
      return {
        subject: `Offer accepted on "${itemTitle}"`,
        html: wrap(`
          <h2 style="font-size:20px;color:#1F2937;text-align:center;margin:16px 0 8px;">Your offer was accepted!</h2>
          ${infoBox('#ECFDF5', `
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Item:</strong> ${itemTitle}</p>
            <p style="font-size:14px;color:#4B5563;margin:0 0 6px;"><strong>Seller:</strong> @${sellerName}</p>
            <p style="font-size:22px;color:#059669;font-weight:800;margin:8px 0 0;">&euro;${acceptedPrice}</p>
          `)}
          <p style="font-size:13px;color:#6B7280;text-align:center;">Complete your purchase now before the offer expires.</p>
          ${btn('Go to Checkout', `${appUrl}/checkout`)}
        `),
      }
    }

    default:
      return { subject: 'Notification from Sib', html: wrap('<p style="font-size:14px;color:#4B5563;text-align:center;">You have a new notification on Sib.</p>') }
  }
}

Deno.serve(async (req) => {
  console.log(`[send-email] ── Edge Function invoked — ${req.method} ──`)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY')
    console.log(`[send-email] RESEND_API_KEY present: ${!!resendKey}`)
    if (!resendKey) {
      console.error('[send-email] ABORT: RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured. Add it in Environment Variables.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // HARDCODED sender — must match a verified Resend domain exactly
    const envFrom = Deno.env.get('EMAIL_FROM')
    console.log(`[send-email] EMAIL_FROM env raw value: "${envFrom}" (type: ${typeof envFrom})`)

    // Always use the canonical format Resend expects: "Name <address>"
    const emailFrom = 'Sib <no-reply@sibmalta.com>'
    console.log(`[send-email] Using from: "${emailFrom}"`)

    const payload: EmailPayload = await req.json()
    console.log(`[send-email] Payload received — type: ${payload.type}, to: ${payload.to}`)

    if (!payload.to || !payload.type) {
      console.error('[send-email] Missing required fields:', { to: payload.to, type: payload.type })
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { subject, html } = buildEmail(payload)
    console.log(`[send-email] Built email — subject: "${subject}", html length: ${html.length}`)

    const resendBody = JSON.stringify({
      from: emailFrom,
      to: [payload.to],
      subject,
      html,
    })
    console.log(`[send-email] Calling Resend API: POST https://api.resend.com/emails`)
    console.log(`[send-email] Resend payload (from/to/subject): from=${emailFrom}, to=${payload.to}, subject="${subject}"`)

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: resendBody,
    })

    console.log(`[send-email] Resend API response status: ${resendResponse.status}`)

    const resendData = await resendResponse.json()
    console.log(`[send-email] Resend API response body:`, JSON.stringify(resendData))

    if (!resendResponse.ok) {
      console.error(`[send-email] RESEND ERROR (${resendResponse.status}):`, JSON.stringify(resendData))
      return new Response(
        JSON.stringify({ error: 'Email send failed', details: resendData }),
        { status: resendResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[send-email] SUCCESS — ${payload.type} email to ${payload.to} — Resend ID: ${resendData.id}`)

    return new Response(
      JSON.stringify({ success: true, id: resendData.id, subject }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[send-email] UNEXPECTED ERROR:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
