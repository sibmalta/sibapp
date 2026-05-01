export const PENDING_PAYOUT_STATUSES = [
  'buyer_protection_hold',
  'blocked_seller_setup',
  'releasable',
  'transfer_failed',
]

export const PENDING_PAYOUT_LABELS = {
  buyer_protection_hold: 'In buyer protection period',
  blocked_seller_setup: 'Action required: complete payout setup',
  releasable: 'Processing soon',
  transfer_failed: 'Payout issue — Sib is reviewing',
}

export function getSellerPayoutAmount(order = {}) {
  const sellerPayout = Number(order.sellerPayout ?? order.seller_payout)
  if (Number.isFinite(sellerPayout) && sellerPayout > 0) return sellerPayout

  const total = Number(order.totalPrice ?? order.total_price ?? order.itemPrice ?? order.item_price ?? 0)
  const platformFee = Number(order.platformFee ?? order.platform_fee ?? 0)
  const fallback = total - (Number.isFinite(platformFee) ? platformFee : 0)
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 0
}

export function getSellerPendingPayoutSummary(orders = [], sellerId) {
  const sellerOrders = (Array.isArray(orders) ? orders : []).filter(order => {
    const orderSellerId = order.sellerId ?? order.seller_id
    const payoutStatus = order.payoutStatus ?? order.payout_status
    return orderSellerId === sellerId && PENDING_PAYOUT_STATUSES.includes(payoutStatus)
  })

  const byStatus = PENDING_PAYOUT_STATUSES.reduce((acc, status) => ({
    ...acc,
    [status]: {
      count: 0,
      totalAmount: 0,
      label: PENDING_PAYOUT_LABELS[status],
    },
  }), {})
  const totalAmount = sellerOrders.reduce((sum, order) => {
    const payoutStatus = order.payoutStatus ?? order.payout_status
    const amount = getSellerPayoutAmount(order)
    byStatus[payoutStatus].count += 1
    byStatus[payoutStatus].totalAmount += amount
    return sum + amount
  }, 0)

  return {
    totalAmount,
    count: sellerOrders.length,
    blockedCount: byStatus.blocked_seller_setup.count,
    protectionHoldCount: byStatus.buyer_protection_hold.count,
    releasableCount: byStatus.releasable.count,
    failedCount: byStatus.transfer_failed.count,
    hasBlockedSetup: byStatus.blocked_seller_setup.count > 0,
    byStatus,
    orders: sellerOrders,
  }
}
