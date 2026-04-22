/**
 * useListings — data hook for the listings table.
 *
 * Uses Supabase as the single source of truth for production listing data.
 *
 * Returns the same shape as the AppContext listings array so callers
 * don't need to change.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabase } from '../lib/useSupabase'
import {
  fetchActiveListings,
  fetchUserListings as dbFetchUserListings,
  fetchListingById as dbFetchListingById,
  createListing as dbCreateListing,
  deleteListing as dbDeleteListing,
  setListingBoosted,
  setListingFlagged,
  toggleListingLike,
  fetchUserLikes,
  markListingSold,
  incrementViewCount,
  updateStyleTags as dbUpdateStyleTags,
  adminUpdateListingMeta as dbAdminUpdateListingMeta,
} from '../lib/db/listings'
import { uploadListingImage, dataUrlToFile } from '../lib/storage'
import { classifyListing, backfillStyleTags } from '../lib/styleClassifier'
import { classifyCollection, backfillCollectionTags } from '../lib/collectionClassifier'

const SUPABASE_ENABLED = true // flip to false to force localStorage-only mode

/**
 * Persist backfilled style_tags to DB for listings that were missing them.
 * Compares original DB data with the backfilled result; only writes where tags were added.
 * Runs fire-and-forget on initial load.
 */
