const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import Stripe from 'npm:stripe@14.14.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

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

function toMoneyNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function eurosToCents(value: number): number {
  return Math.round(value * 100)
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

    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return jsonResponse({ error: 'Invalid or expired token.' }, 401)
    }

    let body: {
      listingId?: string
      listingIds?: string[]
      deliveryMethod?: string
    } = {}

    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body.' }, 400)
    }

    const listingId = body.listingId || ''
    const listingIds = Array.isArray(body.listingIds)
      ? body.listingIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
      : []
    const deliveryMethod = body.deliveryMethod || 'home_delivery'

    const requestedListingIds =
      listingIds.length > 0
        ? [...new Set(listingIds)]
        : listingId
          ? [listingId]
          : []

    if (requestedListingIds.length === 0) {
      return jsonResponse({ error: 'listingId or listingIds is required.' }, 400)
    }

    if (!['home_delivery', 'locker_collection'].includes(deliveryMethod)) {
      return jsonResponse({ error: 'Invalid delivery method.' }, 400)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: listings, error: listingsError } = await supabase
  .from('listings')
  .select('*')
  .in('id', requestedListingIds)

if (listingsError) {
  console.error('Listings query error:', listingsError)
  return jsonResponse(
    { error: `Failed to load listing data: ${listingsError.message}` },
    500
  )
}

  

    if (!listings || listings.length !== requestedListingIds.length) {
      return jsonResponse({ error: 'One or more listings were not found.' }, 404)
    }

    const listingsById = new Map(listings.map((listing) => [listing.id, listing]))
    const orderedListings = requestedListingIds.map((id) => listingsById.get(id)).filter(Boolean)

    if (orderedListings.length !== requestedListingIds.length) {
      return jsonResponse({ error: 'One or more listings were not found.' }, 404)
    }

    const sellerIds = new Set<string>()
    let subtotalEuros = 0
    let derivedDeliverySize = 'medium'

    for (const listing of orderedListings) {
      if (!listing) continue

      if (listing.status && listing.status !== 'active') {
        return jsonResponse({ error: `Listing "${listing.title}" is not available.` }, 400)
      }

      if (listing.is_sold || listing.isSold) {
        return jsonResponse({ error: `Listing "${listing.title}" has already been sold.` }, 400)
      }

const resolvedSellerId =
  listing.seller_id ||
  listing.sellerId ||
  listing.user_id ||
  listing.userId ||
  listing.owner_id ||
  listing.ownerId

if (!resolvedSellerId) {
  return jsonResponse(
    {
      error: `Listing "${listing.title}" is missing seller information.`,
      debug: Object.keys(listing),
    },
    400
  )
}

if (resolvedSellerId === user.id) {
  return jsonResponse({ error: 'You cannot buy your own listing.' }, 400)
}

      if (listing.seller_id === user.id) {
        return jsonResponse({ error: 'You cannot buy your own listing.' }, 400)
      }

      const priceEuros = toMoneyNumber(listing.price)
      if (priceEuros <= 0) {
        return jsonResponse({ error: `Listing "${listing.title}" has an invalid price.` }, 400)
      }

      subtotalEuros += priceEuros
      sellerIds.add(resolvedSellerId)

      const size = String(listing.delivery_size || listing.deliverySize || '').toLowerCase()
      if (size === 'bulky') {
        derivedDeliverySize = 'bulky'
      } else if (size === 'heavy' && derivedDeliverySize !== 'bulky') {
        derivedDeliverySize = 'heavy'
      } else if (size === 'small' && derivedDeliverySize === 'medium') {
        derivedDeliverySize = 'small'
      }
    }

    if (sellerIds.size !== 1) {
      return jsonResponse({ error: 'Bundle listings must all belong to the same seller.' }, 400)
    }

    const sellerId = [...sellerIds][0]

    let deliveryFeeEuros = 0

    if (derivedDeliverySize === 'bulky') {
      deliveryFeeEuros = 4.50
    } else if (derivedDeliverySize === 'heavy') {
      deliveryFeeEuros = 4.50
    } else if (deliveryMethod === 'locker_collection') {
      deliveryFeeEuros = derivedDeliverySize === 'small' ? 2.49 : 2.99
    } else {
      deliveryFeeEuros = derivedDeliverySize === 'small' ? 2.99 : 3.99
    }

    const buyerProtectionFeeEuros = 0.75 + subtotalEuros * 0.05
    const totalEuros = subtotalEuros + deliveryFeeEuros + buyerProtectionFeeEuros

    const subtotalCents = eurosToCents(subtotalEuros)
    const deliveryFeeCents = eurosToCents(deliveryFeeEuros)
    const buyerProtectionFeeCents = eurosToCents(buyerProtectionFeeEuros)
    const totalAmountCents = eurosToCents(totalEuros)

    if (totalAmountCents < 50) {
      return jsonResponse({ error: 'Amount must be at least €0.50 (50 cents).' }, 400)
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

   const paymentIntent = await stripe.paymentIntents.create({
  amount: totalAmountCents,
  currency: 'eur',

  automatic_payment_methods: { enabled: true },

  receipt_email: user.email, // ✅ MUST BE HERE (top level)

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
  },
})

    return jsonResponse({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmountCents,
      subtotalCents,
      deliveryFeeCents,
      buyerProtectionFeeCents,
    })
  } catch (error) {
    console.error('create-payment-intent error:', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Failed to create payment intent.' },
      500
    )
  }
})