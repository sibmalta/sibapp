import Stripe from 'npm:stripe@14.14.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

type ListingRow = {
  id: string
  seller_id: string
  title: string | null
  price: number | string | null
  category: string | null
  subcategory: string | null
  delivery_size: string | null
  status: string | null
}

class CheckoutError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return ''
  return authHeader.slice('Bearer '.length).trim()
}

function cents(amount: number) {
  return Math.round(amount * 100)
}

function buyerProtectionFee(itemSubtotal: number) {
  return Number((0.75 + itemSubtotal * 0.05).toFixed(2))
}

function getSingleListingDeliveryFee(listing: ListingRow, deliveryMethod: string) {
  const rawSize = listing.delivery_size || 'medium'
  const deliverySize = rawSize === 'large' ? 'bulky' : rawSize
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

async function authenticateUser(req: Request) {
  const token = getBearerToken(req)
  if (!token) {
    return { user: null, error: jsonResponse({ error: 'Missing bearer token. Please log in again and retry checkout.' }, 401) }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, error: jsonResponse({ error: 'Supabase auth configuration is missing.' }, 500) }
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await authClient.auth.getUser(token)

  if (error || !data?.user?.id) {
    console.error('create-payment-intent auth verification failed:', error)
    return { user: null, error: jsonResponse({ error: 'Invalid or expired user token. Please log in again and retry checkout.' }, 401) }
  }

  return { user: data.user, error: null }
}

function getServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase database configuration is missing.')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

async function getSingleListing(supabase: ReturnType<typeof createClient>, listingId: string) {
  const { data, error } = await supabase
    .from('listings')
    .select('id, seller_id, title, price, category, subcategory, delivery_size, status')
    .eq('id', listingId)
    .single()

  if (error || !data) {
    console.error('create-payment-intent listing lookup failed:', error)
    throw new CheckoutError('Listing not found.', 404)
  }

  return data as ListingRow
}

async function getBundleListings(supabase: ReturnType<typeof createClient>, listingIds: string[]) {
  const uniqueIds = [...new Set(listingIds)]
  const { data, error } = await supabase
    .from('listings')
    .select('id, seller_id, title, price, category, subcategory, delivery_size, status')
    .in('id', uniqueIds)

  if (error || !data || data.length !== uniqueIds.length) {
    console.error('create-payment-intent bundle listing lookup failed:', error)
    throw new CheckoutError('One or more bundle items could not be found.', 404)
  }

  return data as ListingRow[]
}

function validateListingsForCheckout(listings: ListingRow[], buyerId: string) {
  if (listings.length === 0) {
    throw new CheckoutError('No listings provided for checkout.')
  }

  const sellerId = listings[0].seller_id
  if (!sellerId) {
    throw new CheckoutError('Listing seller is missing.')
  }

  if (sellerId === buyerId) {
    throw new CheckoutError('You cannot buy your own listing.', 403)
  }

  for (const listing of listings) {
    if (listing.seller_id !== sellerId) {
      throw new CheckoutError('Bundle checkout is only allowed for listings from the same seller.')
    }
    if (listing.status !== 'active') {
      throw new CheckoutError('One or more listings are no longer available.', 409)
    }
    if (!Number.isFinite(Number(listing.price)) || Number(listing.price) <= 0) {
      throw new CheckoutError('One or more listings have an invalid price.')
    }
  }

  return sellerId
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return jsonResponse({ error: 'Stripe is not configured.' }, 500)
    }

    const { user, error: authResponse } = await authenticateUser(req)
    if (authResponse) return authResponse
    if (!user) {
      return jsonResponse({ error: 'Invalid or expired user token. Please log in again and retry checkout.' }, 401)
    }

    const buyerId = user.id
    const body = await req.json().catch(() => ({}))
    const listingId = typeof body.listingId === 'string' ? body.listingId : ''
    const listingIds = Array.isArray(body.listingIds)
      ? body.listingIds.filter((id: unknown) => typeof id === 'string')
      : []
    const deliveryMethod = body.deliveryMethod === 'locker_collection'
      ? 'locker_collection'
      : 'home_delivery'

    if (!listingId && listingIds.length === 0) {
      return jsonResponse({ error: 'listingId or listingIds is required.' }, 400)
    }

    const supabase = getServiceClient()
    const isBundle = listingIds.length > 0
    const listings = isBundle
      ? await getBundleListings(supabase, listingIds)
      : [await getSingleListing(supabase, listingId)]

    const sellerId = validateListingsForCheckout(listings, buyerId)
    const itemSubtotal = Number(listings.reduce((sum, listing) => sum + Number(listing.price), 0).toFixed(2))
    const deliveryFee = isBundle
      ? getBundleDeliveryFee(deliveryMethod)
      : getSingleListingDeliveryFee(listings[0], deliveryMethod)
    const protectionFee = buyerProtectionFee(itemSubtotal)
    const total = Number((itemSubtotal + deliveryFee + protectionFee).toFixed(2))
    const amountCents = cents(total)

    if (amountCents < 50) {
      return jsonResponse({ error: 'Payment amount is below Stripe minimum.' }, 400)
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      metadata: {
        buyer_id: buyerId,
        seller_id: sellerId,
        listing_id: listings[0].id,
        listing_ids: listings.map((listing) => listing.id).join(','),
        item_subtotal: itemSubtotal.toFixed(2),
        delivery_fee: deliveryFee.toFixed(2),
        buyer_protection_fee: protectionFee.toFixed(2),
        payment_flow_type: 'separate_charge',
        checkout_type: isBundle ? 'bundle' : 'single',
      },
      payment_method_types: ['card'],
    })

    if (!paymentIntent.client_secret) {
      console.error('create-payment-intent returned PaymentIntent without client_secret', {
        paymentIntentId: paymentIntent.id,
      })
      return jsonResponse({ error: 'Stripe did not return a valid client secret.' }, 500)
    }

    return jsonResponse({
      clientSecret: paymentIntent.client_secret,
      client_secret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      payment_intent_id: paymentIntent.id,
      amount: amountCents,
      currency: 'eur',
    })
  } catch (error) {
    console.error('create-payment-intent error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create payment intent.'
    const status = error instanceof CheckoutError ? error.status : 500
    return jsonResponse({ error: message }, status)
  }
})
