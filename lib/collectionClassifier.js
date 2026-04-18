/**
 * Collection Classifier — auto-tags listings for homepage discovery.
 *
 * This is a SEPARATE layer from the style classifier (styleClassifier.js).
 * Style tags drive "Shop by Style" search/filtering.
 * Collection tags drive homepage collection tiles for browsing discovery.
 *
 * Collection IDs map 1:1 with homepage tile IDs.
 * A listing can match multiple collections. Not every listing needs one.
 *
 * Scoring uses the same weighted approach as the style classifier:
 *   - Brand match       → 5
 *   - Category match    → 5
 *   - Subcategory match → 4
 *   - Keyword in title  → 4
 *   - Keyword in brand  → 3
 *   - Keyword in desc   → 1
 *   - Color match       → 2
 */

import { classifyListing } from './styleClassifier'

const TITLE_W  = 4
const DESC_W   = 1
const BRAND_KW = 3
const BRAND_W  = 5
const CAT_W    = 5
const SUBCAT_W = 4
const COLOR_W  = 2

/**
 * All valid collection IDs — used for filtering and tile display.
 * The first 8 overlap with style classifier IDs.
 * The last 3 are Malta-relevant lifestyle collections.
 */
export const COLLECTION_IDS = [
  'vintage', 'streetwear', 'y2k', 'designer',
  'minimal', 'basics', 'sporty', 'boho',
  'beachwear', 'going-out', 'loungewear',
]

/**
 * Style IDs that map directly to collection IDs.
 * When the style classifier tags a listing with one of these,
 * it automatically qualifies for the same collection.
 */
const STYLE_PASSTHROUGH = [
  'vintage', 'streetwear', 'y2k', 'designer',
  'minimal', 'basics', 'sporty', 'boho',
]

/**
 * Rules for the 3 new Malta-relevant collections.
 * These have their own keyword/brand/color scoring.
 */
const NEW_COLLECTION_RULES = [
  {
    id: 'beachwear',
    threshold: 4,
    categories: [],
    subcategories: ['swimwear', 'beachwear', 'beach'],
    brands: [
      'seafolly', 'billabong', 'rip curl', 'roxy', 'quiksilver',
      'o\'neill', 'oneill', 'calzedonia', 'tezenis', 'hunza g',
      'frankies bikinis', 'triangl', 'aerie', 'vitamin a',
      'solid & striped', 'onia', 'vilebrequin',
    ],
    keywords: [
      'bikini', 'swimsuit', 'swim', 'swimwear', 'beach', 'beachwear',
      'sarong', 'cover-up', 'coverup', 'cover up', 'board shorts',
      'swim trunks', 'trunks', 'one-piece', 'one piece', 'tankini',
      'flip flop', 'flip-flop', 'sandal', 'sandals', 'espadrille',
      'straw hat', 'sun hat', 'sunhat', 'raffia', 'beach bag',
      'kaftan', 'resort', 'resort wear', 'resortwear',
      'pool', 'poolside', 'summer dress', 'linen shorts',
      'waterproof', 'surf', 'snorkel', 'wetsuit',
    ],
    colors: [],
  },
  {
    id: 'going-out',
    threshold: 4,
    categories: [],
    subcategories: ['evening', 'party', 'cocktail', 'formal', 'occasion'],
    brands: [
      'reformation', 'self-portrait', 'needle & thread',
      'revolve', 'house of cb', 'oh polly', 'pretty little thing',
      'plt', 'meshki', 'beginning boutique', 'windsor',
    ],
    keywords: [
      'going out', 'party', 'club', 'clubbing', 'night out', 'nightout',
      'cocktail', 'evening', 'formal', 'prom', 'gala', 'wedding guest',
      'occasion', 'special occasion',
      'sequin', 'sequins', 'glitter', 'sparkle', 'sparkly',
      'satin', 'silk', 'velvet', 'lace',
      'bodycon', 'mini dress', 'slip dress', 'maxi dress',
      'heels', 'stiletto', 'stilettos', 'clutch', 'clutch bag',
      'statement', 'statement piece', 'bold',
      'blazer dress', 'corset', 'corset top',
      'cut-out', 'cutout', 'backless', 'halterneck', 'halter',
      'one shoulder', 'strapless', 'plunge',
    ],
    colors: [],
  },
  {
    id: 'loungewear',
    threshold: 4,
    categories: [],
    subcategories: ['loungewear', 'sleepwear', 'nightwear', 'pyjamas', 'pajamas'],
    brands: [
      'skims', 'entireworld', 'pangaia', 'girlfriend collective',
      'outdoor voices', 'lunya', 'eberjey', 'pour les femmes',
      'sleeper', 'desmond & dempsey',
    ],
    keywords: [
      'loungewear', 'lounge', 'lounge wear', 'lounge set',
      'pajama', 'pajamas', 'pyjama', 'pyjamas', 'pjs',
      'robe', 'dressing gown', 'bathrobe',
      'slippers', 'house shoes',
      'sweatpants', 'sweat pants', 'joggers', 'track pants',
      'hoodie', 'oversized hoodie', 'pullover',
      'matching set', 'co-ord', 'coord', 'cozy', 'cosy',
      'fleece', 'sherpa', 'teddy', 'velour',
      'sleep', 'sleepwear', 'nightwear', 'nightgown',
      'comfort', 'comfortable', 'relaxed', 'soft',
      'cashmere', 'knit set', 'knitted',
      'work from home', 'wfh', 'stay home',
    ],
    colors: [],
  },
]

