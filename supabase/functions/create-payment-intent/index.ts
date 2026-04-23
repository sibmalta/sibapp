import Stripe from 'npm:stripe@14.14.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type JsonObject = Record<string, unknown>

type ListingRow = {
  id: string
  seller_id: string
  title: string | null
  price: number | string | null
  status: string | null
  category: string | null
}

class CheckoutError extends Error {
  status: number
  code: string
  step: string
  details?: JsonObject

  constructor(message: string, status = 400, code = 'checkout_error', step = 'unknown', details?: JsonObject) {
    super(message)
    this.status = status
    this.code = code
    this.step = step
    this.details = details
  }
}

const DELIVERY_TIERS: Record<string, number> = {
  small: 2.99,
  medium: 4.95,
  heavy: 9.95,
  bulky: 39.95,
  large: 39.95,
}

const BUNDLE_DELIVERY_FEES: Record<string, number> = {
  home_delivery: 4.50,
  locker_collection: 3.25,
}

function jsonResponse(body: JsonObject, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(error: CheckoutError) {
  return jsonResponse({
    error: error.message,
    code: error.code,
    step: error.step,
    details: error.details || {},
  }, error.status)
}

function logStep(step: string, message: string, details: JsonObject = {}) {
  console.log(`[create-payment-intent] ${step}: ${message}`, details)
}

function logFailure(error: CheckoutError | Error | unknown, fallbackStep = 'unknown') {
  if (error instanceof CheckoutError) {
    console.error(`[create-payment-intent] ${error.step}: ${error.code}`, {
      message: error.message,
      status: error.status,
      details: error.details || {},
    })
    return
  }

  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error(`[create-payment-intent] ${fallbackStep}: unexpected_error`, { message })
}

function getEnv(name: string, fallbackName?: string) {
  return Deno.env.get(name) || (fallbackName ? Deno.env.get(fallbackName) : undefined)
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return ''
  return authHeader.slice('Bearer '.length).trim()
}

function eurosToCents(value: number) {
  return Math.round(value * 100)
}

function getBuyerProtectionFee(itemSubtotal: number) {
  return Number((0.75 + itemSubtotal * 0.05).toFixed(2))
}

function getDefaultDeliverySize(category: string | null) {
  switch (category) {
    case 'fashion':
    case 'books':
    case 'kids':
      return 'small'
    case 'furniture':
      return 'bulky'
    default:
      return 'medium'
  }
}

function getSingleListingDeliveryFee(listing: ListingRow, deliveryMethod: string) {
  const deliverySize = getDefaultDeliverySize(listing.category)
  const tierPrice = DELIVERY_TIERS[deliverySize] ?? DELIVERY_TIERS.medium

  if (deliverySize === 'bulky' || deliverySize === 'heavy') {
    return tierPrice
  }

  if (deliveryMethod === 'locker_collection') {
    return deliverySize === 'small'
      ? Math.max(tierPrice - 0.50, 1.99)
      : Math.max(tierPrice - 1.00, 2.99)
  }

  return tierPrice
}

function getBundleDeliveryFee(deliveryMethod: string) {
  return BUNDLE_DELIVERY_FEES[deliveryMethod] ?? BUNDLE_DELIVERY_FEES.home_delivery
}

function isValidPaymentIntentClientSecret(value: unknown): value is string {
  return typeof value === 'string' && /^pi_[^_]+_secret_.+/.test(value)
}

async function authenticateUser(req: Request) {
  logStep('auth_verification', 'started')
  const token = getBearerToken(req)
  if (!token) {
    return {
      user: null,
      error: errorResponse(new CheckoutError(
        'Missing bearer token. Please log in again and retry checkout.',
        401,
        'missing_bearer_token',
        'auth_verification',
      )),
    }
  }

  const supabaseUrl = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      user: null,
      error: errorResponse(new CheckoutError(
        'Supabase auth environment variables are missing.',
        500,
        'missing_supabase_auth_env',
        'auth_verification',
      )),
    }
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await authClient.auth.getUser(token)

  if (error || !data?.user?.id) {
    logFailure(new CheckoutError(
      'Invalid or expired token. Please log in again and retry checkout.',
      401,
      'invalid_or_expired_token',
      'auth_verification',
      { authError: error?.message || null },
    ))
    return {
      user: null,
      error: errorResponse(new CheckoutError(
        'Invalid or expired token. Please log in again and retry checkout.',
        401,
        'invalid_or_expired_token',
        'auth_verification',
      )),
    }
  }

  logStep('auth_verification', 'succeeded', { userId: data.user.id })
  return { user: data.user, error: null }
}

