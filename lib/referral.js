/**
 * Referral & influencer link tracking.
 *
 * Shared links can include ?ref=username to attribute traffic and conversions.
 * Data is persisted to the `referral_clicks` Supabase table (fire-and-forget).
 * A sessionStorage key stores the active referral so it survives in-app navigation.
 */

const REF_SESSION_KEY = 'sib_referral'

/* ── Read / write the active referral in sessionStorage ────── */

export function getActiveReferral() {
  try {
    const raw = sessionStorage.getItem(REF_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setActiveReferral(referral) {
  try {
    if (referral) {
      sessionStorage.setItem(REF_SESSION_KEY, JSON.stringify(referral))
    } else {
      sessionStorage.removeItem(REF_SESSION_KEY)
    }
  } catch { /* silent */ }
}

export function clearActiveReferral() {
  try { sessionStorage.removeItem(REF_SESSION_KEY) } catch { /* silent */ }
}

/* ── Build a shareable link with optional ref ─────────────── */

export function buildShareableLink(listingId, referrerUsername) {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}item/${listingId}`
  if (referrerUsername) {
    return `${base}?ref=${encodeURIComponent(referrerUsername)}`
  }
  return base
}

/* ── Track a referral click (fire-and-forget) ─────────────── */

export async function trackReferralClick(supabaseClient, { listingId, referrerUsername, visitorId }) {
  if (!supabaseClient || !listingId || !referrerUsername) return null

  // Avoid duplicate clicks within the same session
  const ref = getActiveReferral()
  if (ref?.listingId === listingId && ref?.referrerUsername === referrerUsername && ref?.clickId) {
    return ref.clickId
  }

  try {
    const { data, error } = await supabaseClient
      .from('referral_clicks')
      .insert({
        listing_id: String(listingId),
        referrer_username: referrerUsername,
        visitor_id: visitorId || null,
        source: 'link',
      })
      .select('id')
      .single()

    if (error) {
      console.warn('[referral] click insert failed:', error.message)
      // Still store locally so the UI works even without the DB
      const localRef = { listingId, referrerUsername, clickId: null, ts: Date.now() }
      setActiveReferral(localRef)
      return null
    }

    const clickId = data?.id || null
    setActiveReferral({ listingId, referrerUsername, clickId, ts: Date.now() })
    return clickId
  } catch (err) {
    console.warn('[referral] unexpected error:', err)
    setActiveReferral({ listingId, referrerUsername, clickId: null, ts: Date.now() })
    return null
  }
}

/* ── Mark a referral click as converted (fire-and-forget) ── */

export async function trackReferralConversion(supabaseClient, { orderId }) {
  const ref = getActiveReferral()
  if (!ref || !supabaseClient) return

  try {
    if (ref.clickId) {
      // Update the specific click row
      const { error } = await supabaseClient
        .from('referral_clicks')
        .update({
          converted: true,
          order_id: orderId || null,
          converted_at: new Date().toISOString(),
        })
        .eq('id', ref.clickId)

      if (error) console.warn('[referral] conversion update failed:', error.message)
    } else {
      // No click ID (table wasn't available), insert a conversion record directly
      const { error } = await supabaseClient
        .from('referral_clicks')
        .insert({
          listing_id: String(ref.listingId),
          referrer_username: ref.referrerUsername,
          source: 'link',
          converted: true,
          order_id: orderId || null,
          converted_at: new Date().toISOString(),
        })

      if (error) console.warn('[referral] conversion insert failed:', error.message)
    }
  } catch (err) {
    console.warn('[referral] conversion tracking error:', err)
  }

  // Clear the referral once conversion is tracked
  clearActiveReferral()
}

/* ── Get referral stats for a user (for future dashboards) ── */

export async function getReferralStats(supabaseClient, referrerUsername) {
  if (!supabaseClient || !referrerUsername) return { clicks: 0, conversions: 0 }

  try {
    const { data: clicks, error: clickErr } = await supabaseClient
      .from('referral_clicks')
      .select('id, converted', { count: 'exact' })
      .eq('referrer_username', referrerUsername)

    if (clickErr) {
      console.warn('[referral] stats query failed:', clickErr.message)
      return { clicks: 0, conversions: 0 }
    }

    return {
      clicks: clicks?.length || 0,
      conversions: clicks?.filter(c => c.converted)?.length || 0,
    }
  } catch {
    return { clicks: 0, conversions: 0 }
  }
}
