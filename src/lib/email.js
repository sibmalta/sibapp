// Email sender via Edge Function.
// Every email is logged locally in localStorage for the admin email log.

const EMAIL_LOG_KEY = 'sib_emailLogs'
const MAX_LOG_ENTRIES = 500

function getEmailLogs() {
  try {
    const raw = localStorage.getItem(EMAIL_LOG_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function appendEmailLog(entry) {
  try {
    const logs = getEmailLogs()
    logs.unshift(entry)
    if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES
    localStorage.setItem(EMAIL_LOG_KEY, JSON.stringify(logs))
  } catch {}
}

export { getEmailLogs }

async function sendEmail(type, to, data) {
  // Read env vars at call time (not module load) to ensure they're available
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  console.log(`[email] sendEmail called — type=${type}, to=${to}`)
  console.log(`[email] SUPABASE_URL present: ${!!supabaseUrl}, ANON_KEY present: ${!!supabaseAnonKey}`)

  if (!supabaseUrl || !supabaseAnonKey) {
    const msg = `Supabase not configured (URL: ${!!supabaseUrl}, KEY: ${!!supabaseAnonKey})`
    console.error(`[email] ${msg} — skipping email`)
    appendEmailLog({
      id: `el_${Date.now()}`,
      type,
      to,
      status: 'skipped',
      subject: `(${type})`,
      error: msg,
      createdAt: new Date().toISOString(),
    })
    return { ok: false, error: msg }
  }

  const endpoint = `${supabaseUrl}/functions/v1/send-email`
  const body = JSON.stringify({ type, to, data })

  console.log(`[email] Calling Edge Function: POST ${endpoint}`)
  console.log(`[email] Payload: ${body}`)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body,
    })

    console.log(`[email] Edge Function response status: ${res.status}`)

    // Clone before reading so we can fallback to .text() if JSON parse fails
    const resClone = res.clone()
    let json
    try {
      json = await res.json()
    } catch (_parseErr) {
      const text = await resClone.text().catch(() => '(unreadable)')
      console.error(`[email] Non-JSON response (${res.status}): ${text.slice(0, 500)}`)
      appendEmailLog({
        id: `el_${Date.now()}`,
        type,
        to,
        status: 'failed',
        subject: `(${type})`,
        error: `Non-JSON response (${res.status}): ${text.slice(0, 200)}`,
        createdAt: new Date().toISOString(),
      })
      return { ok: false, error: `Non-JSON response (${res.status})` }
    }

    console.log(`[email] Edge Function response body:`, JSON.stringify(json))

    if (res.ok) {
      console.log(`[email] SUCCESS — ${type} sent to ${to}, Resend ID: ${json.id}`)
      appendEmailLog({
        id: json.id || `el_${Date.now()}`,
        type,
        to,
        status: 'sent',
        subject: json.subject || `(${type})`,
        createdAt: new Date().toISOString(),
      })
      return { ok: true, id: json.id }
    } else {
      console.error(`[email] FAILED — ${type} to ${to}: ${res.status}`, json.error || json)
      appendEmailLog({
        id: `el_${Date.now()}`,
        type,
        to,
        status: 'failed',
        subject: `(${type})`,
        error: json.error || `HTTP ${res.status}`,
        details: json.details || null,
        createdAt: new Date().toISOString(),
      })
      return { ok: false, error: json.error || 'Email send failed' }
    }
  } catch (err) {
    console.error(`[email] NETWORK ERROR sending ${type} to ${to}:`, err)
    appendEmailLog({
      id: `el_${Date.now()}`,
      type,
      to,
      status: 'failed',
      subject: `(${type})`,
      error: `Network error: ${err.message}`,
      createdAt: new Date().toISOString(),
    })
    return { ok: false, error: err.message }
  }
}

// ── AUTH EMAILS (handled by Supabase GoTrue, NOT this module) ──
// The following auth emails are sent automatically by Supabase's
// built-in mailer (configured via Custom SMTP in the Supabase dashboard):
//   - Email verification / confirmation on signup
//   - Password reset link
//   - Magic link (if enabled)
// Do NOT add auth email functions here. Configure Supabase SMTP
// settings (e.g. Resend SMTP) in the Supabase dashboard under
// Authentication > SMTP Settings to brand those emails.

// ── BUYER EMAILS (sent via Resend edge function) ────────

export function sendOrderConfirmedEmail(buyerEmail, buyerName, orderRef, itemTitle, totalPrice, deliveryMethod) {
  sendEmail('order_confirmed', buyerEmail, { buyerName, orderRef, itemTitle, totalPrice, deliveryMethod })
}

export function sendPaymentConfirmedEmail(buyerEmail, buyerName, orderRef, totalPrice) {
  sendEmail('payment_confirmed', buyerEmail, { buyerName, orderRef, totalPrice })
}

export function sendItemShippedEmail(buyerEmail, buyerName, itemTitle, orderRef, sellerName) {
  sendEmail('item_shipped', buyerEmail, { buyerName, itemTitle, orderRef, sellerName })
}

export function sendItemDeliveredEmail(buyerEmail, buyerName, itemTitle, orderRef) {
  sendEmail('item_delivered', buyerEmail, { buyerName, itemTitle, orderRef })
}

export function sendRefundConfirmedEmail(buyerEmail, buyerName, orderRef, refundAmount, itemTitle) {
  sendEmail('refund_confirmed', buyerEmail, { buyerName, orderRef, refundAmount, itemTitle })
}

export function sendDisputeOpenedEmail(buyerEmail, buyerName, orderRef, reason) {
  sendEmail('dispute_opened', buyerEmail, { buyerName, orderRef, reason })
}

// ── SELLER EMAILS ────────────────────────────────────────

export function sendItemSoldEmail(sellerEmail, sellerName, itemTitle, orderRef, salePrice, buyerName) {
  sendEmail('item_sold', sellerEmail, { sellerName, itemTitle, orderRef, salePrice, buyerName })
}

export function sendShippingReminderEmail(sellerEmail, sellerName, itemTitle, orderRef, daysSinceOrder) {
  sendEmail('shipping_reminder', sellerEmail, { sellerName, itemTitle, orderRef, daysSinceOrder })
}

export function sendPayoutReleasedEmail(sellerEmail, sellerName, orderRef, payoutAmount, itemTitle) {
  sendEmail('payout_released', sellerEmail, { sellerName, orderRef, payoutAmount, itemTitle })
}

// ── OFFER EMAILS ─────────────────────────────────────────

export function sendOfferReceivedEmail(sellerEmail, itemTitle, offerPrice, buyerName) {
  sendEmail('offer_received', sellerEmail, { itemTitle, offerPrice, buyerName })
}

export function sendOfferAcceptedEmail(buyerEmail, itemTitle, acceptedPrice, sellerName) {
  sendEmail('offer_accepted', buyerEmail, { itemTitle, acceptedPrice, sellerName })
}

// ── TRUST & SAFETY EMAILS ────────────────────────────────

export function sendSuspiciousActivityEmail(userEmail, userName) {
  sendEmail('suspicious_activity', userEmail, { userName })
}

export function sendModerationNoticeEmail(userEmail, userName, action, reason, details) {
  sendEmail('moderation_notice', userEmail, { userName, action, reason, details })
}
