/**
 * Lightweight browsing-history tracker stored in localStorage.
 * Keeps the last N search queries, viewed listing IDs, and
 * interacted categories / filters so the homepage can surface
 * personalised recommendations without a backend round-trip.
 */

const STORAGE_KEY = 'sib_browse_history'

const LIMITS = {
  searches: 5,
  viewedIds: 10,
  categories: 5,
  brands: 5,
  genders: 3,
}

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function write(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* quota full — silently ignore */ }
}

/** Push a value to the front of an array, deduplicate, and cap at `limit`. */
function pushRecent(arr = [], value, limit) {
  if (!value) return arr
  const cleaned = typeof value === 'string' ? value.trim().toLowerCase() : value
  if (!cleaned) return arr
  const next = [cleaned, ...arr.filter(v => v !== cleaned)]
  return next.slice(0, limit)
}

// ── Public API ────────────────────────────────────────────────

export function trackSearch(query) {
  if (!query || !query.trim()) return
  const d = read()
  d.searches = pushRecent(d.searches, query, LIMITS.searches)
  d.lastActivity = Date.now()
  write(d)
}

export function trackView(listing) {
  if (!listing?.id) return
  const d = read()
  d.viewedIds = pushRecent(d.viewedIds, listing.id, LIMITS.viewedIds)
  if (listing.category) {
    d.categories = pushRecent(d.categories, listing.category, LIMITS.categories)
  }
  if (listing.brand) {
    d.brands = pushRecent(d.brands, listing.brand, LIMITS.brands)
  }
  if (listing.gender) {
    d.genders = pushRecent(d.genders, listing.gender, LIMITS.genders)
  }
  d.lastActivity = Date.now()
  write(d)
}

export function trackCategory(category) {
  if (!category || category === 'all') return
  const d = read()
  d.categories = pushRecent(d.categories, category, LIMITS.categories)
  d.lastActivity = Date.now()
  write(d)
}

export function trackFilter({ category, gender, brand } = {}) {
  const d = read()
  if (category && category !== 'all') d.categories = pushRecent(d.categories, category, LIMITS.categories)
  if (brand) d.brands = pushRecent(d.brands, brand, LIMITS.brands)
  if (gender) d.genders = pushRecent(d.genders, gender, LIMITS.genders)
  d.lastActivity = Date.now()
  write(d)
}

export function getHistory() {
  const d = read()
  return {
    searches: d.searches || [],
    viewedIds: d.viewedIds || [],
    categories: d.categories || [],
    brands: d.brands || [],
    genders: d.genders || [],
    lastActivity: d.lastActivity || 0,
  }
}

/** True when there is enough signal to personalise. */
export function hasActivity() {
  const h = getHistory()
  return h.searches.length > 0 || h.viewedIds.length > 0 || h.categories.length > 0
}

export function clearHistory() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* noop */ }
}
