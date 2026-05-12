/**
 * profiles.js — Supabase data layer for the `profiles` table.
 *
 * All functions accept an authenticated supabase client (from useSupabase()).
 * Each function returns { data, error } mirroring the Supabase client pattern.
 *
 * The AppContext falls back to localStorage/seed data when these calls fail,
 * so the app is safe to use before the migration has been applied.
 */
import { normalizeSellerBadges } from '../sellerBadges'
import { normalizeUsernameInput, validateUsername } from '../username'

// ── Shape helpers ────────────────────────────────────────────────────────────

/**
 * Convert a DB row (snake_case) to the app's user object (camelCase).
 * Keeps the same shape that the rest of the app already expects.
 */
export function rowToUser(row) {
  if (!row) return null
  const username = row.username || ''
  const name = row.name || row.display_name || row.full_name || username || ''
  const avatar = row.avatar || row.avatar_url || null
  const isAdmin = row.is_admin || row.admin_role === 'super_admin' || username.toLowerCase() === 'sibadmin'
  const sellerBadges = normalizeSellerBadges(row.seller_badges, { isTrustedSeller: !!row.is_trusted_seller })
  return {
    id: row.id,
    username,
    name,
    email: row.email || '',
    bio: row.bio || '',
    phone: row.phone || '',
    avatar,
    location: row.location || 'Malta',
    isShop: row.is_shop || false,
    isAdmin,
    verified: !!(row.verified || row.is_verified || isAdmin),
    isTrustedSeller: !!row.is_trusted_seller,
    rating: Number(row.rating ?? 5.0),
    reviewCount: row.review_count ?? 0,
    sales: row.sales ?? 0,                    // column: sales (not sales_count)
    // Derive booleans from status column for AdminPage compatibility
    suspended: row.status === 'suspended',
    banned: row.status === 'banned',
    status: row.status || 'active',
    // Seller badges & trust tags (admin-managed)
    sellerBadges,
    trustTags: row.trust_tags || [],
    // Admin permission level: 'super_admin' | 'moderator' | null
    adminRole: row.admin_role || null,
    stripeAccountId: row.stripe_account_id || null,
    detailsSubmitted: !!(row.details_submitted ?? row.stripe_onboarding_complete),
    stripeOnboardingComplete: !!row.stripe_onboarding_complete,
    chargesEnabled: !!row.charges_enabled,
    payoutsEnabled: !!row.payouts_enabled,
    stripeStatusUpdatedAt: row.stripe_status_updated_at || null,
    joinedDate: row.created_at ? row.created_at.split('T')[0] : '',
    createdAt: row.created_at || new Date().toISOString(),
  }
}

/**
 * Convert the app's user object back to a DB row for upserts/updates.
 */
export function userToRow(user) {
  const row = {}
  if (user.username !== undefined) row.username = user.username
  if (user.name !== undefined) row.name = user.name
  if (user.bio !== undefined) row.bio = user.bio
  if (user.phone !== undefined) row.phone = user.phone
  if (user.avatar !== undefined) row.avatar = user.avatar       // column: avatar
  if (user.location !== undefined) row.location = user.location
  if (user.isShop !== undefined) row.is_shop = user.isShop
  if (user.isAdmin !== undefined) row.is_admin = user.isAdmin
  if (user.isTrustedSeller !== undefined) row.is_trusted_seller = user.isTrustedSeller
  // Map suspended/banned booleans back to the single status column
  if (user.suspended === true) row.status = 'suspended'
  else if (user.banned === true) row.status = 'banned'
  else if (user.suspended === false && user.banned === false) row.status = 'active'
  else if (user.status !== undefined) row.status = user.status
  // Seller badges & trust tags (admin-managed arrays)
  if (user.sellerBadges !== undefined) row.seller_badges = normalizeSellerBadges(user.sellerBadges)
  if (user.trustTags !== undefined) row.trust_tags = user.trustTags
  // Admin permission level
  if (user.adminRole !== undefined) row.admin_role = user.adminRole
  if (user.stripeAccountId !== undefined) row.stripe_account_id = user.stripeAccountId
  if (user.detailsSubmitted !== undefined) row.details_submitted = user.detailsSubmitted
  if (user.stripeOnboardingComplete !== undefined) row.stripe_onboarding_complete = user.stripeOnboardingComplete
  if (user.chargesEnabled !== undefined) row.charges_enabled = user.chargesEnabled
  if (user.payoutsEnabled !== undefined) row.payouts_enabled = user.payoutsEnabled
  if (user.stripeStatusUpdatedAt !== undefined) row.stripe_status_updated_at = user.stripeStatusUpdatedAt
  row.updated_at = new Date().toISOString()
  return row
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Fetch a single profile by auth user id. */
export async function fetchProfileById(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data: rowToUser(data), error }
}

/** Fetch a single profile by username. */
export async function fetchProfileByUsername(supabase, username) {
  const normalized = normalizeUsernameInput(username)
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', normalized)
    .single()
  return { data: rowToUser(data), error }
}

/** Check username availability before signup. Uses the DB RPC when deployed. */
export async function checkUsernameAvailability(supabase, username) {
  const validation = validateUsername(username)
  if (!validation.valid) {
    return { available: false, username: validation.username, error: null, reason: validation.error }
  }

  const rpcResult = await supabase
    .rpc?.('is_username_available', { p_username: validation.username })

  if (rpcResult && !rpcResult.error && typeof rpcResult.data === 'boolean') {
    return { available: rpcResult.data, username: validation.username, error: null }
  }

  if (rpcResult?.error) {
    console.warn('Username availability RPC unavailable, falling back to direct lookup:', rpcResult.error)
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', validation.username)
    .limit(1)

  if (error) {
    return { available: false, username: validation.username, error }
  }

  return { available: (data || []).length === 0, username: validation.username, error: null }
}

/** Fetch all profiles (admin use / user search). */
export async function fetchAllProfiles(supabase) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  return { data: (data || []).map(rowToUser), error }
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Update the current user's own profile.
 * Only editable fields are sent; id is used as the filter.
 */
export async function updateProfile(supabase, userId, updates) {
  const row = userToRow(updates)
  const { data, error } = await supabase
    .from('profiles')
    .update(row)
    .eq('id', userId)
    .select()
    .single()
  return { data: rowToUser(data), error }
}

/**
 * Admin: update any user's profile fields (suspend, ban, restore, etc.)
 */
export async function adminUpdateProfile(supabase, userId, updates) {
  const row = userToRow(updates)
  const { data, error } = await supabase
    .from('profiles')
    .update(row)
    .eq('id', userId)
    .select()
    .single()
  return { data: rowToUser(data), error }
}

/**
 * Increment the sales count for a seller.
 * Uses read-then-write since RPC may not be available.
 */
export async function incrementSalesCount(supabase, userId, by = 1) {
  const { data: current, error: readErr } = await supabase
    .from('profiles')
    .select('sales')
    .eq('id', userId)
    .single()

  if (readErr) return { error: readErr }

  const { data, error } = await supabase
    .from('profiles')
    .update({ sales: (current.sales || 0) + by, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  return { data: rowToUser(data), error }
}
