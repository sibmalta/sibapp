import { loadStripe } from '@stripe/stripe-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

let stripePromise = null

export function getStripe() {
  if (!stripePromise && STRIPE_PK) {
    stripePromise = loadStripe(STRIPE_PK)
  }
  return stripePromise
}

function getHeaders(accessToken) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  return headers
}

async function callEdgeFunction(fnName, body, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `Edge function ${fnName} failed (${res.status})`)
  }
  return data
}

/**
 * Create a PaymentIntent for an order.
 * @param {number} amountCents - Amount in cents (EUR)
 * @param {object} opts - { orderId, orderRef, sellerId, metadata }
 * @param {string} accessToken - User's JWT
 * @returns {{ clientSecret: string, paymentIntentId: string }}
 */
export async function createPaymentIntent(amountCents, opts = {}, accessToken) {
  return callEdgeFunction('create-payment-intent', {
    amount: amountCents,
    currency: 'eur',
    orderId: opts.orderId || '',
    orderRef: opts.orderRef || '',
    sellerId: opts.sellerId || '',
    metadata: opts.metadata || {},
  }, accessToken)
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
 * @returns {{ url: string, alreadyOnboarded: boolean, chargesEnabled: boolean, payoutsEnabled: boolean }}
 */
export async function createAccountLink(accountId, returnUrl, accessToken) {
  return callEdgeFunction('create-account-link', {
    accountId,
    returnUrl,
    refreshUrl: returnUrl,
  }, accessToken)
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
