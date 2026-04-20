// Email sender via Edge Function.
// Every email is also logged locally in localStorage for the admin email log.

const EMAIL_LOG_KEY = 'sib_emailLogs'
const MAX_LOG_ENTRIES = 500

function getEmailLogs() {
  try {
    const raw = localStorage.getItem(EMAIL_LOG_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function appendEmailLog(entry) {
  try {
    const logs = getEmailLogs()
    logs.unshift(entry)
    if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES
    localStorage.setItem(EMAIL_LOG_KEY, JSON.stringify(logs))
  } catch {}
}

function normalizeEmailOptions(options = {}) {
  const meta = options.meta || {}
  return {
    meta,
    related_entity_type: options.related_entity_type || meta.related_entity_type || meta.relatedEntityType || null,
    related_entity_id: options.related_entity_id || meta.related_entity_id || meta.relatedEntityId || null,
  }
}

function buildLocalLogEntry(type, to, status, payload, extra = {}) {
  const now = new Date().toISOString()
  return {
    id: extra.id || `el_${Date.now()}`,
    email_type: type,
    recipient: to,
    status,
    resend_id: extra.resendId || null,
    subject: extra.subject || `(${type})`,
    error_message: extra.errorMessage || null,
    related_entity_type: extra.related_entity_type || null,
    related_entity_id: extra.related_entity_id || null,
    payload,
    sent_at: extra.sentAt || now,
    created_at: extra.createdAt || now,
    details: extra.details || null,
  }
}

export { getEmailLogs }

async function sendEmail(type, to, data, meta = {}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const options = normalizeEmailOptions(meta)
  const payload = {
    data: data || {},
    meta: options.meta,
  }

  console.log(`[email] sendEmail called - type=${type}, to=${to}`)
  console.log(`[email] SUPABASE_URL present: ${!!supabaseUrl}, ANON_KEY present: ${!!supabaseAnonKey}`)

  if (!supabaseUrl || !supabaseAnonKey) {
    const msg = `Supabase not configured (URL: ${!!supabaseUrl}, KEY: ${!!supabaseAnonKey})`
    console.error(`[email] ${msg} - skipping email`)
    appendEmailLog(buildLocalLogEntry(type, to, 'failed', payload, {
      errorMessage: msg,
      related_entity_type: options.related_entity_type,
      related_entity_id: options.related_entity_id,
    }))
    return { ok: false, error: msg }
  }

  const endpoint = `${supabaseUrl}/functions/v1/send-email`
  const body = JSON.stringify({
    type,
    to,
    data,
    meta: options.meta,
    related_entity_type: options.related_entity_type,
    related_entity_id: options.related_entity_id,
  })

  console.log(`[email] Calling Edge Function: POST ${endpoint}`)
  console.log(`[email] Payload: ${body}`)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body,
    })

    console.log(`[email] Edge Function response status: ${res.status}`)

    const resClone = res.clone()
    let json
    try {
      json = await res.json()
    } catch (_parseErr) {
      const text = await resClone.text().catch(() => '(unreadable)')
      console.error(`[email] Non-JSON response (${res.status}): ${text.slice(0, 500)}`)
      appendEmailLog(buildLocalLogEntry(type, to, 'failed', payload, {
        errorMessage: `Non-JSON response (${res.status}): ${text.slice(0, 200)}`,
        related_entity_type: options.related_entity_type,
        related_entity_id: options.related_entity_id,
      }))
      return { ok: false, error: `Non-JSON response (${res.status})` }
    }

    console.log('[email] Edge Function response body:', JSON.stringify(json))

    if (res.ok) {
      console.log(`[email] SUCCESS - ${type} sent to ${to}, Resend ID: ${json.id}`)
      appendEmailLog(buildLocalLogEntry(type, to, 'success', payload, {
        id: json.id || `el_${Date.now()}`,
        resendId: json.id || null,
        subject: json.subject || `(${type})`,
        related_entity_type: options.related_entity_type,
        related_entity_id: options.related_entity_id,
      }))
      return { ok: true, id: json.id }
    }

    console.error(`[email] FAILED - ${type} to ${to}: ${res.status}`, json.error || json)
    appendEmailLog(buildLocalLogEntry(type, to, 'failed', payload, {
      errorMessage: json.error || `HTTP ${res.status}`,
      details: json.details || null,
      related_entity_type: options.related_entity_type,
      related_entity_id: options.related_entity_id,
    }))
    return { ok: false, error: json.error || 'Email send failed' }
  } catch (err) {
    console.error(`[email] NETWORK ERROR sending ${type} to ${to}:`, err)
    appendEmailLog(buildLocalLogEntry(type, to, 'failed', payload, {
      errorMessage: `Network error: ${err.message}`,
      related_entity_type: options.related_entity_type,
      related_entity_id: options.related_entity_id,
    }))
    return { ok: false, error: err.message }
  }
}

// AUTH EMAILS (verification, password reset, magic link) are handled by
// Supabase GoTrue's built-in mailer via Custom SMTP, not this module.

export function sendOrderConfirmedEmail(buyerEmail, buyerName, orderRef, itemTitle, totalPrice, deliveryMethod, meta = {}) {
  sendEmail('order_confirmed', buyerEmail, { buyerName, orderRef, itemTitle, totalPrice, deliveryMethod }, meta)
}

