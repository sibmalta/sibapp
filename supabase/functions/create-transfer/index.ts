const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

import Stripe from 'npm:stripe@14.14.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const PROTECTION_WINDOW_MS = 48 * 60 * 60 * 1000

type JsonObject = Record<string, unknown>

function jsonResponse(body: JsonObject, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null

  const [scheme, token] = authHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null

  return token
}

function getInternalFunctionSecret() {
  return Deno.env.get('BUYER_PROTECTION_CRON_SECRET') || Deno.env.get('INTERNAL_FUNCTION_SECRET') || ''
}

function isValidInternalCaller(req: Request) {
  const expectedSecret = getInternalFunctionSecret()
  const receivedSecret = req.headers.get('x-cron-secret') || ''
  return Boolean(expectedSecret && receivedSecret && receivedSecret === expectedSecret)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey =
      Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!stripeKey) {
      return jsonResponse({ error: 'STRIPE_SECRET_KEY not configured.' }, 500)
    }

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse(
        { error: 'Supabase environment variables are not configured correctly.' },
        500
      )
    }

    const token = getBearerToken(req)
    if (!token) {
      return jsonResponse({ error: 'Missing bearer token.' }, 401)
    }

    const isInternalCaller = isValidInternalCaller(req)
    let user: { id: string } | null = isInternalCaller ? { id: 'system:auto-release' } : null

    if (!isInternalCaller) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey)
      const {
        data: { user: authUser },
        error: authError,
      } = await authClient.auth.getUser(token)

      if (authError || !authUser) {
        return jsonResponse({ error: 'Invalid or expired token.' }, 401)
      }

      user = authUser
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

    let body: { orderId?: string; payoutId?: string } = {}
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body.' }, 400)
    }

    const { orderId, payoutId } = body

    if (!orderId) {
      return jsonResponse({ error: 'orderId is required.' }, 400)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    if (!isInternalCaller) {
      // Authorize caller.
      // This function should be privileged. For now, only allow the sibadmin account.
      // Adjust this query if you use a dedicated role/permissions table later.
      const { data: callerProfile, error: callerProfileError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', user.id)
        .single()

      if (callerProfileError || !callerProfile) {
        return jsonResponse({ error: 'Caller profile not found.' }, 403)
      }

      const callerUsername = String(callerProfile.username || '').toLowerCase()
      const isPrivilegedCaller = callerUsername === 'sibadmin' || callerUsername === '@sibadmin'

      if (!isPrivilegedCaller) {
        return jsonResponse(
          { error: 'You are not authorized to release seller payouts.' },
          403
        )
      }
    }

    // Fetch order server-side. Never trust sellerId or amount from the client.
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        seller_id,
        stripe_payment_intent_id,
        seller_payout_status,
        payout_status,
        tracking_status,
        delivered_at,
        confirmed_at,
        payout_released_at
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return jsonResponse({ error: 'Order not found.' }, 404)
    }

    if (!order.seller_id) {
      return jsonResponse({ error: 'Order is missing seller information.' }, 400)
    }

    // Hard stop if order already marked paid/released
    if (
      order.seller_payout_status === 'paid' ||
      order.payout_status === 'released' ||
      order.payout_released_at
    ) {
      return jsonResponse(
        { error: 'Seller has already been paid for this order.' },
        400
      )
    }

    // Fetch payout record server-side and derive transfer amount from DB only.
    let payoutQuery = supabase
      .from('payouts')
      .select('id, order_id, seller_id, amount, status, stripe_transfer_id')
      .eq('order_id', orderId)

    if (payoutId) {
      payoutQuery = payoutQuery.eq('id', payoutId)
    }

    const { data: payoutRows, error: payoutError } = await payoutQuery.limit(5)

    if (payoutError) {
      return jsonResponse({ error: 'Failed to load payout record.' }, 500)
    }

    if (!payoutRows || payoutRows.length === 0) {
      return jsonResponse({ error: 'No eligible payout record found for this order.' }, 404)
    }

    if (payoutRows.length > 1 && !payoutId) {
      return jsonResponse(
        { error: 'Multiple payout records found. Pass payoutId explicitly.' },
        400
      )
    }

    const payout = payoutRows[0]

    if (!payout) {
      return jsonResponse({ error: 'Payout record not found.' }, 404)
    }

    if (payout.seller_id !== order.seller_id) {
      return jsonResponse(
        { error: 'Payout seller does not match order seller.' },
        400
      )
    }

    if (payout.stripe_transfer_id) {
      return jsonResponse({
        transferId: payout.stripe_transfer_id,
        amount: Number(payout.amount),
        status: 'completed',
        alreadyReleased: true,
      })
    }

    if (String(payout.status) !== 'releasable') {
      return jsonResponse(
        { error: `Payout is not eligible for release from status "${payout.status}".` },
        400
      )
    }

    const payoutAmount = Number(payout.amount)
    if (!Number.isFinite(payoutAmount) || payoutAmount <= 0) {
      return jsonResponse({ error: 'Invalid payout amount on payout record.' }, 400)
    }

    const transferAmount = Math.round(payoutAmount * 100)
    if (transferAmount <= 0) {
      return jsonResponse({ error: 'Transfer amount must be greater than zero.' }, 400)
    }

    const blockingReasons: string[] = []

    // Get seller Stripe account server-side
    const { data: sellerProfile, error: sellerProfileError } = await supabase
      .from('profiles')
      .select('id, stripe_account_id, details_submitted, charges_enabled, payouts_enabled')
      .eq('id', order.seller_id)
      .single()

    if (sellerProfileError || !sellerProfile) {
      return jsonResponse({ error: 'Seller profile not found.' }, 404)
    }

    if (!sellerProfile.stripe_account_id) {
      blockingReasons.push('Seller has no Stripe connected account.')
    }
    if (!sellerProfile.details_submitted) {
      blockingReasons.push('Seller has not completed Stripe identity verification.')
    }
    if (!sellerProfile.charges_enabled) {
      blockingReasons.push('Seller Stripe account is not enabled to receive charges.')
    }
    if (!sellerProfile.payouts_enabled) {
      blockingReasons.push('Seller Stripe account is not enabled for payouts.')
    }

    const nowMs = Date.now()
    const deliveredAtMs = order.delivered_at ? new Date(order.delivered_at).getTime() : null
    const protectionWindowExpired =
      !!deliveredAtMs && nowMs - deliveredAtMs >= PROTECTION_WINDOW_MS

    const deliveredOrConfirmed =
      order.tracking_status === 'delivered' ||
      order.tracking_status === 'confirmed' ||
      !!order.confirmed_at

    const payoutMarkedReleasable = order.payout_status === 'releasable'
    if (!payoutMarkedReleasable) {
      blockingReasons.push('Order payout is not releasable yet.')
    }
    if (!deliveredOrConfirmed && !protectionWindowExpired) {
      blockingReasons.push('Order is not marked delivered and the buyer protection window has not expired.')
    }

    const { data: openDispute, error: disputeError } = await supabase
      .from('disputes')
      .select('id, status')
      .eq('order_id', orderId)
      .in('status', ['open', 'in_review', 'under_review', 'escalated'])
      .limit(1)
      .maybeSingle()

    if (disputeError) {
      return jsonResponse({ error: 'Failed to check disputes for this order.' }, 500)
    }

    if (openDispute) {
      blockingReasons.push(`Order has an active dispute (${openDispute.status}).`)
    }

    if (blockingReasons.length > 0) {
      return jsonResponse(
        {
          error: 'Transfer blocked by payout release rules.',
          blocking_reasons: blockingReasons,
        },
        400
      )
    }

    // Check if funds were already routed via destination charge.
    let alreadyTransferredViaDestination = false
    let sourceTransactionId: string | undefined

    if (order.stripe_payment_intent_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id)

        if (paymentIntent.transfer_data?.destination) {
          alreadyTransferredViaDestination = true
        }

        const chargeId = paymentIntent.latest_charge
        if (chargeId) {
          sourceTransactionId = typeof chargeId === 'string' ? chargeId : chargeId.id
        }
      } catch (piErr) {
        console.warn(
          'Could not retrieve PaymentIntent for transfer checks:',
          piErr instanceof Error ? piErr.message : String(piErr)
        )
      }
    }

    let transferId = ''
    let finalAmount = transferAmount

    if (alreadyTransferredViaDestination) {
      transferId = 'destination_charge'
    } else {
      if (!sellerProfile.stripe_account_id) {
        return jsonResponse({ error: 'Seller Stripe account not available.' }, 400)
      }

      const transferParams: Stripe.TransferCreateParams = {
        amount: transferAmount,
        currency: 'eur',
        destination: sellerProfile.stripe_account_id,
        metadata: {
          order_id: orderId,
          payout_id: payout.id,
          seller_id: order.seller_id,
          initiated_by: user?.id || 'system:auto-release',
          initiated_by_internal_cron: String(isInternalCaller),
        },
        transfer_group: `sib_order_${orderId}`,
      }

      if (sourceTransactionId) {
        transferParams.source_transaction = sourceTransactionId
      }

      try {
        const transfer = await stripe.transfers.create(transferParams, {
          idempotencyKey: `sib-transfer-${orderId}`,
        })
        transferId = transfer.id
        finalAmount = transfer.amount
      } catch (transferError) {
        const now = new Date().toISOString()
        await supabase
          .from('payouts')
          .update({ status: 'transfer_failed', updated_at: now })
          .eq('id', payout.id)
          .is('stripe_transfer_id', null)
        await supabase
          .from('orders')
          .update({ payout_status: 'transfer_failed', updated_at: now })
          .eq('id', orderId)
          .eq('payout_status', 'releasable')
        return jsonResponse(
          {
            error: 'Stripe transfer failed. Seller payout was not marked released.',
            stripeError: transferError instanceof Error ? transferError.message : String(transferError),
          },
          500,
        )
      }
    }

    // Write payout record update.
    const { error: payoutUpdateError } = await supabase
      .from('payouts')
      .update({
        stripe_transfer_id: transferId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', payout.id)
      .is('stripe_transfer_id', null)

    if (payoutUpdateError) {
      return jsonResponse(
        {
          error: 'Transfer created, but failed to update payout record. Manual review required.',
          transferId,
        },
        500
      )
    }

    // Update order only if not already marked paid.
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        seller_payout_status: 'paid',
        payout_status: 'released',
        stripe_transfer_id: transferId,
        payout_released_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .neq('seller_payout_status', 'paid')

    if (orderUpdateError) {
      return jsonResponse(
        {
          error: 'Transfer created, but failed to update order payout status. Manual review required.',
          transferId,
        },
        500
      )
    }

    return jsonResponse({
      transferId,
      amount: finalAmount,
      status: 'completed',
    })
  } catch (error) {
    console.error('create-transfer error:', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Failed to create transfer' },
      500
    )
  }
})
