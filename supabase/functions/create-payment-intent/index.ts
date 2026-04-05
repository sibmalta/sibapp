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
        JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured. Add it in Environment Variables.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

    // Validate auth — user JWT arrives via x-user-token (Authorization carries anon key for gateway)
    const userToken = req.headers.get('x-user-token')
    if (!userToken) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const token = userToken
    const payloadBase64 = token.split('.')[1]
    const payload = JSON.parse(atob(payloadBase64))
    const userId = payload.sub

    const { amount, currency, orderId, orderRef, sellerId, metadata } = await req.json()

    if (!amount || amount < 50) {
      return new Response(
        JSON.stringify({ error: 'Amount must be at least €0.50 (50 cents)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Look up seller's connected account for destination charge
    let transferData: Record<string, unknown> | undefined
    if (sellerId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_account_id, stripe_onboarding_complete, charges_enabled')
        .eq('id', sellerId)
        .single()

      if (profile?.stripe_account_id && profile?.charges_enabled) {
        // We'll set up transfer_data for destination charge
        // The seller receives the item price, platform keeps the fees
        transferData = {
          destination: profile.stripe_account_id,
        }
      }
    }

    const intentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount), // amount in cents
      currency: currency || 'eur',
      metadata: {
        buyer_id: userId,
        seller_id: sellerId || '',
        order_id: orderId || '',
        order_ref: orderRef || '',
        ...(metadata || {}),
      },
      automatic_payment_methods: { enabled: true },
    }

    // If seller has connected account, use destination charge
    if (transferData) {
      intentParams.transfer_data = transferData as Stripe.PaymentIntentCreateParams.TransferData
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams)

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('create-payment-intent error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create payment intent' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
