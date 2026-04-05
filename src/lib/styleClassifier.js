/**
 * Automatic style classification using **weighted scoring**.
 *
 * Scoring weights:
 *   - Brand match (listing.brand matches a rule brand)         → BRAND_WEIGHT  (5)
 *   - Category match (listing.category matches a rule)         → CAT_WEIGHT    (5)
 *   - Subcategory match (listing.subcategory matches a rule)   → SUBCAT_WEIGHT (4)
 *   - Keyword found in title                                   → TITLE_WEIGHT  (4)
 *   - Keyword found in brand field                             → BRAND_KW_WEIGHT (3)
 *   - Keyword found in description                             → DESC_WEIGHT   (1)
 *
 * A listing can match multiple styles (score >= threshold for each).
 * If no niche style passes threshold, "basics" (Everyday) is assigned as fallback.
 *
 * Admin override: if listing.manualStyleTags is a non-empty array,
 * those are returned directly (bypassing auto-classification).
 */

const TITLE_WEIGHT    = 4
const DESC_WEIGHT     = 1
const BRAND_KW_WEIGHT = 3
const BRAND_WEIGHT    = 5
const CAT_WEIGHT      = 5
const SUBCAT_WEIGHT   = 4
const DEFAULT_THRESHOLD = 5

const STYLE_RULES = [
  {
    id: 'vintage',
    label: 'Vintage',
    emoji: '🕰️',
    threshold: 4,
    categories: ['vintage'],
    subcategories: ['vintage', 'retro'],
    brands: [],
    keywords: [
      'vintage', 'retro', '90s', '80s', '70s', '60s', '50s',
      'thrift', 'antique', 'old school', 'preloved', 'pre-loved',
      'deadstock', 'second hand', 'throwback', 'heritage',
      'mid-century', 'archive', 'rare find', 'collector',
    ],
  },
  {
    id: 'streetwear',
    label: 'Streetwear',
    emoji: '🛹',
    threshold: 5,
    categories: [],
    subcategories: ['streetwear', 'urban'],
    brands: [
      'nike', 'adidas', 'jordan', 'supreme', 'stussy', 'stüssy',
      'off-white', 'bape', 'a bathing ape', 'palace', 'carhartt',
      'carhartt wip', 'new balance', 'puma', 'converse', 'vans',
      'the north face', 'tnf', 'dickies', 'huf', 'obey',
      'champion', 'new era', 'kith', 'fog', 'fear of god', 'essentials',
    ],
    keywords: [
      'streetwear', 'hoodie', 'sneaker', 'sneakers', 'graphic tee',
      'oversized', 'cargo', 'tracksuit', 'track pants', 'windbreaker',
      'bomber jacket', 'bucket hat', 'skate', 'hypebeast', 'hype',
      'drop', 'collab', 'limited edition', 'dunks', 'air max',
      'air force', 'yeezy',
    ],
  },
  {
    id: 'designer',
    label: 'Designer',
    emoji: '✨',
    threshold: 5,
    categories: [],
    subcategories: ['designer', 'luxury'],
    brands: [
      'gucci', 'prada', 'louis vuitton', 'lv', 'chanel', 'dior',
      'balenciaga', 'burberry', 'versace', 'fendi', 'valentino',
      'givenchy', 'saint laurent', 'ysl', 'bottega veneta', 'bottega',
      'hermes', 'hermès', 'celine', 'céline', 'loewe', 'moncler',
      'armani', 'emporio armani', 'giorgio armani', 'dolce & gabbana',
      'dolce', 'tom ford', 'alexander mcqueen', 'mcqueen',
      'jimmy choo', 'salvatore ferragamo', 'ferragamo',
      'ralph lauren', 'calvin klein', 'ck', 'tommy hilfiger',
      'hugo boss', 'boss', 'michael kors', 'marc jacobs',
      'kate spade', 'coach', 'tory burch', 'moschino',
      'vivienne westwood', 'isabel marant', 'acne studios',
      'stone island', 'cp company',
    ],
    keywords: [
      'designer', 'luxury', 'authentic', 'high-end', 'couture',
      'made in italy', 'made in france', 'runway', 'monogram',
      'logo', 'dust bag', 'serial number', 'certificate',
    ],
  },
  {
    id: 'minimal',
    label: 'Minimal',
    emoji: '🤍',
    threshold: 5,
    categories: [],
    subcategories: ['minimalist', 'basics'],
    brands: [
      'cos', 'uniqlo', 'muji', 'arket', 'massimo dutti',
      'everlane', 'the row', 'totême', 'toteme', 'jil sander',
      'lemaire', 'apc', 'a.p.c.', 'theory', 'vince',
      'club monaco', 'reiss', 'allsaints', 'filippa k',
      'norse projects', 'our legacy',
    ],
    keywords: [
      'minimal', 'minimalist', 'clean', 'neutral', 'monochrome',
      'capsule', 'simple', 'plain', 'linen', 'white shirt',
      'black dress', 'tailored', 'structured', 'scandinavian',
      'muted', 'tonal', 'understated', 'quiet luxury', 'effortless',
      'timeless',
    ],
  },
  {
    id: 'y2k',
    label: 'Y2K',
    emoji: '💿',
    threshold: 4,
    categories: [],
    subcategories: ['y2k', '2000s'],
    brands: [
      'juicy couture', 'juicy', 'von dutch', 'ed hardy',
      'baby phat', 'rocawear', 'ecko', 'south pole',
      'miss sixty', 'fornarina',
    ],
    keywords: [
      'y2k', '2000s', 'early 2000s', '00s', 'low rise', 'low-rise',
      'butterfly', 'rhinestone', 'bedazzled', 'halter', 'crop top',
      'mini skirt', 'baby tee', 'velour', 'platform', 'metallic',
      'holographic', 'cyber', 'bling', 'paris hilton', 'glitter',
      'sequin', 'tube top', 'mesh', 'bandana', 'belly chain',
      'chunky', 'frosted',
    ],
  },
  {
    id: 'sporty',
    label: 'Sporty',
    emoji: '🏃',
    threshold: 5,
    categories: [],
    subcategories: ['activewear', 'sportswear', 'athleisure', 'gym'],
    brands: [
      'under armour', 'reebok', 'lululemon', 'gymshark',
      'asics', 'fila', 'ellesse', 'kappa', 'umbro',
      'salomon', 'hoka', 'on running', 'new balance',
      'nike', 'adidas', 'puma',
    ],
    keywords: [
      'sports', 'sporty', 'athletic', 'gym', 'workout', 'running',
      'yoga', 'fitness', 'training', 'activewear', 'athleisure',
      'dri-fit', 'dry-fit', 'compression', 'cycling', 'tennis',
      'swim', 'football', 'jersey', 'leggings', 'sports bra',
      'running shoes', 'trainers', 'performance', 'matching set',
      'gym set', 'joggers',
    ],
  },
  {
    id: 'boho',
    label: 'Boho',
    emoji: '🌻',
    threshold: 4,
    categories: [],
    subcategories: ['boho', 'bohemian', 'festival'],
    brands: [
      'free people', 'freepeople', 'anthropologie',
      'spell', 'spell & the gypsy', 'tigerlily',
      'zimmermann', 'faithfull the brand', 'realisation par',
    ],
    keywords: [
      'boho', 'bohemian', 'crochet', 'floral', 'maxi dress',
      'flow', 'flowy', 'hippie', 'gypsy', 'peasant',
      'embroidered', 'fringe', 'tassel', 'macrame', 'macramé',
      'earthy', 'patchwork', 'festival', 'tie-dye', 'tie dye',
      'kaftan', 'kimono', 'wrap dress', 'prairie',
    ],
  },
  {
    id: 'basics',
    label: 'Everyday',
    emoji: '👕',
    threshold: 4,
    categories: [],
    subcategories: [],
    brands: [
      'h&m', 'primark', 'next', 'gap', 'old navy',
      'pull&bear', 'pull and bear', 'bershka', 'new look',
      'river island', 'topshop', 'topman', 'asos', 'boohoo',
      'shein', 'stradivarius', 'mango', 'reserved', 'only',
      'jack & jones', 'selected', 'pieces', 'zara',
    ],
    keywords: [
      'basic', 'basics', 'everyday', 'casual', 'cotton',
      't-shirt', 'tshirt', 'jeans', 'sweater', 'jumper',
      'sweatshirt', 'shorts', 'polo', 'daily', 'comfy',
      'relaxed fit', 'staple', 'wardrobe essential',
      'classic fit', 'regular fit', 'easy wear',
    ],
  },
]