/* ── helpers ─────────────────────────────────────────────── */
function norm(s) { return (s || '').toLowerCase().trim() }

/**
 * Score a listing against a single collection rule.
 */
function scoreRule(listing, rule) {
  const title  = norm(listing.title)
  const desc   = norm(listing.description)
  const brand  = norm(listing.brand)
  const cat    = norm(listing.category)
  const subcat = norm(listing.subcategory)
  const itemColors = Array.isArray(listing.colors) ? listing.colors.map(c => c.toLowerCase()) : (listing.color ? [listing.color.toLowerCase()] : [])

  let score = 0

  if (cat && rule.categories.length > 0 && rule.categories.includes(cat)) {
    score += CAT_W
  }
  if (subcat && rule.subcategories.length > 0 && rule.subcategories.includes(subcat)) {
    score += SUBCAT_W
  }
  if (brand && rule.brands.length > 0) {
    for (const b of rule.brands) {
      if (brand === b || brand.includes(b)) { score += BRAND_W; break }
    }
  }
  for (const kw of rule.keywords) {
    if (title.includes(kw)) score += TITLE_W
    else if (brand.includes(kw)) score += BRAND_KW
    else if (desc.includes(kw)) score += DESC_W
    if (score >= rule.threshold + 12) break
  }
  if (rule.colors && rule.colors.length > 0) {
    for (const c of rule.colors) {
      if (itemColors.includes(c)) { score += COLOR_W; break }
    }
  }
  return score
}

/**
 * Classify a listing into homepage collection tags.
 *
 * 1. Runs the style classifier — any matching style that is also a collection ID
 *    is included as a collection tag.
 * 2. Runs the 3 new collection rules (beachwear, goingout, loungewear).
 * 3. Removes the "basics" fallback — not every listing needs a collection tag.
 *
 * @param {object} listing
 * @returns {string[]} Array of collection IDs
 */
export function classifyCollection(listing) {
  // Manual override — if listing.manualCollectionTags exists, use those
  if (Array.isArray(listing.manualCollectionTags) && listing.manualCollectionTags.length > 0) {
    return listing.manualCollectionTags
  }

  const collections = new Set()

  // 1. Pass through style tags that are also collection IDs
  const styleTags = Array.isArray(listing.manualStyleTags) && listing.manualStyleTags.length > 0
    ? listing.manualStyleTags
    : (Array.isArray(listing.styleTags) && listing.styleTags.length > 0
      ? listing.styleTags
      : classifyListing(listing))

  for (const st of styleTags) {
    if (STYLE_PASSTHROUGH.includes(st)) {
      collections.add(st)
    }
  }

  // 2. Score against new collection-specific rules
  for (const rule of NEW_COLLECTION_RULES) {
    const s = scoreRule(listing, rule)
    if (s >= rule.threshold) {
      collections.add(rule.id)
    }
  }

  // 3. Remove "basics" if it's the ONLY tag — keep it only if other collections also match
  //    This ensures only clearly relevant items appear in homepage tiles
  const result = [...collections]
  if (result.length === 1 && result[0] === 'basics') {
    return [] // don't surface generic items in homepage collections
  }
  return result
}

/**
 * Backfill collection_tags for an array of listings.
 */
export function backfillCollectionTags(listings) {
  return listings.map(l => {
    const existing = Array.isArray(l.collectionTags) && l.collectionTags.length > 0
      ? l.collectionTags
      : (Array.isArray(l.collection_tags) && l.collection_tags.length > 0
        ? l.collection_tags
        : null)
    if (existing) return l
    const tags = classifyCollection(l)
    return { ...l, collectionTags: tags, collection_tags: tags }
  })
}

/**
 * Get the label for a collection ID.
 */
const COLLECTION_LABELS = {
  vintage: 'Vintage',
  streetwear: 'Streetwear',
  y2k: '00s',
  designer: 'Designer',
  minimal: 'Minimal',
  basics: 'Everyday',
  sporty: 'Sport',
  boho: 'Boho',
  beachwear: 'Beachwear',
  'going-out': 'Going Out',
  loungewear: 'Loungewear',
}

export function getCollectionLabel(id) {
  return COLLECTION_LABELS[id] || id
}

export { NEW_COLLECTION_RULES }
