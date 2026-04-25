const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
  'Access-Control-Max-Age': '86400',
}

import Stripe from 'npm:stripe@14.14.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

type StripeConnectBody = {
  mode?: 'start' | 'status'
  returnUrl?: string
  refreshUrl?: string
}

const PRODUCTION_APP_URL = 'https://sibmalta.com'
const PAYOUT_SETTINGS_PATH = '/seller/payout-settings'

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

  return jsonResponse(
    {
      error: message || 'Failed to set up Stripe Connect',
      code: stripeError?.code || 'stripe_connect_failed',
      details,
    },
    500,
  )
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
      accountId = account.id

      await supabase
        .from('profiles')
        .update({
          stripe_account_id: accountId,
          details_submitted: false,
          stripe_onboarding_complete: false,
          charges_enabled: false,
          payouts_enabled: false,
          stripe_status_updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
    }

    const { account } = await syncStripeAccountStatus(supabase, stripe, userId, accountId)

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
    })
  } catch (error) {
    console.error('stripe-connect error:', error)
    return stripeConnectErrorResponse(error)
  }
})
