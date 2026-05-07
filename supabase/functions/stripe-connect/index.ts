const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
  'Access-Control-Max-Age': '86400',
}

import Stripe from 'npm:stripe@14.14.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

type StripeConnectBody = {
  mode?: 'start' | 'status' | 'reset_invalid_account'
  returnUrl?: string
  refreshUrl?: string
  confirmation?: string
}

const PRODUCTION_APP_URL = 'https://sibmalta.com'
const PAYOUT_SETTINGS_PATH = '/seller/payout-settings'
const TEST_MODE_ACCOUNT_MESSAGE = 'This payout account was created in Stripe test mode. Please restart payout setup with a live account.'

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getAppUrl() {
  const configuredUrl = Deno.env.get('APP_URL')?.trim()
  if (!configuredUrl) return PRODUCTION_APP_URL

  try {
    const parsed = new URL(configuredUrl)
    const hostname = parsed.hostname.toLowerCase()
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
    const isSibDomain = hostname === 'sibmalta.com' || hostname.endsWith('.sibmalta.com')

    if (parsed.protocol === 'https:' && isSibDomain && !isLocalhost) {
      return parsed.origin
    }
  } catch {
    // Ignore malformed values and use the production web app URL below.
  }

  console.warn('[stripe-connect] Ignoring unsafe APP_URL for onboarding redirect:', configuredUrl)
  return PRODUCTION_APP_URL
}

function buildAppUrl(path = PAYOUT_SETTINGS_PATH) {
  return new URL(path, getAppUrl()).toString()
}

function getFallbackPayoutUrl() {
  return buildAppUrl(PAYOUT_SETTINGS_PATH)
}

function sanitizeUrl(input: string | undefined, fallback: string) {
  if (!input) return fallback
  try {
    const parsed = new URL(input)
    const hostname = parsed.hostname.toLowerCase()
    const isSibDomain = hostname === 'sibmalta.com' || hostname.endsWith('.sibmalta.com')
    if (parsed.protocol === 'https:' && isSibDomain) {
      return parsed.toString()
    }
  } catch {
    // Ignore invalid URLs and fall back below.
  }
  return fallback
}

function stripeConnectErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const stripeError = error as { code?: string; type?: string; requestId?: string }
  const details = {
    code: stripeError?.code || null,
    type: stripeError?.type || null,
    requestId: stripeError?.requestId || null,
  }

  if (/Only Stripe Connect platforms can work with other accounts/i.test(message)) {
    return jsonResponse(
      {
        error: 'Stripe Connect is not enabled for the configured Stripe account. Use the platform STRIPE_SECRET_KEY for a Stripe Connect platform, then try verification again.',
        code: 'stripe_connect_platform_required',
        details,
      },
      500,
    )
  }

  if (isStripeModeMismatchError(error)) {
    return jsonResponse(
      {
        error: TEST_MODE_ACCOUNT_MESSAGE,
        code: 'stripe_account_mode_mismatch',
        details,
      },
      409,
    )
  }

  return jsonResponse(
    {
      error: message || 'Failed to set up Stripe Connect',
      code: stripeError?.code || 'stripe_connect_failed',
      details,
    },
    500,
  )
}

function getStripeKeyMode(stripeKey: string) {
  if (stripeKey.startsWith('sk_live_')) return 'live'
  if (stripeKey.startsWith('sk_test_')) return 'test'
  return 'unknown'
}

function getExpectedStripeMode() {
  const explicit = Deno.env.get('STRIPE_MODE')?.trim().toLowerCase()
  if (explicit === 'live' || explicit === 'test') return explicit

  const environment = [
    Deno.env.get('APP_ENV'),
    Deno.env.get('ENVIRONMENT'),
    Deno.env.get('VERCEL_ENV'),
    Deno.env.get('SUPABASE_ENV'),
  ].filter(Boolean).join(' ').toLowerCase()

  if (/\b(production|prod|live)\b/.test(environment)) return 'live'
  if (/\b(local|development|dev|staging|preview|test)\b/.test(environment)) return 'test'

  const urls = [
    Deno.env.get('APP_URL'),
    Deno.env.get('SUPABASE_URL'),
  ].filter(Boolean)

  if (urls.some((url) => /localhost|127\.0\.0\.1|\.local/i.test(url || ''))) return 'test'
  if (urls.some((url) => /sibmalta\.com/i.test(url || ''))) return 'live'

  return null
}

