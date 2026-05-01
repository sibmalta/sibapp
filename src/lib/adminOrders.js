export const ADMIN_ORDER_STATUSES = [
  'all',
  'pending',
  'paid',
  'payment_received_seller_payout_pending',
  'awaiting_delivery',
  'setup_pending',
  'shipped',
  'delivered',
  'under_review',
  'held',
  'releasable',
  'released',
  'disputed',
  'transfer_failed',
  'blocked_payouts',
  'blocked_seller_setup',
  'refunded',
  'cancelled',
]

export function adminOrderMatchesStatus(order, status) {
  if (status === 'all') return true
  if (status === 'blocked_payouts') return order?.payoutStatus === 'blocked_seller_setup'
  return [
    order?.status,
    order?.trackingStatus,
    order?.paymentStatus,
    order?.payoutStatus,
    order?.sellerPayoutStatus,
  ].includes(status)
}

export function filterAdminOrders(orders, { status = 'all', search = '', tab = 'orders', getListingById, getUserById } = {}) {
  let result = Array.isArray(orders) ? orders : []

  if (status !== 'all') {
    result = result.filter(order => adminOrderMatchesStatus(order, status))
  }

  if (search.trim() && tab === 'orders') {
    const q = search.toLowerCase()
    result = result.filter(order => {
      const listing = getListingById?.(order.listingId)
      const buyer = getUserById?.(order.buyerId)
      const seller = getUserById?.(order.sellerId)
      return (
        order.id?.toLowerCase().includes(q) ||
        order.orderRef?.toLowerCase().includes(q) ||
        order.stripePaymentIntentId?.toLowerCase().includes(q) ||
        listing?.title?.toLowerCase().includes(q) ||
        order.listingTitle?.toLowerCase().includes(q) ||
        buyer?.name?.toLowerCase().includes(q) ||
        buyer?.username?.toLowerCase().includes(q) ||
        seller?.name?.toLowerCase().includes(q) ||
        seller?.username?.toLowerCase().includes(q)
      )
    })
  }

  return result
}
