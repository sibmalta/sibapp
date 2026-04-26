import { describe, expect, it } from 'vitest'
import { insertMessage } from '../lib/db/conversations'
import { insertNotification } from '../lib/db/notifications'

function createMessageSupabaseMock() {
  const existing = {
    id: 'message-1',
    conversation_id: 'conversation-1',
    sender_id: 'seller-1',
    recipient_id: 'buyer-1',
    text: 'Counter offer received',
    type: 'offer',
    event_type: 'offer_countered',
    metadata: { idempotencyKey: 'counter-key-1' },
    created_at: '2026-04-26T10:00:00.000Z',
  }

  return {
    from(table) {
      if (table !== 'messages') throw new Error(`Unexpected table ${table}`)
      return {
        insert() {
          return {
            select() {
              return {
                single: async () => ({ data: null, error: { code: '23505', message: 'duplicate key' } }),
              }
            },
          }
        },
        select() {
          return {
            eq() { return this },
            limit() { return this },
            maybeSingle: async () => ({ data: existing, error: null }),
          }
        },
      }
    },
  }
}

function createNotificationSupabaseMock() {
  const existing = {
    id: 'notification-1',
    user_id: 'buyer-1',
    type: 'offer_countered',
    title: 'Counter offer received',
    message: 'Seller countered',
    read: false,
    metadata: { idempotencyKey: 'counter-key-1' },
    created_at: '2026-04-26T10:00:00.000Z',
    updated_at: '2026-04-26T10:00:00.000Z',
  }

  return {
    from(table) {
      if (table !== 'notifications') throw new Error(`Unexpected table ${table}`)
      return {
        insert() {
          return {
            select() {
              return {
                single: async () => ({ data: null, error: { code: '23505', message: 'duplicate key' } }),
              }
            },
          }
        },
        select() {
          return {
            eq() { return this },
            limit() { return this },
            maybeSingle: async () => ({ data: existing, error: null }),
          }
        },
      }
    },
  }
}

describe('counter-offer idempotency', () => {
  it('returns the existing buyer-facing counter-offer message on duplicate idempotency key', async () => {
    const { data, error } = await insertMessage(createMessageSupabaseMock(), {
      conversationId: 'conversation-1',
      senderId: 'seller-1',
      recipientId: 'buyer-1',
      text: 'Counter offer received',
      type: 'offer',
      eventType: 'offer_countered',
      metadata: { idempotencyKey: 'counter-key-1' },
    })

    expect(error).toBeNull()
    expect(data.id).toBe('message-1')
    expect(data.eventType).toBe('offer_countered')
    expect(data.idempotencyKey).toBe('counter-key-1')
  })

  it('returns the existing counter-offer notification on duplicate idempotency key', async () => {
    const { data, error } = await insertNotification(createNotificationSupabaseMock(), {
      userId: 'buyer-1',
      type: 'offer_countered',
      title: 'Counter offer received',
      message: 'Seller countered',
      metadata: { idempotencyKey: 'counter-key-1' },
    })

    expect(error).toBeNull()
    expect(data.id).toBe('notification-1')
    expect(data.type).toBe('offer_countered')
    expect(data.metadata.idempotencyKey).toBe('counter-key-1')
  })
})
