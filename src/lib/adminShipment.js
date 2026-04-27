import { getFulfilmentMethodLabel, normalizeFulfilmentMethod } from './fulfilment'

function splitName(fullName = '') {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { name: parts[0] || '', surname: '' }
  return { name: parts.slice(0, -1).join(' '), surname: parts.at(-1) }
}

export function buildShipmentReference(order) {
  const ref = order?.orderRef || order?.order_ref || order?.id || 'order'
  return `MP-${String(ref).replace(/^#/, '')}`
}

export function buildAdminShipmentPayload(order, { buyer } = {}) {
  const fullName = order?.buyerFullName || buyer?.name || buyer?.username || ''
  const { name, surname } = splitName(fullName)
  const fulfilmentMethod = normalizeFulfilmentMethod(order?.fulfilmentMethod || order?.deliveryMethod)
  const deliveryType = fulfilmentMethod === 'locker' ? 'locker' : 'home'
  const address = deliveryType === 'locker'
    ? (order?.lockerAddress || order?.lockerLocationName || order?.address || '')
    : (order?.address || order?.deliveryAddressSnapshot?.address || '')

  return {
    recipientName: name,
    recipientSurname: surname,
    recipientPhone: order?.buyerPhone || buyer?.phone || '',
    recipientEmail: buyer?.email || '',
    address,
    postcode: order?.buyerPostcode || order?.deliveryAddressSnapshot?.postcode || '',
    country: 'Malta',
    deliveryType,
    deliveryTypeLabel: getFulfilmentMethodLabel(fulfilmentMethod),
    orderReference: order?.orderRef || order?.id || '',
    shipmentReference: buildShipmentReference(order),
  }
}

export function formatAdminShipmentPayload(payload) {
  return [
    ['Recipient name', payload.recipientName],
    ['Recipient surname', payload.recipientSurname],
    ['Phone', payload.recipientPhone],
    ['Email', payload.recipientEmail],
    ['Address', payload.address],
    ['Postcode', payload.postcode],
    ['Country', payload.country],
    ['Delivery type', payload.deliveryTypeLabel],
    ['Order reference', payload.orderReference],
    ['Shipment reference', payload.shipmentReference],
  ].map(([label, value]) => `${label}: ${value || '-'}`).join('\n')
}
