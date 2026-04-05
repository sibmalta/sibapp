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
    if (!userToken) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = userToken
    const payloadBase64 = token.split('.')[1]
    const jwtPayload = JSON.parse(atob(payloadBase64))
    const callerId = jwtPayload.sub

    const { orderId, reason } = await req.json()

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get the order and its payment intent
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('stripe_payment_intent_id, total_price, payment_status')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!order.stripe_payment_intent_id) {
      return new Response(
        JSON.stringify({ error: 'No Stripe payment found for this order. Cannot refund.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (order.payment_status === 'refunded') {
      return new Response(
        JSON.stringify({ error: 'This order has already been refunded.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the refund
    const refundParams: Record<string, unknown> = {
      payment_intent: order.stripe_payment_intent_id,
      metadata: {
        order_id: orderId,
        reason: reason || 'requested_by_customer',
        initiated_by: callerId,
      },
    }

    if (reason) {
      refundParams.reason = reason === 'duplicate' ? 'duplicate'
        : reason === 'fraudulent' ? 'fraudulent'
        : 'requested_by_customer'
    }

    const refund = await stripe.refunds.create(refundParams as Stripe.RefundCreateParams)

    // Update order status in DB
    const now = new Date().toISOString()
    await supabase
      .from('orders')
      .update({
        payment_status: 'refunded',
        payout_status: 'refunded',
        tracking_status: 'refunded',
        seller_payout_status: 'cancelled',
        refunded_at: now,
        stripe_refund_id: refund.id,
      })
      .eq('id', orderId)

    // Update any associated payouts
    await supabase
      .from('payouts')
      .update({
        status: 'cancelled',
        updated_at: now,
      })
      .eq('order_id', orderId)
      .neq('status', 'completed')

    return new Response(
      JSON.stringify({
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('create-refund error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create refund' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
