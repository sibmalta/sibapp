const PAID_ORDER_STATUSES = new Set([
  'paid',
  'payment_received_seller_payout_pending',
  'awaiting_delivery',
])

export function isOrderPaidForDropoff(order) {
  return Boolean(
    order?.paymentStatus === 'paid' ||
    PAID_ORDER_STATUSES.has(order?.status) ||
    PAID_ORDER_STATUSES.has(order?.trackingStatus)
  )
}

export function isOfficiallyDroppedOff(order, shipment) {
  return Boolean(
    shipment?.status === 'dropped_off' ||
    order?.fulfilmentStatus === 'dropped_off' ||
    order?.trackingStatus === 'dropped_off' ||
    order?.status === 'dropped_off'
  )
}

export function getPendingSellerDropoffOrders({ orders = [], shipments = [], currentUserId }) {
  if (!currentUserId) return []

  return orders.filter(order => {
    if (order.sellerId !== currentUserId) return false
    const shipment = shipments.find(item => item.orderId === order.id)
    if (!isOrderPaidForDropoff(order)) return false
    if (isOfficiallyDroppedOff(order, shipment)) return false
    if (order.sellerClaimedDropoff || shipment?.sellerClaimedDropoff) return false
    return true
  })
}

export function buildSellerDropoffClaimPatch(now = new Date().toISOString()) {
  return {
    sellerClaimedDropoff: true,
    sellerDropoffClaimedAt: now,
  }
}
