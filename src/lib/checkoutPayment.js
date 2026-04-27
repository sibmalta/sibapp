export function resolveCheckoutDeliveryMethod(requestedMethod, lockerEligible) {
  if (requestedMethod === 'locker_collection' && lockerEligible) return 'locker_collection'
  return 'home_delivery'
}

export function buildPaymentIntentPayload({
  listingId = '',
  listingIds = [],
  offerId = '',
  deliveryMethod = 'home_delivery',
  lockerEligible = true,
} = {}) {
  const safeDeliveryMethod = resolveCheckoutDeliveryMethod(deliveryMethod, lockerEligible)
  const payload = {
    deliveryMethod: safeDeliveryMethod,
  }

  if (listingId) payload.listingId = listingId
  if (Array.isArray(listingIds) && listingIds.length > 0) payload.listingIds = listingIds
  if (offerId) payload.offerId = offerId

  return payload
}
