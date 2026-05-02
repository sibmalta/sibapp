import Stripe from 'npm:stripe@14.14.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

function getServiceRoleClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

function getServiceRoleKey() {
  return Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function centsToEuros(value: string | number | null | undefined) {
  const cents = Number(value || 0)
  return Number.isFinite(cents) ? Number((cents / 100).toFixed(2)) : 0
}

function normalizeFulfilmentMethod(value: string | null | undefined) {
  return value === 'locker_collection' || value === 'locker' ? 'locker' : 'delivery'
}

function getFulfilmentPrice(method: string) {
  return method === 'locker' ? 3.25 : 4.50
}

function getPaymentIntentListingIds(paymentIntent: Stripe.PaymentIntent) {
  const listingIds = String(paymentIntent.metadata?.listing_ids || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  const listingId = paymentIntent.metadata?.listing_id || ''
  return [...new Set(listingIds.length > 0 ? listingIds : listingId ? [listingId] : [])]
}

function getFirstImage(images: unknown) {
  return Array.isArray(images) && typeof images[0] === 'string' ? images[0] : null
}

function buildRecoveredOrderRef(paymentIntentId: string) {
  return `SIB-${paymentIntentId.replace(/^pi_/, '').slice(-8).toUpperCase()}`
}

function isMissingOptionalSoldColumnError(error: unknown) {
  const typed = error as { code?: string; message?: string; details?: string; hint?: string } | null
  const message = `${typed?.message || ''} ${typed?.details || ''} ${typed?.hint || ''}`.toLowerCase()
  return (
    typed?.code === '42703' ||
    typed?.code === 'PGRST204' ||
    message.includes('sold_at') ||
    message.includes('buyer_id') ||
    message.includes('schema cache')
  )
}

async function markListingsSold(
  supabase: ReturnType<typeof createClient>,
  listingIds: string[],
  buyerId: string | null = null,
) {
  if (!listingIds.length) return

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    status: 'sold',
    sold_at: now,
    updated_at: now,
  }
  if (buyerId) updates.buyer_id = buyerId

  let { error } = await supabase
    .from('listings')
    .update(updates)
    .in('id', listingIds)
    .neq('status', 'sold')

  if (error && isMissingOptionalSoldColumnError(error)) {
    ;({ error } = await supabase
      .from('listings')
      .update({ status: 'sold', updated_at: now })
      .in('id', listingIds)
      .neq('status', 'sold'))
  }

  if (error) {
    console.error('[stripe-webhook] Failed to mark paid listing(s) sold:', {
      listingIds,
      buyerId,
      error,
    })
  }
}

async function sendSaleDropoffInstructions(supabase: ReturnType<typeof createClient>, orderId: string) {
  if (!orderId) return

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id,order_ref,seller_id,buyer_id,listing_id,listing_title')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError || !order) {
    console.error('[stripe-webhook] Drop-off email skipped; order lookup failed:', {
      orderId,
      error: orderError?.message || null,
    })
    return
  }

  const { data: seller, error: sellerError } = await supabase
    .from('profiles')
    .select('id,email,name,username,full_name')
    .eq('id', order.seller_id)
    .maybeSingle()

  if (sellerError || !seller?.email) {
    console.error('[stripe-webhook] Drop-off email skipped; seller email missing:', {
      orderId,
      sellerId: order.seller_id,
      error: sellerError?.message || null,
    })
    return
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceRoleKey = getServiceRoleKey()
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[stripe-webhook] Drop-off email skipped; Supabase function auth missing:', { orderId })
    return
  }

  const dedupeKey = `sale_dropoff_instructions:${order.id}:${order.seller_id}`
  const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      type: 'sale_dropoff_instructions',
      to: seller.email,
      data: {
        sellerName: seller.name || seller.full_name || seller.username || 'seller',
        itemTitle: order.listing_title || 'Sold item',
        orderRef: order.order_ref || order.id,
      },
      meta: {
        related_entity_type: 'order',
        related_entity_id: order.id,
        orderId: order.id,
        listingId: order.listing_id,
        sellerId: order.seller_id,
        buyerId: order.buyer_id,
        dedupe_key: dedupeKey,
      },
    }),
  })

  const body = await response.text()
  if (!response.ok) {
    console.error('[stripe-webhook] Drop-off email failed:', {
      orderId,
      sellerId: order.seller_id,
      status: response.status,
      body,
    })
    return
  }
  console.info('[stripe-webhook] Drop-off email processed:', {
    orderId,
    sellerId: order.seller_id,
    status: response.status,
    body,
  })
}

