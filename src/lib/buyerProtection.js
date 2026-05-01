export const BUYER_CONFIRMATION_WINDOW_MS = 48 * 60 * 60 * 1000
export const BUYER_PROTECTION_HOLD_STATUS = 'buyer_protection_hold'

export function getBuyerConfirmationDeadline(deliveredAt, windowMs = BUYER_CONFIRMATION_WINDOW_MS) {
  if (!deliveredAt) return null
  const deliveredTime = new Date(deliveredAt).getTime()
  if (Number.isNaN(deliveredTime)) return null
  return new Date(deliveredTime + windowMs).toISOString()
}

export function getDeliveredOrderPatch({ order = {}, now = new Date(), windowMs = BUYER_CONFIRMATION_WINDOW_MS } = {}) {
  const timestamp = now instanceof Date ? now.toISOString() : new Date(now).toISOString()
  const deliveredAt = order.deliveredAt || order.delivered_at || timestamp
  const buyerConfirmationDeadline =
    order.buyerConfirmationDeadline ||
    order.buyer_confirmation_deadline ||
    getBuyerConfirmationDeadline(deliveredAt, windowMs)

  return {
    status: 'delivered',
    trackingStatus: 'delivered',
    fulfilmentStatus: 'delivered',
    deliveredAt,
    buyerConfirmationDeadline,
    payoutStatus: BUYER_PROTECTION_HOLD_STATUS,
  }
}

export function canAutoReleaseOrder(order, now = new Date(), windowMs = BUYER_CONFIRMATION_WINDOW_MS) {
  if (!order?.deliveredAt && !order?.delivered_at) return false
  if (['disputed', 'under_review', 'in_review'].includes(order.trackingStatus || order.tracking_status)) return false
  if (['disputed', 'released'].includes(order.payoutStatus || order.payout_status)) return false
  if (order.disputedAt || order.disputed_at || order.completedAt || order.completed_at) return false

  const deliveredAt = order.deliveredAt || order.delivered_at
  const deadline = order.buyerConfirmationDeadline || order.buyer_confirmation_deadline || getBuyerConfirmationDeadline(deliveredAt, windowMs)
  const deadlineMs = new Date(deadline).getTime()
  return Number.isFinite(deadlineMs) && now.getTime() >= deadlineMs
}

export function shouldTriggerAutoTransfer(order, now = new Date(), windowMs = BUYER_CONFIRMATION_WINDOW_MS) {
  const payoutStatus = order?.payoutStatus || order?.payout_status
  if (payoutStatus === 'releasable') return true
  return canAutoReleaseOrder(order, now, windowMs)
}

export function validateCronSecretHeader({ action, headerSecret, expectedSecret } = {}) {
  if (action !== 'auto_release_due') {
    return { ok: false, code: 'unauthorized', message: 'Cron auth is only allowed for auto_release_due.' }
  }
  if (!expectedSecret) {
    return { ok: false, code: 'missing_cron_secret', message: 'Buyer protection cron secret is not configured.' }
  }
  if (!headerSecret) {
    return { ok: false, code: 'missing_cron_secret', message: 'Missing x-cron-secret header.' }
  }
  if (headerSecret !== expectedSecret) {
    return { ok: false, code: 'invalid_cron_secret', message: 'Invalid x-cron-secret header.' }
  }
  return { ok: true, code: '', message: '' }
}

export function getReleasedOrderPatch({ now = new Date(), autoConfirmed = false } = {}) {
  const timestamp = now.toISOString()
  return {
    status: 'completed',
    trackingStatus: 'completed',
    fulfilmentStatus: 'completed',
    payoutStatus: 'releasable',
    sellerPayoutStatus: 'available',
    buyerConfirmedAt: autoConfirmed ? null : timestamp,
    confirmedAt: timestamp,
    completedAt: timestamp,
    autoConfirmed,
  }
}

export function getDisputedOrderPatch({ now = new Date() } = {}) {
  const timestamp = now.toISOString()
  return {
    status: 'disputed',
    trackingStatus: 'under_review',
    fulfilmentStatus: 'under_review',
    payoutStatus: 'disputed',
    disputedAt: timestamp,
  }
}
