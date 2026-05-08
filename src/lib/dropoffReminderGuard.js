export const DROPOFF_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000

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
