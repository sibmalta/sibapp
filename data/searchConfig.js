/**
 * Smart search configuration for Sib marketplace.
 *
 * Provides:
 *  - Curated suggestion map: brand/keyword → common item types
 *  - Intent parsing: multi-word query → { brand, category, subcategory, itemType, query }
 *  - Garment / item type aliases for fuzzy matching
 */

import { CATEGORY_TREE, ALL_SUBCATEGORIES } from './categories'
import CANONICAL_BRANDS from '../lib/brands'

/* ── Curated suggestion map ─────────────────────────────────
 * When a user types a known keyword, we expand it into the most
 * common buyer-intent combinations. Each entry maps to an array of
 * { label, category?, subcategory?, brand?, query? } objects.
 */

const CURATED_SUGGESTIONS = {
  // ── Fashion brands ─────────────────────────────────────────
  nike: [
    { label: 'Nike tops',        category: 'fashion', subcategory: 'tops',      brand: 'Nike', query: 'tops' },
    { label: 'Nike trainers',    category: 'fashion', subcategory: 'shoes',     brand: 'Nike', query: 'trainers' },
    { label: 'Nike jacket',      category: 'fashion', subcategory: 'coats',     brand: 'Nike', query: 'jacket' },
    { label: 'Nike windbreaker', category: 'fashion', subcategory: 'coats',     brand: 'Nike', query: 'windbreaker' },
    { label: 'Nike shorts',      category: 'fashion', subcategory: 'shorts',    brand: 'Nike', query: 'shorts' },
    { label: 'Nike hoodie',      category: 'fashion', subcategory: 'hoodies',   brand: 'Nike', query: 'hoodie' },
  ],
  adidas: [
    { label: 'Adidas trainers',      category: 'fashion', subcategory: 'shoes',    brand: 'Adidas', query: 'trainers' },
    { label: 'Adidas football boots', category: 'sports',  subcategory: 'football', brand: 'Adidas', query: 'football boots' },
    { label: 'Adidas hoodie',        category: 'fashion', subcategory: 'hoodies',  brand: 'Adidas', query: 'hoodie' },
    { label: 'Adidas jacket',        category: 'fashion', subcategory: 'coats',    brand: 'Adidas', query: 'jacket' },
    { label: 'Adidas shorts',        category: 'fashion', subcategory: 'shorts',   brand: 'Adidas', query: 'shorts' },
  ],
  puma: [
    { label: 'Puma trainers',   category: 'fashion', subcategory: 'shoes',    brand: 'Puma', query: 'trainers' },
    { label: 'Puma tops',       category: 'fashion', subcategory: 'tops',     brand: 'Puma', query: 'tops' },
    { label: 'Puma shorts',     category: 'fashion', subcategory: 'shorts',   brand: 'Puma', query: 'shorts' },
  ],
  zara: [
    { label: 'Zara dresses',    category: 'fashion', subcategory: 'dresses',  brand: 'Zara', query: 'dresses' },
    { label: 'Zara tops',       category: 'fashion', subcategory: 'tops',     brand: 'Zara', query: 'tops' },
    { label: 'Zara jeans',      category: 'fashion', subcategory: 'jeans',    brand: 'Zara', query: 'jeans' },
    { label: 'Zara jacket',     category: 'fashion', subcategory: 'coats',    brand: 'Zara', query: 'jacket' },
    { label: 'Zara bags',       category: 'fashion', subcategory: 'bags',     brand: 'Zara', query: 'bags' },
  ],
  'h&m': [
    { label: 'H&M dresses',     category: 'fashion', subcategory: 'dresses',  brand: 'H&M', query: 'dresses' },
    { label: 'H&M tops',        category: 'fashion', subcategory: 'tops',     brand: 'H&M', query: 'tops' },
    { label: 'H&M jeans',       category: 'fashion', subcategory: 'jeans',    brand: 'H&M', query: 'jeans' },
    { label: 'H&M kids',        category: 'kids',    brand: 'H&M', query: 'kids' },
  ],
  'ralph lauren': [
    { label: 'Ralph Lauren polo shirt', category: 'fashion', subcategory: 'tops',   brand: 'Ralph Lauren', query: 'polo' },
    { label: 'Ralph Lauren shirt',      category: 'fashion', subcategory: 'shirts', brand: 'Ralph Lauren', query: 'shirt' },
    { label: 'Ralph Lauren jacket',     category: 'fashion', subcategory: 'coats',  brand: 'Ralph Lauren', query: 'jacket' },
  ],
  'tommy hilfiger': [
    { label: 'Tommy Hilfiger tops',    category: 'fashion', subcategory: 'tops',    brand: 'Tommy Hilfiger', query: 'tops' },
    { label: 'Tommy Hilfiger jacket',  category: 'fashion', subcategory: 'coats',   brand: 'Tommy Hilfiger', query: 'jacket' },
    { label: 'Tommy Hilfiger jeans',   category: 'fashion', subcategory: 'jeans',   brand: 'Tommy Hilfiger', query: 'jeans' },
  ],
  gucci: [
    { label: 'Gucci bag',       category: 'fashion', subcategory: 'bags',       brand: 'Gucci', query: 'bag' },
    { label: 'Gucci shoes',     category: 'fashion', subcategory: 'shoes',      brand: 'Gucci', query: 'shoes' },
    { label: 'Gucci belt',      category: 'fashion', subcategory: 'belts',      brand: 'Gucci', query: 'belt' },
    { label: 'Gucci sunglasses', category: 'fashion', subcategory: 'sunglasses', brand: 'Gucci', query: 'sunglasses' },
  ],

  // ── Activity / sport keywords ──────────────────────────────
  golf: [
    { label: 'Golf clubs',       category: 'sports', query: 'golf clubs' },
    { label: 'Golf balls',       category: 'sports', query: 'golf balls' },
    { label: 'Golf shoes',       category: 'sports', query: 'golf shoes' },
    { label: 'Golf polo shirts', category: 'fashion', subcategory: 'tops', query: 'golf polo' },
    { label: 'Golf trousers',    category: 'fashion', subcategory: 'trousers', query: 'golf trousers' },
  ],
  football: [
    { label: 'Football boots',    category: 'sports', subcategory: 'football', query: 'football boots' },
    { label: 'Football shirts',   category: 'sports', subcategory: 'football', query: 'football shirt' },
    { label: 'Football shorts',   category: 'sports', subcategory: 'football', query: 'football shorts' },
    { label: 'Shin pads',         category: 'sports', subcategory: 'football', query: 'shin pads' },
    { label: 'Football',          category: 'sports', subcategory: 'football', query: 'football' },
  ],
  tennis: [
    { label: 'Tennis racket',    category: 'sports', subcategory: 'tennis', query: 'tennis racket' },
    { label: 'Tennis shoes',     category: 'sports', subcategory: 'tennis', query: 'tennis shoes' },
    { label: 'Tennis balls',     category: 'sports', subcategory: 'tennis', query: 'tennis balls' },
  ],
  cycling: [
    { label: 'Bicycle',          category: 'sports', subcategory: 'cycling', query: 'bicycle' },
    { label: 'Cycling helmet',   category: 'sports', subcategory: 'cycling', query: 'cycling helmet' },
    { label: 'Cycling jersey',   category: 'sports', subcategory: 'cycling', query: 'cycling jersey' },
  ],
  gym: [
    { label: 'Gym equipment',    category: 'sports', subcategory: 'gym_fitness', query: 'gym equipment' },
    { label: 'Gym wear',         category: 'fashion', subcategory: 'activewear', query: 'gym' },
    { label: 'Dumbbells',        category: 'sports', subcategory: 'gym_fitness', query: 'dumbbells' },
  ],

  // ── Electronics brands / keywords ──────────────────────────
  apple: [
    { label: 'Apple iPhone',    category: 'electronics', subcategory: 'phones',     brand: 'Apple', query: 'iphone' },
    { label: 'Apple iPad',      category: 'electronics', subcategory: 'tablets',    brand: 'Apple', query: 'ipad' },
    { label: 'Apple AirPods',   category: 'electronics', subcategory: 'audio',      brand: 'Apple', query: 'airpods' },
    { label: 'Apple Watch',     category: 'electronics', subcategory: 'wearables',  brand: 'Apple', query: 'apple watch' },
    { label: 'Apple MacBook',   category: 'electronics', subcategory: 'laptops',    brand: 'Apple', query: 'macbook' },
  ],
  iphone: [
    { label: 'iPhone',          category: 'electronics', subcategory: 'phones',     brand: 'Apple', query: 'iphone' },
    { label: 'iPhone case',     category: 'electronics', query: 'iphone case' },
    { label: 'iPhone charger',  category: 'electronics', query: 'iphone charger' },
  ],
  ipad: [
    { label: 'iPad',            category: 'electronics', subcategory: 'tablets',    brand: 'Apple', query: 'ipad' },
    { label: 'iPad case',       category: 'electronics', query: 'ipad case' },
  ],
  samsung: [
    { label: 'Samsung phone',   category: 'electronics', subcategory: 'phones',     brand: 'Samsung', query: 'samsung phone' },
    { label: 'Samsung tablet',  category: 'electronics', subcategory: 'tablets',    brand: 'Samsung', query: 'samsung tablet' },
    { label: 'Samsung TV',      category: 'electronics', subcategory: 'tv',         brand: 'Samsung', query: 'samsung tv' },
  ],
  playstation: [
    { label: 'PlayStation 5',   category: 'electronics', subcategory: 'gaming', query: 'ps5' },
    { label: 'PlayStation 4',   category: 'electronics', subcategory: 'gaming', query: 'ps4' },
    { label: 'PS5 controller',  category: 'electronics', subcategory: 'gaming', query: 'ps5 controller' },
    { label: 'PS5 games',       category: 'electronics', subcategory: 'gaming', query: 'ps5 games' },
  ],
  xbox: [
    { label: 'Xbox Series X',   category: 'electronics', subcategory: 'gaming', query: 'xbox series x' },
    { label: 'Xbox controller', category: 'electronics', subcategory: 'gaming', query: 'xbox controller' },
    { label: 'Xbox games',      category: 'electronics', subcategory: 'gaming', query: 'xbox games' },
  ],
  nintendo: [
    { label: 'Nintendo Switch', category: 'electronics', subcategory: 'gaming', query: 'nintendo switch' },
    { label: 'Switch games',    category: 'electronics', subcategory: 'gaming', query: 'switch games' },
  ],

  // ── Toys ───────────────────────────────────────────────────
  lego: [
    { label: 'LEGO sets',       category: 'toys', subcategory: 'lego', query: 'lego set' },
    { label: 'LEGO bundles',    category: 'toys', subcategory: 'lego', query: 'lego bundle' },
    { label: 'LEGO figures',    category: 'toys', subcategory: 'lego', query: 'lego figures' },
  ],

  // ── Home / Furniture ───────────────────────────────────────
  sofa: [
    { label: 'Sofa',             category: 'furniture', subcategory: 'sofas', query: 'sofa' },
    { label: 'Corner sofa',      category: 'furniture', subcategory: 'sofas', query: 'corner sofa' },
    { label: 'Sofa bed',         category: 'furniture', subcategory: 'sofas', query: 'sofa bed' },
  ],
  desk: [
    { label: 'Desk',             category: 'furniture', subcategory: 'tables', query: 'desk' },
    { label: 'Office desk',      category: 'furniture', subcategory: 'office_furniture', query: 'office desk' },
    { label: 'Standing desk',    category: 'furniture', subcategory: 'office_furniture', query: 'standing desk' },
  ],

  // ── Kids ───────────────────────────────────────────────────
  pushchair: [
    { label: 'Pushchair',        category: 'kids', subcategory: 'pushchairs', query: 'pushchair' },
    { label: 'Pram',             category: 'kids', subcategory: 'pushchairs', query: 'pram' },
  ],
}

