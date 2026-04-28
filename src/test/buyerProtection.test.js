import { describe, expect, it } from 'vitest'
import {
  canAutoReleaseOrder,
  getBuyerConfirmationDeadline,
  getDisputedOrderPatch,
  getReleasedOrderPatch,
  shouldTriggerAutoTransfer,
  validateCronSecretHeader,
} from '../lib/buyerProtection'

describe('buyer protection release flow', () => {
  it('buyer confirms -> funds become releasable', () => {
    const now = new Date('2026-04-27T10:00:00.000Z')
    const patch = getReleasedOrderPatch({ now, autoConfirmed: false })

    expect(patch.status).toBe('completed')
    expect(patch.payoutStatus).toBe('releasable')
    expect(patch.sellerPayoutStatus).toBe('available')
    expect(patch.buyerConfirmedAt).toBe(now.toISOString())
    expect(patch.completedAt).toBe(now.toISOString())
  })

  it('48h passes -> auto-release is allowed', () => {
    const deliveredAt = '2026-04-25T09:00:00.000Z'
    const order = {
      deliveredAt,
      buyerConfirmationDeadline: getBuyerConfirmationDeadline(deliveredAt),
      trackingStatus: 'delivered',
      payoutStatus: 'held',
    }

    expect(canAutoReleaseOrder(order, new Date('2026-04-27T09:00:01.000Z'))).toBe(true)
  })

  it('buyer disputes -> funds remain held/disputed', () => {
    const now = new Date('2026-04-27T10:00:00.000Z')
    const patch = getDisputedOrderPatch({ now })

    expect(patch.status).toBe('disputed')
    expect(patch.trackingStatus).toBe('under_review')
    expect(patch.payoutStatus).toBe('disputed')
    expect(patch.disputedAt).toBe(now.toISOString())
  })

  it('frontend refresh cannot release funds before the deadline', () => {
    const deliveredAt = '2026-04-27T09:00:00.000Z'
    const order = {
      deliveredAt,
      buyerConfirmationDeadline: getBuyerConfirmationDeadline(deliveredAt),
      trackingStatus: 'delivered',
      payoutStatus: 'held',
    }

    expect(canAutoReleaseOrder(order, new Date('2026-04-27T10:00:00.000Z'))).toBe(false)
  })

  it('frontend refresh cannot release disputed funds', () => {
    const deliveredAt = '2026-04-25T09:00:00.000Z'
    const order = {
      deliveredAt,
      buyerConfirmationDeadline: getBuyerConfirmationDeadline(deliveredAt),
      trackingStatus: 'under_review',
      payoutStatus: 'disputed',
      disputedAt: '2026-04-26T09:00:00.000Z',
    }

    expect(canAutoReleaseOrder(order, new Date('2026-04-27T10:00:00.000Z'))).toBe(false)
  })

  it('48h passed -> transfer should be triggered', () => {
    const deliveredAt = '2026-04-25T09:00:00.000Z'
    const order = {
      deliveredAt,
      buyerConfirmationDeadline: getBuyerConfirmationDeadline(deliveredAt),
      trackingStatus: 'delivered',
      payoutStatus: 'held',
    }

    expect(shouldTriggerAutoTransfer(order, new Date('2026-04-27T09:00:01.000Z'))).toBe(true)
  })

  it('disputed order -> transfer is not triggered', () => {
    const deliveredAt = '2026-04-25T09:00:00.000Z'
    const order = {
      deliveredAt,
      buyerConfirmationDeadline: getBuyerConfirmationDeadline(deliveredAt),
      trackingStatus: 'under_review',
      payoutStatus: 'disputed',
      disputedAt: '2026-04-26T09:00:00.000Z',
    }

    expect(shouldTriggerAutoTransfer(order, new Date('2026-04-27T10:00:00.000Z'))).toBe(false)
  })

  it('already released order -> transfer is skipped', () => {
    const order = {
      deliveredAt: '2026-04-25T09:00:00.000Z',
      trackingStatus: 'completed',
      payoutStatus: 'released',
      payoutReleasedAt: '2026-04-27T09:30:00.000Z',
    }

    expect(shouldTriggerAutoTransfer(order, new Date('2026-04-27T10:00:00.000Z'))).toBe(false)
  })

  it('duplicate cron call on releasable order can retry transfer without reopening protection window', () => {
    const order = {
      deliveredAt: '2026-04-25T09:00:00.000Z',
      trackingStatus: 'completed',
      payoutStatus: 'releasable',
      completedAt: '2026-04-27T09:00:00.000Z',
    }

    expect(shouldTriggerAutoTransfer(order, new Date('2026-04-27T10:00:00.000Z'))).toBe(true)
  })

  it('validates cron auth using x-cron-secret only for auto_release_due', () => {
    expect(validateCronSecretHeader({
      action: 'auto_release_due',
      headerSecret: 'secret-123',
      expectedSecret: 'secret-123',
    })).toEqual({ ok: true, code: '', message: '' })

    expect(validateCronSecretHeader({
      action: 'auto_release_due',
      headerSecret: '',
      expectedSecret: 'secret-123',
    }).code).toBe('missing_cron_secret')

    expect(validateCronSecretHeader({
      action: 'auto_release_due',
      headerSecret: 'wrong',
      expectedSecret: 'secret-123',
    }).code).toBe('invalid_cron_secret')

    expect(validateCronSecretHeader({
      action: 'confirm_order',
      headerSecret: 'secret-123',
      expectedSecret: 'secret-123',
    }).code).toBe('unauthorized')
  })
})
