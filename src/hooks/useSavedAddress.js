/**
 * useSavedAddress — loads and saves a user's default delivery address.
 *
 * Storage strategy (matches the rest of the app):
 *  - Persists to localStorage keyed by the user's id.
 *  - Also writes/reads from the `profiles` table when the DB is available
 *    (delivery_* columns added via migration).
 *  - Falls back to localStorage gracefully when columns are missing.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabase } from '../lib/useSupabase'

const STORAGE_KEY_PREFIX = 'sib_delivery_'

function getStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}${userId}`
}

const EMPTY_ADDRESS = {
  fullName: '',
  phone: '',
  address: '',
  city: '',
  postcode: '',
  notes: '',
  deliveryMethod: 'home_delivery',
}

export default function useSavedAddress(userId) {
  const { supabase, isAuthenticated } = useSupabase()
  const [savedAddress, setSavedAddress] = useState(null)
  const [loading, setLoading] = useState(true)
  const loadedRef = useRef(false)

  // ── Load saved address on mount ──────────────────────────
  useEffect(() => {
    if (!userId || loadedRef.current) return
    loadedRef.current = true

    async function load() {
      // 1. Try DB first
      if (isAuthenticated) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('delivery_full_name, delivery_phone, delivery_address, delivery_city, delivery_postcode, delivery_notes, delivery_method')
            .eq('id', userId)
            .single()

          if (!error && data && data.delivery_address) {
            const addr = {
              fullName: data.delivery_full_name || '',
              phone: data.delivery_phone || '',
              address: data.delivery_address || '',
              city: data.delivery_city || '',
              postcode: data.delivery_postcode || '',
              notes: data.delivery_notes || '',
              deliveryMethod: data.delivery_method || 'home_delivery',
            }
            setSavedAddress(addr)
            // Sync to localStorage as cache
            try { localStorage.setItem(getStorageKey(userId), JSON.stringify(addr)) } catch {}
            setLoading(false)
            return
          }
        } catch {
          // DB columns might not exist yet — fall through to localStorage
        }
      }

      // 2. Fall back to localStorage
      try {
        const stored = localStorage.getItem(getStorageKey(userId))
        if (stored) {
          setSavedAddress(JSON.parse(stored))
        }
      } catch {}
      setLoading(false)
    }

    load()
  }, [userId, supabase, isAuthenticated])

  // ── Save address ─────────────────────────────────────────
  const saveAddress = useCallback(async (addr) => {
    if (!userId) return

    const toSave = { ...EMPTY_ADDRESS, ...addr }
    setSavedAddress(toSave)

    // Always write to localStorage
    try { localStorage.setItem(getStorageKey(userId), JSON.stringify(toSave)) } catch {}

    // Try DB
    if (isAuthenticated) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            delivery_full_name: toSave.fullName,
            delivery_phone: toSave.phone,
            delivery_address: toSave.address,
            delivery_city: toSave.city,
            delivery_postcode: toSave.postcode,
            delivery_notes: toSave.notes,
            delivery_method: toSave.deliveryMethod,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
        if (error) console.warn('[useSavedAddress] DB save failed:', error.message)
      } catch (e) {
        console.warn('[useSavedAddress] DB save error:', e.message)
      }
    }
  }, [userId, supabase, isAuthenticated])

  // ── Clear saved address ──────────────────────────────────
  const clearAddress = useCallback(async () => {
    if (!userId) return
    setSavedAddress(null)
    try { localStorage.removeItem(getStorageKey(userId)) } catch {}

    if (isAuthenticated) {
      try {
        await supabase
          .from('profiles')
          .update({
            delivery_full_name: null,
            delivery_phone: null,
            delivery_address: null,
            delivery_city: null,
            delivery_postcode: null,
            delivery_notes: null,
            delivery_method: 'home_delivery',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
      } catch {}
    }
  }, [userId, supabase, isAuthenticated])

  return {
    savedAddress,
    loading,
    saveAddress,
    clearAddress,
    hasSavedAddress: !!savedAddress?.address,
  }
}
