/**
 * useListings — data hook for the listings table.
 *
 * Tries Supabase first; falls back to the in-memory/localStorage state
 * provided by AppContext when the backend is unavailable.
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
} from '../lib/db/listings'
import { uploadListingImage, dataUrlToFile } from '../lib/storage'

const SUPABASE_ENABLED = true // flip to false to force localStorage-only mode

/**
 * useListings(localListings, localLikes, currentUser)
 *
 * @param {Array}  localListings - listings from AppContext localStorage state
 * @param {Array}  localLikes    - liked listing ids from AppContext localStorage state
 * @param {object} currentUser   - current user from AppContext
 */
export function useListings(localListings, localLikes, currentUser) {
  const { supabase, isAuthenticated } = useSupabase()

  const [listings, setListings] = useState(localListings)
  const [likedListings, setLikedListings] = useState(localLikes)
  const [loading, setLoading] = useState(false)
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
        setListings(data)
      } else if (error) {
        // Backend unavailable — keep localStorage data
        console.warn('[useListings] Supabase unavailable, using localStorage:', error.message)
        setDbAvailable(false)
        setListings(localListings)
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
    if (!dbAvailable) setListings(localListings)
  }, [localListings, dbAvailable])

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

    if (dbAvailable && isAuthenticated) {
      const { data, error } = await dbCreateListing(supabase, currentUser.id, payload)
      if (!error && data) {
        setListings(prev => [data, ...prev])
        return data
      }
      // Fall through to local creation if DB write fails
      console.warn('[useListings] createListing DB error, using local:', error?.message)
    }

    // Local fallback
    const local = {
      id: `l${Date.now()}`,
      sellerId: currentUser.id,
      ...payload,
      createdAt: new Date().toISOString(),
      likes: 0,
      status: 'active',
      views: 0,
    }
    setListings(prev => [local, ...prev])
    return local
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
    trackView,
    // lookups
    getListingById,
    getUserListings,
  }
}
