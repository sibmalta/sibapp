import { describe, expect, it, vi } from 'vitest'
import {
  filterActiveInventoryListings,
  isActiveInventoryStatus,
  markListingSold,
} from '../lib/db/listings'

function createUpdateSupabaseMock(returnRow = {}) {
  const calls = {
    update: [],
    eq: [],
    select: 0,
    single: 0,
  }
  const chain = {
    update(payload) {
      calls.update.push(payload)
      return chain
    },
    eq(column, value) {
      calls.eq.push([column, value])
      return chain
    },
    select() {
      calls.select += 1
      return chain
    },
    single: vi.fn(async () => {
      calls.single += 1
      return { data: returnRow, error: null }
    }),
  }
  return {
    calls,
    supabase: {
      from: vi.fn(() => chain),
    },
  }
}

describe('listing inventory availability', () => {
  it('keeps only active marketplace inventory for Browse/Home feeds', () => {
    const listings = [
      { id: 'active', status: 'active' },
      { id: 'available', status: 'available' },
      { id: 'published', status: 'published' },
      { id: 'approved', status: 'approved' },
      { id: 'live', status: 'live' },
      { id: 'sold', status: 'sold' },
      { id: 'reserved', status: 'reserved' },
      { id: 'pending-payment', status: 'pending_payment' },
      { id: 'inactive', status: 'inactive' },
    ]

    expect(filterActiveInventoryListings(listings).map(listing => listing.id)).toEqual([
      'active',
      'available',
      'published',
      'approved',
      'live',
    ])
  })

  it('uses the same active inventory definition for marketplace queries and purchase guards', () => {
    for (const status of ['active', 'available', 'published', 'approved', 'live']) {
      expect(isActiveInventoryStatus(status)).toBe(true)
    }

    for (const status of ['sold', 'reserved', 'pending_payment', 'inactive', 'deleted']) {
      expect(isActiveInventoryStatus(status)).toBe(false)
    }
  })

  it('marks a paid order listing sold with sold timestamp and buyer id', async () => {
    const soldAt = '2026-05-02T12:00:00.000Z'
    const { supabase, calls } = createUpdateSupabaseMock({
      id: 'listing-1',
      status: 'sold',
      sold_at: soldAt,
      buyer_id: 'buyer-1',
    })

    const { error } = await markListingSold(supabase, 'listing-1', 'buyer-1', soldAt)

    expect(error).toBeNull()
    expect(supabase.from).toHaveBeenCalledWith('listings')
    expect(calls.update[0]).toMatchObject({
      status: 'sold',
      sold_at: soldAt,
      buyer_id: 'buyer-1',
      updated_at: soldAt,
    })
    expect(calls.eq).toContainEqual(['id', 'listing-1'])
  })

  it('does not treat failed or cancelled checkout statuses as active inventory removal signals', () => {
    const listings = [
      { id: 'failed-checkout-item', status: 'active' },
      { id: 'cancelled-checkout-item', status: 'available' },
    ]

    expect(filterActiveInventoryListings(listings).map(listing => listing.id)).toEqual([
      'failed-checkout-item',
      'cancelled-checkout-item',
    ])
  })
})
