const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
}

import Stripe from 'npm:stripe@14.14.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const PRODUCTION_APP_URL = 'https://sibmalta.com'
const PAYOUT_SETTINGS_PATH = '/seller/payout-settings'

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

  console.warn('[create-account-link] Ignoring unsafe APP_URL for onboarding redirect:', configuredUrl)
  return PRODUCTION_APP_URL
}

function buildAppUrl(path = PAYOUT_SETTINGS_PATH) {
  return new URL(path, getAppUrl()).toString()
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
    return new Response(
      JSON.stringify({
        error: 'Stripe Connect is not enabled for the configured Stripe account. Use the platform STRIPE_SECRET_KEY for a Stripe Connect platform, then try verification again.',
        code: 'stripe_connect_platform_required',
        details,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({
      error: message || 'Failed to create account link',
      code: stripeError?.code || 'stripe_connect_failed',
      details,
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function isInvalidConnectedAccountError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const stripeError = error as { code?: string }
  return (
    stripeError?.code === 'account_invalid' ||
    stripeError?.code === 'resource_missing' ||
    /provided key does not have access to account/i.test(message) ||
    /No such account/i.test(message) ||
    /account_invalid/i.test(message)
  )
}

async function clearStoredStripeAccount(supabase: ReturnType<typeof createClient>, userId: string, reason: string) {
  console.warn('[create-account-link] Clearing stale stripe_account_id', { userId, reason })
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

async function createConnectedAccount(
  supabase: ReturnType<typeof createClient>,
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
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

    const userToken = req.headers.get('x-user-token')
      || req.headers.get('authorization')?.replace('Bearer ', '')
    if (!userToken) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const payloadBase64 = userToken.split('.')[1]
    const payload = JSON.parse(atob(payloadBase64))
    const userId = payload.sub
    const userEmail = payload.email

    let { accountId, returnUrl, refreshUrl } = await req.json()
    const fallbackUrl = buildAppUrl(PAYOUT_SETTINGS_PATH)
    const safeReturnUrl = sanitizeUrl(returnUrl, fallbackUrl)
    const safeRefreshUrl = sanitizeUrl(refreshUrl, safeReturnUrl)

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: 'accountId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Before creating onboarding link, check current account status.
    // Stale account IDs from an old Stripe platform cannot be accessed by the current platform key.
    let account: Stripe.Account
    let accountReset = false
    try {
      account = await stripe.accounts.retrieve(accountId)
    } catch (error) {
      if (!isInvalidConnectedAccountError(error)) throw error
      await clearStoredStripeAccount(supabase, userId, error instanceof Error ? error.message : 'invalid connected account')
      account = await createConnectedAccount(supabase, stripe, userId, userEmail)
      accountId = account.id
      accountReset = true
    }

    // Update profile with latest Stripe account status
    await supabase
      .from('profiles')
      .update({
        details_submitted: account.details_submitted || false,
        stripe_onboarding_complete: account.details_submitted || false,
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
        stripe_status_updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    // If already fully onboarded, return dashboard link instead
    if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
      const loginLink = await stripe.accounts.createLoginLink(accountId)
      return new Response(
        JSON.stringify({
          url: loginLink.url,
          alreadyOnboarded: true,
          detailsSubmitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          accountId,
          accountReset,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: safeRefreshUrl,
      return_url: safeReturnUrl,
      type: 'account_onboarding',
    })

    return new Response(
      JSON.stringify({
        url: accountLink.url,
        alreadyOnboarded: false,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        accountId,
        accountReset,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('create-account-link error:', error)
    return stripeConnectErrorResponse(error)
  }
})
