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

// ✅ FIXED FUNCTION (this was broken)
async function sendEmail(type, to, data, meta = {}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const options = normalizeEmailOptions(meta)

  const payload = {
    data: data || {},
    meta: options.meta,
  }

  console.log(`[email] sendEmail called - type=${type}, to=${to}`)

  if (!supabaseUrl || !supabaseAnonKey) {
    const msg = `Supabase not configured`
    console.error(`[email] ${msg}`)
    appendEmailLog(buildLocalLogEntry(type, to, 'failed', payload, {
      errorMessage: msg,
      related_entity_type: options.related_entity_type,
      related_entity_id: options.related_entity_id,
    }))
    return { ok: false, error: msg }
  }

  const endpoint = `${supabaseUrl}/functions/v1/send-email`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        type,
        to,
        data,
        meta: options.meta,
        related_entity_type: options.related_entity_type,
        related_entity_id: options.related_entity_id,
      }),
    })

    const json = await res.json()

    if (res.ok) {
      appendEmailLog(buildLocalLogEntry(type, to, 'success', payload))
      return { ok: true, id: json.id }
    }

    appendEmailLog(buildLocalLogEntry(type, to, 'failed', payload, {
      errorMessage: json.error || 'Email failed',
    }))

    return { ok: false, error: json.error }
  } catch (err) {
    appendEmailLog(buildLocalLogEntry(type, to, 'failed', payload, {
      errorMessage: err.message,
    }))
    return { ok: false, error: err.message }
  }
}

// ✅ ALL FUNCTIONS NOW CORRECT

export function sendOrderConfirmedEmail(...args) {
  return sendEmail('order_confirmed', ...args)
}

export function sendPaymentConfirmedEmail(...args) {
  return sendEmail('payment_confirmed', ...args)
}

export function sendItemShippedEmail(...args) {
  return sendEmail('item_shipped', ...args)
}

export function sendItemDeliveredEmail(...args) {
  return sendEmail('item_delivered', ...args)
}

export function sendRefundConfirmedEmail(...args) {
  return sendEmail('refund_confirmed', ...args)
}

export function sendDisputeOpenedEmail(...args) {
  return sendEmail('dispute_opened', ...args)
}

export function sendItemSoldEmail(...args) {
  return sendEmail('item_sold', ...args)
}

export function sendShippingReminderEmail(...args) {
  return sendEmail('shipping_reminder', ...args)
}

export function sendPayoutReleasedEmail(...args) {
  return sendEmail('payout_released', ...args)
}

export function sendOfferReceivedEmail(...args) {
  return sendEmail('offer_received', ...args)
}

export function sendOfferAcceptedEmail(...args) {
  return sendEmail('offer_accepted', ...args)
}

export function sendOfferDeclinedEmail(...args) {
  return sendEmail('offer_declined', ...args)
}

export function sendOfferCounteredEmail(...args) {
  return sendEmail('offer_countered', ...args)
}

export function sendOrderCancelledEmail(...args) {
  return sendEmail('order_cancelled', ...args)
}

export function sendOrderCancelledSellerEmail(...args) {
  return sendEmail('order_cancelled_seller', ...args)
}

export function sendDisputeResolvedEmail(...args) {
  return sendEmail('dispute_resolved', ...args)
}

export function sendDisputeMessageEmail(...args) {
  return sendEmail('dispute_message', ...args)
}

export function sendBundleOfferReceivedEmail(...args) {
  return sendEmail('bundle_offer_received', ...args)
}

export function sendBundleOfferAcceptedEmail(...args) {
  return sendEmail('bundle_offer_accepted', ...args)
}

export function sendBundleOfferDeclinedEmail(...args) {
  return sendEmail('bundle_offer_declined', ...args)
}

export function sendBundleOfferCounteredEmail(...args) {
  return sendEmail('bundle_offer_countered', ...args)
}

export function sendSuspiciousActivityEmail(...args) {
  return sendEmail('suspicious_activity', ...args)
}

export function sendModerationNoticeEmail(...args) {
  return sendEmail('moderation_notice', ...args)
}