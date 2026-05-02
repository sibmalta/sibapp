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
    ? 'MaltaPost locker'
    : 'MaltaPost delivery'
}

export function getFulfilmentMethodShortLabel(method) {
  return normalizeFulfilmentMethod(method) === FULFILMENT_METHODS.LOCKER ? 'Locker' : 'Delivery'
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

  const rawMethod = String(fulfilmentMethod || order.fulfilmentMethod || order.deliveryMethod || shipment.fulfilmentMethod || shipment.deliveryType || '').toLowerCase()
  const provider = String(order.fulfilmentProvider || shipment.fulfilmentProvider || '').toLowerCase()
  if ((rawMethod === FULFILMENT_METHODS.DELIVERY || rawMethod === 'home_delivery') && provider.includes('maltapost')) {
    return 'We’re waiting for the drop-off point to confirm receipt.'
  }

  return 'We’re waiting for confirmation that the item was received.'
}

export function getLegacyDeliveryMethod(method) {
  return normalizeFulfilmentMethod(method) === FULFILMENT_METHODS.LOCKER
    ? 'locker_collection'
    : 'home_delivery'
}
