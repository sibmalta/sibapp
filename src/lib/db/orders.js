/**
 * orders.js - Supabase data layer for orders, disputes, and payouts tables.
 *
 * All functions accept an authenticated supabase client (from useSupabase()).
 * Returns { data, error } mirroring the Supabase client pattern.
 */

import { FULFILMENT_PROVIDER, getFulfilmentPrice, normalizeFulfilmentMethod } from '../fulfilment'
import { isActiveInventoryStatus } from './listings'

// Shape helpers

function normalizeListingImages(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function getFirstListingImage(value) {
  return normalizeListingImages(value)[0] || ''
}

export function rowToOrder(row) {
  if (!row) return null
  const listingRow = row.listing || row.listings || null
  const listingImages = normalizeListingImages(listingRow?.images)
  const shippingAddress = row.shipping_address || null
  const shippingAddressObject = shippingAddress && typeof shippingAddress === 'object' && !Array.isArray(shippingAddress)
    ? shippingAddress
    : {}
  const address = row.address || shippingAddressObject.raw || (typeof shippingAddress === 'string' ? shippingAddress : null)
  const fulfilmentMethod = row.fulfilment_method || normalizeFulfilmentMethod(row.delivery_method || shippingAddressObject.fulfilmentMethod)
  const fulfilmentPrice = row.fulfilment_price != null
    ? Number(row.fulfilment_price)
    : (row.delivery_fee != null ? Number(row.delivery_fee) : getFulfilmentPrice(fulfilmentMethod))

  return {
    id: row.id,
    orderRef: row.order_ref || '',
    listingId: row.listing_id || '',
    buyerId: row.buyer_id || '',
    sellerId: row.seller_id || '',
    listing: listingRow ? {
      id: listingRow.id || row.listing_id || '',
      title: listingRow.title || row.listing_title || '',
      images: listingImages,
    } : null,
    listingTitle: row.listing_title || listingRow?.title || '',
    listingImage: row.listing_image || getFirstListingImage(listingRow?.images),
    itemPrice: Number(row.item_price || 0),
    bundledFee: Number(row.bundled_fee || row.platform_fee || shippingAddressObject.bundledFee || 0),
    totalPrice: Number(row.total_price || 0),
    sellerPayout: Number(row.seller_payout || 0),
    sellerPayoutAmount: Number(row.seller_payout_amount ?? row.seller_payout ?? 0),
    platformFee: Number(row.platform_fee || 0),
    platformFeeAmount: Number(row.platform_fee_amount ?? row.platform_fee ?? 0),
    deliveryFeeAmount: row.delivery_fee_amount != null ? Number(row.delivery_fee_amount) : null,
    stripeFeeAmount: row.stripe_fee_amount != null ? Number(row.stripe_fee_amount) : null,
    amount: Number(row.amount || 0),
    status: row.status || 'pending',
    trackingStatus: row.tracking_status || 'pending',
    payoutStatus: row.payout_status || 'held',
    deliveryMethod: row.delivery_method || 'sib_delivery',
    fulfilmentProvider: row.fulfilment_provider || FULFILMENT_PROVIDER,
    fulfilmentMethod,
    fulfilmentPrice,
    fulfilmentStatus: row.fulfilment_status || row.tracking_status || 'awaiting_fulfilment',
    trackingNumber: row.tracking_number || null,
    shippingAddress,
    isBundle: row.is_bundle || false,
    bundleListingIds: row.bundle_listing_ids || [],
    bundleOfferId: row.bundle_offer_id || null,
    address,
    overdueFlag: row.overdue_flag || false,
    overdueFlaggedAt: row.overdue_flagged_at || null,
    sellerClaimedDropoff: Boolean(row.seller_claimed_dropoff),
    sellerDropoffClaimedAt: row.seller_dropoff_claimed_at || null,
    dropoffScanToken: row.dropoff_scan_token || '',
    dropoffConfirmedAt: row.dropoff_confirmed_at || null,
    dropoffConfirmedBy: row.dropoff_confirmed_by || null,
    dropoffLocation: row.dropoff_location || null,
    autoConfirmed: row.auto_confirmed || false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    paidAt: row.paid_at || null,
    shippedAt: row.shipped_at || null,
    deliveredAt: row.delivered_at || null,
    buyerConfirmationDeadline: row.buyer_confirmation_deadline || null,
    buyerConfirmedAt: row.buyer_confirmed_at || null,
    disputedAt: row.disputed_at || null,
    completedAt: row.completed_at || null,
    confirmedAt: row.confirmed_at || null,
    payoutReleasedAt: row.payout_released_at || null,
    cancelledAt: row.cancelled_at || null,
    // Delivery snapshot - buyer
    buyerFullName: row.buyer_full_name || shippingAddressObject.buyerFullName || null,
    buyerPhone: row.buyer_phone || shippingAddressObject.buyerPhone || null,
    buyerCity: row.buyer_city || shippingAddressObject.buyerCity || null,
    buyerPostcode: row.buyer_postcode || shippingAddressObject.buyerPostcode || null,
    deliveryNotes: row.delivery_notes || shippingAddressObject.deliveryNotes || null,
    deliveryFee: row.delivery_fee != null ? Number(row.delivery_fee) : (shippingAddressObject.deliveryFee != null ? Number(shippingAddressObject.deliveryFee) : null),
    lockerLocationName: row.locker_location_name || shippingAddressObject.lockerLocationName || null,
    lockerAddress: row.locker_address || shippingAddressObject.lockerAddress || null,
    lockerLocation: row.locker_location || shippingAddressObject.lockerLocation || null,
    deliveryAddressSnapshot: row.delivery_address_snapshot || shippingAddressObject.deliveryAddressSnapshot || null,
    // Delivery snapshot - seller
    sellerName: row.seller_name || shippingAddressObject.sellerName || null,
    sellerPhone: row.seller_phone || shippingAddressObject.sellerPhone || null,
    sellerAddress: row.seller_address || shippingAddressObject.sellerAddress || null,
    // Stripe fields (written by Edge Functions / checkout pages)
    stripePaymentIntentId: row.stripe_payment_intent_id || null,
    stripeCheckoutSessionId: row.stripe_checkout_session_id || null,
    stripeTransferId: row.stripe_transfer_id || null,
    sellerStripeAccountId: row.seller_stripe_account_id || null,
    paymentStatus: row.payment_status || null,
    paymentFlowType: row.payment_flow_type || null,
    sellerPayoutStatus: row.seller_payout_status || null,
    autoReleaseAttemptedAt: row.auto_release_attempted_at || null,
    autoReleaseResult: row.auto_release_result || null,
    autoReleaseError: row.auto_release_error || null,
    refundedAt: row.refunded_at || null,
    stripeRefundId: row.stripe_refund_id || null,
  }
}

export function orderToRow(order) {
  const row = {}
  if (order.orderRef !== undefined) row.order_ref = order.orderRef
  if (order.listingId !== undefined) row.listing_id = order.listingId
  if (order.buyerId !== undefined) row.buyer_id = order.buyerId
  if (order.sellerId !== undefined) row.seller_id = order.sellerId
  if (order.listingTitle !== undefined) row.listing_title = order.listingTitle
  if (order.listingImage !== undefined) row.listing_image = order.listingImage
  if (order.itemPrice !== undefined) row.item_price = order.itemPrice
  if (order.totalPrice !== undefined) row.total_price = order.totalPrice
  if (order.sellerPayout !== undefined) row.seller_payout = order.sellerPayout
  if (order.sellerPayoutAmount !== undefined) row.seller_payout_amount = order.sellerPayoutAmount
  if (order.platformFee !== undefined) row.platform_fee = order.platformFee
  if (order.platformFeeAmount !== undefined) row.platform_fee_amount = order.platformFeeAmount
  if (order.deliveryFeeAmount !== undefined) row.delivery_fee_amount = order.deliveryFeeAmount
  if (order.stripeFeeAmount !== undefined) row.stripe_fee_amount = order.stripeFeeAmount
  if (order.amount !== undefined) row.amount = order.amount
  if (order.status !== undefined) row.status = order.status
  if (order.trackingStatus !== undefined) row.tracking_status = order.trackingStatus
  if (order.payoutStatus !== undefined) row.payout_status = order.payoutStatus
  if (order.deliveryMethod !== undefined) row.delivery_method = order.deliveryMethod
  if (order.deliveryFee !== undefined) row.delivery_fee = order.deliveryFee
  if (order.buyerFullName !== undefined) row.buyer_full_name = order.buyerFullName
  if (order.buyerPhone !== undefined) row.buyer_phone = order.buyerPhone
  if (order.buyerCity !== undefined) row.buyer_city = order.buyerCity
  if (order.buyerPostcode !== undefined) row.buyer_postcode = order.buyerPostcode
  if (order.deliveryNotes !== undefined) row.delivery_notes = order.deliveryNotes
  if (order.lockerLocationName !== undefined) row.locker_location_name = order.lockerLocationName
  if (order.lockerAddress !== undefined) row.locker_address = order.lockerAddress
  if (order.sellerName !== undefined) row.seller_name = order.sellerName
  if (order.sellerPhone !== undefined) row.seller_phone = order.sellerPhone
  if (order.sellerAddress !== undefined) row.seller_address = order.sellerAddress
  if (order.fulfilmentProvider !== undefined) row.fulfilment_provider = order.fulfilmentProvider
  if (order.fulfilmentMethod !== undefined) row.fulfilment_method = normalizeFulfilmentMethod(order.fulfilmentMethod)
  if (order.fulfilmentPrice !== undefined) row.fulfilment_price = order.fulfilmentPrice
  if (order.fulfilmentStatus !== undefined) row.fulfilment_status = order.fulfilmentStatus
  if (order.lockerLocation !== undefined) row.locker_location = order.lockerLocation
  if (order.deliveryAddressSnapshot !== undefined) row.delivery_address_snapshot = order.deliveryAddressSnapshot
  if (order.trackingNumber !== undefined) row.tracking_number = order.trackingNumber

  const shippingAddress = buildShippingAddressPayload(order)
  if (shippingAddress !== undefined) row.shipping_address = shippingAddress

  if (order.isBundle !== undefined) row.is_bundle = order.isBundle
  if (order.bundleListingIds !== undefined) row.bundle_listing_ids = order.bundleListingIds
  if (order.bundleOfferId !== undefined) row.bundle_offer_id = order.bundleOfferId
  if (order.overdueFlag !== undefined) row.overdue_flag = order.overdueFlag
  if (order.overdueFlaggedAt !== undefined) row.overdue_flagged_at = order.overdueFlaggedAt
  if (order.sellerClaimedDropoff !== undefined) row.seller_claimed_dropoff = order.sellerClaimedDropoff
  if (order.sellerDropoffClaimedAt !== undefined) row.seller_dropoff_claimed_at = order.sellerDropoffClaimedAt
  if (order.dropoffScanToken !== undefined) row.dropoff_scan_token = order.dropoffScanToken
  if (order.dropoffConfirmedAt !== undefined) row.dropoff_confirmed_at = order.dropoffConfirmedAt
  if (order.dropoffConfirmedBy !== undefined) row.dropoff_confirmed_by = order.dropoffConfirmedBy
  if (order.dropoffLocation !== undefined) row.dropoff_location = order.dropoffLocation
  if (order.autoConfirmed !== undefined) row.auto_confirmed = order.autoConfirmed
  if (order.paidAt !== undefined) row.paid_at = order.paidAt
  if (order.shippedAt !== undefined) row.shipped_at = order.shippedAt
  if (order.deliveredAt !== undefined) row.delivered_at = order.deliveredAt
  if (order.buyerConfirmationDeadline !== undefined) row.buyer_confirmation_deadline = order.buyerConfirmationDeadline
  if (order.buyerConfirmedAt !== undefined) row.buyer_confirmed_at = order.buyerConfirmedAt
  if (order.disputedAt !== undefined) row.disputed_at = order.disputedAt
  if (order.completedAt !== undefined) row.completed_at = order.completedAt
  if (order.confirmedAt !== undefined) row.confirmed_at = order.confirmedAt
  if (order.payoutReleasedAt !== undefined) row.payout_released_at = order.payoutReleasedAt
  if (order.cancelledAt !== undefined) row.cancelled_at = order.cancelledAt

  if (order.stripePaymentIntentId !== undefined) row.stripe_payment_intent_id = order.stripePaymentIntentId
  if (order.stripeCheckoutSessionId !== undefined) row.stripe_checkout_session_id = order.stripeCheckoutSessionId
  if (order.stripeTransferId !== undefined) row.stripe_transfer_id = order.stripeTransferId
  if (order.sellerStripeAccountId !== undefined) row.seller_stripe_account_id = order.sellerStripeAccountId
  if (order.paymentStatus !== undefined) row.payment_status = order.paymentStatus
  if (order.paymentFlowType !== undefined) row.payment_flow_type = order.paymentFlowType
  if (order.sellerPayoutStatus !== undefined) row.seller_payout_status = order.sellerPayoutStatus
  if (order.autoReleaseAttemptedAt !== undefined) row.auto_release_attempted_at = order.autoReleaseAttemptedAt
  if (order.autoReleaseResult !== undefined) row.auto_release_result = order.autoReleaseResult
  if (order.autoReleaseError !== undefined) row.auto_release_error = order.autoReleaseError
  if (order.refundedAt !== undefined) row.refunded_at = order.refundedAt
  if (order.stripeRefundId !== undefined) row.stripe_refund_id = order.stripeRefundId

  return row
}

// Order CRUD

function buildShippingAddressPayload(order) {
  if (order.shippingAddress !== undefined) return order.shippingAddress

  const hasDeliverySnapshot = [
    'address',
    'bundledFee',
    'buyerFullName',
    'buyerPhone',
    'buyerCity',
    'buyerPostcode',
    'deliveryNotes',
    'deliveryFee',
    'fulfilmentMethod',
    'fulfilmentPrice',
    'fulfilmentStatus',
    'lockerLocation',
    'deliveryAddressSnapshot',
    'lockerLocationName',
    'lockerAddress',
    'sellerName',
    'sellerPhone',
    'sellerAddress',
  ].some(key => order[key] !== undefined)

  if (!hasDeliverySnapshot) return undefined

  return {
    raw: order.address || null,
    bundledFee: order.bundledFee ?? null,
    buyerFullName: order.buyerFullName || null,
    buyerPhone: order.buyerPhone || null,
    buyerCity: order.buyerCity || null,
    buyerPostcode: order.buyerPostcode || null,
    deliveryNotes: order.deliveryNotes || null,
    deliveryFee: order.deliveryFee ?? null,
    fulfilmentMethod: order.fulfilmentMethod || null,
    fulfilmentPrice: order.fulfilmentPrice ?? null,
    fulfilmentStatus: order.fulfilmentStatus || null,
    lockerLocation: order.lockerLocation || null,
    deliveryAddressSnapshot: order.deliveryAddressSnapshot || null,
    lockerLocationName: order.lockerLocationName || null,
    lockerAddress: order.lockerAddress || null,
    sellerName: order.sellerName || null,
    sellerPhone: order.sellerPhone || null,
    sellerAddress: order.sellerAddress || null,
  }
}

export async function fetchAllOrders(supabase) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) return { data: null, error }
    const rows = data || []
    const listingIds = [...new Set(rows.map(row => row?.listing_id).filter(Boolean))]
    let listingsById = new Map()

    if (listingIds.length > 0) {
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('id,title,images')
        .in('id', listingIds)

      if (listingsError) {
        console.warn('[orders] Unable to enrich orders with listing images:', listingsError.message)
      } else {
        listingsById = new Map((listingsData || []).map(listing => [listing.id, listing]))
      }
    }

    return {
      data: rows.map(row => rowToOrder({
        ...row,
        listing: row.listing || row.listings || listingsById.get(row.listing_id) || null,
      })),
      error: null,
    }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function insertOrder(supabase, order) {
  try {
    const row = orderToRow(order)
    const validationError = validateOrderRowForInsert(row)
    if (validationError) return { data: null, error: validationError }

    const existingOrder = await findExistingOrderByPaymentIntent(supabase, row.stripe_payment_intent_id)
    if (existingOrder.error) return { data: null, error: existingOrder.error }
    if (existingOrder.data) return { data: existingOrder.data, error: null }

    const listingCheck = await assertListingCanBeOrdered(supabase, row.listing_id)
    if (listingCheck.error) return { data: null, error: listingCheck.error }

    const { data, error } = await insertOrderRow(supabase, row)
    if (error) {
      const duplicateOrder = await findExistingOrderByPaymentIntent(supabase, row.stripe_payment_intent_id)
      if (!duplicateOrder.error && duplicateOrder.data) return { data: duplicateOrder.data, error: null }
      return { data: null, error }
    }
    return { data: rowToOrder(data), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

async function findExistingOrderByPaymentIntent(supabase, paymentIntentId) {
  if (!paymentIntentId) return { data: null, error: null }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (error) return { data: null, error }
  return { data: rowToOrder(data), error: null }
}

const SOLD_ORDER_STATUSES = ['paid', 'payment_received_seller_payout_pending', 'shipped', 'delivered', 'confirmed', 'completed']

async function assertListingCanBeOrdered(supabase, listingId) {
  if (!listingId) return { error: { message: 'Item already sold' } }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id,status')
    .eq('id', listingId)
    .single()

  if (listingError) return { error: listingError }
  const canOrderListing =
    isActiveInventoryStatus(listing?.status) ||
    String(listing?.status || '').toLowerCase() === 'reserved'
  if (!listing || !canOrderListing) return { error: { message: 'Item already sold' } }

  const { data: existingOrders, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('listing_id', listingId)
    .in('status', SOLD_ORDER_STATUSES)
    .limit(1)

  if (orderError) return { error: orderError }
  if (existingOrders?.length > 0) return { error: { message: 'Item already sold' } }

  return { error: null }
}

async function insertOrderRow(supabase, row) {
  let currentRow = { ...row }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabase
      .from('orders')
      .insert(currentRow)
      .select()
      .single()

    if (!error) return { data, error: null }

    const missingColumn = getMissingSchemaColumn(error)
    if (!missingColumn || !(missingColumn in currentRow)) {
      return { data: null, error }
    }

    if (!isOptionalSchemaDriftColumn(missingColumn)) {
      console.error(`[orders] Live orders schema is missing required checkout column "${missingColumn}". Refusing to create a partial order.`)
      return {
        data: null,
        error: {
          ...error,
          message: `Live orders schema is missing required checkout column "${missingColumn}". Apply the orders schema repair migration before placing orders.`,
        },
      }
    }

    console.warn(`[orders] Live orders schema is missing optional legacy column "${missingColumn}". Retrying insert without it.`)
    const { [missingColumn]: _removed, ...nextRow } = currentRow
    currentRow = nextRow
  }

  return { data: null, error: { message: 'Order insert failed after removing unsupported live-schema columns.' } }
}

function getMissingSchemaColumn(error) {
  const message = error?.message || ''
  const match = message.match(/Could not find the '([^']+)' column/i)
  return match?.[1] || null
}

function isOptionalSchemaDriftColumn(column) {
  return [
    'bundled_fee',
    'fulfilment_provider',
    'fulfilment_method',
    'fulfilment_price',
    'fulfilment_status',
    'locker_location',
    'delivery_address_snapshot',
    'seller_stripe_account_id',
    'stripe_checkout_session_id',
    'stripe_transfer_id',
    'seller_payout_amount',
    'platform_fee_amount',
    'delivery_fee_amount',
    'stripe_fee_amount',
  ].includes(column)
}

function validateOrderRowForInsert(row) {
  const requiredText = [
    'order_ref',
    'listing_id',
    'buyer_id',
    'seller_id',
    'status',
    'tracking_status',
    'payout_status',
    'delivery_method',
    'payment_flow_type',
  ]
  const requiredNumbers = [
    'item_price',
    'total_price',
    'seller_payout',
    'platform_fee',
    'amount',
  ]
  const missing = requiredText.filter(key => !row[key])
  for (const key of requiredNumbers) {
    if (row[key] === undefined || row[key] === null || Number.isNaN(Number(row[key]))) missing.push(key)
  }
  if (!row.paid_at) missing.push('paid_at')
  if (!row.shipping_address || typeof row.shipping_address !== 'object' || Array.isArray(row.shipping_address)) {
    missing.push('shipping_address')
  }

  if (missing.length > 0) {
    const message = `Order insert blocked. Missing required order field(s): ${missing.join(', ')}.`
    console.error(`[orders] ${message}`)
    return { message }
  }

  const amount = Number(row.amount)
  const totalPrice = Number(row.total_price)
  if (amount < 0 || totalPrice < 0 || Number(row.item_price) < 0 || Number(row.seller_payout) < 0 || Number(row.platform_fee) < 0) {
    return { message: 'Order insert blocked. Order monetary fields must be non-negative.' }
  }
  if (Math.abs(amount - totalPrice) > 0.01) {
    return { message: 'Order insert blocked. Amount must match total_price for checkout orders.' }
  }

  return null
}

function stripUnsupportedOrderColumns(row) {
  const nextRow = { ...row }
  if (nextRow.bundled_fee !== undefined) {
    const shippingAddress = nextRow.shipping_address && typeof nextRow.shipping_address === 'object' && !Array.isArray(nextRow.shipping_address)
      ? { ...nextRow.shipping_address }
      : {}
    if (shippingAddress.bundledFee === undefined) shippingAddress.bundledFee = nextRow.bundled_fee
    nextRow.shipping_address = shippingAddress
    delete nextRow.bundled_fee
  }
  return nextRow
}

export async function updateOrder(supabase, orderId, updates) {
  try {
    const row = stripUnsupportedOrderColumns(orderToRow(updates))
    row.updated_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('orders')
      .update(row)
      .eq('id', orderId)
      .select()
      .single()
    if (error) return { data: null, error }
    return { data: rowToOrder(data), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

// Dispute shape helpers

export function rowToDispute(row) {
  if (!row) return null
  return {
    id: row.id,
    orderId: row.order_id || '',
    buyerId: row.buyer_id || '',
    sellerId: row.seller_id || '',
    listingId: row.listing_id || '',
    type: row.type || 'not_as_described',
    reason: row.reason || '',
    description: row.description || '',
    details: row.details || row.description || '',
    status: row.status || 'open',
    source: row.source || 'buyer',
    resolution: row.resolution || null,
    resolvedAt: row.resolved_at || null,
    adminNotes: row.admin_notes || null,
    evidenceUrls: row.evidence_urls || [],
    messages: row.messages || [],
    adminMessages: row.admin_messages || [],
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  }
}

export function disputeToRow(dispute) {
  const row = {}
  if (dispute.orderId !== undefined) row.order_id = dispute.orderId
  if (dispute.buyerId !== undefined) row.buyer_id = dispute.buyerId
  if (dispute.sellerId !== undefined) row.seller_id = dispute.sellerId
  if (dispute.listingId !== undefined) row.listing_id = dispute.listingId
  if (dispute.type !== undefined) row.type = dispute.type
  if (dispute.reason !== undefined) row.reason = dispute.reason
  if (dispute.description !== undefined) row.description = dispute.description
  if (dispute.details !== undefined) row.details = dispute.details
  if (dispute.status !== undefined) row.status = dispute.status
  if (dispute.source !== undefined) row.source = dispute.source
  if (dispute.resolution !== undefined) row.resolution = dispute.resolution
  if (dispute.resolvedAt !== undefined) row.resolved_at = dispute.resolvedAt
  if (dispute.adminNotes !== undefined) row.admin_notes = dispute.adminNotes
  if (dispute.evidenceUrls !== undefined) row.evidence_urls = dispute.evidenceUrls
  if (dispute.messages !== undefined) row.messages = dispute.messages
  if (dispute.adminMessages !== undefined) row.admin_messages = dispute.adminMessages
  return row
}

// Dispute CRUD

export async function fetchAllDisputes(supabase) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) return { data: null, error }
    return { data: (data || []).map(rowToDispute), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function insertDispute(supabase, dispute) {
  try {
    const row = disputeToRow(dispute)
    const { data, error } = await supabase
      .from('disputes')
      .insert(row)
      .select()
      .single()
    if (error) return { data: null, error }
    return { data: rowToDispute(data), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function updateDispute(supabase, disputeId, updates) {
  try {
    const row = disputeToRow(updates)
    row.updated_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('disputes')
      .update(row)
      .eq('id', disputeId)
      .select()
      .single()
    if (error) return { data: null, error }
    return { data: rowToDispute(data), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

// Payout shape helpers

export function rowToPayout(row) {
  if (!row) return null
  return {
    id: row.id,
    orderId: row.order_id || '',
    sellerId: row.seller_id || '',
    amount: Number(row.amount || 0),
    status: row.status || 'pending',
    method: row.method || null,
    reference: row.reference || null,
    releasedAt: row.released_at || null,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    // Stripe fields (written by Edge Functions)
    stripeTransferId: row.stripe_transfer_id || null,
    completedAt: row.completed_at || null,
  }
}

export function payoutToRow(payout) {
  const row = {}
  if (payout.orderId !== undefined) row.order_id = payout.orderId
  if (payout.sellerId !== undefined) row.seller_id = payout.sellerId
  if (payout.amount !== undefined) row.amount = payout.amount
  if (payout.status !== undefined) row.status = payout.status
  if (payout.method !== undefined) row.method = payout.method
  if (payout.reference !== undefined) row.reference = payout.reference
  if (payout.releasedAt !== undefined) row.released_at = payout.releasedAt
  // Stripe fields
  if (payout.stripeTransferId !== undefined) row.stripe_transfer_id = payout.stripeTransferId
  if (payout.completedAt !== undefined) row.completed_at = payout.completedAt
  return row
}

// Payout CRUD

export async function fetchAllPayouts(supabase) {
  try {
    const { data, error } = await supabase
      .from('payouts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) return { data: null, error }
    return { data: (data || []).map(rowToPayout), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function insertPayout(supabase, payout) {
  try {
    const row = payoutToRow(payout)
    const { data, error } = await supabase
      .from('payouts')
      .insert(row)
      .select()
      .single()
    if (error) return { data: null, error }
    return { data: rowToPayout(data), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function updatePayout(supabase, payoutId, updates) {
  try {
    const row = payoutToRow(updates)
    row.updated_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('payouts')
      .update(row)
      .eq('id', payoutId)
      .select()
      .single()
    if (error) return { data: null, error }
    return { data: rowToPayout(data), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

// Shipment shape helpers

export function rowToShipment(row) {
  if (!row) return null
  const fulfilmentMethod = row.fulfilment_method || normalizeFulfilmentMethod(row.delivery_method || row.status)
  return {
    id: row.id,
    orderId: row.order_id || '',
    orderRef: row.order_ref || '',
    sellerId: row.seller_id || '',
    buyerId: row.buyer_id || '',
    status: row.status || 'awaiting_shipment',
    courier: row.courier || 'MaltaPost',
    fulfilmentProvider: row.fulfilment_provider || FULFILMENT_PROVIDER,
    fulfilmentMethod,
    fulfilmentPrice: row.fulfilment_price != null ? Number(row.fulfilment_price) : getFulfilmentPrice(fulfilmentMethod),
    fulfilmentStatus: row.fulfilment_status || row.status || 'awaiting_fulfilment',
    deliveryType: row.delivery_type || (fulfilmentMethod === 'locker' ? 'locker_collection' : 'home_delivery'),
    shipmentCreatedAt: row.shipment_created_at || null,
    shipmentReference: row.shipment_reference || null,
    lockerLocation: row.locker_location || null,
    deliveryAddressSnapshot: row.delivery_address_snapshot || null,
    trackingNumber: row.tracking_number || null,
    maltapostConsignmentId: row.maltapost_consignment_id || null,
    maltapostBarcode: row.maltapost_barcode || null,
    senderAddress: row.sender_address || null,
    recipientAddress: row.recipient_address || null,
    shipByDeadline: row.ship_by_deadline || null,
    shippedAt: row.shipped_at || null,
    inTransitAt: row.in_transit_at || null,
    deliveredAt: row.delivered_at || null,
    dropoffStoreId: row.dropoff_store_id || null,
    dropoffStoreName: row.dropoff_store_name || null,
    dropoffStoreAddress: row.dropoff_store_address || null,
    droppedOffAt: row.dropped_off_at || null,
    dropoffConfirmedAt: row.dropoff_confirmed_at || row.dropped_off_at || null,
    dropoffConfirmedBy: row.dropoff_confirmed_by || null,
    dropoffLocation: row.dropoff_location || row.current_location || null,
    currentLocation: row.current_location || null,
    sellerClaimedDropoff: Boolean(row.seller_claimed_dropoff),
    sellerDropoffClaimedAt: row.seller_dropoff_claimed_at || null,
    fallbackStoreName: row.fallback_store_name || null,
    failedAt: row.failed_at || null,
    returnedAt: row.returned_at || null,
    deliveryProof: row.delivery_proof || null,
    deliverySignatureUrl: row.delivery_signature_url || null,
    deliveryPhotoUrl: row.delivery_photo_url || null,
    failureReason: row.failure_reason || null,
    returnReason: row.return_reason || null,
    weightGrams: row.weight_grams || null,
    parcelSize: row.parcel_size || null,
    maltapostLabelUrl: row.maltapost_label_url || null,
    maltapostLastSync: row.maltapost_last_sync || null,
    maltapostRawStatus: row.maltapost_raw_status || null,
    reminderSentAt: row.reminder_sent_at || null,
    reminderCount: row.reminder_count || 0,
    notes: row.notes || null,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  }
}

export function shipmentToRow(shipment) {
  const row = {}
  if (shipment.orderId !== undefined) row.order_id = shipment.orderId
  if (shipment.orderRef !== undefined) row.order_ref = shipment.orderRef
  if (shipment.sellerId !== undefined) row.seller_id = shipment.sellerId
  if (shipment.buyerId !== undefined) row.buyer_id = shipment.buyerId
  if (shipment.status !== undefined) row.status = shipment.status
  if (shipment.courier !== undefined) row.courier = shipment.courier
  if (shipment.fulfilmentProvider !== undefined) row.fulfilment_provider = shipment.fulfilmentProvider
  if (shipment.fulfilmentMethod !== undefined) row.fulfilment_method = normalizeFulfilmentMethod(shipment.fulfilmentMethod)
  if (shipment.fulfilmentPrice !== undefined) row.fulfilment_price = shipment.fulfilmentPrice
  if (shipment.fulfilmentStatus !== undefined) row.fulfilment_status = shipment.fulfilmentStatus
  if (shipment.deliveryType !== undefined) row.delivery_type = shipment.deliveryType
  if (shipment.shipmentCreatedAt !== undefined) row.shipment_created_at = shipment.shipmentCreatedAt
  if (shipment.shipmentReference !== undefined) row.shipment_reference = shipment.shipmentReference
  if (shipment.lockerLocation !== undefined) row.locker_location = shipment.lockerLocation
  if (shipment.deliveryAddressSnapshot !== undefined) row.delivery_address_snapshot = shipment.deliveryAddressSnapshot
  if (shipment.trackingNumber !== undefined) row.tracking_number = shipment.trackingNumber
  if (shipment.maltapostConsignmentId !== undefined) row.maltapost_consignment_id = shipment.maltapostConsignmentId
  if (shipment.maltapostBarcode !== undefined) row.maltapost_barcode = shipment.maltapostBarcode
  if (shipment.senderAddress !== undefined) row.sender_address = shipment.senderAddress
  if (shipment.recipientAddress !== undefined) row.recipient_address = shipment.recipientAddress
  if (shipment.shipByDeadline !== undefined) row.ship_by_deadline = shipment.shipByDeadline
  if (shipment.shippedAt !== undefined) row.shipped_at = shipment.shippedAt
  if (shipment.inTransitAt !== undefined) row.in_transit_at = shipment.inTransitAt
  if (shipment.deliveredAt !== undefined) row.delivered_at = shipment.deliveredAt
  if (shipment.dropoffStoreId !== undefined) row.dropoff_store_id = shipment.dropoffStoreId
  if (shipment.dropoffStoreName !== undefined) row.dropoff_store_name = shipment.dropoffStoreName
  if (shipment.dropoffStoreAddress !== undefined) row.dropoff_store_address = shipment.dropoffStoreAddress
  if (shipment.droppedOffAt !== undefined) row.dropped_off_at = shipment.droppedOffAt
  if (shipment.dropoffConfirmedAt !== undefined) row.dropoff_confirmed_at = shipment.dropoffConfirmedAt
  if (shipment.dropoffConfirmedBy !== undefined) row.dropoff_confirmed_by = shipment.dropoffConfirmedBy
  if (shipment.dropoffLocation !== undefined) row.dropoff_location = shipment.dropoffLocation
  if (shipment.currentLocation !== undefined) row.current_location = shipment.currentLocation
  if (shipment.sellerClaimedDropoff !== undefined) row.seller_claimed_dropoff = shipment.sellerClaimedDropoff
  if (shipment.sellerDropoffClaimedAt !== undefined) row.seller_dropoff_claimed_at = shipment.sellerDropoffClaimedAt
  if (shipment.fallbackStoreName !== undefined) row.fallback_store_name = shipment.fallbackStoreName
  if (shipment.failedAt !== undefined) row.failed_at = shipment.failedAt
  if (shipment.returnedAt !== undefined) row.returned_at = shipment.returnedAt
  if (shipment.deliveryProof !== undefined) row.delivery_proof = shipment.deliveryProof
  if (shipment.deliverySignatureUrl !== undefined) row.delivery_signature_url = shipment.deliverySignatureUrl
  if (shipment.deliveryPhotoUrl !== undefined) row.delivery_photo_url = shipment.deliveryPhotoUrl
  if (shipment.failureReason !== undefined) row.failure_reason = shipment.failureReason
  if (shipment.returnReason !== undefined) row.return_reason = shipment.returnReason
  if (shipment.weightGrams !== undefined) row.weight_grams = shipment.weightGrams
  if (shipment.parcelSize !== undefined) row.parcel_size = shipment.parcelSize
  if (shipment.maltapostLabelUrl !== undefined) row.maltapost_label_url = shipment.maltapostLabelUrl
  if (shipment.maltapostLastSync !== undefined) row.maltapost_last_sync = shipment.maltapostLastSync
  if (shipment.maltapostRawStatus !== undefined) row.maltapost_raw_status = shipment.maltapostRawStatus
  if (shipment.reminderSentAt !== undefined) row.reminder_sent_at = shipment.reminderSentAt
  if (shipment.reminderCount !== undefined) row.reminder_count = shipment.reminderCount
  if (shipment.notes !== undefined) row.notes = shipment.notes
  return row
}

// Shipment CRUD

export async function fetchAllShipments(supabase) {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) return { data: null, error }
    return { data: (data || []).map(rowToShipment), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function insertShipment(supabase, shipment) {
  try {
    const row = shipmentToRow(shipment)
    const { data, error } = await supabase
      .from('shipments')
      .insert(row)
      .select()
      .single()
    if (error) return { data: null, error }
    return { data: rowToShipment(data), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function updateShipment(supabase, shipmentId, updates) {
  try {
    const row = shipmentToRow(updates)
    row.updated_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('shipments')
      .update(row)
      .eq('id', shipmentId)
      .select()
      .single()
    if (error) return { data: null, error }
    return { data: rowToShipment(data), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export function rowToLogisticsDeliverySheetRow(row) {
  if (!row) return null
  return {
    id: row.id,
    orderId: row.order_id || '',
    shipmentId: row.shipment_id || '',
    sellerName: row.seller_name || '',
    buyerName: row.buyer_name || '',
    itemTitle: row.item_title || '',
    orderCode: row.order_code || '',
    dropoffStoreName: row.dropoff_store_name || '',
    dropoffStoreAddress: row.dropoff_store_address || '',
    droppedOffAt: row.dropped_off_at || null,
    buyerDeliveryAddress: row.buyer_delivery_address || '',
    buyerContact: row.buyer_contact || '',
    deliveryTiming: row.delivery_timing || '',
    deliveryStatus: row.delivery_status || '',
    fallbackStoreName: row.fallback_store_name || '',
    notes: row.notes || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  }
}

export async function fetchLogisticsDeliverySheet(supabase) {
  try {
    const { data, error } = await supabase
      .from('logistics_delivery_sheet')
      .select('*')
      .order('dropped_off_at', { ascending: false, nullsFirst: false })
      .limit(1000)
    if (error) return { data: null, error }
    return { data: (data || []).map(rowToLogisticsDeliverySheetRow), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function upsertLogisticsDeliverySheetRow(supabase, row) {
  try {
    const { data, error } = await supabase
      .from('logistics_delivery_sheet')
      .upsert(row, { onConflict: 'shipment_id' })
      .select()
      .single()
    if (error) return { data: null, error }
    return { data: rowToLogisticsDeliverySheetRow(data), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function insertDropoffScanLog(supabase, scan) {
  try {
    const row = {
      order_id: scan.orderId,
      shipment_id: scan.shipmentId || null,
      order_code: scan.orderCode || null,
      scanned_by: scan.scannedBy || null,
      scan_status: scan.scanStatus || 'confirmed',
      message: scan.message || null,
      dropoff_location: scan.dropoffLocation || null,
      created_at: scan.createdAt || new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('dropoff_scan_logs')
      .insert(row)
      .select()
      .single()
    if (error) return { data: null, error }
    return { data, error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}
