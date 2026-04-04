const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

import Stripe from 'npm:stripe@14.14.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // CORS preflight — must return 204 with full CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return jsonResponse(
        { error: 'STRIPE_SECRET_KEY not configured. Add it in Environment Variables.' },
        500
      )
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

    // Extract user JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Not authenticated. Please log in.' }, 401)
    }
    const token = authHeader.replace('Bearer ', '')

    // Decode JWT to get user info
    let userId: string
    let userEmail: string
    try {
      const payloadBase64 = token.split('.')[1]
      const payload = JSON.parse(atob(payloadBase64))
      userId = payload.sub
      userEmail = payload.email
    } catch {
      return jsonResponse({ error: 'Invalid authentication token.' }, 401)
    }

    // Parse body — returnUrl is optional
    let returnUrl = ''
    try {
      const body = await req.json()
      returnUrl = body.returnUrl || ''
    } catch {
      // empty body is fine
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Step 1: Check if user already has a connected account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete, charges_enabled, payouts_enabled')
      .eq('id', userId)
      .single()

    let accountId = profile?.stripe_account_id

    // Step 2: Create Stripe Connect Express account if none exists
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

      // Save to profile
      await supabase
        .from('profiles')
        .update({
          stripe_account_id: accountId,
          stripe_onboarding_complete: false,
          charges_enabled: false,
          payouts_enabled: false,
        })
        .eq('id', userId)
    }

    // Step 3: Check current account status with Stripe
    const account = await stripe.accounts.retrieve(accountId)

    // Update profile with latest status
    await supabase
      .from('profiles')
      .update({
        stripe_onboarding_complete: account.details_submitted || false,
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
      })
      .eq('id', userId)

    // Step 4: If fully onboarded, return dashboard link
    if (account.details_submitted && account.charges_enabled) {
      const loginLink = await stripe.accounts.createLoginLink(accountId)
      return jsonResponse({
        url: loginLink.url,
        accountId,
        alreadyOnboarded: true,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      })
    }

    // Step 5: Create onboarding link
    const fallbackUrl = returnUrl || 'https://sib.mt/seller/payout-settings'
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: fallbackUrl,
      return_url: fallbackUrl,
      type: 'account_onboarding',
    })

    return jsonResponse({
      url: accountLink.url,
      accountId,
      alreadyOnboarded: false,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
    })
  } catch (error) {
    console.error('stripe-connect error:', error)
    return jsonResponse(
      { error: error.message || 'Failed to set up Stripe Connect' },
      500
    )
  }
})
