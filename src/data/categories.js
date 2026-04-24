/**
 * Scalable category system for Sib marketplace.
 *
 * Each top-level category defines:
 *   - id / label / slug        — identity
 *   - icon                     — Lucide icon name for UI
 *   - subcategories            — array of { id, label } objects
 *   - attributes               — fields shown on SellPage for this category
 *   - filters                  — fields shown in Browse / FilterPanel
 *   - deliveryEligible         — whether MaltaPost shipping applies
 *
 * Subcategories are objects (not plain strings) so they can carry their own
 * metadata later (e.g. size charts, attribute overrides) without a migration.
 */

const CATEGORY_TREE = [
  {
    id: 'fashion',
    label: 'Fashion',
    slug: 'fashion',
    icon: 'shirt',
    deliveryEligible: true,
    subcategories: [
      { id: 'dresses', label: 'Dresses' },
      { id: 'tops', label: 'Tops & T-Shirts' },
      { id: 'shoes', label: 'Shoes' },
      { id: 'shirts', label: 'Shirts & Blouses' },
      { id: 'jeans', label: 'Jeans' },
      { id: 'trousers', label: 'Trousers' },
      { id: 'bags', label: 'Bags & Purses' },
      { id: 'coats', label: 'Coats & Jackets' },
      { id: 'hoodies', label: 'Hoodies & Sweatshirts' },
      { id: 'skirts', label: 'Skirts' },
      { id: 'shorts', label: 'Shorts' },
      { id: 'activewear', label: 'Activewear' },
      { id: 'swimwear', label: 'Swimwear' },
      { id: 'lingerie', label: 'Lingerie & Sleepwear' },
      { id: 'suits', label: 'Suits & Formalwear' },
      { id: 'jewellery', label: 'Jewellery' },
      { id: 'watches', label: 'Watches' },
      { id: 'sunglasses', label: 'Sunglasses' },
      { id: 'hats', label: 'Hats & Caps' },
      { id: 'scarves', label: 'Scarves & Wraps' },
      { id: 'belts', label: 'Belts' },
      { id: 'wallets', label: 'Wallets & Card Holders' },
      { id: 'vintage', label: 'Vintage' },
      { id: 'other_fashion', label: 'Other' },
    ],
    attributes: ['brand', 'size', 'shoe_size', 'colour', 'condition', 'gender', 'material'],
    filters: ['size', 'shoe_size', 'brand', 'condition', 'colour', 'price'],
  },
  {
    id: 'electronics',
    label: 'Electronics',
    slug: 'electronics',
    icon: 'smartphone',
    deliveryEligible: true,
    subcategories: [
      { id: 'phones', label: 'Phones & Smartphones' },
      { id: 'tablets', label: 'Tablets' },
      { id: 'laptops', label: 'Laptops' },
      { id: 'desktops', label: 'Desktop Computers' },
      { id: 'monitors', label: 'Monitors & Displays' },
      { id: 'gaming', label: 'Gaming & Consoles' },
      { id: 'cameras', label: 'Cameras & Photography' },
      { id: 'audio', label: 'Audio & Headphones' },
      { id: 'wearables', label: 'Wearables & Smartwatches' },
      { id: 'tv', label: 'TVs & Projectors' },
      { id: 'components', label: 'Components & Parts' },
      { id: 'other_electronics', label: 'Other' },
    ],
    attributes: ['brand', 'model', 'condition', 'power_info'],
    filters: ['brand', 'condition', 'price'],
  },
  {
    id: 'books',
    label: 'Books',
    slug: 'books',
    icon: 'book-open',
    deliveryEligible: true,
    subcategories: [
      { id: 'fiction', label: 'Fiction' },
      { id: 'non_fiction', label: 'Non-Fiction' },
      { id: 'textbooks', label: 'Textbooks & Education' },
      { id: 'children_books', label: "Children's Books" },
      { id: 'comics', label: 'Comics & Graphic Novels' },
      { id: 'cookbooks', label: 'Cookbooks' },
      { id: 'art_books', label: 'Art & Photography' },
      { id: 'other_books', label: 'Other' },
    ],
    attributes: ['author', 'isbn', 'condition', 'language', 'format'],
    filters: ['condition', 'price', 'language'],
  },
  {
    id: 'sports',
    label: 'Sports',
    slug: 'sporting-equipment',
    icon: 'dumbbell',
    deliveryEligible: true,
    subcategories: [
      { id: 'gym_fitness', label: 'Gym & Fitness' },
      { id: 'cycling', label: 'Cycling' },
      { id: 'water_sports', label: 'Water Sports' },
      { id: 'football', label: 'Football' },
      { id: 'racket_sports', label: 'Racket Sports' },
      { id: 'running', label: 'Running' },
      { id: 'outdoor_hiking', label: 'Outdoor & Hiking' },
      { id: 'team_sports', label: 'Team Sports' },
      { id: 'golf', label: 'Golf' },
      { id: 'combat_sports', label: 'Combat Sports' },
      { id: 'winter_sports', label: 'Winter Sports' },
      { id: 'other_sports', label: 'Other' },
    ],
    attributes: ['brand', 'condition', 'sport_detail'],
    filters: ['condition', 'price', 'brand', 'sport_filters'],
  },
  {
    id: 'home',
    label: 'Home & Living',
    slug: 'home-living',
    icon: 'lamp',
    deliveryEligible: true,
    subcategories: [
      { id: 'decor', label: 'Décor & Art' },
      { id: 'kitchenware', label: 'Kitchenware' },
      { id: 'bedding', label: 'Bedding & Linen' },
      { id: 'bathroom', label: 'Bathroom' },
      { id: 'lighting', label: 'Lighting' },
      { id: 'storage', label: 'Storage & Organisation' },
      { id: 'garden', label: 'Garden & Outdoor' },
      { id: 'appliances', label: 'Small Appliances' },
      { id: 'other_home', label: 'Other' },
    ],
    attributes: ['condition', 'material', 'dimensions'],
    filters: ['condition', 'price', 'material'],
  },
  {
    id: 'furniture',
    label: 'Furniture',
    slug: 'furniture',
    icon: 'armchair',
    deliveryEligible: false, // typically too large for standard MaltaPost
    subcategories: [
      { id: 'sofas', label: 'Sofas & Couches' },
      { id: 'tables', label: 'Tables & Desks' },
      { id: 'chairs', label: 'Chairs & Seating' },
      { id: 'beds', label: 'Beds & Mattresses' },
      { id: 'wardrobes', label: 'Wardrobes & Closets' },
      { id: 'shelving', label: 'Shelving & Bookcases' },
      { id: 'outdoor_furniture', label: 'Outdoor Furniture' },
      { id: 'office_furniture', label: 'Office Furniture' },
      { id: 'other_furniture', label: 'Other' },
    ],
    attributes: ['condition', 'material', 'dimensions', 'assembly_required'],
    filters: ['condition', 'price', 'material', 'delivery'],
  },
  {
    id: 'toys',
    label: 'Toys & Games',
    slug: 'toys-games',
    icon: 'puzzle',
    deliveryEligible: true,
    subcategories: [
      { id: 'action_figures', label: 'Action Figures & Dolls' },
      { id: 'board_games', label: 'Board Games & Puzzles' },
      { id: 'lego', label: 'LEGO & Building Sets' },
      { id: 'outdoor_toys', label: 'Outdoor Toys' },
      { id: 'educational', label: 'Educational Toys' },
      { id: 'rc_vehicles', label: 'RC & Vehicles' },
      { id: 'plush', label: 'Plush & Soft Toys' },
      { id: 'collectibles', label: 'Collectibles & Trading Cards' },
      { id: 'other_toys', label: 'Other' },
    ],
    attributes: ['brand', 'condition', 'age_group'],
    filters: ['condition', 'price', 'age_group'],
  },
  {
    id: 'kids',
    label: 'Kids & Baby',
    slug: 'kids-baby',
    icon: 'baby',
    deliveryEligible: true,
    subcategories: [
      { id: 'baby_clothing', label: 'Baby Clothing (0-2)' },
      { id: 'kids_clothing', label: 'Kids Clothing (3-14)' },
      { id: 'pushchairs', label: 'Pushchairs & Prams' },
      { id: 'car_seats', label: 'Car Seats' },
      { id: 'nursery', label: 'Nursery & Cots' },
      { id: 'feeding', label: 'Feeding & Highchairs' },
      { id: 'maternity', label: 'Maternity' },
      { id: 'other_kids', label: 'Other' },
    ],
    attributes: ['brand', 'kids_size', 'condition', 'age_group', 'kids_gender'],
    filters: ['condition', 'price', 'kids_size', 'age_group', 'kids_gender'],
  },
]

