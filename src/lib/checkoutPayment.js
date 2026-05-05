export const LEGACY_HOME_DELIVERY_UNAVAILABLE_MESSAGE = 'This delivery method is no longer available.'

export function resolveCheckoutDeliveryMethod(requestedMethod, lockerEligible) {
  if (requestedMethod === 'locker_collection' && lockerEligible) return 'locker_collection'
  return requestedMethod || ''
}

export function buildPaymentIntentPayload({
  listingId = '',
  listingIds = [],
  offerId = '',
  orderId = '',
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
  if (orderId) payload.orderId = orderId

  return payload
}

export function getPaymentInitializationBlocker({
  stripeConfigured = true,
  currentUser = null,
  sessionAccessToken = '',
  listing = null,
  feesTotal = 0,
  isLocker = false,
  lockerEligible = true,
  deliveryMethod = '',
  selectedLockerId = '',
  address = '',
  city = '',
  postcode = '',
} = {}) {
  if (!stripeConfigured) return 'Online payments are still being set up.'
  if (!currentUser?.id) return 'Please log in before continuing to payment.'
  if (!sessionAccessToken || String(sessionAccessToken).split('.').length !== 3) {
    return 'Please log in again before continuing to payment.'
  }
  if (!listing?.id) return 'Listing data is still loading. Please try again in a moment.'
  if (!listing?.sellerId && !listing?.seller_id) return 'Seller details are still loading. Please try again in a moment.'
  if (!Number.isFinite(Number(feesTotal)) || Number(feesTotal) < 0.5) {
    return 'Order total must be at least €0.50 to proceed.'
  }
  if (deliveryMethod === 'home_delivery') return LEGACY_HOME_DELIVERY_UNAVAILABLE_MESSAGE
  if (isLocker) {
    if (!lockerEligible) return 'Only small parcels are supported right now.'
    if (!selectedLockerId) return 'Please select a MYConvenience location before continuing to payment.'
    return ''
  }
  if (!String(address).trim()) return 'Enter your street address before continuing to payment.'
  if (!String(city).trim()) return 'Enter your city or town before continuing to payment.'
  if (!String(postcode).trim()) return 'Enter your postcode before continuing to payment.'
  return ''
}

export function shouldInitializePaymentIntent(state = {}) {
  if (state.creatingIntent || state.clientSecret) return false
  if (getPaymentInitializationBlocker(state)) return false
  if (state.intentError && state.hasAttemptedPaymentIntent) return false
  return true
}

export async function runPaymentIntentInitialization(state = {}, createPaymentIntentFn) {
  const blocker = getPaymentInitializationBlocker(state)
  if (blocker) {
    return { called: false, blocker, result: null }
  }

  const result = await createPaymentIntentFn(buildPaymentIntentPayload(state), state.sessionAccessToken)
  return { called: true, blocker: '', result }
}
