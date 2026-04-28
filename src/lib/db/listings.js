/**
 * listings.js — Supabase data layer for the `listings` table.
 *
 * All functions accept an authenticated supabase client (from useSupabase()).
 * AppContext falls back to localStorage/seed data when these calls fail.
 */

import { normalizeSubcategoryValue } from '../../data/categories'

function normalizeListingStatus(status) {
  const value = String(status || 'active').toLowerCase()
  if (['active', 'available', 'published', 'approved', 'live'].includes(value)) return 'active'
  if (['sold', 'purchased', 'completed'].includes(value)) return 'sold'
  if (['deleted', 'removed'].includes(value)) return 'deleted'
  if (['reserved', 'pending_sale', 'pending-sale'].includes(value)) return 'reserved'
  return value || 'active'
}

// ── Shape helpers ────────────────────────────────────────────────────────────

/**
 * Convert a DB row (snake_case) to the app's listing object (camelCase).
 */
export function rowToListing(row) {
  if (!row) return null
  const resolvedAttributes = row.attributes || {}
  const resolvedGender = row.gender || resolvedAttributes.gender || ''
  const resolvedSize =
    row.size ||
    resolvedAttributes.size ||
    resolvedAttributes.kids_size ||
    resolvedAttributes.shoe_size ||
    ''
  const resolvedCondition = row.condition || resolvedAttributes.condition || ''
  return {
    id: row.id,
    sellerId: row.seller_id,
    title: row.title || '',
    description: row.description || '',
    price: Number(row.price || 0),
    category: row.category || '',
    subcategory: normalizeSubcategoryValue(row.subcategory || '', row.category || ''),
    type: row.type || row.attributes?.type || undefined,
    categoryType: row.category_type || row.attributes?.category_type || undefined,
    attributes: resolvedAttributes,
    gender: resolvedGender,
    size: resolvedSize,
    brand: row.brand || '',
    condition: resolvedCondition,
    color: row.color || '',
    colors: row.colors || (row.color ? [row.color] : []),
    images: row.images || [],
    status: normalizeListingStatus(row.status),
    likes: row.likes_count ?? 0,
    views: row.views_count ?? 0,
    boosted: row.boosted || false,
    flagged: row.flagged || false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    deliverySize: row.delivery_size || '',
    lockerEligible: row.locker_eligible == null ? null : row.locker_eligible === true,
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
 *
 * COMPATIBILITY NOTE:
 * `subcategory` (TEXT) and `attributes` (JSONB) are new columns.
 * If they don't exist in the DB yet, Supabase will return a column-not-found
 * error. The `createListing` function below handles this by retrying without
 * the new columns so the insert still succeeds. Once the migration adds the
 * columns, the retry path is never hit.
 */
export function listingToRow(listing) {
  const row = {}
  if (listing.sellerId !== undefined) row.seller_id = listing.sellerId
  if (listing.title !== undefined) row.title = listing.title
  if (listing.description !== undefined) row.description = listing.description
  if (listing.price !== undefined) row.price = listing.price
  if (listing.category !== undefined) row.category = listing.category
  row.subcategory = listing.subcategory || null
  if (listing.attributes !== undefined && Object.keys(listing.attributes).length > 0) row.attributes = listing.attributes
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
  if (listing.deliverySize !== undefined) row.delivery_size = listing.deliverySize
  if (listing.delivery_size !== undefined) row.delivery_size = listing.delivery_size
  if (listing.lockerEligible !== undefined) row.locker_eligible = listing.lockerEligible == null ? null : listing.lockerEligible === true
  if (listing.locker_eligible !== undefined) row.locker_eligible = listing.locker_eligible == null ? null : listing.locker_eligible === true
  row.updated_at = new Date().toISOString()
  return row
}

/**
 * Strip new-schema columns that may not exist in the DB yet.
 * Used as a fallback when an insert/update fails with a column error.
 */
function stripNewColumns(row) {
  const cleaned = { ...row }
  delete cleaned.subcategory
  delete cleaned.attributes
  delete cleaned.delivery_size
  delete cleaned.locker_eligible
  return cleaned
}

// ── Queries ──────────────────────────────────────────────────────────────────

const BASE_SELECT = `*, seller:profiles!listings_seller_id_fkey(id, username, name, avatar, rating, review_count, is_shop, location)`

const BROWSE_SELECT = `
  id,
  seller_id,
  title,
  description,
  price,
  category,
  subcategory,
  attributes,
  gender,
  size,
  brand,
  condition,
  color,
  colors,
  images,
  status,
  likes_count,
  views_count,
  boosted,
  created_at,
  updated_at,
  delivery_size,
  locker_eligible,
  style_tags,
  manual_style_tags,
  collection_tags,
  manual_collection_tags,
  seller:profiles!listings_seller_id_fkey(id, username, name, avatar, rating, review_count, is_shop, location)
`

const MINIMAL_BROWSE_SELECT = `
  id,
  seller_id,
  title,
  description,
  price,
  category
`

function isMissingListingColumnError(error) {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    message.includes('column listings.') ||
    message.includes('could not find') && message.includes('column') ||
    message.includes('schema cache')
  )
}

async function runBrowseQuery(supabase, select, { limit, offset, useStatusFilter = true, useOrdering = true } = {}) {
  let query = supabase
    .from('listings')
    .select(select)

  if (useStatusFilter) query = query.eq('status', 'active')
  if (useOrdering) {
    query = query
      .order('boosted', { ascending: false })
      .order('created_at', { ascending: false })
  }

  return query.range(offset, offset + limit - 1)
}

/** Fetch public browse/home listings with only card/filter fields. */
export async function fetchActiveListings(supabase, { limit = 100, offset = 0 } = {}) {
  let { data, error } = await runBrowseQuery(supabase, BROWSE_SELECT, { limit, offset })

  if (error && isMissingListingColumnError(error)) {
    console.warn('[listings] Browse select hit live-schema mismatch, retrying minimal listing query:', {
      message: error.message,
      code: error.code,
    })
    ;({ data, error } = await runBrowseQuery(supabase, MINIMAL_BROWSE_SELECT, {
      limit,
      offset,
      useStatusFilter: false,
      useOrdering: false,
    }))
  } else if (!error && offset === 0 && (data || []).length === 0) {
    console.warn('[listings] Browse active query returned 0 rows; retrying without status filter to diagnose status mismatch.')
    const retry = await runBrowseQuery(supabase, BROWSE_SELECT, {
      limit,
      offset,
      useStatusFilter: false,
      useOrdering: true,
    })
    if (!retry.error && retry.data?.length) {
      data = retry.data
      error = null
    }
  }

  const mapped = (data || []).map(rowToListing)
  console.info('[listings] fetchActiveListings raw result', {
    count: mapped.length,
    offset,
    limit,
    error: error?.message || null,
    sample: mapped.slice(0, 5).map(listing => ({
      id: listing.id,
      category: listing.category,
      subcategory: listing.subcategory,
      status: listing.status,
      price: listing.price,
    })),
  })
  return { data: mapped, error }
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

/**
 * Create a new listing. Returns the created row.
 *
 * Compatibility: if the DB doesn't have `subcategory`/`attributes` columns yet,
 * the first insert will fail. We detect that specific error and retry without
 * those columns so the listing is still created. The `subcategory` and
 * `attributes` values are preserved on the returned in-memory object regardless.
 */
export async function createListing(supabase, sellerId, listing) {
  const row = listingToRow({ ...listing, sellerId })
  delete row.updated_at // let DB default handle created_at & updated_at on insert
  const insertRow = { ...row, seller_id: sellerId }

  console.log('[listings] createListing insert payload', {
    sellerId,
    category: listing.category,
    payloadSubcategory: listing.subcategory,
    rowSubcategory: insertRow.subcategory,
  })

  let { data, error } = await supabase
    .from('listings')
    .insert(insertRow)
    .select(BASE_SELECT)
    .single()

  // Fallback: strip new columns and retry if DB schema is behind.
  // PostgREST error: "Could not find the 'attributes' column of 'listings' in the schema cache"
  // Match broadly: any mention of subcategory/attributes in the error, or the "schema cache" pattern.
  const isNewColumnError = error && (
    /(?:subcategory|attributes)/i.test(error.message) ||
    /schema.cache/i.test(error.message) ||
    (error.code === 'PGRST204')
  )
  if (!data && isNewColumnError) {
    console.warn('[listings] New columns not in DB yet — retrying without subcategory/attributes:', {
      message: error.message,
      code: error.code,
      hint: error.hint,
      rowSubcategory: insertRow.subcategory,
    })
    const fallbackRow = stripNewColumns(insertRow)
    ;({ data, error } = await supabase
      .from('listings')
      .insert(fallbackRow)
      .select(BASE_SELECT)
      .single())
  }

  const result = rowToListing(data)
  console.log('[listings] createListing result', {
    id: result?.id,
    rowSubcategory: data?.subcategory,
    resultSubcategory: result?.subcategory,
    usedFallback: Boolean(isNewColumnError),
  })

  // Merge structured fields back onto the result even if DB didn't persist them
  if (result) {
    if (listing.subcategory && !result.subcategory) result.subcategory = listing.subcategory
    if (listing.attributes && Object.keys(listing.attributes).length > 0 && (!result.attributes || Object.keys(result.attributes).length === 0)) {
      result.attributes = listing.attributes
    }
  }

  return { data: result, error }
}

/** Update an existing listing. */
export async function updateListing(supabase, id, listing) {
  const row = listingToRow(listing)

  console.log('[listings] updateListing payload', {
    id,
    category: listing.category,
    payloadSubcategory: listing.subcategory,
    rowSubcategory: row.subcategory,
  })

  let { data, error } = await supabase
    .from('listings')
    .update(row)
    .eq('id', id)
    .select(BASE_SELECT)
    .single()

  const isNewColumnError = error && (
    /(?:subcategory|attributes)/i.test(error.message) ||
    /schema.cache/i.test(error.message) ||
    error.code === 'PGRST204'
  )
  if (isNewColumnError) {
    console.warn('[listings] updateListing — retrying without new columns:', {
      message: error.message,
      code: error.code,
      hint: error.hint,
      rowSubcategory: row.subcategory,
    })
    const fallbackRow = stripNewColumns(row)
    ;({ data, error } = await supabase
      .from('listings')
      .update(fallbackRow)
      .eq('id', id)
      .select(BASE_SELECT)
      .single())
  }

  const result = rowToListing(data)
  console.log('[listings] updateListing result', {
    id: result?.id,
    rowSubcategory: data?.subcategory,
    resultSubcategory: result?.subcategory,
    usedFallback: Boolean(isNewColumnError),
  })
  if (result) {
    if (listing.subcategory && !result.subcategory) result.subcategory = listing.subcategory
    if (listing.attributes && Object.keys(listing.attributes).length > 0 && (!result.attributes || Object.keys(result.attributes).length === 0)) {
      result.attributes = listing.attributes
    }
  }

  return { data: result, error }
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

/** Mark a listing as reserved after an offer is accepted. */
export async function markListingReserved(supabase, id) {
  const { data, error } = await supabase
    .from('listings')
    .update({ status: 'reserved', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'active')
    .select()
    .single()
  return { data: rowToListing(data), error }
}

/** Release a reserved listing back to active if the sale falls through. */
export async function releaseListingReservation(supabase, id) {
  const { data, error } = await supabase
    .from('listings')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'reserved')
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

  let { data, error } = await supabase
    .from('listings')
    .update(row)
    .eq('id', id)
    .select(BASE_SELECT)
    .single()

  // Fallback: strip new columns if DB schema is behind
  if (error && (/(?:subcategory|attributes)/i.test(error.message) || /schema.cache/i.test(error.message) || error.code === 'PGRST204')) {
    console.warn('[listings] adminUpdateListingMeta — retrying without new columns:', error.message)
    const fallbackRow = stripNewColumns(row)
    ;({ data, error } = await supabase
      .from('listings')
      .update(fallbackRow)
      .eq('id', id)
      .select(BASE_SELECT)
      .single())
  }

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