/* ── helpers ─────────────────────────────────────────────── */
function norm(s) { return (s || '').toLowerCase().trim() }

/**
 * Classify a listing into style categories using weighted scoring.
 * @param {object} listing - { title, description, brand, category, subcategory, manualStyleTags? }
 * @returns {string[]} Array of matching style IDs (can be multiple)
 */
export function classifyListing(listing) {
  // Admin override
  if (Array.isArray(listing.manualStyleTags) && listing.manualStyleTags.length > 0) {
    return listing.manualStyleTags
  }

  const title  = norm(listing.title)
  const desc   = norm(listing.description)
  const brand  = norm(listing.brand)
  const cat    = norm(listing.category)
  const subcat = norm(listing.subcategory)

  const matched = []

  for (const rule of STYLE_RULES) {
    let score = 0
    const t = rule.threshold ?? DEFAULT_THRESHOLD

    // Category match
    if (cat && rule.categories.length > 0 && rule.categories.includes(cat)) {
      score += CAT_WEIGHT
    }

    // Subcategory match
    if (subcat && rule.subcategories.length > 0 && rule.subcategories.includes(subcat)) {
      score += SUBCAT_WEIGHT
    }

    // Brand match
    if (brand && rule.brands.length > 0) {
      for (const b of rule.brands) {
        if (brand === b || brand.includes(b)) { score += BRAND_WEIGHT; break }
      }
    }

    // Keyword matching — weighted by where the keyword appears
    for (const kw of rule.keywords) {
      if (title.includes(kw)) {
        score += TITLE_WEIGHT
      } else if (brand.includes(kw)) {
        score += BRAND_KW_WEIGHT
      } else if (desc.includes(kw)) {
        score += DESC_WEIGHT
      }
      // early exit when score is already well above threshold
      if (score >= t + 12) break
    }

    if (score >= t) matched.push(rule.id)
  }

  // Fallback: no niche style matched → assign "basics" (Everyday)
  if (matched.length === 0) matched.push('basics')

  return matched
}

