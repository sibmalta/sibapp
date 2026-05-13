const EXCLUDED_STATUSES = new Set([
  'cancelled',
  'canceled',
  'refunded',
  'failed',
  'payment_failed',
  'void',
])

export const MIN_FULFILMENT_METRIC_SAMPLE_SIZE = 5

function firstValue(...values) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== '')
}

function parseTime(value) {
  const time = new Date(value || '').getTime()
  return Number.isFinite(time) ? time : null
}

function isExcludedOrder(order = {}) {
  const statuses = [
    order.status,
    order.trackingStatus,
    order.tracking_status,
    order.paymentStatus,
    order.payment_status,
    order.payoutStatus,
    order.payout_status,
  ].map(value => String(value || '').toLowerCase())

  return statuses.some(status => EXCLUDED_STATUSES.has(status)) ||
    Boolean(order.cancelledAt || order.cancelled_at || order.refundedAt || order.refunded_at)
}

function getPaidAt(order = {}) {
  return firstValue(
    order.paidAt,
    order.paid_at,
    order.paymentCapturedAt,
    order.payment_captured_at,
    order.createdAt,
    order.created_at,
  )
}

function getDropoffConfirmedAt(order = {}, shipment = {}) {
  return firstValue(
    order.dropoffConfirmedAt,
    order.dropoff_confirmed_at,
    order.droppedOffAt,
    order.dropped_off_at,
    shipment.dropoffConfirmedAt,
    shipment.dropoff_confirmed_at,
    shipment.droppedOffAt,
    shipment.dropped_off_at,
  )
}

function median(values = []) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}

export function getSellerDropoffDurations({ orders = [], shipments = [] } = {}) {
  return (orders || []).map(order => {
    const shipment = (shipments || []).find(item => (
      item?.orderId === order?.id ||
      item?.order_id === order?.id ||
      item?.orderId === order?.orderId ||
      item?.order_id === order?.order_id
    ))

    if (!order || isExcludedOrder(order)) return null

    const paidAt = parseTime(getPaidAt(order))
    const dropoffConfirmedAt = parseTime(getDropoffConfirmedAt(order, shipment))
    if (!paidAt || !dropoffConfirmedAt || dropoffConfirmedAt < paidAt) return null

    return (dropoffConfirmedAt - paidAt) / (1000 * 60 * 60)
  }).filter(value => Number.isFinite(value))
}

export function calculateSellerFulfilmentMetrics({ orders = [], shipments = [], minimumSampleSize = MIN_FULFILMENT_METRIC_SAMPLE_SIZE } = {}) {
  const durations = getSellerDropoffDurations({ orders, shipments })
  const sampleSize = durations.length

  if (sampleSize < minimumSampleSize) {
    return {
      avgDropoffHours: null,
      medianDropoffHours: null,
      within24hRate: null,
      within48hRate: null,
      sampleSize,
    }
  }

  const average = durations.reduce((sum, value) => sum + value, 0) / sampleSize
  const rate = (limit) => durations.filter(value => value <= limit).length / sampleSize

  return {
    avgDropoffHours: Number(average.toFixed(1)),
    medianDropoffHours: Number(median(durations).toFixed(1)),
    within24hRate: Number(rate(24).toFixed(3)),
    within48hRate: Number(rate(48).toFixed(3)),
    sampleSize,
  }
}
