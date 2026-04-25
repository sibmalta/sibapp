const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
}

import Stripe from 'npm:stripe@14.14.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

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
  console.warn('[create-connected-account] Clearing stale stripe_account_id', { userId, reason })
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

async function createConnectedAccount(stripe: Stripe, userId: string, userEmail: string) {
  return await stripe.accounts.create({
    type: 'express',
    country: 'MT', // Malta
    email: userEmail,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      user_id: userId,
    },
  })
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if user already has a connected account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    let accountId = profile?.stripe_account_id

    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId)
      } catch (error) {
        if (!isInvalidConnectedAccountError(error)) throw error
        await clearStoredStripeAccount(supabase, userId, error instanceof Error ? error.message : 'invalid connected account')
        accountId = null
      }
    }

    if (!accountId) {
      // Create new Stripe Connect Express account
      const account = await createConnectedAccount(stripe, userId, userEmail)
      accountId = account.id

      // Save to profile
      const { error: updateErr } = await supabase
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

      if (updateErr) {
        console.error('Failed to save stripe_account_id:', updateErr)
      }
    }

    return new Response(
      JSON.stringify({ accountId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('create-connected-account error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create connected account' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
