/**
 * Automatic style classification using keyword matching against listing title,
 * description, and brand. Returns an array of matched style IDs (a listing can
 * belong to more than one style).
 */

const STYLE_RULES = [
  {
    id: 'vintage',
    label: 'Vintage',
    emoji: '🕰️',
    keywords: [
      'vintage', 'retro', '90s', '80s', '70s', '60s', 'thrift', 'antique',
      'classic', 'old school', 'preloved', 'pre-loved', 'deadstock',
      'second hand', 'throwback',
    ],
  },
  {
    id: 'streetwear',
    label: 'Streetwear',
    emoji: '🛹',
    keywords: [
      'streetwear', 'hoodie', 'nike', 'adidas', 'jordan', 'supreme',
      'stussy', 'off-white', 'bape', 'palace', 'carhartt', 'new balance',
      'puma', 'converse', 'vans', 'skate', 'sneaker', 'sneakers',
      'graphic tee', 'oversized', 'cargo', 'tracksuit', 'track pants',
      'windbreaker', 'bomber jacket',
    ],
  },
  {
    id: 'designer',
    label: 'Designer',
    emoji: '✨',
    keywords: [
      'designer', 'gucci', 'prada', 'louis vuitton', 'chanel', 'dior',
      'balenciaga', 'burberry', 'versace', 'fendi', 'valentino',
      'givenchy', 'saint laurent', 'ysl', 'bottega', 'hermes', 'hermès',
      'celine', 'céline', 'loewe', 'moncler', 'armani', 'dolce',
      'tom ford', 'luxury', 'authentic',
    ],
  },
  {
    id: 'minimal',
    label: 'Minimal',
    emoji: '🤍',
    keywords: [
      'minimal', 'minimalist', 'zara', 'cos', 'uniqlo', 'muji',
      'clean', 'neutral', 'monochrome', 'capsule', 'simple', 'plain',
      'linen', 'cotton', 'basic tee', 'white shirt', 'black dress',
      'tailored', 'structured', 'scandinavian', 'arket',
    ],
  },
  {
    id: 'y2k',
    label: 'Y2K',
    emoji: '💿',
    keywords: [
      'y2k', '2000s', 'early 2000s', 'low rise', 'low-rise', 'butterfly',
      'rhinestone', 'bedazzled', 'halter', 'crop top', 'mini skirt',
      'baby tee', 'juicy', 'juicy couture', 'velour', 'platform',
      'metallic', 'holographic', 'cyber', 'bling', 'paris hilton',
      'von dutch',
    ],
  },
  {
    id: 'basics',
    label: 'Everyday',
    emoji: '👕',
    keywords: [
      'basic', 'basics', 'everyday', 'casual', 'h&m', 'primark',
      'next', 'gap', 'old navy', 'pull&bear', 'bershka',
      'new look', 'river island', 'topshop', 'cotton', 't-shirt',
      'jeans', 'leggings', 'sweater', 'jumper', 'sweatshirt',
      'shorts', 'polo', 'daily', 'comfy', 'relaxed fit',
    ],
  },
  {
    id: 'sporty',
    label: 'Sporty',
    emoji: '🏃',
    keywords: [
      'sports', 'sporty', 'athletic', 'gym', 'workout', 'running',
      'yoga', 'fitness', 'training', 'activewear', 'under armour',
      'reebok', 'lululemon', 'dri-fit', 'compression', 'cycling',
      'tennis', 'swim', 'football', 'jersey',
    ],
  },
  {
    id: 'boho',
    label: 'Boho',
    emoji: '🌻',
    keywords: [
      'boho', 'bohemian', 'free people', 'freepeople', 'crochet',
      'floral', 'maxi dress', 'flow', 'flowy', 'hippie', 'gypsy',
      'peasant', 'embroidered', 'fringe', 'tassel', 'macrame',
      'earthy', 'patchwork',
    ],
  },
]

/**
 * Classify a listing into style categories.
 * @param {object} listing - { title, description, brand }
 * @returns {string[]} Array of style IDs that match
 */
export function classifyListing(listing) {
  const text = [
    listing.title || '',
    listing.description || '',
    listing.brand || '',
  ].join(' ').toLowerCase()

  const matched = []
  for (const rule of STYLE_RULES) {
    for (const kw of rule.keywords) {
      if (text.includes(kw)) {
        matched.push(rule.id)
        break // one keyword match is enough for this style
      }
    }
  }
  return matched
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

export { STYLE_RULES }