/* ── Garment / item type → subcategory mapping ──────────────
 * Maps common buyer search terms to their most likely category + subcategory.
 * Used for intent parsing when a brand + item type combo is typed.
 */
const ITEM_TYPE_MAP = {
  // Fashion garments
  top:          { category: 'fashion', subcategory: 'tops' },
  tops:         { category: 'fashion', subcategory: 'tops' },
  'tee':        { category: 'fashion', subcategory: 'tops' },
  'tees':       { category: 'fashion', subcategory: 'tops' },
  't-shirt':    { category: 'fashion', subcategory: 'tops' },
  'tshirt':     { category: 'fashion', subcategory: 'tops' },
  't shirt':    { category: 'fashion', subcategory: 'tops' },
  polo:         { category: 'fashion', subcategory: 'tops' },
  'polo shirt': { category: 'fashion', subcategory: 'tops' },
  shirt:        { category: 'fashion', subcategory: 'shirts' },
  shirts:       { category: 'fashion', subcategory: 'shirts' },
  blouse:       { category: 'fashion', subcategory: 'shirts' },
  hoodie:       { category: 'fashion', subcategory: 'hoodies' },
  hoodies:      { category: 'fashion', subcategory: 'hoodies' },
  sweatshirt:   { category: 'fashion', subcategory: 'hoodies' },
  jacket:       { category: 'fashion', subcategory: 'coats' },
  jackets:      { category: 'fashion', subcategory: 'coats' },
  coat:         { category: 'fashion', subcategory: 'coats' },
  coats:        { category: 'fashion', subcategory: 'coats' },
  windbreaker:  { category: 'fashion', subcategory: 'coats' },
  jeans:        { category: 'fashion', subcategory: 'jeans' },
  trousers:     { category: 'fashion', subcategory: 'trousers' },
  pants:        { category: 'fashion', subcategory: 'trousers' },
  shorts:       { category: 'fashion', subcategory: 'shorts' },
  dress:        { category: 'fashion', subcategory: 'dresses' },
  dresses:      { category: 'fashion', subcategory: 'dresses' },
  skirt:        { category: 'fashion', subcategory: 'skirts' },
  skirts:       { category: 'fashion', subcategory: 'skirts' },
  trainers:     { category: 'fashion', subcategory: 'shoes' },
  sneakers:     { category: 'fashion', subcategory: 'shoes' },
  shoes:        { category: 'fashion', subcategory: 'shoes' },
  boots:        { category: 'fashion', subcategory: 'shoes' },
  heels:        { category: 'fashion', subcategory: 'shoes' },
  sandals:      { category: 'fashion', subcategory: 'shoes' },
  bag:          { category: 'fashion', subcategory: 'bags' },
  bags:         { category: 'fashion', subcategory: 'bags' },
  handbag:      { category: 'fashion', subcategory: 'bags' },
  purse:        { category: 'fashion', subcategory: 'bags' },
  backpack:     { category: 'fashion', subcategory: 'bags' },
  watch:        { category: 'fashion', subcategory: 'watches' },
  watches:      { category: 'fashion', subcategory: 'watches' },
  sunglasses:   { category: 'fashion', subcategory: 'sunglasses' },
  belt:         { category: 'fashion', subcategory: 'belts' },
  belts:        { category: 'fashion', subcategory: 'belts' },
  hat:          { category: 'fashion', subcategory: 'hats' },
  cap:          { category: 'fashion', subcategory: 'hats' },
  scarf:        { category: 'fashion', subcategory: 'scarves' },
  swimwear:     { category: 'fashion', subcategory: 'swimwear' },
  bikini:       { category: 'fashion', subcategory: 'swimwear' },
  suit:         { category: 'fashion', subcategory: 'suits' },
  activewear:   { category: 'fashion', subcategory: 'activewear' },

  // Electronics
  phone:        { category: 'electronics', subcategory: 'phones' },
  phones:       { category: 'electronics', subcategory: 'phones' },
  smartphone:   { category: 'electronics', subcategory: 'phones' },
  tablet:       { category: 'electronics', subcategory: 'tablets' },
  laptop:       { category: 'electronics', subcategory: 'laptops' },
  laptops:      { category: 'electronics', subcategory: 'laptops' },
  monitor:      { category: 'electronics', subcategory: 'monitors' },
  headphones:   { category: 'electronics', subcategory: 'audio' },
  earbuds:      { category: 'electronics', subcategory: 'audio' },
  speaker:      { category: 'electronics', subcategory: 'audio' },
  camera:       { category: 'electronics', subcategory: 'cameras' },
  tv:           { category: 'electronics', subcategory: 'tv' },
  television:   { category: 'electronics', subcategory: 'tv' },
  console:      { category: 'electronics', subcategory: 'gaming' },

  // Sports
  'football boots': { category: 'sports', subcategory: 'football' },
  bicycle:     { category: 'sports', subcategory: 'cycling' },
  bike:        { category: 'sports', subcategory: 'cycling' },
  racket:      { category: 'sports', subcategory: 'tennis' },
  dumbbells:   { category: 'sports', subcategory: 'gym_fitness' },
  weights:     { category: 'sports', subcategory: 'gym_fitness' },
  treadmill:   { category: 'sports', subcategory: 'gym_fitness' },
}

