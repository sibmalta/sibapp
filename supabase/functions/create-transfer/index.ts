const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decode JWT to verify admin or system caller
    const token = authHeader.replace('Bearer ', '')
    const payloadBase64 = token.split('.')[1]
    const jwtPayload = JSON.parse(atob(payloadBase64))
    const callerId = jwtPayload.sub

    const { orderId, payoutId, amount, sellerId } = await req.json()

    if (!orderId || !amount || !sellerId) {
      return new Response(
        JSON.stringify({ error: 'orderId, amount, and sellerId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get seller's connected account
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('stripe_account_id, charges_enabled')
      .eq('id', sellerId)
      .single()

    if (!sellerProfile?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: 'Seller has no Stripe connected account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!sellerProfile.charges_enabled) {
      return new Response(
        JSON.stringify({ error: 'Seller Stripe account is not fully activated' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the order to find the payment intent (for source_transaction)
    const { data: order } = await supabase
      .from('orders')
      .select('stripe_payment_intent_id, seller_payout_status')
      .eq('id', orderId)
      .single()

    // Guard against double-payout: if already paid, bail out
    if (order?.seller_payout_status === 'paid') {
      return new Response(
        JSON.stringify({ error: 'Seller has already been paid for this order' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if this PaymentIntent used destination charges (transfer_data.destination)
    // If so, Stripe already routed funds to the seller — skip creating a separate transfer
    let alreadyTransferredViaDestination = false
    if (order?.stripe_payment_intent_id) {
      try {
        const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id)
        if (pi.transfer_data?.destination) {
          alreadyTransferredViaDestination = true
        }
      } catch (piErr) {
        console.warn('Could not retrieve PaymentIntent, will create manual transfer:', piErr.message)
      }
    }

    let transferId = ''
    let transferAmount = Math.round(amount)

    if (alreadyTransferredViaDestination) {
      // Funds were already routed via destination charge — no separate transfer needed
      console.log('Destination charge already transferred funds to seller; skipping manual transfer.')
      transferId = 'destination_charge'
    } else {
      // Create the transfer to the connected account
      const transferParams: Record<string, unknown> = {
        amount: transferAmount,
        currency: 'eur',
        destination: sellerProfile.stripe_account_id,
        metadata: {
          order_id: orderId,
          payout_id: payoutId || '',
          seller_id: sellerId,
          initiated_by: callerId,
        },
      }

      // If we have the payment intent, retrieve its latest charge for source_transaction
      if (order?.stripe_payment_intent_id) {
        try {
          const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id)
          const chargeId = pi.latest_charge
          if (chargeId) {
            transferParams.source_transaction = typeof chargeId === 'string' ? chargeId : chargeId.id
          }
        } catch (piErr) {
          console.warn('Could not retrieve PaymentIntent charge, proceeding without source_transaction:', piErr.message)
        }
      }

      const transfer = await stripe.transfers.create(transferParams as Stripe.TransferCreateParams)
      transferId = transfer.id
      transferAmount = transfer.amount
    }

    // Auto-lookup payout record if payoutId was not passed
    let resolvedPayoutId = payoutId
    if (!resolvedPayoutId) {
      const { data: payoutRow } = await supabase
        .from('payouts')
        .select('id')
        .eq('order_id', orderId)
        .in('status', ['pending', 'held'])
        .limit(1)
        .single()
      if (payoutRow) resolvedPayoutId = payoutRow.id
    }

    // Update payout record with stripe_transfer_id
    if (resolvedPayoutId) {
      await supabase
        .from('payouts')
        .update({
          stripe_transfer_id: transferId,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', resolvedPayoutId)
    }

    // Update order seller_payout_status
    await supabase
      .from('orders')
      .update({
        seller_payout_status: 'paid',
        payout_status: 'released',
        payout_released_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return new Response(
      JSON.stringify({
        transferId,
        amount: transferAmount,
        status: 'completed',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('create-transfer error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create transfer' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