export function sendPaymentConfirmedEmail(buyerEmail, buyerName, orderRef, totalPrice, meta = {}) {
  sendEmail('payment_confirmed', buyerEmail, { buyerName, orderRef, totalPrice }, meta)
}

export function sendItemShippedEmail(buyerEmail, buyerName, itemTitle, orderRef, sellerName, meta = {}) {
  sendEmail('item_shipped', buyerEmail, { buyerName, itemTitle, orderRef, sellerName }, meta)
}

export function sendItemDeliveredEmail(buyerEmail, buyerName, itemTitle, orderRef, meta = {}) {
  sendEmail('item_delivered', buyerEmail, { buyerName, itemTitle, orderRef }, meta)
}

export function sendRefundConfirmedEmail(buyerEmail, buyerName, orderRef, refundAmount, itemTitle, meta = {}) {
  sendEmail('refund_confirmed', buyerEmail, { buyerName, orderRef, refundAmount, itemTitle }, meta)
}

export function sendDisputeOpenedEmail(recipientEmail, recipientName, orderRef, reason, role = 'buyer', meta = {}) {
  sendEmail('dispute_opened', recipientEmail, {
    recipientName,
    buyerName: recipientName,
    orderRef,
    reason,
    role,
  }, meta)
}

export function sendItemSoldEmail(sellerEmail, sellerName, itemTitle, orderRef, salePrice, buyerName, meta = {}) {
  sendEmail('item_sold', sellerEmail, { sellerName, itemTitle, orderRef, salePrice, buyerName }, meta)
}

export function sendShippingReminderEmail(sellerEmail, sellerName, itemTitle, orderRef, daysSinceOrder, meta = {}) {
  sendEmail('shipping_reminder', sellerEmail, { sellerName, itemTitle, orderRef, daysSinceOrder }, meta)
}

export function sendPayoutReleasedEmail(sellerEmail, sellerName, orderRef, payoutAmount, itemTitle, meta = {}) {
  sendEmail('payout_released', sellerEmail, { sellerName, orderRef, payoutAmount, itemTitle }, meta)
}

export function sendOfferReceivedEmail(sellerEmail, itemTitle, offerPrice, buyerName, meta = {}) {
  sendEmail('offer_received', sellerEmail, { itemTitle, offerPrice, buyerName }, meta)
}

export function sendOfferAcceptedEmail(buyerEmail, itemTitle, acceptedPrice, sellerName, meta = {}) {
  sendEmail('offer_accepted', buyerEmail, { itemTitle, acceptedPrice, sellerName }, meta)
}

export function sendOfferDeclinedEmail(buyerEmail, itemTitle, declinedPrice, sellerName, meta = {}) {
  sendEmail('offer_declined', buyerEmail, { itemTitle, declinedPrice, sellerName }, meta)
}

export function sendOfferCounteredEmail(buyerEmail, itemTitle, originalPrice, counterPrice, sellerName, meta = {}) {
  sendEmail('offer_countered', buyerEmail, { itemTitle, originalPrice, counterPrice, sellerName }, meta)
}

export function sendOrderCancelledEmail(buyerEmail, buyerName, orderRef, itemTitle, refundAmount, meta = {}) {
  sendEmail('order_cancelled', buyerEmail, { buyerName, orderRef, itemTitle, refundAmount }, meta)
}

export function sendOrderCancelledSellerEmail(sellerEmail, sellerName, orderRef, itemTitle, meta = {}) {
  sendEmail('order_cancelled_seller', sellerEmail, { sellerName, orderRef, itemTitle }, meta)
}

export function sendDisputeResolvedEmail(userEmail, userName, orderRef, resolution, meta = {}) {
  sendEmail('dispute_resolved', userEmail, { userName, orderRef, resolution }, meta)
}

export function sendDisputeMessageEmail(userEmail, userName, orderRef, messagePreview, meta = {}) {
  sendEmail('dispute_message', userEmail, { userName, orderRef, messagePreview }, meta)
}

export function sendBundleOfferReceivedEmail(sellerEmail, itemCount, offerPrice, originalTotal, buyerName, meta = {}) {
  sendEmail('bundle_offer_received', sellerEmail, { itemCount, offerPrice, originalTotal, buyerName }, meta)
}

export function sendBundleOfferAcceptedEmail(buyerEmail, itemCount, acceptedPrice, sellerName, meta = {}) {
  sendEmail('bundle_offer_accepted', buyerEmail, { itemCount, acceptedPrice, sellerName }, meta)
}

export function sendBundleOfferDeclinedEmail(buyerEmail, itemCount, declinedPrice, sellerName, meta = {}) {
  sendEmail('bundle_offer_declined', buyerEmail, { itemCount, declinedPrice, sellerName }, meta)
}

export function sendBundleOfferCounteredEmail(buyerEmail, itemCount, originalPrice, counterPrice, sellerName, meta = {}) {
  sendEmail('bundle_offer_countered', buyerEmail, { itemCount, originalPrice, counterPrice, sellerName }, meta)
}

export function sendSuspiciousActivityEmail(userEmail, userName, message, meta = {}) {
  sendEmail('suspicious_activity', userEmail, { userName, message }, meta)
}

export function sendModerationNoticeEmail(userEmail, userName, action, reason, details, meta = {}) {
  sendEmail('moderation_notice', userEmail, { userName, action, reason, details }, meta)
}