/* ── Brand alias lookup (fast lowercase → canonical) ────── */
const BRAND_LOOKUP = {}
for (const [alias, canonical] of Object.entries(CANONICAL_BRANDS)) {
  BRAND_LOOKUP[alias] = canonical
}

/**
 * Resolve a string to a canonical brand name, or null if not a brand.
 */
function resolveBrand(text) {
  if (!text) return null
  return BRAND_LOOKUP[text.toLowerCase()] || null
}

/**
 * Parse a multi-word query into structured search intent.
 *
 * Examples:
 *  "nike jacket"   → { brand: 'Nike', category: 'fashion', subcategory: 'coats', query: 'jacket' }
 *  "golf clubs"    → { category: 'sports', query: 'golf clubs' }
 *  "apple ipad"    → { brand: 'Apple', category: 'electronics', subcategory: 'tablets', query: 'ipad' }
 *  "blue dress"    → { category: 'fashion', subcategory: 'dresses', query: 'blue dress' }
 *
 * @param {string} raw - The raw search query
 * @returns {{ brand: string|null, category: string|null, subcategory: string|null, query: string }}
 */
export function parseSearchIntent(raw) {
  if (!raw || typeof raw !== 'string') return { brand: null, category: null, subcategory: null, query: raw || '' }
  const trimmed = raw.trim()
  const lower = trimmed.toLowerCase()
  const words = lower.split(/\s+/)

  let brand = null
  let category = null
  let subcategory = null
  let remainingQuery = trimmed

  // Try to match multi-word brand first (e.g. "ralph lauren", "tommy hilfiger")
  for (let len = Math.min(words.length - 1, 4); len >= 1; len--) {
    const brandCandidate = words.slice(0, len).join(' ')
    const resolved = resolveBrand(brandCandidate)
    if (resolved) {
      brand = resolved
      remainingQuery = words.slice(len).join(' ')
      break
    }
  }

  // If no brand found from start, try the last word(s) as brand
  if (!brand && words.length >= 2) {
    for (let len = Math.min(words.length - 1, 3); len >= 1; len--) {
      const brandCandidate = words.slice(-len).join(' ')
      const resolved = resolveBrand(brandCandidate)
      if (resolved) {
        brand = resolved
        remainingQuery = words.slice(0, words.length - len).join(' ')
        break
      }
    }
  }

  // Try to match item type from remaining query
  const rLower = remainingQuery.toLowerCase().trim()
  if (rLower && ITEM_TYPE_MAP[rLower]) {
    const mapping = ITEM_TYPE_MAP[rLower]
    category = mapping.category
    subcategory = mapping.subcategory
  }

  // If no item type match, check multi-word item types
  if (!category && rLower) {
    const rWords = rLower.split(/\s+/)
    // Try progressively shorter suffix matches
    for (let start = 0; start < rWords.length; start++) {
      const candidate = rWords.slice(start).join(' ')
      if (ITEM_TYPE_MAP[candidate]) {
        const mapping = ITEM_TYPE_MAP[candidate]
        category = mapping.category
        subcategory = mapping.subcategory
        break
      }
    }
  }

  return {
    brand,
    category,
    subcategory,
    query: remainingQuery || trimmed,
  }
}

