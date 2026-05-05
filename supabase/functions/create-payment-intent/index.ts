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
  subcategory: string | null
  created_at: string | null
  locker_eligible: boolean | null
}

type OfferRow = {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  status: string | null
  price: number | string | null
  counter_price: number | string | null
  accepted_price: number | string | null
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

const BUNDLE_DELIVERY_FEES: Record<string, number> = {
  home_delivery: 3.50,
  locker_collection: 3.50,
}

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  women: 'fashion',
  men: 'fashion',
  shoes: 'fashion',
  accessories: 'fashion',
  vintage: 'fashion',
}

const ALWAYS_LOCKER_ELIGIBLE_CATEGORIES = new Set(['fashion', 'books'])
const LOCKER_ELIGIBLE_SUBCATEGORIES: Record<string, Set<string>> = {
  home: new Set(['decor', 'kitchenware', 'bedding', 'bathroom', 'lighting', 'storage', 'other_home']),
  toys: new Set(['action_figures', 'board_games', 'lego', 'educational', 'plush', 'collectibles']),
  kids: new Set(['baby_clothing', 'kids_clothing', 'maternity']),
}
const LOCKER_ELIGIBILITY_FIX_TIME = Date.parse('2026-04-27T00:00:00.000Z')

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

function resolveCategory(category: string | null) {
  const normalized = (category || '').toLowerCase()
  return LEGACY_CATEGORY_MAP[normalized] || normalized
}