/**
 * Score a single listing against a single style (for admin debug view).
 */
export function scoreListing(listing, styleId) {
  const rule = STYLE_RULES.find(r => r.id === styleId)
  if (!rule) return 0
  const title  = norm(listing.title)
  const desc   = norm(listing.description)
  const brand  = norm(listing.brand)
  const cat    = norm(listing.category)
  const subcat = norm(listing.subcategory)

  let score = 0
  if (cat && rule.categories.includes(cat)) score += CAT_WEIGHT
  if (subcat && rule.subcategories.includes(subcat)) score += SUBCAT_WEIGHT
  if (brand && rule.brands.length > 0) {
    for (const b of rule.brands) {
      if (brand === b || brand.includes(b)) { score += BRAND_WEIGHT; break }
    }
  }
  for (const kw of rule.keywords) {
    if (title.includes(kw)) score += TITLE_WEIGHT
    else if (brand.includes(kw)) score += BRAND_KW_WEIGHT
    else if (desc.includes(kw)) score += DESC_WEIGHT
  }
  return score
}

/**
 * Given a full listing array, return a map: { styleId → [listing, ...] }
 * Each listing appears under every style it matches.
 */
export function groupListingsByStyle(listings) {
  const groups = {}
  for (const rule of STYLE_RULES) {
    groups[rule.id] = []
  }
  for (const listing of listings) {
    const styles = classifyListing(listing)
    for (const sid of styles) {
      if (groups[sid]) groups[sid].push(listing)
    }
  }
  return groups
}

/**
 * Count how many active listings match each style.
 * Returns STYLE_RULES enriched with `count`.
 */
export function getStylesWithCounts(listings) {
  const groups = groupListingsByStyle(listings)
  return STYLE_RULES.map(rule => ({
    ...rule,
    count: groups[rule.id]?.length || 0,
  }))
}

/**
 * Get the label for a given style ID.
 */
export function getStyleLabel(styleId) {
  const rule = STYLE_RULES.find(r => r.id === styleId)
  return rule ? rule.label : styleId
}

/**
 * Auto-tag a listing: returns the listing object with `style_tags` added.
 * Used when creating or updating a listing.
 */
export function autoTagListing(listing) {
  const tags = classifyListing(listing)
  return { ...listing, style_tags: tags }
}

/**
 * Backfill styleTags for an array of listings that don't have them yet.
 * Works on camelCase listings (post-rowToListing) — checks both styleTags and style_tags.
 */
export function backfillStyleTags(listings) {
  return listings.map(l => {
    const existing = (Array.isArray(l.styleTags) && l.styleTags.length > 0) ? l.styleTags
      : (Array.isArray(l.style_tags) && l.style_tags.length > 0) ? l.style_tags
      : null
    if (existing) return l
    const tags = classifyListing(l)
    return { ...l, styleTags: tags, style_tags: tags }
  })
}

export { STYLE_RULES }
