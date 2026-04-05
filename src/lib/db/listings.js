/**
 * listings.js — Supabase data layer for the `listings` table.
 *
 * All functions accept an authenticated supabase client (from useSupabase()).
 * AppContext falls back to localStorage/seed data when these calls fail.
 */

// ── Shape helpers ────────────────────────────────────────────────────────────

/**
 * Convert a DB row (snake_case) to the app's listing object (camelCase).
 */
export function rowToListing(row) {
  if (!row) return null
  return {
    id: row.id,
    sellerId: row.seller_id,
    title: row.title || '',
    description: row.description || '',
    price: Number(row.price || 0),
    category: row.category || '',
    gender: row.gender || '',
    size: row.size || '',
    brand: row.brand || '',
    condition: row.condition || '',
    color: row.color || '',
    colors: row.colors || (row.color ? [row.color] : []),
    images: row.images || [],
    status: row.status || 'active',
    likes: row.likes_count ?? 0,
    views: row.views_count ?? 0,
    boosted: row.boosted || false,
    flagged: row.flagged || false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    styleTags: row.style_tags || [],
    manualStyleTags: row.manual_style_tags || [],
    collectionTags: row.collection_tags || [],
    manualCollectionTags: row.manual_collection_tags || [],
    // Joined seller profile (when fetched with seller:profiles(*))
    seller: row.seller ? row.seller : undefined,
  }
}

/**
 * Convert the app's listing object to a DB insert/update row.
 */
export function listingToRow(listing) {
  const row = {}
  if (listing.sellerId !== undefined) row.seller_id = listing.sellerId
  if (listing.title !== undefined) row.title = listing.title
  if (listing.description !== undefined) row.description = listing.description
  if (listing.price !== undefined) row.price = listing.price
  if (listing.category !== undefined) row.category = listing.category
  if (listing.gender !== undefined) row.gender = listing.gender
  if (listing.size !== undefined) row.size = listing.size
  if (listing.brand !== undefined) row.brand = listing.brand
  if (listing.condition !== undefined) row.condition = listing.condition
  if (listing.color !== undefined) row.color = listing.color
  if (listing.colors !== undefined) row.colors = listing.colors
  if (listing.images !== undefined) row.images = listing.images
  if (listing.status !== undefined) row.status = listing.status
  if (listing.boosted !== undefined) row.boosted = listing.boosted
  if (listing.flagged !== undefined) row.flagged = listing.flagged
  if (listing.styleTags !== undefined) row.style_tags = listing.styleTags
  if (listing.style_tags !== undefined) row.style_tags = listing.style_tags
  if (listing.manualStyleTags !== undefined) row.manual_style_tags = listing.manualStyleTags
  if (listing.collectionTags !== undefined) row.collection_tags = listing.collectionTags
  if (listing.collection_tags !== undefined) row.collection_tags = listing.collection_tags
  if (listing.manualCollectionTags !== undefined) row.manual_collection_tags = listing.manualCollectionTags
  row.updated_at = new Date().toISOString()
  return row
}

// ── Queries ──────────────────────────────────────────────────────────────────

const BASE_SELECT = `*, seller:profiles!listings_seller_id_fkey(id, username, name, avatar, rating, review_count, is_shop, location)`

