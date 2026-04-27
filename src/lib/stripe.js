import { loadStripe } from '@stripe/stripe-js'
import { ensureFreshSupabaseSession } from './supabase'
import { buildPaymentIntentPayload } from './checkoutPayment'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

let stripePromise = null
const EDGE_TIMEOUT_MS = 15000

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

async function resolveAccessToken(accessToken) {
  try {
    const freshSession = await ensureFreshSupabaseSession()
    if (isValidSupabaseAccessToken(freshSession?.access_token)) {
      return freshSession.access_token
    }
  } catch (error) {
    console.warn('[stripe] Could not resolve fresh Supabase session before Edge Function call:', {
      message: error?.message || String(error),
      hasFallbackToken: Boolean(accessToken),
    })
  }

  if (isValidSupabaseAccessToken(accessToken)) {
    return accessToken
  }

  throw new Error('Not authenticated. Please log in again to continue.')
}

function getHeaders(accessToken) {
  if (!isValidSupabaseAccessToken(accessToken)) {
    console.error('[stripe] Missing or invalid Supabase access token for Edge Function call', {
      hasToken: Boolean(accessToken),
      tokenParts: typeof accessToken === 'string' ? accessToken.split('.').length : 0,
      tokenLooksLikeAnonKey: accessToken === SUPABASE_ANON_KEY,
    })
    throw new Error('Not authenticated. Please log in again to continue.')
  }

  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
  }
}

function getPayoutSettingsUrl() {
  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return new URL('seller/payout-settings', window.location.origin + normalizedBase).toString()
}

async function callEdgeFunction(fnName, body, accessToken) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase frontend environment variables are missing.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), EDGE_TIMEOUT_MS)

  let res
  try {
    const token = await resolveAccessToken(accessToken)
    console.info(`[${fnName}] Calling Edge Function`, {
      hasAuthToken: true,
      payload: body,
    })
    res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`Edge function ${fnName} timed out after ${EDGE_TIMEOUT_MS / 1000}s.`)
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }

  let data
  try {
    data = await res.json()
  } catch {
    if (res.status === 401) {
      console.error(`[${fnName}] Edge function rejected auth before JSON response`, {
        status: res.status,
        hasAccessToken: Boolean(accessToken),
      })
      data = {
        error: 'Your session expired. Please log in again before continuing.',
        code: 'edge_auth_rejected',
        step: 'edge_gateway_auth',
      }
    } else {
      throw new Error(`Edge function ${fnName} returned a non-JSON response (${res.status}).`)
    }
  }

  if (res.status === 401) {
    console.warn(`[${fnName}] Edge function returned 401; refreshing session and retrying once`, {
      code: data?.code || null,
      step: data?.step || null,
      error: data?.error || null,
    })
    try {
      const refreshed = await ensureFreshSupabaseSession({ minTtlSeconds: Number.MAX_SAFE_INTEGER })
      const retryRes = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
        method: 'POST',
        headers: getHeaders(refreshed.access_token),
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      res = retryRes
      data = await retryRes.json().catch(() => null)
    } catch (retryError) {
      console.error(`[${fnName}] Session refresh/retry after 401 failed`, {
        message: retryError?.message || String(retryError),
      })
    }
  }

  if (!res.ok) {
    console.error(`[${fnName}] Edge function failed`, {
      status: res.status,
      code: data?.code || null,
      step: data?.step || null,
      error: data?.error || null,
      details: data?.details || {},
    })

    const extra = Array.isArray(data?.blocking_reasons) && data.blocking_reasons.length
      ? ` ${data.blocking_reasons.join(' ')}`
      : ''

    const requestId = res.headers.get('x-request-id') || res.headers.get('x-supabase-request-id')
    const diagnostic = requestId ? ` Request ID: ${requestId}.` : ''
    const structured = data?.code && data?.step ? ` [${data.code} at ${data.step}]` : ''
    throw new Error((data?.error || `Edge function ${fnName} failed (${res.status}).`) + structured + extra + diagnostic)
  }

  return data
}

function isValidPaymentIntentClientSecret(value) {
  return typeof value === 'string' && /^pi_[^_]+_secret_.+/.test(value)
}

export async function createPaymentIntent(opts = {}, accessToken) {
  const payload = buildPaymentIntentPayload(opts)
  const data = await callEdgeFunction(
    'create-payment-intent',
      payload,
    accessToken
  )

  const clientSecret = data?.clientSecret || data?.client_secret || null
  const paymentIntentId = data?.paymentIntentId || data?.payment_intent_id || null

  if (!isValidPaymentIntentClientSecret(clientSecret)) {
    console.error('[createPaymentIntent] Invalid client secret returned from backend', {
      hasClientSecret: typeof clientSecret === 'string',
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

export async function createConnectedAccount(accessToken) {
  return callEdgeFunction('create-connected-account', {}, accessToken)
}

export async function createAccountLink(returnUrl, accessToken) {
  return callEdgeFunction(
    'create-account-link',
    {
      returnUrl,
      refreshUrl: returnUrl,
    },
    accessToken
  )
}

export async function getStripeConnectStatus(accessToken) {
  if (!isValidSupabaseAccessToken(accessToken)) {
    throw new Error('Not authenticated. Please log in to view payout setup.')
  }

  return callEdgeFunction(
    'stripe-connect',
    {
      mode: 'status',
    },
    accessToken
  )
}

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
    apikey: '***',
    Authorization: 'Bearer <user-jwt>',
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

export async function createTransfer(params, accessToken) {
  return callEdgeFunction('create-transfer', params, accessToken)
}

export async function createRefund(orderId, reason, accessToken) {
  return callEdgeFunction('create-refund', { orderId, reason }, accessToken)
}
