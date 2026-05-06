import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { insertNotification } from '../lib/db/notifications'
import { getOverdueOrderIdsToFlag } from '../lib/overdueNotifications'

function createDuplicateNotificationSupabaseMock(existing) {
  const eqCalls = []
  return {
    eqCalls,
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
            eq(column, value) {
              eqCalls.push([column, value])
              return this
            },
            limit() { return this },
            maybeSingle: async () => ({ data: existing, error: null }),
          }
        },
      }
    },
  }
}

function existingNotification(type, orderId = 'order-1') {
  return {
    id: `${type}-notification-1`,
    user_id: 'seller-1',
    type,
    title: type,
    message: 'Existing notification',
    read: false,
    order_id: orderId,
    metadata: type === 'offer_countered' ? { idempotencyKey: 'counter-key-1' } : {},
    created_at: '2026-05-06T10:00:00.000Z',
    updated_at: '2026-05-06T10:00:00.000Z',
  }
}

describe('notification idempotency', () => {
  it('returns the existing overdue warning notification on duplicate user/order/type', async () => {
    const supabase = createDuplicateNotificationSupabaseMock(existingNotification('overdue_warning'))

    const { data, error } = await insertNotification(supabase, {
      userId: 'seller-1',
      orderId: 'order-1',
      type: 'overdue_warning',
      title: 'Collection overdue',
      message: 'Your collection is overdue.',
    })

    expect(error).toBeNull()
    expect(data.id).toBe('overdue_warning-notification-1')
    expect(supabase.eqCalls).toEqual([
      ['user_id', 'seller-1'],
      ['type', 'overdue_warning'],
      ['order_id', 'order-1'],
    ])
  })

  it('keeps existing order-scoped dedupe behavior for sale notifications', async () => {
    for (const type of ['new_sale', 'bundle_sold']) {
      const supabase = createDuplicateNotificationSupabaseMock(existingNotification(type))
      const { data, error } = await insertNotification(supabase, {
        userId: 'seller-1',
        orderId: 'order-1',
        type,
        title: 'Sold',
        message: 'You sold an item.',
      })

      expect(error).toBeNull()
      expect(data.type).toBe(type)
      expect(supabase.eqCalls).toEqual([
        ['user_id', 'seller-1'],
        ['type', type],
        ['order_id', 'order-1'],
      ])
    }
  })

  it('keeps existing counter-offer idempotency key behavior', async () => {
    const supabase = createDuplicateNotificationSupabaseMock(existingNotification('offer_countered', null))
    const { data, error } = await insertNotification(supabase, {
      userId: 'buyer-1',
      type: 'offer_countered',
      title: 'Counter offer received',
      message: 'Seller countered',
      metadata: { idempotencyKey: 'counter-key-1' },
    })

    expect(error).toBeNull()
    expect(data.id).toBe('offer_countered-notification-1')
    expect(supabase.eqCalls).toEqual([
      ['user_id', 'buyer-1'],
      ['type', 'offer_countered'],
      ['metadata->>idempotencyKey', 'counter-key-1'],
    ])
  })

  it('does not return duplicate overdue ids when an order is already being flagged', () => {
    const now = new Date('2026-05-06T12:00:00.000Z').getTime()
    const orders = [
      { id: 'order-1', trackingStatus: 'pending', overdueFlag: false },
      { id: 'order-1', trackingStatus: 'pending', overdueFlag: false },
      { id: 'order-2', trackingStatus: 'paid', overdueFlag: false },
    ]
    const shipments = [
      { orderId: 'order-1', shipByDeadline: '2026-05-06T10:00:00.000Z' },
      { orderId: 'order-2', shipByDeadline: '2026-05-06T10:00:00.000Z' },
    ]

    expect(getOverdueOrderIdsToFlag({ orders, shipments, now })).toEqual(['order-1', 'order-2'])
    expect(getOverdueOrderIdsToFlag({ orders, shipments, now, inFlightOrderIds: new Set(['order-1']) })).toEqual(['order-2'])
  })

  it('defines cleanup SQL that preserves one overdue warning row per user/order/type', () => {
    const root = resolve(__dirname, '..', '..')
    const migration = readFileSync(resolve(root, 'supabase/migrations/20260506213000_dedupe_overdue_notifications.sql'), 'utf8')

    expect(migration).toContain("WHERE type = 'overdue_warning'")
    expect(migration).toContain('PARTITION BY user_id, order_id, type')
    expect(migration).toContain('ORDER BY created_at ASC, id ASC')
    expect(migration).toContain('ranked.duplicate_rank > 1')
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_overdue_warning_dedupe')
    expect(migration).toContain("WHERE order_id IS NOT NULL")
    expect(migration).toContain("AND type = 'overdue_warning'")
  })
})
