import { describe, expect, it } from 'vitest'
import { buildPaymentIntentPayload, resolveCheckoutDeliveryMethod } from '../lib/checkoutPayment'
import { shouldMountStripeElements } from '../pages/CheckoutPage'

describe('checkout payment helpers', () => {
  it('builds a valid home delivery payment-intent payload', () => {
    expect(buildPaymentIntentPayload({
      listingId: 'listing_123',
      offerId: 'offer_123',
      deliveryMethod: 'home_delivery',
      lockerEligible: false,
    })).toEqual({
      listingId: 'listing_123',
      offerId: 'offer_123',
      deliveryMethod: 'home_delivery',
    })
  })

  it('forces home delivery when locker is requested for a non-locker listing', () => {
    expect(resolveCheckoutDeliveryMethod('locker_collection', false)).toBe('home_delivery')
    expect(buildPaymentIntentPayload({
      listingId: 'listing_123',
      deliveryMethod: 'locker_collection',
      lockerEligible: false,
    })).toEqual({
      listingId: 'listing_123',
      deliveryMethod: 'home_delivery',
    })
  })

  it('does not mount Stripe Elements without a valid client secret', () => {
    expect(shouldMountStripeElements(null)).toBe(false)
    expect(shouldMountStripeElements('not-a-secret')).toBe(false)
    expect(shouldMountStripeElements('pi_123_secret_456', 'Payment unavailable')).toBe(false)
    expect(shouldMountStripeElements('pi_123_secret_456')).toBe(true)
  })
})