/* ── Derived helpers ─────────────────────────────────────────── */

/**
 * Flat list of all subcategories with a reference to their parent category.
 * Useful for search, autocomplete, and validation.
 */
const ALL_SUBCATEGORIES = CATEGORY_TREE.flatMap(cat =>
  cat.subcategories.map(sub => ({
    ...sub,
    categoryId: cat.id,
    categoryLabel: cat.label,
  })),
)

const SUBCATEGORY_LABEL_MAP = Object.fromEntries(
  ALL_SUBCATEGORIES.map(s => [s.label.toLowerCase(), s.id]),
)

const SUBCATEGORY_ID_MAP = Object.fromEntries(
  ALL_SUBCATEGORIES.map(s => [s.id.toLowerCase(), s.id]),
)

const SUBCATEGORY_ALIASES = {
  'tops & t-shirts': 'tops',
  'tops and t-shirts': 'tops',
  tops_tshirts: 'tops',
  tops_and_tshirts: 'tops',
  tshirts_tops: 'tops',
}

/**
 * Quick lookup: subcategory id → parent category id.
 */
const SUBCATEGORY_TO_CATEGORY = Object.fromEntries(
  ALL_SUBCATEGORIES.map(s => [s.id, s.categoryId]),
)

/**
 * Quick lookup: category id → category object.
 */
