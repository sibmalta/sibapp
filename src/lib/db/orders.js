/**
 * orders.js — Supabase data layer for orders, disputes, and payouts tables.
 *
 * All functions accept an authenticated supabase client (from useSupabase()).
 * Returns { data, error } mirroring the Supabase client pattern.
 */

// ── Shape helpers ────────────────────────────────────────────────────────────

export function rowToOrder(row) {
  if (!row) return null
  return {
    id: row.id,
    orderRef: row.order_ref || '',
    listingId: row.listing_id || '',
    buyerId: row.buyer_id || '',
    sellerId: row.seller_id || '',
    listingTitle: row.listing_title || '',
    listingImage: row.listing_image || '',
    itemPrice: Number(row.item_price || 0),
    bundledFee: Number(row.bundled_fee || 0),
    totalPrice: Number(row.total_price || 0),
    sellerPayout: Number(row.seller_payout || 0),
    platformFee: Number(row.platform_fee || 0),
    amount: Number(row.amount || 0),
    status: row.status || 'pending',
    trackingStatus: row.tracking_status || 'pending',
    payoutStatus: row.payout_status || 'held',
    deliveryMethod: row.delivery_method || 'sib_delivery',
    trackingNumber: row.tracking_number || null,
    shippingAddress: row.shipping_address || null,
    isBundle: row.is_bundle || false,
    bundleListingIds: row.bundle_listing_ids || [],
    bundleOfferId: row.bundle_offer_id || null,
    address: row.address || null,
    overdueFlag: row.overdue_flag || false,
    overdueFlaggedAt: row.overdue_flagged_at || null,
    autoConfirmed: row.auto_confirmed || false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    paidAt: row.paid_at || null,
    shippedAt: row.shipped_at || null,
    deliveredAt: row.delivered_at || null,
    confirmedAt: row.confirmed_at || null,
    payoutReleasedAt: row.payout_released_at || null,
    cancelledAt: row.cancelled_at || null,
    // Stripe fields (written by Edge Functions / checkout pages)
    stripePaymentIntentId: row.stripe_payment_intent_id || null,
    paymentStatus: row.payment_status || null,
    sellerPayoutStatus: row.seller_payout_status || null,
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
  if (order.bundledFee !== undefined) row.bundled_fee = order.bundledFee
  if (order.totalPrice !== undefined) row.total_price = order.totalPrice
  if (order.sellerPayout !== undefined) row.seller_payout = order.sellerPayout
  if (order.platformFee !== undefined) row.platform_fee = order.platformFee
  if (order.amount !== undefined) row.amount = order.amount
  if (order.status !== undefined) row.status = order.status
  if (order.trackingStatus !== undefined) row.tracking_status = order.trackingStatus
  if (order.payoutStatus !== undefined) row.payout_status = order.payoutStatus
  if (order.deliveryMethod !== undefined) row.delivery_method = order.deliveryMethod
  if (order.trackingNumber !== undefined) row.tracking_number = order.trackingNumber
  if (order.shippingAddress !== undefined) row.shipping_address = order.shippingAddress
  if (order.isBundle !== undefined) row.is_bundle = order.isBundle
  if (order.bundleListingIds !== undefined) row.bundle_listing_ids = order.bundleListingIds
  if (order.bundleOfferId !== undefined) row.bundle_offer_id = order.bundleOfferId
  if (order.address !== undefined) row.address = order.address
  if (order.overdueFlag !== undefined) row.overdue_flag = order.overdueFlag
  if (order.overdueFlaggedAt !== undefined) row.overdue_flagged_at = order.overdueFlaggedAt
  if (order.autoConfirmed !== undefined) row.auto_confirmed = order.autoConfirmed
  if (order.paidAt !== undefined) row.paid_at = order.paidAt
  if (order.shippedAt !== undefined) row.shipped_at = order.shippedAt
  if (order.deliveredAt !== undefined) row.delivered_at = order.deliveredAt
  if (order.confirmedAt !== undefined) row.confirmed_at = order.confirmedAt
  if (order.payoutReleasedAt !== undefined) row.payout_released_at = order.payoutReleasedAt
  if (order.cancelledAt !== undefined) row.cancelled_at = order.cancelledAt
  // Stripe fields
  if (order.stripePaymentIntentId !== undefined) row.stripe_payment_intent_id = order.stripePaymentIntentId
  if (order.paymentStatus !== undefined) row.payment_status = order.paymentStatus
  if (order.sellerPayoutStatus !== undefined) row.seller_payout_status = order.sellerPayoutStatus
  if (order.refundedAt !== undefined) row.refunded_at = order.refundedAt
  if (order.stripeRefundId !== undefined) row.stripe_refund_id = order.stripeRefundId
  return row
}

// ── Order CRUD ────────────────────────────────────────────────────────────────

export async function fetchAllOrders(supabase) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) return { data: null, error }
    return { data: (data || []).map(rowToOrder), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function insertOrder(supabase, order) {
  try {
    const row = orderToRow(order)
    const { data, error } = await supabase
      .from('orders')
      .insert(row)
      .select()
      .single()
    if (error) return { data: null, error }
    return { data: rowToOrder(data), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function updateOrder(supabase, orderId, updates) {
  try {
    const row = orderToRow(updates)
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

// ── Dispute shape helpers ─────────────────────────────────────────────────────

export function rowToDispute(row) {
  if (!row) return null
  return {
    id: row.id,
    orderId: row.order_id || '',
    buyerId: row.buyer_id || '',
    sellerId: row.seller_id || '',
    type: row.type || 'not_as_described',
    reason: row.reason || '',
    description: row.description || '',
    status: row.status || 'open',
    source: row.source || 'buyer',
    resolution: row.resolution || null,
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
  if (dispute.type !== undefined) row.type = dispute.type
  if (dispute.reason !== undefined) row.reason = dispute.reason
  if (dispute.description !== undefined) row.description = dispute.description
  if (dispute.status !== undefined) row.status = dispute.status
  if (dispute.source !== undefined) row.source = dispute.source
  if (dispute.resolution !== undefined) row.resolution = dispute.resolution
  if (dispute.evidenceUrls !== undefined) row.evidence_urls = dispute.evidenceUrls
  if (dispute.messages !== undefined) row.messages = dispute.messages
  if (dispute.adminMessages !== undefined) row.admin_messages = dispute.adminMessages
  return row
}

// ── Dispute CRUD ──────────────────────────────────────────────────────────────

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

// ── Payout shape helpers ──────────────────────────────────────────────────────

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

// ── Payout CRUD ───────────────────────────────────────────────────────────────

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

// ── Shipment shape helpers ────────────────────────────────────────────────────

export function rowToShipment(row) {
  if (!row) return null
  return {
    id: row.id,
    orderId: row.order_id || '',
    orderRef: row.order_ref || '',
    sellerId: row.seller_id || '',
    buyerId: row.buyer_id || '',
    status: row.status || 'awaiting_shipment',
    courier: row.courier || 'MaltaPost',
    trackingNumber: row.tracking_number || null,
    maltapostConsignmentId: row.maltapost_consignment_id || null,
    maltapostBarcode: row.maltapost_barcode || null,
    senderAddress: row.sender_address || null,
    recipientAddress: row.recipient_address || null,
    shipByDeadline: row.ship_by_deadline || null,
    shippedAt: row.shipped_at || null,
    inTransitAt: row.in_transit_at || null,
    deliveredAt: row.delivered_at || null,
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
  if (shipment.trackingNumber !== undefined) row.tracking_number = shipment.trackingNumber
  if (shipment.maltapostConsignmentId !== undefined) row.maltapost_consignment_id = shipment.maltapostConsignmentId
  if (shipment.maltapostBarcode !== undefined) row.maltapost_barcode = shipment.maltapostBarcode
  if (shipment.senderAddress !== undefined) row.sender_address = shipment.senderAddress
  if (shipment.recipientAddress !== undefined) row.recipient_address = shipment.recipientAddress
  if (shipment.shipByDeadline !== undefined) row.ship_by_deadline = shipment.shipByDeadline
  if (shipment.shippedAt !== undefined) row.shipped_at = shipment.shippedAt
  if (shipment.inTransitAt !== undefined) row.in_transit_at = shipment.inTransitAt
  if (shipment.deliveredAt !== undefined) row.delivered_at = shipment.deliveredAt
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

// ── Shipment CRUD ─────────────────────────────────────────────────────────────

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
