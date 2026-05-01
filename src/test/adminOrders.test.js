import { describe, expect, it } from 'vitest'
import { ADMIN_ORDER_STATUSES, filterAdminOrders } from '../lib/adminOrders'

describe('admin order visibility', () => {
  const paidHeldOrder = {
    id: 'order-123',
    orderRef: 'SIB-PAID123',
    listingId: 'listing-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    status: 'paid',
    trackingStatus: 'awaiting_delivery',
    paymentStatus: 'paid',
    payoutStatus: 'held',
    sellerPayoutStatus: 'held',
    stripePaymentIntentId: 'pi_today_paid',
    listingTitle: 'Blue jacket',
  }

  it('includes paid/held orders in the supported admin status filters', () => {
    expect(ADMIN_ORDER_STATUSES).toContain('paid')
    expect(ADMIN_ORDER_STATUSES).toContain('held')
    expect(ADMIN_ORDER_STATUSES).toContain('releasable')
    expect(ADMIN_ORDER_STATUSES).toContain('released')
    expect(ADMIN_ORDER_STATUSES).toContain('disputed')

    expect(filterAdminOrders([paidHeldOrder], { status: 'all' })).toEqual([paidHeldOrder])
    expect(filterAdminOrders([paidHeldOrder], { status: 'paid' })).toEqual([paidHeldOrder])
    expect(filterAdminOrders([paidHeldOrder], { status: 'held' })).toEqual([paidHeldOrder])
    expect(filterAdminOrders([paidHeldOrder], { status: 'awaiting_delivery' })).toEqual([paidHeldOrder])
  })

  it('shows blocked seller setup orders in the blocked payouts filter', () => {
    const blockedOrder = {
      ...paidHeldOrder,
      id: 'order-blocked',
      payoutStatus: 'blocked_seller_setup',
      status: 'delivered',
      trackingStatus: 'delivered',
    }

    expect(ADMIN_ORDER_STATUSES).toContain('blocked_payouts')
    expect(ADMIN_ORDER_STATUSES).toContain('blocked_seller_setup')
    expect(filterAdminOrders([paidHeldOrder, blockedOrder], { status: 'blocked_payouts' })).toEqual([blockedOrder])
    expect(filterAdminOrders([paidHeldOrder, blockedOrder], { status: 'blocked_seller_setup' })).toEqual([blockedOrder])
  })

  it('can find recovered orders by Stripe PaymentIntent ID', () => {
    const result = filterAdminOrders([paidHeldOrder], {
      search: 'pi_today_paid',
      tab: 'orders',
    })

    expect(result).toEqual([paidHeldOrder])
  })
})
