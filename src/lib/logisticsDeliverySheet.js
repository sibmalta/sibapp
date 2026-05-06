import { getCourierDeliveryTiming, getCourierDeliveryTimingLabel } from './courierDeliveryTiming'

export const DELIVERY_SHEET_FIELDS = [
  'order_id',
  'shipment_id',
  'order_code',
  'seller_name',
  'buyer_name',
  'buyer_surname',
  'buyer_locality',
  'item_title',
  'dropoff_store_id',
  'dropoff_location_name',
  'dropoff_store_name',
  'dropoff_store_address',
  'dropoff_store_locality',
  'pickup_zone',
  'dropped_off_at',
  'buyer_delivery_address',
  'buyer_contact',
  'delivery_timing',
  'delivery_status',
  'fallback_store_name',
  'notes',
]

function formatAddress(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return String(value)

  const parts = [
    value.name,
    value.line1,
    value.line2,
    value.address,
    value.street,
    value.city,
    value.postcode,
    value.country,
  ].filter(Boolean)
  return parts.join(', ')
}

function getSurname(value) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean)
  return parts.length ? parts[parts.length - 1] : ''
}

function getLocality(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return String(value)
  return value.locality || value.city || value.town || value.village || value.area || ''
}

function getInitialDeliveryStatus(order, shipment) {
  if (shipment.status) return shipment.status
  if (order.deliveryStatus) return order.deliveryStatus
  if (order.delivery_status) return order.delivery_status
  if (order.dropoffConfirmedAt || order.dropoff_confirmed_at) return 'dropped_off'
  if (order.paymentStatus === 'paid' || order.payment_status === 'paid' || order.paidAt || order.paid_at) return 'awaiting_pickup'
  return order.fulfilmentStatus || order.trackingStatus || ''
}

export function buildDeliverySheetRow({ order = {}, shipment = {}, seller = {}, buyer = {}, listing = {} } = {}) {
  const buyerAddress = shipment.deliveryAddressSnapshot || shipment.recipientAddress || order.deliveryAddressSnapshot || order.address
  const buyerName = order.buyerFullName || buyer.name || buyer.username || ''
  const storeName = shipment.dropoffStoreName || shipment.dropoffLocationName || shipment.dropoffLocation || order.dropoffLocationName || order.dropoffLocation || ''
  const scanTime = shipment.dropoffConfirmedAt || shipment.droppedOffAt || order.dropoffConfirmedAt
  const deliveryTiming = shipment.deliveryTiming || order.deliveryTiming || getCourierDeliveryTiming(scanTime)
  const buyerContact = [
    order.buyerPhone || buyer.phone,
    buyer.email,
  ].filter(Boolean).join(' / ')

  return {
    order_id: order.id || shipment.orderId || '',
    shipment_id: shipment.id || '',
    order_code: order.orderRef || shipment.orderRef || '',
    seller_name: order.sellerName || seller.name || seller.username || '',
    buyer_name: buyerName,
    buyer_surname: order.buyerSurname || buyer.surname || getSurname(buyerName),
    buyer_locality: order.buyerLocality || getLocality(buyerAddress),
    item_title: order.listingTitle || listing.title || '',
    dropoff_store_id: shipment.dropoffStoreId || order.dropoffStoreId || '',
    dropoff_location_name: storeName,
    dropoff_store_name: shipment.dropoffStoreName || storeName,
    dropoff_store_address: shipment.dropoffStoreAddress || order.dropoffStoreAddress || '',
    dropoff_store_locality: shipment.dropoffStoreLocality || order.dropoffStoreLocality || '',
    pickup_zone: shipment.pickupZone || order.pickupZone || '',
    dropped_off_at: shipment.droppedOffAt || null,
    buyer_delivery_address: formatAddress(buyerAddress),
    buyer_contact: buyerContact,
    delivery_timing: deliveryTiming,
    delivery_status: getInitialDeliveryStatus(order, shipment),
    fallback_store_name: shipment.fallbackStoreName || '',
    notes: shipment.notes || `Delivery timing: ${getCourierDeliveryTimingLabel(deliveryTiming)}`,
  }
}
