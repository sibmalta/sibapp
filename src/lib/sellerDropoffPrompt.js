import { isDropoffConfirmed } from './dropoffQr'

const PAID_ORDER_STATUSES = new Set([
  'paid',
  'payment_received_seller_payout_pending',
  'awaiting_delivery',
  'shipped',
  'delivered',
  'confirmed',
  'completed',
  'disputed',
  'under_review',
  'cancelled',
  'refunded',
])

const TERMINAL_NO_DROPOFF_STATUSES = new Set([
  'completed',
  'confirmed',
  'cancelled',
  'refunded',
])

export function isOrderPaidForDropoff(order) {
  return Boolean(
    order?.paidAt ||
    order?.paymentStatus === 'paid' ||
    PAID_ORDER_STATUSES.has(order?.status) ||
    PAID_ORDER_STATUSES.has(order?.trackingStatus)
  )
}

export function isActiveSellerDropoffOrder(order) {
  if (!isOrderPaidForDropoff(order)) return false
  const status = order?.status
  const trackingStatus = order?.trackingStatus
  if (TERMINAL_NO_DROPOFF_STATUSES.has(status) || TERMINAL_NO_DROPOFF_STATUSES.has(trackingStatus)) {
    return false
  }
  return true
}

export function isOfficiallyDroppedOff(order, shipment) {
  return Boolean(
    isDropoffConfirmed({ order, shipment }) ||
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
    if (!isActiveSellerDropoffOrder(order)) return false
    if (isOfficiallyDroppedOff(order, shipment)) return false
    return true
  })
}

export function shouldShowSellerDropoffQr({ order, shipment, currentUserId }) {
  if (!order || order.sellerId !== currentUserId) return false
  if (!isActiveSellerDropoffOrder(order)) return false
  if (shipment?.status === 'delivered') return false
  return true
}

export function buildSellerDropoffClaimPatch(now = new Date().toISOString()) {
  return {
    sellerClaimedDropoff: true,
    sellerDropoffClaimedAt: now,
  }
}
