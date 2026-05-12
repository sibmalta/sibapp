import { describe, expect, it } from 'vitest'
import {
  buildPaymentIntentPayload,
  getDeliveryPhoneError,
  getPaymentInitializationBlocker,
  isValidPhoneNumber,
  normalizePhoneNumber,
  resolveCheckoutDeliveryMethod,
  runPaymentIntentInitialization,
  shouldInitializePaymentIntent,
} from '../lib/checkoutPayment'
import { shouldMountStripeElements } from '../pages/CheckoutPage'

describe('checkout payment helpers', () => {
  it('builds a valid locker payment-intent payload', () => {
    expect(buildPaymentIntentPayload({
      listingId: 'listing_123',
      offerId: 'offer_123',
      deliveryMethod: 'locker_collection',
      lockerEligible: true,
    })).toEqual({
      listingId: 'listing_123',
      offerId: 'offer_123',
      deliveryMethod: 'locker_collection',
    })
  })

  it('does not silently convert ineligible locker checkout to legacy home delivery', () => {
    expect(resolveCheckoutDeliveryMethod('locker_collection', false)).toBe('locker_collection')
    expect(buildPaymentIntentPayload({
      listingId: 'listing_123',
      deliveryMethod: 'locker_collection',
      lockerEligible: false,
    })).toEqual({
      listingId: 'listing_123',
      deliveryMethod: 'locker_collection',
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
      isLocker: true,
      lockerEligible: true,
      deliveryMethod: 'locker_collection',
      address: '1 Main Street',
      city: 'Valletta',
      postcode: 'VLT1234',
      phone: '+35699123456',
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
      deliveryMethod: 'home_delivery',
      address: '1 Main Street',
      city: 'Valletta',
      postcode: 'VLT1234',
      phone: '+35699123456',
    })).toBe('This delivery method is no longer available.')

    expect(getPaymentInitializationBlocker({
      stripeConfigured: true,
      currentUser: { id: 'buyer_123' },
      sessionAccessToken: 'aaa.bbb.ccc',
      listing: { id: 'listing_123', sellerId: 'seller_123' },
      feesTotal: 12.5,
      isLocker: false,
      deliveryMethod: 'courier_partner',
      address: '',
      city: 'Valletta',
      postcode: 'VLT1234',
      phone: '+35699123456',
    })).toBe('Enter your street address before continuing to payment.')

    expect(getPaymentInitializationBlocker({
      stripeConfigured: true,
      currentUser: { id: 'buyer_123' },
      sessionAccessToken: 'aaa.bbb.ccc',
      listing: { id: 'listing_123', sellerId: 'seller_123' },
      feesTotal: 12.5,
      isLocker: true,
      lockerEligible: true,
      deliveryMethod: 'locker_collection',
      address: '',
      city: 'Valletta',
      postcode: 'VLT1234',
      phone: '+35699123456',
    })).toBe('Enter your street address before continuing to payment.')
  })

  it('requires a valid phone number before payment initialization', () => {
    const baseState = {
      stripeConfigured: true,
      currentUser: { id: 'buyer_123' },
      sessionAccessToken: 'aaa.bbb.ccc',
      listing: { id: 'listing_123', sellerId: 'seller_123' },
      feesTotal: 12.5,
      isLocker: true,
      lockerEligible: true,
      deliveryMethod: 'locker_collection',
      address: '1 Main Street',
      city: 'Valletta',
      postcode: 'VLT1234',
    }

    expect(getPaymentInitializationBlocker(baseState)).toBe('Enter a phone number for delivery before continuing to payment.')
    expect(getPaymentInitializationBlocker({ ...baseState, phone: '123' })).toBe('Enter a valid phone number before continuing to payment.')
    expect(getPaymentInitializationBlocker({ ...baseState, phone: '+356 99 123 456' })).toBe('')
    expect(getPaymentInitializationBlocker({ ...baseState, phone: '07960 729294', phoneCountryCode: '+44' })).toBe('')
    expect(getPaymentInitializationBlocker({ ...baseState, phone: '+44 7960 729294', phoneCountryCode: '+356' })).toBe('')
    expect(getDeliveryPhoneError('+356 99 123 456')).toBe('')
  })

  it('normalizes and validates international phone numbers', () => {
    expect(normalizePhoneNumber('99 123 456')).toBe('+35699123456')
    expect(normalizePhoneNumber('35699123456')).toBe('+35699123456')
    expect(normalizePhoneNumber('0035699123456')).toBe('+35699123456')
    expect(normalizePhoneNumber('+44 (7700) 900-123')).toBe('+447700900123')
    expect(normalizePhoneNumber('07960 729294', '+44')).toBe('+447960729294')
    expect(normalizePhoneNumber('+44 7960 729294', '+356')).toBe('+447960729294')
    expect(normalizePhoneNumber('+39 06 6988 1')).toBe('+390669881')
    expect(isValidPhoneNumber('+356 99 123 456')).toBe(true)
    expect(isValidPhoneNumber('+44 7700 900123')).toBe(true)
    expect(isValidPhoneNumber('+44 (7700) 900-123')).toBe(true)
    expect(isValidPhoneNumber('')).toBe(false)
    expect(isValidPhoneNumber('call me')).toBe(false)
    expect(isValidPhoneNumber('@@@123')).toBe(false)
  })

  it('does not require buyers to select a MYConvenience location for drop-off delivery', () => {
    expect(getPaymentInitializationBlocker({
      stripeConfigured: true,
      currentUser: { id: 'buyer_123' },
      sessionAccessToken: 'aaa.bbb.ccc',
      listing: { id: 'listing_123', sellerId: 'seller_123' },
      feesTotal: 12.5,
      isLocker: true,
      lockerEligible: true,
      deliveryMethod: 'locker_collection',
      address: '1 Main Street',
      city: 'Valletta',
      postcode: 'VLT1234',
      phone: '+35699123456',
    })).toBe('')
  })

  it('blocks payment initialization for ineligible Sib Express delivery', () => {
    expect(getPaymentInitializationBlocker({
      stripeConfigured: true,
      currentUser: { id: 'buyer_123' },
      sessionAccessToken: 'aaa.bbb.ccc',
      listing: { id: 'listing_123', sellerId: 'seller_123' },
      feesTotal: 12.5,
      isLocker: true,
      lockerEligible: false,
      deliveryMethod: 'locker_collection',
      address: '1 Main Street',
      city: 'Valletta',
      postcode: 'VLT1234',
      phone: '+35699123456',
    })).toBe('Sib delivery for larger items is coming soon.')
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
      deliveryMethod: 'courier_partner',
      address: '',
      city: 'Valletta',
      postcode: 'VLT1234',
      phone: '+35699123456',
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
      isLocker: true,
      lockerEligible: true,
      deliveryMethod: 'locker_collection',
      address: '1 Main Street',
      city: 'Valletta',
      postcode: 'VLT1234',
      phone: '+35699123456',
    }, async (payload) => {
      receivedPayload = payload
      return { clientSecret: 'pi_123_secret_456' }
    })

    expect(response.called).toBe(true)
    expect(receivedPayload).toEqual({
      listingId: 'listing_123',
      deliveryMethod: 'locker_collection',
    })
  })

  it('stale pre-attempt intent errors do not block initialization after fixing the blocker', () => {
    expect(shouldInitializePaymentIntent({
      stripeConfigured: true,
      currentUser: { id: 'buyer_123' },
      sessionAccessToken: 'aaa.bbb.ccc',
      listing: { id: 'listing_123', sellerId: 'seller_123' },
      feesTotal: 12.5,
      isLocker: true,
      lockerEligible: true,
      deliveryMethod: 'locker_collection',
      address: '1 Main Street',
      city: 'Valletta',
      postcode: 'VLT1234',
      phone: '+35699123456',
      intentError: 'Enter your street address before continuing to payment.',
      hasAttemptedPaymentIntent: false,
    })).toBe(true)

    expect(shouldInitializePaymentIntent({
      stripeConfigured: true,
      currentUser: { id: 'buyer_123' },
      sessionAccessToken: 'aaa.bbb.ccc',
      listing: { id: 'listing_123', sellerId: 'seller_123' },
      feesTotal: 12.5,
      isLocker: true,
      lockerEligible: true,
      deliveryMethod: 'locker_collection',
      address: '1 Main Street',
      city: 'Valletta',
      postcode: 'VLT1234',
      phone: '+35699123456',
      intentError: "We couldn't load payment options right now. Please try again in a moment.",
      hasAttemptedPaymentIntent: true,
    })).toBe(false)
  })
})
