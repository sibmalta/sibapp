const NOT_PROVIDED = 'Not provided'

function clean(value) {
  return String(value || '').trim()
}

function splitDisplayName(value) {
  return clean(value).split(/\s+/).filter(Boolean)
}

export function getBuyerSurnameForParcel(order = {}, buyer = {}) {
  const explicit = clean(
    order?.buyerSurname ||
    order?.buyerLastName ||
    order?.buyer_last_name ||
    buyer?.surname ||
    buyer?.lastName ||
    buyer?.last_name,
  )
  if (explicit) return explicit

  const nameParts = splitDisplayName(
    order?.buyerFullName ||
    order?.buyerName ||
    buyer?.name ||
    buyer?.fullName ||
    buyer?.username,
  )

  return nameParts.length > 1 ? nameParts[nameParts.length - 1] : NOT_PROVIDED
}

export function getBuyerLocalityForParcel(order = {}, buyer = {}) {
  const deliverySnapshot = order?.deliveryAddressSnapshot && typeof order.deliveryAddressSnapshot === 'object'
    ? order.deliveryAddressSnapshot
    : {}
  const shippingAddress = order?.shippingAddress && typeof order.shippingAddress === 'object'
    ? order.shippingAddress
    : {}
  const recipientAddress = order?.recipientAddress && typeof order.recipientAddress === 'object'
    ? order.recipientAddress
    : {}

  return clean(
    order?.buyerLocality ||
    order?.buyer_locality ||
    order?.buyerCity ||
    order?.buyer_city ||
    deliverySnapshot.locality ||
    deliverySnapshot.city ||
    deliverySnapshot.town ||
    shippingAddress.buyerLocality ||
    shippingAddress.buyerCity ||
    shippingAddress.locality ||
    shippingAddress.city ||
    recipientAddress.locality ||
    recipientAddress.city ||
    buyer?.deliveryLocality ||
    buyer?.deliveryCity ||
    buyer?.locality ||
    buyer?.city,
  ) || NOT_PROVIDED
}

export function getParcelLabelDetails(order = {}, buyer = {}, orderCode = '') {
  return {
    orderId: clean(orderCode) || NOT_PROVIDED,
    surname: getBuyerSurnameForParcel(order, buyer),
    locality: getBuyerLocalityForParcel(order, buyer),
  }
}
