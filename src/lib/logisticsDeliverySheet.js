export const DELIVERY_SHEET_FIELDS = [
  'order_id',
  'shipment_id',
  'order_code',
  'seller_name',
  'buyer_name',
  'item_title',
  'dropoff_store_name',
  'dropoff_store_address',
  'dropped_off_at',
  'buyer_delivery_address',
  'buyer_contact',
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

export function buildDeliverySheetRow({ order = {}, shipment = {}, seller = {}, buyer = {}, listing = {} } = {}) {
  const buyerAddress = shipment.deliveryAddressSnapshot || shipment.recipientAddress || order.deliveryAddressSnapshot || order.address
  const buyerContact = [
    order.buyerPhone || buyer.phone,
    buyer.email,
  ].filter(Boolean).join(' / ')

  return {
    order_id: order.id || shipment.orderId || '',
    shipment_id: shipment.id || '',
    order_code: order.orderRef || shipment.orderRef || '',
    seller_name: order.sellerName || seller.name || seller.username || '',
    buyer_name: order.buyerFullName || buyer.name || buyer.username || '',
    item_title: order.listingTitle || listing.title || '',
    dropoff_store_name: shipment.dropoffStoreName || '',
    dropoff_store_address: shipment.dropoffStoreAddress || '',
    dropped_off_at: shipment.droppedOffAt || null,
    buyer_delivery_address: formatAddress(buyerAddress),
    buyer_contact: buyerContact,
    delivery_status: shipment.status || order.fulfilmentStatus || order.trackingStatus || '',
    fallback_store_name: shipment.fallbackStoreName || '',
    notes: shipment.notes || '',
  }
}
