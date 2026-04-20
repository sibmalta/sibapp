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

    // Validate auth — try x-user-token first (gateway may strip Authorization), then Authorization
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

    const { amount, currency, orderId, orderRef, sellerId, metadata } = await req.json()

    if (!amount || amount < 50) {
      return new Response(
        JSON.stringify({ error: 'Amount must be at least €0.50 (50 cents)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
      // Explicit payment methods for Malta market only.
      // 'card' covers Visa/Mastercard plus Apple Pay & Google Pay wallets
      // via the Payment Element on supported devices.
      // Bancontact, EPS, and other EU-specific methods are excluded.
      payment_method_types: ['card'],
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams)
    if (!paymentIntent.client_secret) {
      console.error('create-payment-intent returned PaymentIntent without client_secret', {
        paymentIntentId: paymentIntent.id,
      })
      return new Response(
        JSON.stringify({ error: 'Stripe did not return a valid client secret.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        client_secret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        payment_intent_id: paymentIntent.id,
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
