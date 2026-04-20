import { loadStripe } from '@stripe/stripe-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

let stripePromise = null

/**
 * Returns true if the Stripe publishable key is configured.
 * Use this to guard UI before attempting to load Stripe Elements.
 */
export function isStripeConfigured() {
  return !!STRIPE_PK
}

export function getStripe() {
  if (!stripePromise && STRIPE_PK) {
    stripePromise = loadStripe(STRIPE_PK)
  }
  return stripePromise
}

function isValidSupabaseAccessToken(value) {
  return typeof value === 'string'
    && value !== SUPABASE_ANON_KEY
    && value.split('.').length === 3
}

function getHeaders(accessToken) {
  if (!isValidSupabaseAccessToken(accessToken)) {
    throw new Error('Not authenticated. Please log in again to continue.')
  }

  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${accessToken}`,
    'x-user-token': accessToken,
  }
}

function getPayoutSettingsUrl() {
  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return new URL('seller/payout-settings', window.location.origin + normalizedBase).toString()
}

async function callEdgeFunction(fnName, body, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    const extra = Array.isArray(data.blocking_reasons) && data.blocking_reasons.length
      ? ` ${data.blocking_reasons.join(' ')}`
      : ''
    throw new Error((data.error || `Edge function ${fnName} failed (${res.status})`) + extra)
  }
  return data
}

function isValidPaymentIntentClientSecret(value) {
  return typeof value === 'string' && /^pi_[^_]+_secret_.+/.test(value)
}

/**
 * Create a PaymentIntent for an order.
 * @param {number} amountCents - Amount in cents (EUR)
 * @param {object} opts - { orderId, orderRef, sellerId, metadata }
 * @param {string} accessToken - User's JWT
 * @returns {{ clientSecret: string, paymentIntentId: string }}
 */
export async function createPaymentIntent(amountCents, opts = {}, accessToken) {
  const data = await callEdgeFunction('create-payment-intent', {
    amount: amountCents,
    currency: 'eur',
    orderId: opts.orderId || '',
    orderRef: opts.orderRef || '',
    sellerId: opts.sellerId || '',
    metadata: opts.metadata || {},
  }, accessToken)

  const clientSecret = data?.clientSecret || data?.client_secret || null
  const paymentIntentId = data?.paymentIntentId || data?.payment_intent_id || null

  if (!isValidPaymentIntentClientSecret(clientSecret)) {
    console.error('[createPaymentIntent] Invalid client secret returned from backend', {
      clientSecret,
      paymentIntentId,
      rawKeys: data ? Object.keys(data) : [],
    })
    throw new Error('Payment service returned an invalid client secret.')
  }

  return {
    ...data,
    clientSecret,
    paymentIntentId,
  }
}

/**
 * Create a Stripe Connect Express account for the current seller.
 * @param {string} accessToken
 * @returns {{ accountId: string }}
 */
export async function createConnectedAccount(accessToken) {
  return callEdgeFunction('create-connected-account', {}, accessToken)
}

/**
 * Create an onboarding or dashboard link for a connected account.
 * @param {string} accountId
 * @param {string} returnUrl
 * @param {string} accessToken
 * @returns {{ url: string, alreadyOnboarded: boolean, detailsSubmitted?: boolean, chargesEnabled: boolean, payoutsEnabled: boolean }}
 */
export async function createAccountLink(accountId, returnUrl, accessToken) {
  return callEdgeFunction('create-account-link', {
    accountId,
    returnUrl,
    refreshUrl: returnUrl,
  }, accessToken)
}

/**
 * Fetch the seller's current Stripe Connect onboarding status.
 * Does not create a connected account when none exists.
 */
export async function getStripeConnectStatus(accessToken) {
  if (!isValidSupabaseAccessToken(accessToken)) {
    throw new Error('Not authenticated. Please log in to view payout setup.')
  }

  return callEdgeFunction('stripe-connect', {
    mode: 'status',
  }, accessToken)
}

/**
 * Call the unified stripe-connect Edge Function for Stripe Connect onboarding.
 * Returns a Stripe onboarding/dashboard URL to redirect the user to.
 * @param {string} accessToken - User's JWT for authentication
 * @param {string} returnUrl - URL to return to after Stripe onboarding
 * @returns {{ url: string, accountId?: string, alreadyOnboarded?: boolean, detailsSubmitted?: boolean, chargesEnabled?: boolean, payoutsEnabled?: boolean }}
 */
export async function startStripeConnect(accessToken, returnUrl) {
  if (!isValidSupabaseAccessToken(accessToken)) {
    throw new Error('Not authenticated. Please log in to set up payouts.')
  }

  const url = `${SUPABASE_URL}/functions/v1/stripe-connect`
  const headers = getHeaders(accessToken)
  const safeReturnUrl = returnUrl || getPayoutSettingsUrl()
  const body = JSON.stringify({
    mode: 'start',
    returnUrl: safeReturnUrl,
    refreshUrl: safeReturnUrl,
  })

  console.log('[stripe-connect] POST', url)
  console.log('[stripe-connect] headers', {
    'Content-Type': headers['Content-Type'],
    'apikey': '***',
    'Authorization': 'Bearer <user-jwt>',
    'x-user-token': '<user-jwt>',
  })
  console.log('[stripe-connect] body', body)

  let res
  try {
    res = await fetch(url, { method: 'POST', headers, body })
  } catch (fetchErr) {
    console.error('[stripe-connect] network error:', fetchErr)
    throw new Error('Failed to fetch: Network error connecting to payment service.')
  }

  console.log('[stripe-connect] status', res.status)

  let data
  try {
    data = await res.json()
  } catch {
    console.error('[stripe-connect] non-JSON response, status:', res.status)
    throw new Error(`stripe-connect returned non-JSON response (${res.status})`)
  }

  console.log('[stripe-connect] response', data)

  if (!res.ok) {
    throw new Error(data.error || `stripe-connect failed (${res.status})`)
  }

  if (data.url) {
    console.log('[stripe-connect] redirect URL:', data.url)
  }

  return data
}

/**
 * Create a Stripe Transfer to a seller's connected account (payout release).
 * @param {object} params - { orderId, payoutId, amount (cents), sellerId }
 * @param {string} accessToken
 * @returns {{ transferId: string, amount: number, status: string }}
 */
export async function createTransfer(params, accessToken) {
  return callEdgeFunction('create-transfer', params, accessToken)
}

/**
 * Create a Stripe Refund for an order.
 * @param {string} orderId
 * @param {string} reason - optional: 'duplicate', 'fraudulent', or default
 * @param {string} accessToken
 * @returns {{ refundId: string, amount: number, status: string }}
 */
export async function createRefund(orderId, reason, accessToken) {
  return callEdgeFunction('create-refund', { orderId, reason }, accessToken)
}
