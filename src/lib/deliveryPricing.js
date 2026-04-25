/**
 * Delivery size tiers and pricing for the Sib marketplace.
 *
 * 4 tiers:
 *   locker   → €3.25 via MaltaPost
 *   delivery → €4.50 via MaltaPost
 *
 * Seller input: "Can this item be safely carried by 1 person?"
 *   No  → flag as bulky handling, still fulfilled via MaltaPost for now
 *   Yes → small / medium / heavy based on weight/category
 */

export const DELIVERY_TIERS = [
  {
    id: 'small',
    label: 'Small (Lite)',
    price: 4.50,
    priceLabel: '€4.50',
    description: 'Fashion, shoes, books — under ~5 kg',
    examples: 'Fits in a padded envelope or small box',
    weight: 'Under 5 kg',
  },
  {
    id: 'medium',
    label: 'Medium',
    price: 4.50,
    priceLabel: '€4.50',
    description: 'Electronics, kitchen items — up to 20 kg',
    examples: 'Fits in a standard parcel box',
    weight: 'Up to 20 kg',
  },
  {
    id: 'heavy',
    label: 'Heavy',
    price: 4.50,
    priceLabel: '€4.50',
    description: 'Heavy items — 20 to 40 kg',
    examples: 'Can be safely carried by 1 person',
    weight: '20–40 kg',
  },
  {
    id: 'bulky',
    label: 'Bulky',
    price: 4.50,
    priceLabel: '€4.50',
    description: 'Prepare securely for MaltaPost fulfilment',
    examples: 'Sofas, fridges, large appliances',
    weight: 'Any weight — too large for 1 person',
  },
]

export const TIER_MAP = Object.fromEntries(DELIVERY_TIERS.map(t => [t.id, t]))

/**
 * Important notes shown wherever bulky delivery appears.
 */
export const BULKY_DELIVERY_NOTES = [
  'Ground floor or lift access assumed',
  'Stairs or complex access may incur additional fees',
  'If delivery cannot be completed, a re-delivery fee may apply',
]

// Backward-compatible alias
export const LARGE_DELIVERY_NOTES = BULKY_DELIVERY_NOTES

/**
 * Warning shown to all sellers on the delivery size section.
 */
export const SIZE_ACCURACY_WARNING =
  'If item exceeds declared size or weight, the order may be cancelled.'

/**
 * Get the delivery fee for a tier id.
 */
export function getDeliveryFee(tierId) {
  // Support legacy 'large' id mapping to 'bulky'
  if (tierId === 'large') return TIER_MAP['bulky']?.price ?? 4.50
  return TIER_MAP[tierId]?.price ?? 4.50
}

/**
 * Format the delivery price for buyer-facing display.
 */
export function getDeliveryPriceLabel(tierId) {
  if (tierId === 'large') return TIER_MAP['bulky']?.priceLabel ?? '€4.50'
  return TIER_MAP[tierId]?.priceLabel ?? '€4.50'
}

/* ── Categories / subcategories that FORCE bulky ──────────── */

const FORCE_BULKY_CATEGORIES = ['furniture']

const FORCE_BULKY_SUBCATEGORIES = [
  'sofas', 'beds', 'wardrobes', 'tables',
  'outdoor_furniture', 'office_furniture', 'shelving',
  'pushchairs', 'nursery',
]

const BULKY_KEYWORDS = [
  'sofa', 'couch', 'bed', 'mattress', 'wardrobe', 'closet',
  'treadmill', 'elliptical', 'exercise bike', 'rowing machine',
  'washing machine', 'dishwasher', 'dryer', 'refrigerator', 'fridge',
  'oven', 'freezer', 'bookcase', 'cabinet',
]

const DEFAULT_SMALL_CATEGORIES = ['fashion', 'books', 'kids']
const DEFAULT_MEDIUM_CATEGORIES = ['electronics', 'sports', 'toys', 'home']

/**
 * Check if category/subcategory forces bulky.
 */
export function isForceBulky(categoryId, subcategoryId) {
  if (FORCE_BULKY_CATEGORIES.includes(categoryId)) return true
  if (subcategoryId && FORCE_BULKY_SUBCATEGORIES.includes(subcategoryId)) return true
  return false
}

/**
 * Determine the smart default delivery size for a given category + subcategory.
 */
export function getDefaultDeliverySize(categoryId, subcategoryId) {
  if (isForceBulky(categoryId, subcategoryId)) return 'bulky'
  if (DEFAULT_SMALL_CATEGORIES.includes(categoryId)) return 'small'
  if (DEFAULT_MEDIUM_CATEGORIES.includes(categoryId)) return 'medium'
  return 'medium'
}

/**
 * Determine the minimum allowed delivery size for a category/subcategory.
 */
export function getMinDeliverySize(categoryId, subcategoryId) {
  if (isForceBulky(categoryId, subcategoryId)) return 'bulky'
  return 'small'
}

/**
 * Check whether a given delivery size is valid for the category/subcategory.
 */
export function isDeliverySizeAllowed(size, categoryId, subcategoryId) {
  const minSize = getMinDeliverySize(categoryId, subcategoryId)
  if (minSize === 'bulky') return size === 'bulky'
  return true
}

/**
 * Check if title text suggests a bulky item.
 */
export function titleSuggestsBulky(title) {
  if (!title) return false
  const lower = title.toLowerCase()
  return BULKY_KEYWORDS.some(kw => lower.includes(kw))
}

/**
 * Get allowed tier ids for a given category/subcategory + onePersonCarry flag.
 *
 * onePersonCarry:
 *   false → only 'bulky'
 *   true  → 'small', 'medium', 'heavy' (no bulky)
 *   undefined/null → smart default based on category (backward compat)
 */
export function getAllowedTiers(categoryId, subcategoryId, onePersonCarry) {
  if (isForceBulky(categoryId, subcategoryId)) return ['bulky']
  if (onePersonCarry === false) return ['bulky']
  if (onePersonCarry === true) return ['small', 'medium', 'heavy']
  // Fallback: all non-bulky tiers + bulky
  return ['small', 'medium', 'heavy', 'bulky']
}

/**
 * Resolve the final delivery size based on seller inputs.
 * If onePersonCarry is false, always returns 'bulky'.
 * Handles legacy 'large' → 'bulky' mapping.
 */
export function resolveDeliverySize(chosenSize, onePersonCarry) {
  if (chosenSize === 'large') chosenSize = 'bulky'
  if (onePersonCarry === false) return 'bulky'
  if (onePersonCarry === true && chosenSize === 'bulky') return 'heavy'
  return chosenSize || 'medium'
}
