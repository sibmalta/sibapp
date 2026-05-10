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
  'Sib Express delivery currently supports lightweight parcels up to 5kg that can be safely transported by motorcycle courier.'

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