async function confirmPaidOrder(
  supabase: ReturnType<typeof createClient>,
  order: { id: string; payout_status: string | null; tracking_status: string | null },
  paymentIntent: Stripe.PaymentIntent,
  now: string,
) {
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      tracking_status: ['delivered', 'completed', 'under_review'].includes(order.tracking_status || '')
        ? order.tracking_status
        : 'awaiting_delivery',
      payment_status: 'paid',
      payout_status: order.payout_status || 'held',
      paid_at: now,
      updated_at: now,
    })
    .eq('id', order.id)

  if (error) throw error
  await markListingsSold(supabase, getPaymentIntentListingIds(paymentIntent), paymentIntent.metadata?.buyer_id || null)
}

async function recoverPaidOrderFromPaymentIntent(
  supabase: ReturnType<typeof createClient>,
  paymentIntent: Stripe.PaymentIntent,
  now: string,
) {
  const listingIds = getPaymentIntentListingIds(paymentIntent)
  const buyerId = paymentIntent.metadata?.buyer_id || ''
  const sellerId = paymentIntent.metadata?.seller_id || ''

  if (!buyerId || !sellerId || listingIds.length === 0) {
    console.error('[stripe-webhook] Cannot recover paid order from PaymentIntent metadata:', {
      paymentIntentId: paymentIntent.id,
      buyerId: buyerId || null,
      sellerId: sellerId || null,
      listingIds,
      metadata: paymentIntent.metadata || {},
    })
    return null
  }

  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('id,title,price,images,seller_id')
    .in('id', listingIds)

  if (listingsError || !listings?.length) {
    console.error('[stripe-webhook] Cannot recover paid order because listing lookup failed:', {
      paymentIntentId: paymentIntent.id,
      listingIds,
      error: listingsError || null,
    })
    return null
  }

  const subtotal = centsToEuros(paymentIntent.metadata?.subtotal_cents)
  const deliveryFee = centsToEuros(paymentIntent.metadata?.delivery_fee_cents)
  const buyerProtectionFee = centsToEuros(paymentIntent.metadata?.buyer_protection_fee_cents)
  const total = centsToEuros(paymentIntent.metadata?.total_cents) || centsToEuros(paymentIntent.amount_received || paymentIntent.amount)
  const itemPrice = subtotal || Number(listings.reduce((sum, listing) => sum + Number(listing.price || 0), 0).toFixed(2))
  const platformFee = Number((total - itemPrice).toFixed(2))
  const fulfilmentMethod = normalizeFulfilmentMethod(paymentIntent.metadata?.delivery_method)
  const fulfilmentPrice = deliveryFee || getFulfilmentPrice(fulfilmentMethod)
  const firstListing = listings[0]
  const listingTitle = listings.length === 1
    ? firstListing.title || 'Purchased item'
    : `${listings.length} item bundle`

  const recoveredOrder = {
    order_ref: buildRecoveredOrderRef(paymentIntent.id),
    listing_id: listingIds.length === 1 ? listingIds[0] : listingIds[0],
    buyer_id: buyerId,
    seller_id: sellerId,
    listing_title: listingTitle,
    listing_image: getFirstImage(firstListing.images),
    item_price: itemPrice,
    bundled_fee: platformFee,
    total_price: total,
    seller_payout: itemPrice,
    platform_fee: platformFee,
    amount: total,
    status: 'paid',
    tracking_status: 'awaiting_delivery',
    payout_status: 'held',
    delivery_method: paymentIntent.metadata?.delivery_method === 'locker_collection' ? 'locker_collection' : 'home_delivery',
    delivery_fee: fulfilmentPrice,
    fulfilment_provider: 'MaltaPost',
    fulfilment_method: fulfilmentMethod,
    fulfilment_price: fulfilmentPrice,
    fulfilment_status: 'awaiting_fulfilment',
    shipping_address: {
      recoveredFromStripeWebhook: true,
      paymentIntentId: paymentIntent.id,
      fulfilmentProvider: 'MaltaPost',
      fulfilmentMethod,
      fulfilmentPrice,
      deliveryFee,
      buyerProtectionFee,
    },
    is_bundle: listingIds.length > 1,
    bundle_listing_ids: listingIds.length > 1 ? listingIds : [],
    paid_at: now,
    stripe_payment_intent_id: paymentIntent.id,
    payment_status: 'paid',
    payment_flow_type: paymentIntent.metadata?.payment_flow_type || 'separate_charge',
    seller_payout_status: 'held',
    created_at: now,
    updated_at: now,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('orders')
    .insert(recoveredOrder)
    .select('id,order_ref')
    .single()

  if (insertError) {
    const { data: existing } = await supabase
      .from('orders')
      .select('id,order_ref')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle()

    if (existing?.id) {
      console.warn('[stripe-webhook] Recovered order already existed after insert race:', {
        paymentIntentId: paymentIntent.id,
        orderId: existing.id,
      })
      await markListingsSold(supabase, listingIds, buyerId)
      return existing
    }

    console.error('[stripe-webhook] Failed to recover paid order from PaymentIntent:', {
      paymentIntentId: paymentIntent.id,
      error: insertError,
      recoveredOrder,
    })
    return null
  }

  await markListingsSold(supabase, listingIds, buyerId)
  console.info('[stripe-webhook] Recovered missing paid order from PaymentIntent metadata:', {
    paymentIntentId: paymentIntent.id,
    orderId: inserted.id,
    orderRef: inserted.order_ref,
    listingIds,
    buyerId,
    sellerId,
  })
  return inserted
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const signature = req.headers.get('stripe-signature')

    if (!stripeKey || !webhookSecret) {
      return jsonResponse({ error: 'Stripe webhook secrets are not configured.' }, 500)
    }

    if (!signature) {
      return jsonResponse({ error: 'Missing Stripe signature header.' }, 400)
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    const cryptoProvider = Stripe.createSubtleCryptoProvider()
    const payload = await req.text()

    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret, undefined, cryptoProvider)
    } catch (error) {
      console.error('[stripe-webhook] Signature verification failed:', error)
      return jsonResponse({ error: 'Invalid webhook signature.' }, 400)
    }

    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account
      const supabase = getServiceRoleClient()

      let userId = account.metadata?.user_id || null
      if (!userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_account_id', account.id)
          .maybeSingle()
        userId = profile?.id || null
      }

      if (userId) {
        const updates = {
          stripe_account_id: account.id,
          details_submitted: account.details_submitted || false,
          stripe_onboarding_complete: account.details_submitted || false,
          charges_enabled: account.charges_enabled || false,
          payouts_enabled: account.payouts_enabled || false,
          stripe_status_updated_at: new Date().toISOString(),
        }

        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)

        if (error) {
          console.error('[stripe-webhook] Failed to sync Stripe account status:', error)
          return jsonResponse({ error: 'Failed to sync Stripe account status.' }, 500)
        }
      } else {
        console.warn('[stripe-webhook] No matching Sib profile found for Stripe account:', account.id)
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const supabase = getServiceRoleClient()
      const now = new Date().toISOString()

      const { data: order, error: orderLookupError } = await supabase
        .from('orders')
        .select('id,payment_status,payout_status,status,tracking_status')
        .eq('stripe_payment_intent_id', paymentIntent.id)
        .maybeSingle()

      if (orderLookupError) {
        console.error('[stripe-webhook] Failed to look up order for PaymentIntent:', orderLookupError)
        return jsonResponse({ error: 'Failed to look up order.' }, 500)
      }

      if (!order) {
        console.warn('[stripe-webhook] PaymentIntent succeeded before order row existed; attempting recovery:', {
          paymentIntentId: paymentIntent.id,
          listingId: paymentIntent.metadata?.listing_id || null,
          listingIds: paymentIntent.metadata?.listing_ids || null,
          buyerId: paymentIntent.metadata?.buyer_id || null,
          sellerId: paymentIntent.metadata?.seller_id || null,
          orderId: paymentIntent.metadata?.order_id || null,
        })
        const recovered = await recoverPaidOrderFromPaymentIntent(supabase, paymentIntent, now)
        if (recovered?.id) await sendSaleDropoffInstructions(supabase, recovered.id)
      } else if (order.payment_status !== 'paid') {
        try {
          await confirmPaidOrder(supabase, order, paymentIntent, now)
          await sendSaleDropoffInstructions(supabase, order.id)
        } catch (error) {
          console.error('[stripe-webhook] Failed to confirm paid order:', error)
          return jsonResponse({ error: 'Failed to confirm paid order.' }, 500)
        }
      } else {
        await markListingsSold(supabase, getPaymentIntentListingIds(paymentIntent), paymentIntent.metadata?.buyer_id || null)
        await sendSaleDropoffInstructions(supabase, order.id)
      }
    }

    return jsonResponse({ received: true })
  } catch (error) {
    console.error('[stripe-webhook] Unexpected error:', error)
    return jsonResponse({ error: error.message || 'Webhook handling failed.' }, 500)
  }
})
