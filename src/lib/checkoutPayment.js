export const LEGACY_HOME_DELIVERY_UNAVAILABLE_MESSAGE = 'This delivery method is no longer available.'
export const SIB_EXPRESS_UNAVAILABLE_MESSAGE = 'Sib delivery for larger items is coming soon.'

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

export const COUNTRY_CALLING_CODES = [
  { country: 'Malta', code: '+356' },
  { country: 'United Kingdom', code: '+44' },
  { country: 'Italy', code: '+39' },
  { country: 'Ireland', code: '+353' },
  { country: 'Germany', code: '+49' },
  { country: 'France', code: '+33' },
]

export const DEFAULT_COUNTRY_CALLING_CODE = '+356'

function normalizeCallingCode(value = DEFAULT_COUNTRY_CALLING_CODE) {
  const digits = String(value || '').replace(/[^\d]/g, '')
  return digits ? `+${digits}` : DEFAULT_COUNTRY_CALLING_CODE
}

function shouldStripTrunkZero(countryCode) {
  return ['+33', '+353', '+44', '+49'].includes(normalizeCallingCode(countryCode))
}

export function normalizePhoneNumber(value = '', countryCode = DEFAULT_COUNTRY_CALLING_CODE) {
  const compact = String(value || '').trim().replace(/[\s().-]/g, '')
  if (!compact) return ''
  if (/^00\d{6,15}$/.test(compact)) return `+${compact.slice(2)}`
  if (/^\+\d+$/.test(compact)) return compact

  const code = normalizeCallingCode(countryCode)
  const codeDigits = code.slice(1)
  if (compact.startsWith(codeDigits) && compact.length > codeDigits.length) {
    return `+${compact}`
  }

  const local = shouldStripTrunkZero(code) ? compact.replace(/^0+/, '') : compact
  return local ? `${code}${local}` : ''
}

export function getLocalPhoneNumber(value = '', countryCode = DEFAULT_COUNTRY_CALLING_CODE) {
  const normalized = normalizePhoneNumber(value, countryCode)
  const code = normalizeCallingCode(countryCode)
  if (!normalized || !normalized.startsWith(code)) return String(value || '').trim()
  return normalized.slice(code.length)
}

export function splitPhoneNumber(value = '') {
  const normalized = normalizePhoneNumber(value)
  const match = COUNTRY_CALLING_CODES
    .slice()
    .sort((a, b) => b.code.length - a.code.length)
    .find(({ code }) => normalized.startsWith(code))

  if (!match) {
    return { countryCode: DEFAULT_COUNTRY_CALLING_CODE, localNumber: String(value || '').trim() }
  }

  return {
    countryCode: match.code,
    localNumber: normalized.slice(match.code.length),
  }
}

export function isValidPhoneNumber(value = '', countryCode = DEFAULT_COUNTRY_CALLING_CODE) {
  const normalized = normalizePhoneNumber(value, countryCode)
  if (!normalized) return false
  if (!/^\+\d+$/.test(normalized)) return false

  const digits = normalized.replace(/^\+/, '')
  return digits.length >= 7 && digits.length <= 15
}

export function getDeliveryPhoneError(value = '', countryCode = DEFAULT_COUNTRY_CALLING_CODE) {
  if (!String(value || '').trim()) return 'Enter a phone number for delivery.'
  if (!isValidPhoneNumber(value, countryCode)) return 'Enter a valid phone number.'
  return ''
}

export const normalizeMaltaPhoneNumber = normalizePhoneNumber
export const isValidMaltaPhoneNumber = isValidPhoneNumber

export function getPaymentInitializationBlocker({
  stripeConfigured = true,
  currentUser = null,
  sessionAccessToken = '',
  listing = null,
  feesTotal = 0,
  isLocker = false,
  lockerEligible = true,
  deliveryMethod = '',
  address = '',
  city = '',
  postcode = '',
  phone = '',
  phoneCountryCode = DEFAULT_COUNTRY_CALLING_CODE,
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
    if (!lockerEligible) return SIB_EXPRESS_UNAVAILABLE_MESSAGE
  }
  const phoneError = getDeliveryPhoneError(phone, phoneCountryCode)
  if (phoneError) return `${phoneError.replace(/\.$/, '')} before continuing to payment.`
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