function validateStripeKeyForEnvironment(stripeKey: string) {
  const keyMode = getStripeKeyMode(stripeKey)
  const expectedMode = getExpectedStripeMode()

  if (!expectedMode || keyMode === 'unknown' || keyMode === expectedMode) return

  const target = expectedMode === 'live' ? 'Production' : 'Non-production'
  throw new Error(`${target} payout setup is configured with a Stripe ${keyMode} secret key. Use a Stripe ${expectedMode} secret key for this environment.`)
}

function isInvalidConnectedAccountError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const stripeError = error as { code?: string; type?: string }
  return (
    stripeError?.code === 'account_invalid' ||
    stripeError?.code === 'resource_missing' ||
    /provided key does not have access to account/i.test(message) ||
    /No such account/i.test(message) ||
    /account_invalid/i.test(message)
  )
}

function isStripeModeMismatchError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /test account created with a testmode key/i.test(message)
    || /can only be used with testmode keys/i.test(message)
    || /live account created with a livemode key/i.test(message)
    || /can only be used with livemode keys/i.test(message)
}

function getServiceRoleClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

function parseUserToken(req: Request) {
  const userToken = req.headers.get('x-user-token')
    || req.headers.get('authorization')?.replace('Bearer ', '')

  if (!userToken) {
    return { error: 'Not authenticated. Please log in.' }
  }

  try {
    const payloadBase64 = userToken.split('.')[1]
    const payload = JSON.parse(atob(payloadBase64))
    return {
      userId: payload.sub as string,
      userEmail: payload.email as string,
    }
  } catch {
    return { error: 'Invalid authentication token.' }
  }
}

async function syncStripeAccountStatus(
  supabase: ReturnType<typeof getServiceRoleClient>,
  stripe: Stripe,
  userId: string,
  accountId: string,
) {
  const account = await stripe.accounts.retrieve(accountId)
  const updates = {
    stripe_account_id: account.id,
    details_submitted: account.details_submitted || false,
    stripe_onboarding_complete: account.details_submitted || false,
    charges_enabled: account.charges_enabled || false,
    payouts_enabled: account.payouts_enabled || false,
    stripe_status_updated_at: new Date().toISOString(),
  }

  await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  return {
    account,
    updates,
  }
}

