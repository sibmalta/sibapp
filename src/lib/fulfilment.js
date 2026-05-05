export const FULFILMENT_PROVIDER = 'MaltaPost'
export const FULFILMENT_METHODS = {
  LOCKER: 'locker',
  DELIVERY: 'delivery',
}

export const FULFILMENT_PRICES = {
  [FULFILMENT_METHODS.LOCKER]: 3.50,
  [FULFILMENT_METHODS.DELIVERY]: 3.50,
}

export function normalizeFulfilmentMethod(value) {
  if (value == null || value === '') return null
  if (value === FULFILMENT_METHODS.LOCKER || value === 'locker_collection') return FULFILMENT_METHODS.LOCKER
  if (value === FULFILMENT_METHODS.DELIVERY || value === 'home_delivery') return FULFILMENT_METHODS.DELIVERY
  return null
}

export function getFulfilmentPrice(method) {
  return FULFILMENT_PRICES[normalizeFulfilmentMethod(method)] ?? FULFILMENT_PRICES[FULFILMENT_METHODS.DELIVERY]
}

export function getFulfilmentMethodLabel(method) {
  const normalized = normalizeFulfilmentMethod(method)
  if (normalized === FULFILMENT_METHODS.LOCKER) return 'MYConvenience drop-off'
  if (normalized === FULFILMENT_METHODS.DELIVERY) return 'Legacy delivery method'
  return 'Drop-off pending'
}

export function getFulfilmentMethodShortLabel(method) {
  const normalized = normalizeFulfilmentMethod(method)
  if (normalized === FULFILMENT_METHODS.LOCKER) return 'MYConvenience'
  if (normalized === FULFILMENT_METHODS.DELIVERY) return 'Legacy delivery'
  return 'Drop-off pending'
}

const HISTORICAL_LEGACY_STATUSES = new Set(['completed', 'confirmed', 'cancelled', 'refunded'])

export function isHistoricalLegacyOrder(order = {}) {
  return HISTORICAL_LEGACY_STATUSES.has(order?.status) || HISTORICAL_LEGACY_STATUSES.has(order?.trackingStatus)
}

export function getOrderFulfilmentProviderLabel(order = {}, shipment = null) {
  const method = order?.fulfilmentMethod || shipment?.fulfilmentMethod || order?.deliveryMethod
  if (normalizeFulfilmentMethod(method) === FULFILMENT_METHODS.DELIVERY && isHistoricalLegacyOrder(order)) {
    return 'Legacy delivery provider'
  }
  return 'MYConvenience drop-off'
}

export function getOrderFulfilmentMethodLabel(order = {}, shipment = null) {
  const method = order?.fulfilmentMethod || shipment?.fulfilmentMethod || order?.deliveryMethod
  if (normalizeFulfilmentMethod(method) === FULFILMENT_METHODS.DELIVERY && isHistoricalLegacyOrder(order)) {
    return 'Legacy delivery method'
  }
  return 'Store drop-off'
}

export function getDropoffPendingConfirmationCopy(input = {}) {
  const safeInput = input && typeof input === 'object' ? input : {}
  const order = safeInput.order && typeof safeInput.order === 'object' ? safeInput.order : {}
  const shipment = safeInput.shipment && typeof safeInput.shipment === 'object' ? safeInput.shipment : {}
  const fulfilmentMethod = safeInput.fulfilmentMethod
  const rawValues = [
    fulfilmentMethod,
    order?.fulfilmentMethod,
    order?.deliveryMethod,
    order?.fulfilmentProvider,
    shipment?.fulfilmentMethod,
    shipment?.deliveryType,
    shipment?.fulfilmentProvider,
    shipment?.dropoffStoreName,
  ]
    .filter(Boolean)
    .map(value => String(value).toLowerCase())

  const joined = rawValues.join(' ')
  if (joined.includes('myconvenience') || joined.includes('my convenience') || /\bmy\s/.test(joined)) {
    return 'We’re waiting for the MYconvenience store to scan and confirm it.'
  }

  return 'We’re waiting for confirmation that the item was received.'
}

export function getLegacyDeliveryMethod(method) {
  return normalizeFulfilmentMethod(method) === FULFILMENT_METHODS.LOCKER
    ? 'locker_collection'
    : 'home_delivery'
}