function isLockerEligible(listing: ListingRow) {
  const category = resolveCategory(listing.category)
  const subcategory = listing.subcategory || ''
  const defaultEligible =
    ALWAYS_LOCKER_ELIGIBLE_CATEGORIES.has(category) ||
    Boolean(LOCKER_ELIGIBLE_SUBCATEGORIES[category]?.has(subcategory))

  if (typeof listing.locker_eligible === 'boolean') {
    const createdTime = listing.created_at ? Date.parse(listing.created_at) : Number.NaN
    const legacyDefaultFalse =
      listing.locker_eligible === false &&
      defaultEligible &&
      Number.isFinite(createdTime) &&
      createdTime < LOCKER_ELIGIBILITY_FIX_TIME
    return legacyDefaultFalse ? defaultEligible : listing.locker_eligible
  }

  if (defaultEligible) return true
  return false
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
  return BUNDLE_DELIVERY_FEES[deliveryMethod] ?? BUNDLE_DELIVERY_FEES.home_delivery
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
    .select('id, seller_id, title, price, status, category, subcategory, created_at, locker_eligible')
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

async function loadAcceptedOffer(
  supabase: ReturnType<typeof createClient>,
  offerId: string,
  listingId: string,
  buyerId: string,
) {
  if (!offerId) return null

  logStep('offer_lookup', 'started', { offerId, listingId, buyerId })
  const { data, error } = await supabase
    .from('offers')
    .select('id,listing_id,buyer_id,seller_id,status,price,counter_price,accepted_price')
    .eq('id', offerId)
    .single()

  if (error) {
    throw new CheckoutError(
      'Failed to load accepted offer.',
      409,
      'offer_lookup_failed',
      'offer_lookup',
      { offerId, dbCode: error.code || null, dbMessage: error.message || null },
    )
  }

  const offer = data as OfferRow
  if (
    !offer ||
    offer.listing_id !== listingId ||
    offer.buyer_id !== buyerId ||
    offer.status !== 'accepted'
  ) {
    throw new CheckoutError(
      'This offer is not available for checkout.',
      409,
      'accepted_offer_invalid',
      'offer_lookup',
      { offerId, listingId, status: offer?.status || null },
    )
  }

  logStep('offer_lookup', 'succeeded', { offerId, acceptedPrice: offer.accepted_price })
  return offer
}

function getAcceptedOfferPrice(offer: OfferRow | null) {
  if (!offer) return null
  const value = Number(offer.accepted_price ?? offer.counter_price ?? offer.price)
  return Number.isFinite(value) && value > 0 ? value : null
}

function validateListingsForCheckout(listings: ListingRow[], buyerId: string, acceptedOffer: OfferRow | null = null) {
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

    const isReservedForAcceptedOffer =
      isReservedListingStatus(listing.status) &&
      acceptedOffer?.listing_id === listing.id &&
      acceptedOffer?.buyer_id === buyerId &&
      acceptedOffer?.status === 'accepted'

    if (!isActiveListingStatus(listing.status) && !isReservedForAcceptedOffer) {
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

function validateLockerEligibility(listings: ListingRow[], deliveryMethod: string) {
  if (deliveryMethod !== 'locker_collection') return
  const ineligible = listings.find((listing) => !isLockerEligible(listing))
  if (!ineligible) return

  throw new CheckoutError(
    'Only small parcels are supported right now.',
    400,
    'locker_not_available',
    'delivery_method_validation',
    {
      listingId: ineligible.id,
      category: ineligible.category,
      subcategory: ineligible.subcategory,
      lockerEligible: ineligible.locker_eligible,
      createdAt: ineligible.created_at,
    },
  )
}

const SOLD_ORDER_STATUSES = ['paid', 'payment_received_seller_payout_pending', 'shipped', 'delivered', 'confirmed', 'completed']
const ACTIVE_LISTING_STATUSES = ['active', 'available', 'published', 'approved', 'live']
const RESERVED_LISTING_STATUSES = ['reserved']

function isActiveListingStatus(status: string | null | undefined) {
  return ACTIVE_LISTING_STATUSES.includes(String(status || '').toLowerCase())
}

function isReservedListingStatus(status: string | null | undefined) {
  return RESERVED_LISTING_STATUSES.includes(String(status || '').toLowerCase())
}

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
    .select('id, stripe_account_id, details_submitted, payouts_enabled')
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

  const payoutSetupReasons: string[] = []
  if (!data.stripe_account_id) payoutSetupReasons.push('missing_stripe_account')
  if (!data.details_submitted) payoutSetupReasons.push('verification_incomplete')
  if (!data.payouts_enabled) payoutSetupReasons.push('payouts_not_enabled')

  const payoutReady = payoutSetupReasons.length === 0
  logStep('seller_lookup', 'succeeded', { sellerId, payoutReady, payoutSetupReasons })
  return { payoutReady, payoutSetupReasons }
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
    const offerId = typeof requestBody.offerId === 'string' ? requestBody.offerId.trim() : ''
    const orderId = typeof requestBody.orderId === 'string' ? requestBody.orderId.trim() : ''
    const listingIds = Array.isArray(requestBody.listingIds)
      ? requestBody.listingIds.filter((id: unknown) => typeof id === 'string' && id.trim()).map((id: string) => id.trim())
      : []
    const requestedListingIds = [...new Set(listingIds.length > 0 ? listingIds : listingId ? [listingId] : [])]
    const rawDeliveryMethod = typeof requestBody.deliveryMethod === 'string' ? requestBody.deliveryMethod : ''
    if (rawDeliveryMethod !== 'locker_collection') {
      throw new CheckoutError(
        'This delivery method is no longer available.',
        400,
        'delivery_method_unavailable',
        'request_body_validation',
        { requestedDeliveryMethod: rawDeliveryMethod || null },
      )
    }
    const deliveryMethod = 'locker_collection'
    logStep('request_body_validation', 'payload_received', {
      listingId: listingId || null,
      orderId: orderId || null,
      listingIds,
      offerId: offerId || null,
      deliveryMethod,
      rawDeliveryMethod: rawDeliveryMethod || null,
      buyerId: user.id,
    })

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
    const acceptedOffer = requestedListingIds.length === 1
      ? await loadAcceptedOffer(supabase, offerId, requestedListingIds[0], user.id)
      : null
    const sellerId = validateListingsForCheckout(listings, user.id, acceptedOffer)
    validateLockerEligibility(listings, deliveryMethod)
    await validateNoExistingSoldOrders(supabase, requestedListingIds)
    const sellerPayout = await validateSellerProfile(supabase, sellerId)

    logStep('pricing', 'started', { listingCount: listings.length, deliveryMethod })
    const acceptedOfferPrice = getAcceptedOfferPrice(acceptedOffer)
    const subtotalEuros = Number((
      acceptedOfferPrice ?? listings.reduce((sum, listing) => sum + Number(listing.price), 0)
    ).toFixed(2))
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
      subtotalEuros,
      deliveryFeeEuros,
      buyerProtectionFeeEuros,
      totalEuros,
    })

    logStep('payment_intent_creation', 'started', {
      totalAmountCents,
      currency: 'eur',
      buyerId: user.id,
      sellerId,
      listingIds: requestedListingIds,
      deliveryMethod,
    })
    let paymentIntent: Stripe.PaymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmountCents,
        currency: 'eur',
        automatic_payment_methods: { enabled: true },
        excluded_payment_method_types: ['bancontact', 'eps'],
        receipt_email: user.email || undefined,
        metadata: {
          buyer_id: user.id,
          seller_id: sellerId,
          order_id: orderId,
          listing_id: requestedListingIds.length === 1 ? requestedListingIds[0] : '',
          listing_ids: requestedListingIds.join(','),
          offer_id: offerId,
          delivery_method: deliveryMethod,
          seller_payout_ready: sellerPayout.payoutReady ? 'true' : 'false',
          seller_payout_setup_reasons: sellerPayout.payoutSetupReasons.join(','),
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
      sellerPayoutReady: sellerPayout.payoutReady,
      sellerPayoutSetupReasons: sellerPayout.payoutSetupReasons,
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
