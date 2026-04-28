import { describe, expect, it } from 'vitest'
import {
  canCreateSellerTransfer,
  canRefundFromPlatform,
  eurosToStripeCents,
  getSellerPaymentReadiness,
  getTransferIdempotencyKey,
} from '../lib/marketplacePayments'

describe('marketplace payment safety', () => {
  it('blocks checkout when seller cannot receive payments', () => {
    expect(getSellerPaymentReadiness({
      stripeAccountId: '',
      detailsSubmitted: false,
      payoutsEnabled: false,
    })).toEqual({
      ready: false,
      blockingReasons: [
        'Seller has no Stripe connected account.',
        'Seller has not completed Stripe verification.',
        'Seller Stripe account cannot receive payouts yet.',
      ],
      message: 'Seller cannot receive payments yet.',
    })
  })

  it('allows transfer only when order and payout are releasable', () => {
    expect(canCreateSellerTransfer(
      { payoutStatus: 'releasable' },
      { status: 'releasable' },
    )).toEqual({ ok: true, reason: '' })
  })

  it('duplicate release attempt does not create a new transfer', () => {
    expect(canCreateSellerTransfer(
      { payoutStatus: 'releasable' },
      { status: 'releasable', stripeTransferId: 'tr_123' },
    )).toEqual({
      ok: false,
      reason: 'This payout already has a Stripe transfer attached.',
    })
  })

  it('dispute blocks seller transfer', () => {
    expect(canCreateSellerTransfer(
      { payoutStatus: 'disputed' },
      { status: 'releasable' },
      { hasOpenDispute: true },
    )).toEqual({
      ok: false,
      reason: 'Order has an active dispute.',
    })
  })

  it('uses order-based Stripe transfer idempotency', () => {
    expect(getTransferIdempotencyKey('order_123')).toBe('sib-transfer-order_123')
  })

  it('converts seller payout euros to Stripe transfer cents', () => {
    expect(eurosToStripeCents(12.5)).toBe(1250)
    expect(eurosToStripeCents('9.99')).toBe(999)
  })

  it('refund after released payout requires manual review', () => {
    expect(canRefundFromPlatform({ payoutStatus: 'released' })).toEqual({
      ok: false,
      reason: 'Seller payout was already released. Refund requires transfer reversal/manual review.',
    })
  })
})
