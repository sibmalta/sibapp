import { describe, expect, it } from 'vitest'
import { getSellerPendingPayoutSummary } from '../lib/pendingPayouts'

describe('seller pending payout summary', () => {
  it('summarizes pending payout statuses for the current seller', () => {
    const summary = getSellerPendingPayoutSummary([
      { id: 'held-1', sellerId: 'seller-1', payoutStatus: 'buyer_protection_hold', sellerPayout: 12.5 },
      { id: 'blocked-1', sellerId: 'seller-1', payoutStatus: 'blocked_seller_setup', totalPrice: 20, platformFee: 2 },
      { id: 'failed-1', sellerId: 'seller-1', payoutStatus: 'transfer_failed', itemPrice: 8 },
      { id: 'released-1', sellerId: 'seller-1', payoutStatus: 'released', sellerPayout: 99 },
      { id: 'other-seller', sellerId: 'seller-2', payoutStatus: 'blocked_seller_setup', sellerPayout: 50 },
    ], 'seller-1')

    expect(summary.count).toBe(3)
    expect(summary.totalAmount).toBe(38.5)
    expect(summary.protectionHoldCount).toBe(1)
    expect(summary.blockedCount).toBe(1)
    expect(summary.failedCount).toBe(1)
    expect(summary.hasBlockedSetup).toBe(true)
  })

  it('uses snake_case order fields from Supabase rows', () => {
    const summary = getSellerPendingPayoutSummary([
      {
        id: 'row-1',
        seller_id: 'seller-1',
        payout_status: 'releasable',
        seller_payout: 14.25,
      },
    ], 'seller-1')

    expect(summary.count).toBe(1)
    expect(summary.releasableCount).toBe(1)
    expect(summary.totalAmount).toBe(14.25)
  })
})
