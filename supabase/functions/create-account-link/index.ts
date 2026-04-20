const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
}

import Stripe from 'npm:stripe@14.14.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

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

    const { accountId, returnUrl, refreshUrl } = await req.json()

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: 'accountId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Before creating onboarding link, check current account status
    const account = await stripe.accounts.retrieve(accountId)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

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
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl || returnUrl || 'https://sib.mt/seller/payout-settings',
      return_url: returnUrl || 'https://sib.mt/seller/payout-settings',
      type: 'account_onboarding',
    })

    return new Response(
      JSON.stringify({
        url: accountLink.url,
        alreadyOnboarded: false,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('create-account-link error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create account link' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
