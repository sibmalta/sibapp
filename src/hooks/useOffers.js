import { useCallback, useEffect, useState } from 'react'
import { useSupabase } from '../lib/useSupabase'
import { fetchUserOffers, insertOffer, updateOffer } from '../lib/db/offers'

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function sortOffers(items) {
  return [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

export function useOffers(currentUser) {
  const { supabase, isAuthenticated } = useSupabase()
  const [offers, setOffers] = useState(() => loadFromStorage('sib_offers', []))
  const [dbAvailable, setDbAvailable] = useState(null)

  const refreshOffers = useCallback(async () => {
    if (!currentUser?.id || !isAuthenticated) return []
    const { data, error } = await fetchUserOffers(supabase, currentUser.id)
    if (error) {
      console.error('[useOffers] fetchUserOffers failed:', error.message)
      setDbAvailable(false)
      return []
    }
    setDbAvailable(true)
    setOffers(sortOffers(data || []))
    return data || []
  }, [currentUser?.id, isAuthenticated, supabase])

  useEffect(() => {
    refreshOffers()
  }, [refreshOffers])

  useEffect(() => {
    if (!dbAvailable) saveToStorage('sib_offers', offers)
  }, [dbAvailable, offers])

  useEffect(() => {
    if (!currentUser?.id || !isAuthenticated) return undefined

    const channel = supabase
      .channel(`offers:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offers', filter: `buyer_id=eq.${currentUser.id}` },
        refreshOffers,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offers', filter: `seller_id=eq.${currentUser.id}` },
        refreshOffers,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser?.id, isAuthenticated, refreshOffers, supabase])

  const createOffer = useCallback(async (offer) => {
    if (!isAuthenticated) {
      setOffers(prev => sortOffers([offer, ...prev]))
      return { data: offer, error: null }
    }
    const { data, error } = await insertOffer(supabase, offer)
    if (error) {
      console.error('[useOffers] insertOffer failed:', {
        listingId: offer.listingId,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        message: error.message,
        code: error.code || null,
      })
      return { data: null, error }
    }
    setOffers(prev => sortOffers(prev.some(o => o.id === data.id) ? prev : [data, ...prev]))
    return { data, error: null }
  }, [isAuthenticated, supabase])

  const patchOffer = useCallback(async (offerId, updates) => {
    if (!isAuthenticated) {
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, ...updates } : o))
      return { data: { id: offerId, ...updates }, error: null }
    }
    const { data, error } = await updateOffer(supabase, offerId, updates)
    if (error) {
      console.error('[useOffers] updateOffer failed:', {
        offerId,
        message: error.message,
        code: error.code || null,
      })
      return { data: null, error }
    }
    setOffers(prev => sortOffers(prev.map(o => o.id === offerId ? data : o)))
    return { data, error: null }
  }, [isAuthenticated, supabase])

  return {
    offers,
    setOffers,
    dbAvailable,
    refreshOffers,
    createOffer,
    patchOffer,
  }
}
