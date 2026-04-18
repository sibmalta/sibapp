import { useState, useEffect, useMemo, useRef } from 'react'
import { useSupabase } from '../lib/useSupabase'
import { useAuth } from '../lib/auth-context'
import { useApp } from '../context/AppContext'
import { normalizeBrand } from '../lib/brands'

const MAX_ITEMS = 8

/**
 * "For You" hook — returns personalised listing recommendations.
 *
 * Logic:
 *  1. Fetch the logged-in user's activity from user_activity.
 *  2. Tally category frequency from viewed items.
 *  3. Return active listings from the user's top categories,
 *     excluding items they already viewed.
 *  4. Fallback: if no activity or not logged in, return newest listings.
 */
export default function useForYou(externalListings) {
  const { supabase } = useSupabase()
  const { user } = useAuth()
  const appContext = useApp()
  const listings = externalListings || appContext.listings

  // Keep a stable ref to supabase client and listings so the effect
  // doesn't re-fire when their object identity changes.
  const sbRef = useRef(supabase)
  sbRef.current = supabase
  const listingsRef = useRef(listings)
  listingsRef.current = listings

  const [viewedItemIds, setViewedItemIds] = useState([])
  const [topCategories, setTopCategories] = useState([])
  const [topBrands, setTopBrands] = useState([])
  const [loading, setLoading] = useState(true)

  const activeListings = useMemo(
    () => listings.filter(l => l.status === 'active'),
    [listings],
  )

  // Fetch activity from Supabase for the current user
  useEffect(() => {
    let cancelled = false

    async function fetchActivity() {
      if (!user?.id) {
        setViewedItemIds([])
        setTopCategories([])
        setTopBrands([])
        setLoading(false)
        return
      }

      try {
        const { data, error } = await sbRef.current
          .from('user_activity')
          .select('item_id, action')
          .eq('user_id', user.id)
          .eq('action', 'view')
          .order('created_at', { ascending: false })
          .limit(200)

        if (error) {
          console.error('[useForYou] fetch error:', error.message)
          setLoading(false)
          return
        }

        if (cancelled) return

        const ids = (data || []).map(r => r.item_id)
        setViewedItemIds(ids)

        // Build category + brand frequency maps from the viewed items
        const currentListings = listingsRef.current
        const catCount = {}
        const brandCount = {}
        for (const itemId of ids) {
          const found = currentListings.find(l => l.id === itemId || String(l.id) === itemId)
          if (found?.category) {
            const cat = found.category.toLowerCase()
            catCount[cat] = (catCount[cat] || 0) + 1
          }
          if (found?.brand) {
            const nb = normalizeBrand(found.brand)
            if (nb) brandCount[nb] = (brandCount[nb] || 0) + 1
          }
        }

        // Sort categories by frequency descending
        const sortedCats = Object.entries(catCount)
          .sort((a, b) => b[1] - a[1])
          .map(([cat]) => cat)

        // Sort brands by frequency descending
        const sortedBrands = Object.entries(brandCount)
          .sort((a, b) => b[1] - a[1])
          .map(([brand]) => brand)

        setTopCategories(sortedCats)
        setTopBrands(sortedBrands)
      } catch (err) {
        console.error('[useForYou] unexpected:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    setLoading(true)
    fetchActivity()
    return () => { cancelled = true }
  }, [user?.id])

  // Compute personalised "For You" results
  const forYou = useMemo(() => {
    if (activeListings.length === 0) return []

    const isPersonalised = topCategories.length > 0 || topBrands.length > 0

    if (!isPersonalised) {
      // Fallback: newest listings
      return [...activeListings]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, MAX_ITEMS)
    }

    // Exclude already-viewed items
    const viewedSet = new Set(viewedItemIds.map(String))
    const unseen = activeListings.filter(l => !viewedSet.has(String(l.id)))

    // Score by category rank + brand preference
    const scored = unseen.map(l => {
      let score = 0

      // Category score (10 pts per rank)
      const cat = (l.category || '').toLowerCase()
      const catIdx = topCategories.indexOf(cat)
      if (catIdx >= 0) score += (topCategories.length - catIdx) * 10

      // Brand score (5 pts per rank) — uses normalizeBrand for fuzzy matching
      if (l.brand && topBrands.length > 0) {
        const nb = normalizeBrand(l.brand)
        if (nb) {
          const brandIdx = topBrands.indexOf(nb)
          if (brandIdx >= 0) score += (topBrands.length - brandIdx) * 5
        }
      }

      return { listing: l, score }
    })

    scored.sort(
      (a, b) => b.score - a.score || new Date(b.listing.createdAt) - new Date(a.listing.createdAt),
    )

    const results = scored.slice(0, MAX_ITEMS).map(s => s.listing)

    // If fewer than MAX_ITEMS, pad with newest unseen
    if (results.length < MAX_ITEMS) {
      const seen = new Set(results.map(l => l.id))
      const remaining = unseen
        .filter(l => !seen.has(l.id))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      for (const l of remaining) {
        results.push(l)
        if (results.length >= MAX_ITEMS) break
      }
    }

    return results
  }, [activeListings, topCategories, topBrands, viewedItemIds])

  return {
    forYou,
    loading,
    isPersonalised: topCategories.length > 0 || topBrands.length > 0,
  }
}
