export function getSellerPaymentReadiness(profile = {}) {
  const blockingReasons = []

  if (!profile?.stripeAccountId && !profile?.stripe_account_id) {
    blockingReasons.push('Seller has no Stripe connected account.')
  }
  if (!(profile?.detailsSubmitted ?? profile?.details_submitted)) {
    blockingReasons.push('Seller has not completed Stripe verification.')
  }
  if (!(profile?.payoutsEnabled ?? profile?.payouts_enabled)) {
    blockingReasons.push('Seller Stripe account cannot receive payouts yet.')
  }

  return {
    ready: blockingReasons.length === 0,
    blockingReasons,
    message: blockingReasons.length ? 'Seller cannot receive payments yet.' : '',
  }
}

function roundMoney(value) {
  return Number((Number(value || 0)).toFixed(2))
}

export function calculateMarketplacePaymentSplit({
  itemPrice = 0,
  buyerProtectionFee = 0,
  deliveryFee = 0,
  sellerSideFee = 0,
} = {}) {
  const item = roundMoney(itemPrice)
  const buyerProtection = roundMoney(buyerProtectionFee)
  const delivery = roundMoney(deliveryFee)
  const sellerFee = roundMoney(sellerSideFee)
  const sellerPayoutAmount = roundMoney(Math.max(0, item - sellerFee))
  const platformFeeAmount = roundMoney(buyerProtection + delivery + sellerFee)
  const buyerTotalAmount = roundMoney(item + buyerProtection + delivery)

  return {
    buyerTotalAmount,
    itemPrice: item,
    sellerPayoutAmount,
    platformFeeAmount,
    buyerProtectionFeeAmount: buyerProtection,
    deliveryFeeAmount: delivery,
    sellerSideFeeAmount: sellerFee,
  }
}

export function canCreateSellerTransfer(order = {}, payout = {}, { hasOpenDispute = false } = {}) {
  if (order.payoutStatus === 'released' || order.payout_status === 'released' || order.payoutReleasedAt || order.payout_released_at) {
    return { ok: false, reason: 'Seller has already been paid for this order.' }
  }
  if (order.payoutStatus === 'disputed' || order.payout_status === 'disputed' || order.disputedAt || order.disputed_at || hasOpenDispute) {
    return { ok: false, reason: 'Order has an active dispute.' }
  }
  if ((order.payoutStatus || order.payout_status) !== 'releasable') {
    return { ok: false, reason: 'Order payout is not releasable yet.' }
  }
  if (payout.stripeTransferId || payout.stripe_transfer_id) {
    return { ok: false, reason: 'This payout already has a Stripe transfer attached.' }
  }
  if ((payout.status || '') !== 'releasable') {
    return { ok: false, reason: `Payout is not eligible for release from status "${payout.status || 'unknown'}".` }
  }
  return { ok: true, reason: '' }
}

export function getTransferIdempotencyKey(orderId) {
  return `sib-transfer-${orderId}`
}

export function eurosToStripeCents(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.round(value * 100)
}

export function canRefundFromPlatform(order = {}) {
  const payoutStatus = order.payoutStatus || order.payout_status
  const sellerPayoutStatus = order.sellerPayoutStatus || order.seller_payout_status
  if (payoutStatus === 'released' || sellerPayoutStatus === 'paid' || order.payoutReleasedAt || order.payout_released_at) {
    return {
      ok: false,
      reason: 'Seller payout was already released. Refund requires transfer reversal/manual review.',
    }
  }
  return { ok: true, reason: '' }
}
