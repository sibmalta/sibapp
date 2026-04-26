export function rowToOffer(row) {
  if (!row) return null
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    conversationId: row.conversation_id || null,
    price: Number(row.price || 0),
    status: row.status || 'pending',
    counterPrice: row.counter_price == null ? null : Number(row.counter_price),
    acceptedPrice: row.accepted_price == null ? null : Number(row.accepted_price),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || row.created_at || null,
    expiresAt: row.expires_at || null,
    metadata: row.metadata || {},
  }
}

function offerToRow(offer) {
  const row = {}
  if (offer.id !== undefined) row.id = offer.id
  if (offer.listingId !== undefined) row.listing_id = offer.listingId
  if (offer.buyerId !== undefined) row.buyer_id = offer.buyerId
  if (offer.sellerId !== undefined) row.seller_id = offer.sellerId
  if (offer.conversationId !== undefined) row.conversation_id = offer.conversationId
  if (offer.price !== undefined) row.price = offer.price
  if (offer.status !== undefined) row.status = offer.status
  if (offer.counterPrice !== undefined) row.counter_price = offer.counterPrice
  if (offer.acceptedPrice !== undefined) row.accepted_price = offer.acceptedPrice
  if (offer.expiresAt !== undefined) row.expires_at = offer.expiresAt
  if (offer.metadata !== undefined) row.metadata = offer.metadata
  return row
}

export async function fetchUserOffers(supabase, userId) {
  try {
    if (!userId) return { data: [], error: null }
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) return { data: null, error }
    return { data: (data || []).map(rowToOffer).filter(Boolean), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function insertOffer(supabase, offer) {
  try {
    const { data, error } = await supabase
      .from('offers')
      .insert(offerToRow(offer))
      .select('*')
      .single()

    if (error) return { data: null, error }
    return { data: rowToOffer(data), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function updateOffer(supabase, offerId, updates, options = {}) {
  try {
    let query = supabase
      .from('offers')
      .update(offerToRow(updates))
      .eq('id', offerId)

    if (options.expectedStatus) {
      query = query.eq('status', options.expectedStatus)
    }

    const { data, error } = await query
      .select('*')
      .single()

    if (error) return { data: null, error }
    return { data: rowToOffer(data), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}