/**
 * Generate smart autocomplete suggestions for a query.
 *
 * Priority order:
 *  1. Curated suggestions (exact or prefix match on known keywords)
 *  2. Brand + item type combos (dynamically generated)
 *  3. Category / subcategory matches
 *  4. Listing title matches
 *
 * Each suggestion is: { type, label, category?, subcategory?, brand?, query?, id?, price?, image? }
 *
 * @param {string} query - The current search input
 * @param {Array} listings - Active listings for title/product matching
 * @param {number} maxResults - Maximum number of suggestions to return
 * @returns {Array} Suggestion objects
 */
export function generateSuggestions(query, listings = [], maxResults = 8) {
  if (!query || query.trim().length < 2) return []

  const q = query.toLowerCase().trim()
  const results = []
  const seenLabels = new Set()

  const addIfNew = (suggestion) => {
    const key = suggestion.label.toLowerCase()
    if (seenLabels.has(key)) return false
    if (results.length >= maxResults) return false
    seenLabels.add(key)
    results.push(suggestion)
    return true
  }

  // 1. Curated suggestions — exact key match or prefix
  for (const [key, suggestions] of Object.entries(CURATED_SUGGESTIONS)) {
    // Exact match: show all curated for this keyword
    if (q === key || q === key.replace(/&/g, 'and')) {
      for (const s of suggestions) {
        addIfNew({ type: 'smart', ...s })
      }
    }
    // Prefix match on the curated key
    else if (key.startsWith(q) || key.replace(/&/g, 'and').startsWith(q)) {
      // The user is typing toward this keyword — suggest the keyword itself first
      const brandName = resolveBrand(key)
      if (brandName) {
        addIfNew({ type: 'smart', label: brandName, brand: brandName, query: '' })
      } else {
        // Non-brand keyword (like "golf", "football")
        const firstSuggestion = suggestions[0]
        if (firstSuggestion) {
          addIfNew({ type: 'smart', label: key.charAt(0).toUpperCase() + key.slice(1), category: firstSuggestion.category, query: key })
        }
      }
    }
  }

  // Also match when user types "brand + partial item" e.g. "nike ja" → "Nike jacket"
  if (results.length < maxResults) {
    for (const [key, suggestions] of Object.entries(CURATED_SUGGESTIONS)) {
      for (const s of suggestions) {
        if (s.label.toLowerCase().startsWith(q) || s.label.toLowerCase().includes(q)) {
          addIfNew({ type: 'smart', ...s })
        }
      }
    }
  }

  // 2. Dynamic brand + item type suggestions
  //    If user typed a brand (possibly partial), suggest brand + common item types
  if (results.length < maxResults) {
    const intent = parseSearchIntent(q)
    if (intent.brand && !CURATED_SUGGESTIONS[intent.brand.toLowerCase()]) {
      // Brand found but no curated map — generate dynamic suggestions
      const commonItems = ['tops', 'shoes', 'jacket', 'bag', 'jeans']
      for (const item of commonItems) {
        const mapping = ITEM_TYPE_MAP[item]
        if (mapping) {
          addIfNew({
            type: 'smart',
            label: `${intent.brand} ${item}`,
            brand: intent.brand,
            category: mapping.category,
            subcategory: mapping.subcategory,
            query: item,
          })
        }
      }
    }
  }

  // 3. Category / subcategory matches
  if (results.length < maxResults) {
    for (const cat of CATEGORY_TREE) {
      if (cat.label.toLowerCase().includes(q) || cat.id.includes(q)) {
        addIfNew({ type: 'category', label: cat.label, category: cat.id, query: '' })
      }
    }
    for (const sub of ALL_SUBCATEGORIES) {
      if (sub.label.toLowerCase().includes(q) || sub.id.includes(q)) {
        addIfNew({
          type: 'subcategory',
          label: sub.label,
          category: sub.categoryId,
          subcategory: sub.id,
          query: '',
        })
      }
    }
  }

  // 4. Listing title matches (limited, for product discovery)
  if (results.length < maxResults) {
    const activeListings = listings.filter(l => l.status === 'active')
    const titleMatches = activeListings
      .filter(l => l.title.toLowerCase().includes(q))
      .slice(0, Math.min(4, maxResults - results.length))
    for (const l of titleMatches) {
      addIfNew({
        type: 'item',
        label: l.title,
        id: l.id,
        price: l.price,
        image: l.images?.[0],
      })
    }
  }

  return results
}

export { CURATED_SUGGESTIONS, ITEM_TYPE_MAP }
