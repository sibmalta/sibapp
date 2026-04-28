import { describe, expect, it } from 'vitest'
import { isActiveDisputeStatus, sortDisputesForAdmin } from '../lib/disputes'
import { rowToDispute, disputeToRow } from '../lib/db/orders'

describe('dispute handling helpers', () => {
  it('treats open and review statuses as active payout blockers', () => {
    expect(isActiveDisputeStatus('open')).toBe(true)
    expect(isActiveDisputeStatus('in_review')).toBe(true)
    expect(isActiveDisputeStatus('under_review')).toBe(true)
    expect(isActiveDisputeStatus('resolved_buyer')).toBe(false)
    expect(isActiveDisputeStatus('closed')).toBe(false)
  })

  it('sorts admin disputes with active disputes first and newest first', () => {
    const sorted = sortDisputesForAdmin([
      { id: 'closed-new', status: 'closed', createdAt: '2026-04-28T12:00:00.000Z' },
      { id: 'open-old', status: 'open', createdAt: '2026-04-27T12:00:00.000Z' },
      { id: 'review-new', status: 'in_review', createdAt: '2026-04-28T10:00:00.000Z' },
    ])

    expect(sorted.map(dispute => dispute.id)).toEqual(['review-new', 'open-old', 'closed-new'])
  })

  it('maps dispute listing/details/admin fields to and from Supabase rows', () => {
    const row = disputeToRow({
      orderId: 'order-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      listingId: 'listing-1',
      details: 'Item arrived damaged',
      adminNotes: 'Needs photos',
      resolvedAt: null,
    })

    expect(row).toMatchObject({
      order_id: 'order-1',
      listing_id: 'listing-1',
      details: 'Item arrived damaged',
      admin_notes: 'Needs photos',
      resolved_at: null,
    })

    expect(rowToDispute({
      id: 'dispute-1',
      ...row,
      status: 'open',
      created_at: '2026-04-28T12:00:00.000Z',
    })).toMatchObject({
      id: 'dispute-1',
      orderId: 'order-1',
      listingId: 'listing-1',
      details: 'Item arrived damaged',
      adminNotes: 'Needs photos',
    })
  })
})