async function persistBackfilledTags(supabase, originalData, taggedData) {
  const toUpdate = []
  for (let i = 0; i < originalData.length; i++) {
    const orig = originalData[i]
    const tagged = taggedData[i]
    // Check if original had no tags. rowToListing sets styleTags to [] when column is null/empty.
    const origArr = orig.styleTags
    const origHasTags = Array.isArray(origArr) && origArr.length > 0
    // Check the backfilled result (backfillStyleTags sets both styleTags and style_tags)
    const newArr = tagged.styleTags
    const newHasTags = Array.isArray(newArr) && newArr.length > 0
    if (!origHasTags && newHasTags) {
      toUpdate.push({ id: orig.id, style_tags: newArr })
    }
  }
  if (toUpdate.length === 0) return
  console.log(`[useListings] Persisting backfilled style_tags for ${toUpdate.length} listings`)
  // Batch update — use individual updates (Supabase doesn't support bulk update by different ids)
  for (const item of toUpdate) {
    supabase
      .from('listings')
      .update({ style_tags: item.style_tags, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .then(({ error }) => {
        if (error) console.warn(`[backfill] Failed to persist tags for ${item.id}:`, error.message)
      })
  }
}

/**
 * useListings(localListings, localLikes, currentUser)
 *
 * @param {Array}  localListings - ignored; kept for backward-compatible hook signature
 * @param {Array}  localLikes    - liked listing ids from AppContext localStorage state
 * @param {object} currentUser   - current user from AppContext
 */
export function useListings(localListings, localLikes, currentUser) {
  const { supabase, isAuthenticated } = useSupabase()

  // When Supabase is enabled, start empty to prevent flash of stale seed data
  const [listings, setListings] = useState(SUPABASE_ENABLED ? [] : localListings)
  const [likedListings, setLikedListings] = useState(SUPABASE_ENABLED ? [] : localLikes)
  const [loading, setLoading] = useState(SUPABASE_ENABLED)
  const [dbAvailable, setDbAvailable] = useState(false)
  const fetchedRef = useRef(false)

  // ── Initial load from Supabase ─────────────────────────────────────────────
  useEffect(() => {
    if (!SUPABASE_ENABLED || fetchedRef.current) return
    fetchedRef.current = true

    async function load() {
      setLoading(true)
      const { data, error } = await fetchActiveListings(supabase, { limit: 200 })
      if (!error && data) {
        // DB reachable — use DB as single source of truth (even if empty)
        setDbAvailable(true)
        // Backfill style_tags in memory first, then persist to DB for any that were missing
        const tagged = backfillCollectionTags(backfillStyleTags(data))
        setListings(tagged)
        // Persist backfilled tags to DB (fire-and-forget)
        persistBackfilledTags(supabase, data, tagged)
      } else if (error) {
        // Backend unavailable — keep localStorage data
        console.warn('[useListings] Supabase unavailable. Listing grid will render empty instead of demo data:', error.message)
        setDbAvailable(false)
        setListings([])
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync liked listings for authenticated users ────────────────────────────
  useEffect(() => {
    if (!SUPABASE_ENABLED || !isAuthenticated || !currentUser?.id || !dbAvailable) return
    fetchUserLikes(supabase, currentUser.id).then(({ data }) => {
      if (data && data.length > 0) setLikedListings(data)
    })
  }, [isAuthenticated, currentUser?.id, dbAvailable]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keep in sync with local state when DB is unavailable ──────────────────
  useEffect(() => {
    if (!dbAvailable) setLikedListings(localLikes)
  }, [localLikes, dbAvailable])

  // ── Create listing ─────────────────────────────────────────────────────────
  const createListing = useCallback(async (formData, imageFiles = []) => {
    if (!currentUser) throw new Error('Must be logged in to create a listing')

    // Upload images to Storage when available
    let imageUrls = formData.images || [] // may already contain dataURLs from SellPage
    // Determine actual File objects to upload:
    // 1. Prefer explicit imageFiles param (if SellPage passes them)
    // 2. Otherwise, convert any base64 dataURLs in formData.images to Files
    let filesToUpload = imageFiles
    if (filesToUpload.length === 0 && dbAvailable && isAuthenticated && imageUrls.length > 0) {
      filesToUpload = imageUrls
        .filter(img => typeof img === 'string' && img.startsWith('data:'))
        .map((dataUrl, i) => dataUrlToFile(dataUrl, `listing_${i}.jpg`))
    }
    if (dbAvailable && isAuthenticated && filesToUpload.length > 0) {
      const uploads = await Promise.all(
        filesToUpload.map((file, i) => uploadListingImage(supabase, currentUser.id, file, i))
      )
      const successUrls = uploads.filter(r => r.url).map(r => r.url)
      if (successUrls.length > 0) imageUrls = successUrls
    }

    const payload = { ...formData, images: imageUrls }
    // Auto-classify style tags and collection tags
    payload.style_tags = classifyListing(payload)
    payload.collection_tags = classifyCollection(payload)

    if (dbAvailable && isAuthenticated) {
      const { data, error } = await dbCreateListing(supabase, currentUser.id, payload)
      if (error) {
        console.error('[useListings] createListing DB error:', error.message, error.details, error.hint)
        // Surface the error instead of silently falling back
        throw new Error(`DB insert failed: ${error.message}${error.hint ? ` (hint: ${error.hint})` : ''}`)
      }
      if (data) {
        // Backfill style_tags and collection_tags if DB didn't persist them (columns might not exist yet)
        const tagged = {
          ...data,
          styleTags: data.styleTags?.length ? data.styleTags : payload.style_tags,
          collectionTags: data.collectionTags?.length ? data.collectionTags : payload.collection_tags,
        }
        setListings(prev => [tagged, ...prev])
        return tagged
      }
      throw new Error('DB insert returned no data and no error — unexpected response')
    }

    if (!dbAvailable) {
      console.warn('[useListings] DB unavailable — creating local-only listing (will NOT persist)')
    } else if (!isAuthenticated) {
      console.warn('[useListings] User not authenticated — creating local-only listing (will NOT persist)')
    }

    // Local fallback — only when DB is genuinely unreachable or user isn't authenticated
    throw new Error('Listings database is unavailable. Listing was not saved.')
  }, [supabase, currentUser, dbAvailable, isAuthenticated])

  // ── Delete listing ─────────────────────────────────────────────────────────
  const deleteListing = useCallback(async (listingId) => {
    // Optimistic update
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: 'deleted' } : l))

    if (dbAvailable && isAuthenticated) {
      const { error } = await dbDeleteListing(supabase, listingId)
      if (error) console.warn('[useListings] deleteListing DB error:', error.message)
    }
  }, [supabase, dbAvailable, isAuthenticated])

  // ── Mark sold ──────────────────────────────────────────────────────────────
  const markSold = useCallback(async (listingId) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: 'sold' } : l))
    if (dbAvailable && isAuthenticated) {
      await markListingSold(supabase, listingId)
    }
  }, [supabase, dbAvailable, isAuthenticated])

  // ── Toggle like ────────────────────────────────────────────────────────────
  const toggleLike = useCallback(async (listingId) => {
    if (!currentUser) return
    const currentlyLiked = likedListings.includes(listingId)
    const listing = listings.find(l => l.id === listingId)
    const currentCount = listing?.likes || 0

    // Optimistic update
    setLikedListings(prev =>
      currentlyLiked ? prev.filter(id => id !== listingId) : [...prev, listingId]
    )
    setListings(prev => prev.map(l => {
      if (l.id !== listingId) return l
      return { ...l, likes: currentlyLiked ? Math.max(0, l.likes - 1) : l.likes + 1 }
    }))

    if (dbAvailable && isAuthenticated) {
      const { error } = await toggleListingLike(supabase, currentUser.id, listingId, currentlyLiked, currentCount)
      if (error) console.warn('[useListings] toggleLike DB error:', error.message)
    }
  }, [supabase, currentUser, likedListings, listings, dbAvailable, isAuthenticated])

  // ── Admin mutations ────────────────────────────────────────────────────────
  const boostListing = useCallback(async (listingId) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, boosted: true } : l))
    if (dbAvailable) await setListingBoosted(supabase, listingId, true)
  }, [supabase, dbAvailable])

  const unboostListing = useCallback(async (listingId) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, boosted: false } : l))
    if (dbAvailable) await setListingBoosted(supabase, listingId, false)
  }, [supabase, dbAvailable])

  const flagListing = useCallback(async (listingId) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, flagged: true } : l))
    if (dbAvailable) await setListingFlagged(supabase, listingId, true, undefined)
  }, [supabase, dbAvailable])

  const approveListing = useCallback(async (listingId) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, flagged: false, status: 'active' } : l))
    if (dbAvailable) await setListingFlagged(supabase, listingId, false, 'active')
  }, [supabase, dbAvailable])

  const hideListing = useCallback(async (listingId) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: 'hidden' } : l))
    if (dbAvailable) await setListingFlagged(supabase, listingId, true, 'hidden')
  }, [supabase, dbAvailable])

  // ── Update style tags (admin) ──────────────────────────────────────────────
  const updateStyleTags = useCallback(async (listingId, styleTags, manualStyleTags) => {
    setListings(prev => prev.map(l =>
      l.id === listingId ? { ...l, styleTags, manualStyleTags: manualStyleTags !== undefined ? manualStyleTags : l.manualStyleTags } : l
    ))
    if (dbAvailable) {
      await dbUpdateStyleTags(supabase, listingId, styleTags, manualStyleTags)
    }
  }, [supabase, dbAvailable])

  // ── Admin: update any listing metadata (category, brand, colour, tags, etc.) ──
  const adminUpdateListingMeta = useCallback(async (listingId, updates) => {
    // Optimistic update
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, ...updates } : l))
    if (dbAvailable) {
      const { error } = await dbAdminUpdateListingMeta(supabase, listingId, updates)
      if (error) console.warn('[useListings] adminUpdateListingMeta DB error:', error.message)
    }
  }, [supabase, dbAvailable])

  // ── Update collection tags (admin) ──────────────────────────────────────────
  const updateCollectionTags = useCallback(async (listingId, collectionTags, manualCollectionTags) => {
    setListings(prev => prev.map(l =>
      l.id === listingId ? { ...l, collectionTags, manualCollectionTags: manualCollectionTags !== undefined ? manualCollectionTags : l.manualCollectionTags } : l
    ))
    if (dbAvailable) {
      const updates = { collection_tags: collectionTags }
      if (manualCollectionTags !== undefined) updates.manual_collection_tags = manualCollectionTags
      await dbAdminUpdateListingMeta(supabase, listingId, { collectionTags, manualCollectionTags })
    }
  }, [supabase, dbAvailable])

  // ── Lookup helpers (sync, no DB call — work on in-memory state) ───────────
  const getListingById = useCallback((id) => listings.find(l => l.id === id), [listings])
  const getUserListings = useCallback((userId) =>
    listings.filter(l => l.sellerId === userId && l.status !== 'deleted'),
    [listings]
  )

  // ── Track view (fire and forget) ──────────────────────────────────────────
  const trackView = useCallback((listingId) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, views: (l.views || 0) + 1 } : l))
    if (dbAvailable) incrementViewCount(supabase, listingId)
  }, [supabase, dbAvailable])

  return {
    listings,
    likedListings,
    loading,
    dbAvailable,
    // mutations
    createListing,
    deleteListing,
    markSold,
    toggleLike,
    boostListing,
    unboostListing,
    flagListing,
    approveListing,
    hideListing,
    updateStyleTags,
    updateCollectionTags,
    adminUpdateListingMeta,
    trackView,
    // lookups
    getListingById,
    getUserListings,
  }
}