/** Fetch all active listings (browse / homepage). */
export async function fetchActiveListings(supabase, { limit = 100, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('listings')
    .select(BASE_SELECT)
    .eq('status', 'active')
    .order('boosted', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return { data: (data || []).map(rowToListing), error }
}

/** Fetch a single listing by id. */
export async function fetchListingById(supabase, id) {
  const { data, error } = await supabase
    .from('listings')
    .select(BASE_SELECT)
    .eq('id', id)
    .single()
  return { data: rowToListing(data), error }
}

/** Fetch all listings for a seller (seller dashboard / profile). */
export async function fetchUserListings(supabase, sellerId) {
  const { data, error } = await supabase
    .from('listings')
    .select(BASE_SELECT)
    .eq('seller_id', sellerId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
  return { data: (data || []).map(rowToListing), error }
}

/** Admin: fetch all listings including deleted/flagged. */
export async function fetchAllListings(supabase) {
  const { data, error } = await supabase
    .from('listings')
    .select(BASE_SELECT)
    .order('created_at', { ascending: false })
  return { data: (data || []).map(rowToListing), error }
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Create a new listing. Returns the created row. */
export async function createListing(supabase, sellerId, listing) {
  const row = listingToRow({ ...listing, sellerId })
  delete row.updated_at // let DB default handle created_at & updated_at on insert
  const { data, error } = await supabase
    .from('listings')
    .insert({ ...row, seller_id: sellerId })
    .select(BASE_SELECT)
    .single()
  return { data: rowToListing(data), error }
}

/** Soft-delete a listing (status = 'deleted'). */
export async function deleteListing(supabase, id) {
  const { data, error } = await supabase
    .from('listings')
    .update({ status: 'deleted', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data: rowToListing(data), error }
}

/** Mark a listing as sold. */
export async function markListingSold(supabase, id) {
  const { data, error } = await supabase
    .from('listings')
    .update({ status: 'sold', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data: rowToListing(data), error }
}

/** Admin: boost / unboost a listing. */
export async function setListingBoosted(supabase, id, boosted) {
  const { data, error } = await supabase
    .from('listings')
    .update({ boosted, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data: rowToListing(data), error }
}

/** Admin: flag / approve a listing. */
export async function setListingFlagged(supabase, id, flagged, status) {
  const updates = { flagged, updated_at: new Date().toISOString() }
  if (status !== undefined) updates.status = status
  const { data, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data: rowToListing(data), error }
}

/** Admin: update style tags for a listing. */
export async function updateStyleTags(supabase, id, styleTags, manualStyleTags) {
  const updates = { updated_at: new Date().toISOString() }
  if (styleTags !== undefined) updates.style_tags = styleTags
  if (manualStyleTags !== undefined) updates.manual_style_tags = manualStyleTags
  const { data, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data: rowToListing(data), error }
}

/** Admin: update any listing metadata (category, brand, colour, tags, collection tags, etc.) */
export async function adminUpdateListingMeta(supabase, id, updates) {
  const row = listingToRow(updates)
  const { data, error } = await supabase
    .from('listings')
    .update(row)
    .eq('id', id)
    .select(BASE_SELECT)
    .single()
  return { data: rowToListing(data), error }
}

/** Increment view count for a listing. Fire-and-forget is fine. */
export async function incrementViewCount(supabase, id) {
  // Read current count and increment
  const { data: current } = await supabase
    .from('listings')
    .select('views_count')
    .eq('id', id)
    .single()
  if (!current) return
  await supabase
    .from('listings')
    .update({ views_count: (current.views_count || 0) + 1 })
    .eq('id', id)
}

// ── Likes ────────────────────────────────────────────────────────────────────

/** Check which of a list of listing ids the user has liked. */
export async function fetchUserLikes(supabase, userId) {
  const { data, error } = await supabase
    .from('listing_likes')
    .select('listing_id')
    .eq('user_id', userId)
  return {
    data: (data || []).map(r => r.listing_id),
    error,
  }
}

/** Toggle a like. Returns { liked: boolean, newCount: number }. */
export async function toggleListingLike(supabase, userId, listingId, currentlyLiked, currentCount) {
  if (currentlyLiked) {
    // Remove like
    const { error } = await supabase
      .from('listing_likes')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId)
    if (error) return { error }

    const newCount = Math.max(0, (currentCount || 0) - 1)
    await supabase
      .from('listings')
      .update({ likes_count: newCount })
      .eq('id', listingId)
    return { liked: false, newCount, error: null }
  } else {
    // Add like (ignore duplicate key conflicts)
    await supabase
      .from('listing_likes')
      .upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id', ignoreDuplicates: true })

    const newCount = (currentCount || 0) + 1
    await supabase
      .from('listings')
      .update({ likes_count: newCount })
      .eq('id', listingId)
    return { liked: true, newCount, error: null }
  }
}
