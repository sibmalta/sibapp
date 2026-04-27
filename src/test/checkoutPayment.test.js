import { describe, expect, it } from 'vitest'
import {
  buildPaymentIntentPayload,
  getPaymentInitializationBlocker,
  resolveCheckoutDeliveryMethod,
  runPaymentIntentInitialization,
  shouldInitializePaymentIntent,
} from '../lib/checkoutPayment'
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

  it('allows payment initialization when required checkout data is valid', () => {
    const state = {
      stripeConfigured: true,
      currentUser: { id: 'buyer_123' },
      sessionAccessToken: 'aaa.bbb.ccc',
      listing: { id: 'listing_123', sellerId: 'seller_123' },
      feesTotal: 12.5,
      isLocker: false,
      address: '1 Main Street',
      city: 'Valletta',
      postcode: 'VLT1234',
    }

    expect(getPaymentInitializationBlocker(state)).toBe('')
    expect(shouldInitializePaymentIntent(state)).toBe(true)
  })

  it('returns specific missing-field blockers before payment initialization', () => {
    expect(getPaymentInitializationBlocker({
      stripeConfigured: true,
      currentUser: { id: 'buyer_123' },
      sessionAccessToken: 'aaa.bbb.ccc',
      listing: { id: 'listing_123', sellerId: 'seller_123' },
      feesTotal: 12.5,
      isLocker: false,
      address: '',
      city: 'Valletta',
      postcode: 'VLT1234',
    })).toBe('Enter your street address before continuing to payment.')

    expect(getPaymentInitializationBlocker({
      stripeConfigured: true,
      currentUser: { id: 'buyer_123' },
      sessionAccessToken: 'aaa.bbb.ccc',
      listing: { id: 'listing_123', sellerId: 'seller_123' },
      feesTotal: 12.5,
      isLocker: true,
      lockerEligible: true,
      selectedLockerId: '',
    })).toBe('Please select a locker location before continuing to payment.')
  })

  it('blocked checkout returns a specific blocker and does not call createPaymentIntent', async () => {
    let called = false
    const response = await runPaymentIntentInitialization({
      stripeConfigured: true,
      currentUser: { id: 'buyer_123' },
      sessionAccessToken: 'aaa.bbb.ccc',
      listing: { id: 'listing_123', sellerId: 'seller_123' },
      feesTotal: 12.5,
      isLocker: false,
      address: '',
      city: 'Valletta',
      postcode: 'VLT1234',
    }, async () => {
      called = true
      return { clientSecret: 'pi_123_secret_456' }
    })

    expect(called).toBe(false)
    expect(response).toEqual({
      called: false,
      blocker: 'Enter your street address before continuing to payment.',
      result: null,
    })
  })

  it('valid checkout calls createPaymentIntent with a safe payload', async () => {
    let receivedPayload = null
    const response = await runPaymentIntentInitialization({
      stripeConfigured: true,
      currentUser: { id: 'buyer_123' },
      sessionAccessToken: 'aaa.bbb.ccc',
      listing: { id: 'listing_123', sellerId: 'seller_123' },
      listingId: 'listing_123',
      feesTotal: 12.5,
      isLocker: false,
      address: '1 Main Street',
      city: 'Valletta',
      postcode: 'VLT1234',
      deliveryMethod: 'home_delivery',
    }, async (payload) => {
      receivedPayload = payload
      return { clientSecret: 'pi_123_secret_456' }
    })

    expect(response.called).toBe(true)
    expect(receivedPayload).toEqual({
      listingId: 'listing_123',
      deliveryMethod: 'home_delivery',
    })
  })

  it('stale pre-attempt intent errors do not block initialization after fixing the blocker', () => {
    expect(shouldInitializePaymentIntent({
      stripeConfigured: true,
      currentUser: { id: 'buyer_123' },
      sessionAccessToken: 'aaa.bbb.ccc',
      listing: { id: 'listing_123', sellerId: 'seller_123' },
      feesTotal: 12.5,
      isLocker: false,
      address: '1 Main Street',
      city: 'Valletta',
      postcode: 'VLT1234',
      intentError: 'Enter your street address before continuing to payment.',
      hasAttemptedPaymentIntent: false,
    })).toBe(true)

    expect(shouldInitializePaymentIntent({
      stripeConfigured: true,
      currentUser: { id: 'buyer_123' },
      sessionAccessToken: 'aaa.bbb.ccc',
      listing: { id: 'listing_123', sellerId: 'seller_123' },
      feesTotal: 12.5,
      isLocker: false,
      address: '1 Main Street',
      city: 'Valletta',
      postcode: 'VLT1234',
      intentError: "We couldn't load payment options right now. Please try again in a moment.",
      hasAttemptedPaymentIntent: true,
    })).toBe(false)
  })
})
