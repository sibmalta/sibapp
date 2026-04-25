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

export function getLegacyDeliveryMethod(method) {
  return normalizeFulfilmentMethod(method) === FULFILMENT_METHODS.LOCKER
    ? 'locker_collection'
    : 'home_delivery'
}
