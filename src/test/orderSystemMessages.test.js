import { describe, expect, it } from 'vitest'
import {
  buildCourierCollectedSystemMessage,
  buildDeliveredSystemMessage,
  buildDropoffConfirmedSystemMessage,
  buildOrderCompletedSystemMessage,
  ORDER_SYSTEM_EVENT_TYPES,
} from '../lib/orderSystemMessages'

const order = {
  id: 'order-123',
  listingId: 'listing-123',
  buyerId: 'buyer-123',
  sellerId: 'seller-123',
}

describe('order lifecycle system messages', () => {
  it('creates a non-replyable same-day drop-off timeline message before noon', () => {
    const message = buildDropoffConfirmedSystemMessage({
      order,
      timestamp: '2026-05-05T09:30:00.000Z',
      deliveryTiming: 'same_day',
    })

    expect(message).toMatchObject({
      type: 'system',
      eventType: ORDER_SYSTEM_EVENT_TYPES.DROPOFF_CONFIRMED,
      senderId: 'system',
      orderId: order.id,
      title: 'Parcel dropped off',
      text: 'Your parcel is awaiting courier collection. Expected delivery: Today',
      read: true,
      notUserGenerated: true,
      replyable: false,
      editable: false,
      deletable: false,
    })
    expect(message.lines).toEqual(['Your parcel is awaiting courier collection.', 'Expected delivery: Today'])
  })

  it('creates a next-working-day drop-off timeline message after noon', () => {
    const message = buildDropoffConfirmedSystemMessage({
      order,
      timestamp: '2026-05-05T12:30:00.000Z',
      deliveryTiming: 'next_day',
    })

    expect(message.title).toBe('Parcel dropped off')
    expect(message.lines).toEqual(['Your parcel will be delivered next working day.'])
    expect(message.deliveryTiming).toBe('next_day')
  })

  it('creates courier collected, delivered, and completed system messages', () => {
    expect(buildCourierCollectedSystemMessage({ order })).toMatchObject({
      type: 'system',
      eventType: ORDER_SYSTEM_EVENT_TYPES.COURIER_COLLECTED,
      title: 'Parcel collected by courier',
      lines: ['Your delivery is in progress.'],
    })
    expect(buildDeliveredSystemMessage({ order })).toMatchObject({
      type: 'system',
      eventType: ORDER_SYSTEM_EVENT_TYPES.DELIVERED,
      title: 'Delivered',
      lines: ['Your parcel has been delivered.'],
    })
    expect(buildOrderCompletedSystemMessage({ order, seller: { username: 'seller' } })).toMatchObject({
      type: 'system',
      eventType: ORDER_SYSTEM_EVENT_TYPES.COMPLETED,
      title: 'Order completed',
      lines: ['Funds released to seller', 'Please leave a review.'],
      feedbackUrl: '/reviews/seller',
    })
  })
})