const CATEGORY_MAP = Object.fromEntries(
  CATEGORY_TREE.map(c => [c.id, c]),
)

/**
 * Get a category by id.
 */
function getCategoryById(id) {
  return CATEGORY_MAP[id] || null
}

/**
 * Get the parent category for a given subcategory id.
 */
function getParentCategory(subcategoryId) {
  const parentId = SUBCATEGORY_TO_CATEGORY[subcategoryId]
  return parentId ? CATEGORY_MAP[parentId] : null
}

/**
 * Get subcategories for a given category id.
 */
function getSubcategories(categoryId) {
  return CATEGORY_MAP[categoryId]?.subcategories || []
}

function normalizeSubcategoryValue(rawSubcategory, categoryId = '') {
  if (!rawSubcategory) return ''
  const raw = String(rawSubcategory).trim()
  if (!raw) return ''

  const lower = raw.toLowerCase()
  const normalizedKey = lower.replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '')
  const aliasMatch = SUBCATEGORY_ALIASES[lower] || SUBCATEGORY_ALIASES[normalizedKey]
  if (aliasMatch) return aliasMatch

  const directMatch = SUBCATEGORY_ID_MAP[lower]
  if (directMatch) return directMatch

  const labelMatch = SUBCATEGORY_LABEL_MAP[lower]
  if (labelMatch) return labelMatch

  if (categoryId) {
    const categorySubcategories = getSubcategories(categoryId)
    const scopedMatch = categorySubcategories.find((sub) => {
      const subLabel = sub.label.toLowerCase()
      const subNormalized = subLabel.replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '')
      return sub.id.toLowerCase() === lower || subLabel === lower || subNormalized === normalizedKey
    })
    if (scopedMatch) return scopedMatch.id
  }

  return raw
}

/**
 * Get the attributes that should be shown on SellPage for a category.
 */
function getCategoryAttributes(categoryId) {
  return CATEGORY_MAP[categoryId]?.attributes || ['condition']
}

/**
 * Get the filters that should be shown on Browse/FilterPanel for a category.
 */
function getCategoryFilters(categoryId) {
  return CATEGORY_MAP[categoryId]?.filters || ['condition', 'price']
}

/**
 * Check if a category supports standard delivery.
 */
function isDeliveryEligible(categoryId) {
  return CATEGORY_MAP[categoryId]?.deliveryEligible ?? true
}

/**
 * Return a flat label array of all top-level categories (for dropdowns, etc.).
 * Includes an "All" option at position 0.
 */
function getCategoryOptions({ includeAll = true } = {}) {
  const opts = CATEGORY_TREE.map(c => ({ id: c.id, name: c.label, icon: c.icon }))
  if (includeAll) opts.unshift({ id: 'all', name: 'All', icon: 'grid' })
  return opts
}

/* ── Legacy compatibility ──────────────────────────────────── */

/**
 * Map old top-level category ids (women, men, shoes, accessories, vintage)
 * to the new system. Used when filtering or displaying listings that were
 * created before the multi-category migration.
 */
const LEGACY_CATEGORY_MAP = {
  women: 'fashion',
  men: 'fashion',
  shoes: 'fashion',
  accessories: 'fashion',
  vintage: 'fashion',
}

/**
 * Map old sports subcategory ids to new ones for backward compatibility.
 */
const LEGACY_SPORTS_SUBCATEGORY_MAP = {
  tennis: 'racket_sports',
  outdoor: 'outdoor_hiking',
  fishing: 'other_sports',
  water_sports_diving: 'water_sports',
}

/**
 * Resolve a sports subcategory to its canonical new id.
 */
function resolveSportsSubcategory(subId) {
  if (!subId) return ''
  return LEGACY_SPORTS_SUBCATEGORY_MAP[subId] || subId
}

/**
 * Resolve a listing's category to the canonical new-system category id.
 * Returns the id unchanged if it's already a valid new-system category,
 * maps known legacy values, or returns the input as-is for unknowns.
 */
function resolveCategory(rawCategory) {
  if (!rawCategory) return ''
  const lower = rawCategory.toLowerCase()
  if (CATEGORY_MAP[lower]) return lower
  return LEGACY_CATEGORY_MAP[lower] || lower
}

/**
 * Check whether a raw category value is a known legacy value.
 */
function isLegacyCategory(rawCategory) {
  return !!LEGACY_CATEGORY_MAP[(rawCategory || '').toLowerCase()]
}

export {
  CATEGORY_TREE,
  ALL_SUBCATEGORIES,
  SUBCATEGORY_TO_CATEGORY,
  CATEGORY_MAP,
  LEGACY_CATEGORY_MAP,
  LEGACY_SPORTS_SUBCATEGORY_MAP,
  getCategoryById,
  getParentCategory,
  getSubcategories,
  normalizeSubcategoryValue,
  getCategoryAttributes,
  getCategoryFilters,
  isDeliveryEligible,
  getCategoryOptions,
  resolveCategory,
  resolveSportsSubcategory,
  isLegacyCategory,
}
