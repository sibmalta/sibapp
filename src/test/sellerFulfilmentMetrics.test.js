import { describe, expect, it } from 'vitest'
import {
  calculateSellerFulfilmentMetrics,
  getSellerDropoffDurations,
  MIN_FULFILMENT_METRIC_SAMPLE_SIZE,
} from '../lib/sellerFulfilmentMetrics'

function order(id, paidAt, dropoffConfirmedAt, overrides = {}) {
  return {
    id,
    status: 'paid',
    paymentStatus: 'paid',
    paidAt,
    dropoffConfirmedAt,
    ...overrides,
  }
}

describe('seller fulfilment metrics', () => {
  it('calculates average, median, and drop-off rates from paid-to-dropoff timestamps', () => {
    const base = '2026-05-01T08:00:00.000Z'
    const orders = [
      order('1', base, '2026-05-01T10:00:00.000Z'),
      order('2', base, '2026-05-01T20:00:00.000Z'),
      order('3', base, '2026-05-02T14:00:00.000Z'),
      order('4', base, '2026-05-03T08:00:00.000Z'),
      order('5', base, '2026-05-04T08:00:00.000Z'),
    ]

    expect(calculateSellerFulfilmentMetrics({ orders })).toEqual({
      avgDropoffHours: 32.8,
      medianDropoffHours: 30,
      within24hRate: 0.4,
      within48hRate: 0.8,
      sampleSize: 5,
    })
  })

  it('uses a true median for even sample sizes when explicitly allowed', () => {
    const base = '2026-05-01T08:00:00.000Z'
    const metrics = calculateSellerFulfilmentMetrics({
      minimumSampleSize: 4,
      orders: [
        order('1', base, '2026-05-01T10:00:00.000Z'),
        order('2', base, '2026-05-01T12:00:00.000Z'),
        order('3', base, '2026-05-01T18:00:00.000Z'),
        order('4', base, '2026-05-02T08:00:00.000Z'),
      ],
    })

    expect(metrics.medianDropoffHours).toBe(7)
  })

  it('excludes cancelled and refunded orders', () => {
    const base = '2026-05-01T08:00:00.000Z'
    const durations = getSellerDropoffDurations({
      orders: [
        order('valid', base, '2026-05-01T12:00:00.000Z'),
        order('cancelled', base, '2026-05-01T09:00:00.000Z', { status: 'cancelled' }),
        order('refunded', base, '2026-05-01T09:00:00.000Z', { paymentStatus: 'refunded' }),
        order('cancelled-at', base, '2026-05-01T09:00:00.000Z', { cancelledAt: '2026-05-01T09:30:00.000Z' }),
      ],
    })

    expect(durations).toEqual([4])
  })

  it('ignores missing, invalid, and backwards timestamps', () => {
    const durations = getSellerDropoffDurations({
      orders: [
        order('missing-paid', null, '2026-05-01T12:00:00.000Z'),
        order('missing-dropoff', '2026-05-01T08:00:00.000Z', null),
        order('invalid', 'not-a-date', '2026-05-01T12:00:00.000Z'),
        order('backwards', '2026-05-01T12:00:00.000Z', '2026-05-01T08:00:00.000Z'),
      ],
    })

    expect(durations).toEqual([])
  })

  it('uses shipment drop-off timestamps when order timestamps are absent', () => {
    const durations = getSellerDropoffDurations({
      orders: [order('order-1', '2026-05-01T08:00:00.000Z', null)],
      shipments: [{ orderId: 'order-1', dropoffConfirmedAt: '2026-05-01T11:30:00.000Z' }],
    })

    expect(durations).toEqual([3.5])
  })

  it('does not expose public metrics for very low sample sizes', () => {
    const metrics = calculateSellerFulfilmentMetrics({
      orders: [
        order('1', '2026-05-01T08:00:00.000Z', '2026-05-01T10:00:00.000Z'),
        order('2', '2026-05-01T08:00:00.000Z', '2026-05-01T12:00:00.000Z'),
      ],
    })

    expect(metrics).toEqual({
      avgDropoffHours: null,
      medianDropoffHours: null,
      within24hRate: null,
      within48hRate: null,
      sampleSize: 2,
    })
    expect(MIN_FULFILMENT_METRIC_SAMPLE_SIZE).toBe(5)
  })
})
