import { isDeliveryEligible, resolveCategory } from '../data/categories'
import { isForceBulky, titleSuggestsBulky } from './deliveryPricing'

export const DELIVERY_ELIGIBILITY_REASONS = {
  ELIGIBLE: 'eligible',
  OVER_WEIGHT_LIMIT: 'over_weight_limit',
  BULKY_CATEGORY: 'bulky_category',
  MISSING_WEIGHT: 'missing_weight',
  DELIVERY_COMING_SOON: 'delivery_coming_soon',
}

export const SIB_EXPRESS_BUYER_UNAVAILABLE_MESSAGE = 'Sib delivery for larger items is coming soon.'
export const SIB_EXPRESS_SELLER_LIMIT_MESSAGE =
  'Sib Express currently supports lightweight parcels under 5kg that can safely fit inside a motorcycle courier delivery bag.'
export const SIB_EXPRESS_LARGER_ITEMS_COMING_SOON_MESSAGE = 'Delivery for larger items is coming soon.'
export const SIB_EXPRESS_LISTING_BLOCKED_MESSAGE = 'Large and bulky item delivery is not available yet on Sib.'

function readDeliverySize(listing) {
  return listing?.deliverySize || listing?.delivery_size || listing?.parcelSize || listing?.parcel_size || ''
}

function readWeightKg(listing) {
  const raw = listing?.weightKg ?? listing?.weight_kg ?? listing?.parcelWeightKg ?? listing?.parcel_weight_kg
  if (raw === null || raw === undefined || raw === '') return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function result(reason) {
  return {
    eligible: reason === DELIVERY_ELIGIBILITY_REASONS.ELIGIBLE,
    reason,
    buyerMessage: reason === DELIVERY_ELIGIBILITY_REASONS.ELIGIBLE ? '' : SIB_EXPRESS_BUYER_UNAVAILABLE_MESSAGE,
    sellerMessage: reason === DELIVERY_ELIGIBILITY_REASONS.ELIGIBLE ? '' : SIB_EXPRESS_SELLER_LIMIT_MESSAGE,
  }
}

export function getDeliveryEligibility(listing, { requireExplicitParcelSize = false, ignoreExplicitLockerEligible = false } = {}) {
  const category = resolveCategory(listing?.category || '')
  const subcategory = listing?.subcategory || listing?.type || listing?.categoryType || ''
  const deliverySize = readDeliverySize(listing)
  const weightKg = readWeightKg(listing)

  if (!isDeliveryEligible(category)) return result(DELIVERY_ELIGIBILITY_REASONS.BULKY_CATEGORY)
  if (isForceBulky(category, subcategory) || titleSuggestsBulky(listing?.title || '')) {
    return result(DELIVERY_ELIGIBILITY_REASONS.BULKY_CATEGORY)
  }
  if (weightKg !== null && weightKg > 5) return result(DELIVERY_ELIGIBILITY_REASONS.OVER_WEIGHT_LIMIT)
  if (deliverySize && deliverySize !== 'small') return result(DELIVERY_ELIGIBILITY_REASONS.OVER_WEIGHT_LIMIT)

  const explicit = listing?.lockerEligible ?? listing?.locker_eligible
  if (!ignoreExplicitLockerEligible && explicit === false) return result(DELIVERY_ELIGIBILITY_REASONS.DELIVERY_COMING_SOON)
  if ((!ignoreExplicitLockerEligible && explicit === true) || deliverySize === 'small') return result(DELIVERY_ELIGIBILITY_REASONS.ELIGIBLE)

  if (requireExplicitParcelSize) return result(DELIVERY_ELIGIBILITY_REASONS.MISSING_WEIGHT)

  if (['fashion', 'books', 'kids'].includes(category)) return result(DELIVERY_ELIGIBILITY_REASONS.ELIGIBLE)
  if (category === 'toys') return result(DELIVERY_ELIGIBILITY_REASONS.ELIGIBLE)
  if (category === 'electronics') return result(DELIVERY_ELIGIBILITY_REASONS.ELIGIBLE)
  if (category === 'home' && ['decor', 'kitchenware', 'bedding', 'bathroom', 'lighting', 'storage', 'other_home'].includes(subcategory)) {
    return result(DELIVERY_ELIGIBILITY_REASONS.ELIGIBLE)
  }

  return result(DELIVERY_ELIGIBILITY_REASONS.MISSING_WEIGHT)
}

export function getListingLaunchSupport(listing) {
  const eligibility = getDeliveryEligibility(listing, { requireExplicitParcelSize: true })
  if (eligibility.eligible) return { supported: true, error: '' }
  return { supported: false, error: SIB_EXPRESS_LISTING_BLOCKED_MESSAGE, eligibility }
}
