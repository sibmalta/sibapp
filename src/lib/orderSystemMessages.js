import { getCourierDeliveryTiming } from './courierDeliveryTiming'

export const ORDER_SYSTEM_EVENT_TYPES = {
  DROPOFF_CONFIRMED: 'dropoff_confirmed',
  COURIER_COLLECTED: 'courier_collected',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
}

function normalizeTiming(timing, timestamp) {
  if (timing === 'same_day' || timing === 'next_day') return timing
  if (timing === 'Same-day') return 'same_day'
  if (timing === 'Next-day') return 'next_day'
  return getCourierDeliveryTiming(timestamp)
}

function baseSystemEvent({ eventType, title, lines = [], timestamp, order, listingId, extra = {} }) {
  const cleanLines = lines.filter(Boolean)
  return {
    type: 'system',
    eventType,
    senderId: 'system',
    orderId: order?.id || extra.orderId || null,
    listingId: listingId || order?.listingId || extra.listingId || null,
    title,
    text: cleanLines.join(' '),
    lines: cleanLines,
    timestamp: timestamp || new Date().toISOString(),
    read: true,
    notUserGenerated: true,
    replyable: false,
    editable: false,
    deletable: false,
    eventKey: `${eventType}:${order?.id || extra.orderId || 'unknown'}`,
    ...extra,
  }
}

export function buildDropoffConfirmedSystemMessage({ order, timestamp, deliveryTiming }) {
  const timing = normalizeTiming(deliveryTiming, timestamp)
  const lines = timing === 'same_day'
    ? ['Your parcel is awaiting courier collection.', 'Expected delivery: Today']
    : ['Your parcel will be delivered next working day.']

  return baseSystemEvent({
    eventType: ORDER_SYSTEM_EVENT_TYPES.DROPOFF_CONFIRMED,
    title: 'Parcel dropped off',
    lines,
    timestamp,
    order,
    extra: { deliveryTiming: timing },
  })
}

export function buildCourierCollectedSystemMessage({ order, timestamp }) {
  return baseSystemEvent({
    eventType: ORDER_SYSTEM_EVENT_TYPES.COURIER_COLLECTED,
    title: 'Parcel collected by courier',
    lines: ['Your delivery is in progress.'],
    timestamp,
    order,
  })
}

export function buildDeliveredSystemMessage({ order, timestamp }) {
  return baseSystemEvent({
    eventType: ORDER_SYSTEM_EVENT_TYPES.DELIVERED,
    title: 'Delivered',
    lines: ['Your parcel has been delivered.'],
    timestamp,
    order,
  })
}

export function buildOrderCompletedSystemMessage({ order, timestamp, seller }) {
  return baseSystemEvent({
    eventType: ORDER_SYSTEM_EVENT_TYPES.COMPLETED,
    title: 'Order completed',
    lines: ['Funds released to seller', 'Please leave a review.'],
    timestamp,
    order,
    extra: {
      feedbackUrl: seller?.username ? `/reviews/${seller.username}` : null,
    },
  })
}
