/**
 * Delivery size and pricing for the active Sib motorcycle courier model.
 *
 * Active MYConvenience drop-off orders support small parcels only.
 * Historical orders keep their stored fulfilment_price / delivery_fee snapshots.
 */

export const DELIVERY_TIERS = [
  {
    id: 'small',
    label: 'Small parcel',
    price: 3.50,
    priceLabel: 'EUR 3.50',
    description: 'Only small parcels are supported right now.',
    examples: 'Your parcel must be small enough to be carried safely by one motorcycle courier.',
    weight: 'Small motorcycle courier parcel',
  },
]

export const TIER_MAP = Object.fromEntries(DELIVERY_TIERS.map(t => [t.id, t]))

export const BULKY_DELIVERY_NOTES = [
  'Only small parcels are supported right now.',
  'Your parcel must be small enough to be carried safely by one motorcycle courier.',
]

// Backward-compatible alias
export const LARGE_DELIVERY_NOTES = BULKY_DELIVERY_NOTES

export const SIZE_ACCURACY_WARNING =
  'Your parcel must be small enough to be carried safely by one motorcycle courier.'

export function getDeliveryFee(tierId) {
  return TIER_MAP[tierId]?.price ?? TIER_MAP.small.price
}

export function getDeliveryPriceLabel(tierId) {
  return TIER_MAP[tierId]?.priceLabel ?? TIER_MAP.small.priceLabel
}

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

export function isForceBulky(categoryId, subcategoryId) {
  if (FORCE_BULKY_CATEGORIES.includes(categoryId)) return true
  if (subcategoryId && FORCE_BULKY_SUBCATEGORIES.includes(subcategoryId)) return true
  return false
}

export function getDefaultDeliverySize() {
  return 'small'
}

export function getMinDeliverySize() {
  return 'small'
}

export function isDeliverySizeAllowed(size) {
  return size === 'small'
}

export function titleSuggestsBulky(title) {
  if (!title) return false
  const lower = title.toLowerCase()
  return BULKY_KEYWORDS.some(kw => lower.includes(kw))
}

export function getAllowedTiers() {
  return ['small']
}

export function resolveDeliverySize() {
  return 'small'
}
