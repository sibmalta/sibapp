export const FULFILMENT_PROVIDER = 'MaltaPost'
export const FULFILMENT_METHODS = {
  LOCKER: 'locker',
  DELIVERY: 'delivery',
}

export const FULFILMENT_PRICES = {
  [FULFILMENT_METHODS.LOCKER]: 3.25,
  [FULFILMENT_METHODS.DELIVERY]: 4.50,
}

export function normalizeFulfilmentMethod(value) {
  if (value === FULFILMENT_METHODS.LOCKER || value === 'locker_collection') return FULFILMENT_METHODS.LOCKER
  return FULFILMENT_METHODS.DELIVERY
}

export function getFulfilmentPrice(method) {
  return FULFILMENT_PRICES[normalizeFulfilmentMethod(method)]
}

export function getFulfilmentMethodLabel(method) {
  return normalizeFulfilmentMethod(method) === FULFILMENT_METHODS.LOCKER
    ? 'Locker collection'
    : 'Legacy delivery method'
}

export function getFulfilmentMethodShortLabel(method) {
  return normalizeFulfilmentMethod(method) === FULFILMENT_METHODS.LOCKER ? 'Locker' : 'Legacy delivery'
}

export function getDropoffPendingConfirmationCopy({ order = {}, shipment = {}, fulfilmentMethod } = {}) {
  const rawValues = [
    fulfilmentMethod,
    order.fulfilmentMethod,
    order.deliveryMethod,
    order.fulfilmentProvider,
    shipment.fulfilmentMethod,
    shipment.deliveryType,
    shipment.fulfilmentProvider,
    shipment.dropoffStoreName,
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