async function clearStoredStripeAccount(
  supabase: ReturnType<typeof getServiceRoleClient>,
  userId: string,
  reason: string,
) {
  console.warn('[stripe-connect] Clearing stale stripe_account_id', { userId, reason })
  await supabase
    .from('profiles')
    .update({
      stripe_account_id: null,
      details_submitted: false,
      stripe_onboarding_complete: false,
      charges_enabled: false,
      payouts_enabled: false,
      stripe_status_updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
}

async function createConnectedAccountForUser(
  supabase: ReturnType<typeof getServiceRoleClient>,
  stripe: Stripe,
  userId: string,
  userEmail: string,
) {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'MT',
    email: userEmail,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      user_id: userId,
    },
  })

  await supabase
    .from('profiles')
    .update({
      stripe_account_id: account.id,
      details_submitted: false,
      stripe_onboarding_complete: false,
      charges_enabled: false,
      payouts_enabled: false,
      stripe_status_updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  return account
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return jsonResponse(
        { error: 'STRIPE_SECRET_KEY not configured. Add it in Environment Variables.' },
        500,
      )
    }
    validateStripeKeyForEnvironment(stripeKey)

    const auth = parseUserToken(req)
    if ('error' in auth) {
      return jsonResponse({ error: auth.error }, 401)
    }

    const { userId, userEmail } = auth
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    const supabase = getServiceRoleClient()

    let body: StripeConnectBody = {}
    try {
      body = await req.json()
    } catch {
      // Empty JSON body is fine.
    }

    const mode = body.mode || 'start'
    const fallbackUrl = getFallbackPayoutUrl()
    const returnUrl = sanitizeUrl(body.returnUrl, fallbackUrl)
    const refreshUrl = sanitizeUrl(body.refreshUrl, returnUrl)

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, details_submitted, stripe_onboarding_complete, charges_enabled, payouts_enabled')
      .eq('id', userId)
      .single()

    let accountId = profile?.stripe_account_id || null

    if (mode === 'reset_invalid_account') {
      if (body.confirmation !== 'RESET_STRIPE_ACCOUNT') {
        return jsonResponse({ error: 'Reset confirmation is required.' }, 400)
      }

      await clearStoredStripeAccount(supabase, userId, 'manual reset requested by authenticated seller')
      return jsonResponse({
        accountId: null,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingRequired: true,
        accountReset: true,
      })
    }

    if (mode === 'status' && !accountId) {
      return jsonResponse({
        accountId: null,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingRequired: true,
      })
    }

    if (!accountId) {
      const account = await createConnectedAccountForUser(supabase, stripe, userId, userEmail)
      accountId = account.id
    }

    let account: Stripe.Account
    let recreatedAccount = false
    try {
      const synced = await syncStripeAccountStatus(supabase, stripe, userId, accountId)
      account = synced.account
    } catch (error) {
      if (isStripeModeMismatchError(error)) {
        await clearStoredStripeAccount(supabase, userId, error instanceof Error ? error.message : 'stripe mode mismatch')

        if (mode === 'status') {
          return jsonResponse({
            accountId: null,
            detailsSubmitted: false,
            chargesEnabled: false,
            payoutsEnabled: false,
            onboardingRequired: true,
            accountReset: true,
            resetReason: 'stripe_account_mode_mismatch',
          })
        }

        return jsonResponse(
          {
            error: TEST_MODE_ACCOUNT_MESSAGE,
            code: 'stripe_account_mode_mismatch',
            accountReset: true,
          },
          409,
        )
      }

      if (!isInvalidConnectedAccountError(error)) throw error

      await clearStoredStripeAccount(supabase, userId, error instanceof Error ? error.message : 'invalid connected account')

      if (mode === 'status') {
        return jsonResponse({
          accountId: null,
          detailsSubmitted: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          onboardingRequired: true,
          accountReset: true,
        })
      }

      account = await createConnectedAccountForUser(supabase, stripe, userId, userEmail)
      accountId = account.id
      recreatedAccount = true
    }

    const detailsSubmitted = account.details_submitted || false
    const chargesEnabled = account.charges_enabled || false
    const payoutsEnabled = account.payouts_enabled || false
    const fullyOnboarded = detailsSubmitted && chargesEnabled && payoutsEnabled

    if (mode === 'status') {
      return jsonResponse({
        accountId,
        detailsSubmitted,
        chargesEnabled,
        payoutsEnabled,
        onboardingRequired: !fullyOnboarded,
        accountReset: recreatedAccount,
      })
    }

    if (fullyOnboarded) {
      const loginLink = await stripe.accounts.createLoginLink(accountId)
      return jsonResponse({
        url: loginLink.url,
        accountId,
        alreadyOnboarded: true,
        detailsSubmitted,
        chargesEnabled,
        payoutsEnabled,
        accountReset: recreatedAccount,
      })
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })

    return jsonResponse({
      url: accountLink.url,
      accountId,
      alreadyOnboarded: false,
      detailsSubmitted,
      chargesEnabled,
      payoutsEnabled,
      accountReset: recreatedAccount,
    })
  } catch (error) {
    console.error('stripe-connect error:', error)
    return stripeConnectErrorResponse(error)
  }
})
