export const DROPOFF_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000
export const GROUPED_DROPOFF_REMINDER_WINDOW_MS = 6 * 60 * 60 * 1000
export const GROUPED_DROPOFF_REMINDER_ROUTE = '/orders?sellerDropoff=pending'
export const GROUPED_DROPOFF_REMINDER_TYPE = 'dropoff_reminder_group'

export function getDropoffReminderKey(shipment = {}, order = {}) {
  const orderId = shipment.orderId || order?.id
  const sellerId = shipment.sellerId || order?.sellerId
  return orderId && sellerId ? `${sellerId}:${orderId}` : null
}

export function shouldSkipDropoffReminder({
  shipment,
  order,
  inFlightKeys = new Set(),
  now = Date.now(),
  windowMs = DROPOFF_REMINDER_WINDOW_MS,
}) {
  if (!shipment) return { skip: true, reason: 'missing_shipment' }
  if (shipment.status !== 'awaiting_shipment') return { skip: true, reason: 'not_awaiting_shipment' }

  const key = getDropoffReminderKey(shipment, order)
  if (!key) return { skip: true, reason: 'missing_key' }
  if (inFlightKeys.has(key)) return { skip: true, reason: 'in_flight', key }

  const sentAtValue = shipment.reminderSentAt || shipment.dropoffReminderSentAt
  if (sentAtValue) {
    const sentAt = new Date(sentAtValue).getTime()
    if (Number.isFinite(sentAt) && now - sentAt < windowMs) {
      return { skip: true, reason: 'recent_reminder_sent_at', key }
    }
  }

  if (!shipment.createdAt) return { skip: true, reason: 'missing_created_at', key }
  const createdAt = new Date(shipment.createdAt).getTime()
  if (!Number.isFinite(createdAt)) return { skip: true, reason: 'invalid_created_at', key }
  if (now - createdAt < windowMs) return { skip: true, reason: 'too_early', key }

  return {
    skip: false,
    key,
    orderId: shipment.orderId || order?.id,
    sellerId: shipment.sellerId || order?.sellerId,
  }
}

export function getGroupedDropoffReminderKey(sellerId) {
  return sellerId ? `grouped_dropoff_reminder:${sellerId}` : null
}

export function shouldGroupDropoffReminders(items = []) {
  return items.length > 3
}

export function buildGroupedDropoffReminder({ sellerId, items = [] } = {}) {
  const orderRefs = items
    .map(item => item?.shipment?.orderRef || item?.order?.orderRef || item?.order?.orderCode || item?.order?.id || item?.shipment?.orderId)
    .filter(Boolean)
  const uniqueOrderRefs = [...new Set(orderRefs)]
  const visibleRefs = uniqueOrderRefs.slice(0, 3)
  const moreCount = Math.max(uniqueOrderRefs.length - visibleRefs.length, 0)
  const messageLines = [
    `You have ${uniqueOrderRefs.length} orders awaiting MYConvenience drop-off:`,
    ...visibleRefs,
  ]
  if (moreCount > 0) messageLines.push(`+${moreCount} more`)

  return {
    userId: sellerId,
    type: GROUPED_DROPOFF_REMINDER_TYPE,
    title: 'Multiple Sib parcels ready for drop-off',
    message: messageLines.join('\n'),
    actionTarget: GROUPED_DROPOFF_REMINDER_ROUTE,
    status: 'awaiting_shipment',
    metadata: {
      orderIds: items.map(item => item?.shipment?.orderId || item?.order?.id).filter(Boolean),
      orderRefs: uniqueOrderRefs,
      count: uniqueOrderRefs.length,
    },
  }
}

export function shouldSkipGroupedDropoffReminder({
  sellerId,
  orderIds = [],
  notifications = [],
  inFlightKeys = new Set(),
  now = Date.now(),
  windowMs = GROUPED_DROPOFF_REMINDER_WINDOW_MS,
}) {
  const key = getGroupedDropoffReminderKey(sellerId)
  if (!key) return { skip: true, reason: 'missing_seller' }
  if (inFlightKeys.has(key)) return { skip: true, reason: 'in_flight', key }

  const pendingOrderIds = [...new Set(orderIds.filter(Boolean))]
  if (pendingOrderIds.length === 0) return { skip: true, reason: 'missing_orders', key }

  const latestGrouped = (notifications || [])
    .filter(notification => (
      notification?.userId === sellerId &&
      notification?.type === GROUPED_DROPOFF_REMINDER_TYPE
    ))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]

  if (!latestGrouped) return { skip: false, key, reason: 'no_recent_group' }

  const createdAt = new Date(latestGrouped.createdAt || 0).getTime()
  const isRecent = Number.isFinite(createdAt) && now - createdAt < windowMs
  const notifiedOrderIds = new Set(latestGrouped.metadata?.orderIds || latestGrouped.data?.orderIds || [])
  const hasNewOrders = pendingOrderIds.some(orderId => !notifiedOrderIds.has(orderId))

  if (isRecent && !hasNewOrders) {
    return { skip: true, reason: 'recent_grouped_reminder', key, notificationId: latestGrouped.id }
  }

  return {
    skip: false,
    key,
    reason: hasNewOrders ? 'new_orders_since_grouped_reminder' : 'cooldown_expired',
  }
}