function getServiceClient() {
  const supabaseUrl = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new CheckoutError(
      'Supabase service role environment variables are missing.',
      500,
      'missing_service_role_env',
      'listing_lookup',
    )
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

async function loadListings(supabase: ReturnType<typeof createClient>, ids: string[]) {
  logStep('listing_lookup', 'started', { listingCount: ids.length, listingIds: ids })
  const { data, error } = await supabase
    .from('listings')
    .select('id, seller_id, title, price, status, category')
    .in('id', ids)

  if (error) {
    throw new CheckoutError(
      'Failed to load listing data.',
      500,
      'listing_query_failed',
      'listing_lookup',
      { dbCode: error.code || null, dbMessage: error.message || null },
    )
  }

  if (!data || data.length !== ids.length) {
    throw new CheckoutError(
      'One or more listings were not found.',
      404,
      'listing_not_found',
      'listing_lookup',
      { requestedCount: ids.length, foundCount: data?.length || 0 },
    )
  }

  const byId = new Map((data as ListingRow[]).map((listing) => [listing.id, listing]))
  const ordered = ids.map((id) => byId.get(id))

  if (ordered.some((listing) => !listing)) {
    throw new CheckoutError(
      'One or more listings were not found.',
      404,
      'listing_not_found',
      'listing_lookup',
      { requestedCount: ids.length, foundCount: data.length },
    )
  }

  logStep('listing_lookup', 'succeeded', { listingCount: ordered.length })
  return ordered as ListingRow[]
}

function validateListingsForCheckout(listings: ListingRow[], buyerId: string) {
  logStep('listing_validation', 'started', { listingCount: listings.length, buyerId })
  if (listings.length === 0) {
    throw new CheckoutError(
      'No listings provided for checkout.',
      400,
      'no_listings_provided',
      'listing_validation',
    )
  }

  const sellerId = listings[0].seller_id
  if (!sellerId) {
    throw new CheckoutError(
      'Listing seller is missing.',
      400,
      'listing_seller_missing',
      'listing_validation',
      { listingId: listings[0].id },
    )
  }

  if (sellerId === buyerId) {
    throw new CheckoutError(
      'You cannot buy your own listing.',
      403,
      'buyer_is_seller',
      'listing_validation',
      { sellerId },
    )
  }

  for (const listing of listings) {
    if (listing.seller_id !== sellerId) {
      throw new CheckoutError(
        'Bundle listings must all belong to the same seller.',
        400,
        'bundle_multiple_sellers',
        'listing_validation',
        { listingId: listing.id },
      )
    }

    if (listing.status !== 'active') {
      throw new CheckoutError(
        'Item already sold',
        409,
        'listing_not_active',
        'listing_validation',
        { listingId: listing.id, status: listing.status },
      )
    }

    if (!Number.isFinite(Number(listing.price)) || Number(listing.price) <= 0) {
      throw new CheckoutError(
        `Listing "${listing.title || listing.id}" has an invalid price.`,
        400,
        'listing_invalid_price',
        'listing_validation',
        { listingId: listing.id, price: String(listing.price) },
      )
    }
  }

  logStep('listing_validation', 'succeeded', { sellerId })
  return sellerId
}

const SOLD_ORDER_STATUSES = ['paid', 'shipped', 'delivered', 'confirmed', 'completed']

async function validateNoExistingSoldOrders(supabase: ReturnType<typeof createClient>, listingIds: string[]) {
  logStep('duplicate_order_check', 'started', { listingCount: listingIds.length })
  const { data, error } = await supabase
    .from('orders')
    .select('id,listing_id,status')
    .in('listing_id', listingIds)
    .in('status', SOLD_ORDER_STATUSES)
    .limit(1)

  if (error) {
    throw new CheckoutError(
      'Failed to check existing orders.',
      500,
      'duplicate_order_check_failed',
      'duplicate_order_check',
      { dbCode: error.code || null, dbMessage: error.message || null },
    )
  }

  if (data?.length) {
    throw new CheckoutError(
      'Item already sold',
      409,
      'item_already_sold',
      'duplicate_order_check',
      { listingId: data[0].listing_id, orderId: data[0].id, status: data[0].status },
    )
  }

  logStep('duplicate_order_check', 'succeeded')
}

async function validateSellerProfile(supabase: ReturnType<typeof createClient>, sellerId: string) {
  logStep('seller_lookup', 'started', { sellerId })
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', sellerId)
    .maybeSingle()

  if (error) {
    throw new CheckoutError(
      'Failed to load seller data.',
      500,
      'seller_query_failed',
      'seller_lookup',
      { dbCode: error.code || null, dbMessage: error.message || null },
    )
  }

  if (!data?.id) {
    throw new CheckoutError(
      'Seller profile was not found.',
      400,
      'seller_profile_not_found',
      'seller_lookup',
      { sellerId },
    )
  }

  logStep('seller_lookup', 'succeeded', { sellerId })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse(new CheckoutError(
      'Method not allowed.',
      405,
      'method_not_allowed',
      'request',
      { method: req.method },
    ))
  }

  try {
    logStep('request', 'started', { method: req.method })

    logStep('stripe_initialization', 'started')
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      throw new CheckoutError(
        'Stripe is not configured for checkout.',
        500,
        'missing_stripe_secret_key',
        'stripe_initialization',
      )
    }
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    logStep('stripe_initialization', 'succeeded')

    const { user, error: authResponse } = await authenticateUser(req)
    if (authResponse) return authResponse
    if (!user) {
      throw new CheckoutError(
        'Invalid or expired token. Please log in again and retry checkout.',
        401,
        'invalid_or_expired_token',
        'auth_verification',
      )
    }

    logStep('request_body_validation', 'started')
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      throw new CheckoutError(
        'Invalid JSON body.',
        400,
        'invalid_json_body',
        'request_body_validation',
      )
    }

    const requestBody = body as Record<string, unknown>
    const listingId = typeof requestBody.listingId === 'string' ? requestBody.listingId.trim() : ''
    const listingIds = Array.isArray(requestBody.listingIds)
      ? requestBody.listingIds.filter((id: unknown) => typeof id === 'string' && id.trim()).map((id: string) => id.trim())
      : []
    const requestedListingIds = [...new Set(listingIds.length > 0 ? listingIds : listingId ? [listingId] : [])]
    const deliveryMethod = requestBody.deliveryMethod === 'locker_collection' ? 'locker_collection' : 'home_delivery'

    if (requestedListingIds.length === 0) {
      throw new CheckoutError(
        'listingId or listingIds is required.',
        400,
        'missing_listing_ids',
        'request_body_validation',
        { hasListingId: Boolean(listingId), listingIdsCount: listingIds.length },
      )
    }
    logStep('request_body_validation', 'succeeded', {
      listingCount: requestedListingIds.length,
      deliveryMethod,
    })

    const supabase = getServiceClient()
    const listings = await loadListings(supabase, requestedListingIds)
    const sellerId = validateListingsForCheckout(listings, user.id)
    await validateNoExistingSoldOrders(supabase, requestedListingIds)
    await validateSellerProfile(supabase, sellerId)

    logStep('pricing', 'started', { listingCount: listings.length, deliveryMethod })
    const subtotalEuros = Number(listings.reduce((sum, listing) => sum + Number(listing.price), 0).toFixed(2))
    const deliveryFeeEuros = listings.length > 1
      ? getBundleDeliveryFee(deliveryMethod)
      : getSingleListingDeliveryFee(listings[0], deliveryMethod)
    const buyerProtectionFeeEuros = getBuyerProtectionFee(subtotalEuros)
    const totalEuros = Number((subtotalEuros + deliveryFeeEuros + buyerProtectionFeeEuros).toFixed(2))

    const subtotalCents = eurosToCents(subtotalEuros)
    const deliveryFeeCents = eurosToCents(deliveryFeeEuros)
    const buyerProtectionFeeCents = eurosToCents(buyerProtectionFeeEuros)
    const totalAmountCents = eurosToCents(totalEuros)

    if (totalAmountCents < 50) {
      throw new CheckoutError(
        'Amount must be at least EUR 0.50.',
        400,
        'amount_below_stripe_minimum',
        'pricing',
        { totalAmountCents },
      )
    }
    logStep('pricing', 'succeeded', {
      subtotalCents,
      deliveryFeeCents,
      buyerProtectionFeeCents,
      totalAmountCents,
    })

    logStep('payment_intent_creation', 'started', { totalAmountCents, currency: 'eur' })
    let paymentIntent: Stripe.PaymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmountCents,
        currency: 'eur',
        automatic_payment_methods: { enabled: true },
        receipt_email: user.email || undefined,
        metadata: {
          buyer_id: user.id,
          seller_id: sellerId,
          listing_id: requestedListingIds.length === 1 ? requestedListingIds[0] : '',
          listing_ids: requestedListingIds.join(','),
          delivery_method: deliveryMethod,
          subtotal_cents: String(subtotalCents),
          delivery_fee_cents: String(deliveryFeeCents),
          buyer_protection_fee_cents: String(buyerProtectionFeeCents),
          total_cents: String(totalAmountCents),
          payment_flow_type: 'separate_charge',
        },
      })
    } catch (stripeError) {
      const message = stripeError instanceof Error ? stripeError.message : 'Stripe PaymentIntent creation failed.'
      throw new CheckoutError(
        'Stripe PaymentIntent creation failed.',
        500,
        'stripe_payment_intent_failed',
        'payment_intent_creation',
        { stripeError: message },
      )
    }
    logStep('payment_intent_creation', 'succeeded', { paymentIntentId: paymentIntent.id })

    logStep('response_payload', 'started', { paymentIntentId: paymentIntent.id })
    if (!isValidPaymentIntentClientSecret(paymentIntent.client_secret)) {
      throw new CheckoutError(
        'Stripe did not return a valid client secret.',
        500,
        'invalid_stripe_client_secret',
        'response_payload',
        {
          paymentIntentId: paymentIntent.id,
          hasClientSecret: typeof paymentIntent.client_secret === 'string',
        },
      )
    }

    const responsePayload = {
      clientSecret: paymentIntent.client_secret,
      client_secret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      payment_intent_id: paymentIntent.id,
      amount: totalAmountCents,
      subtotalCents,
      deliveryFeeCents,
      buyerProtectionFeeCents,
    }
    logStep('response_payload', 'succeeded', {
      paymentIntentId: paymentIntent.id,
      hasClientSecret: true,
      responseKeys: Object.keys(responsePayload),
    })

    return jsonResponse(responsePayload)
  } catch (error) {
    logFailure(error, 'request')
    if (error instanceof CheckoutError) {
      return errorResponse(error)
    }

    const message = error instanceof Error ? error.message : 'Failed to create payment intent.'
    return errorResponse(new CheckoutError(
      message,
      500,
      'unexpected_checkout_error',
      'request',
    ))
  }
})
