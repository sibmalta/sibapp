/**
 * useProfiles — data hook for the `profiles` table.
 *
 * Tries Supabase first; falls back to localStorage/seed user array
 * from AppContext when the backend is unavailable.
 *
 * Exposes the same shape and function names that AppContext currently
 * provides for `users`, `getUserById`, `getUserByUsername`, `updateProfile`.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabase } from '../lib/useSupabase'
import { useAuth } from '../lib/auth-context'
import {
  fetchAllProfiles,
  fetchProfileById,
  updateProfile as dbUpdateProfile,
  adminUpdateProfile,
  incrementSalesCount,
} from '../lib/db/profiles'
import { uploadAvatar, dataUrlToFile } from '../lib/storage'

const SUPABASE_ENABLED = true

/**
 * useProfiles(localUsers, currentUser)
 *
 * @param {Array}  localUsers  - users array from AppContext localStorage state
 * @param {object} currentUser - current user derived from Supabase auth
 */
export function useProfiles(localUsers, currentUser) {
  const { supabase, isAuthenticated } = useSupabase()
  const { updateUserMetadata } = useAuth()

  const [users, setUsers] = useState(localUsers)
  const [dbAvailable, setDbAvailable] = useState(false)
  const fetchedRef = useRef(false)

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!SUPABASE_ENABLED || fetchedRef.current) return
    fetchedRef.current = true

    async function load() {
      const { data, error } = await fetchAllProfiles(supabase)
      if (!error && data) {
        // DB reachable — use DB as single source of truth (even if empty)
        setDbAvailable(true)
        setUsers(data)
      } else if (error) {
        console.warn('[useProfiles] Supabase unavailable, using localStorage:', error.message)
        setDbAvailable(false)
        setUsers(localUsers)
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep in sync with local state when DB is unavailable
  useEffect(() => {
    if (!dbAvailable) setUsers(localUsers)
  }, [localUsers, dbAvailable])

  // ── Refresh current user's own profile from DB ─────────────────────────────
  const refreshCurrentProfile = useCallback(async () => {
    if (!dbAvailable || !currentUser?.id) return
    const { data, error } = await fetchProfileById(supabase, currentUser.id)
    if (!error && data) {
      setUsers(prev => prev.map(u => u.id === data.id ? { ...u, ...data } : u))
    }
  }, [supabase, currentUser?.id, dbAvailable])

  // ── Update profile ─────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (updates, avatarFile = null) => {
    if (!currentUser?.id) return { error: 'Not logged in' }

    let finalUpdates = { ...updates }

    // Upload avatar to Storage if a new file is provided
    if (avatarFile && dbAvailable && isAuthenticated) {
      const { url, error: uploadErr } = await uploadAvatar(supabase, currentUser.id, avatarFile)
      if (!uploadErr && url) {
        finalUpdates.avatar = url
      } else if (uploadErr) {
        console.warn('[useProfiles] avatar upload error:', uploadErr.message)
      }
    } else if (
      !avatarFile &&
      updates.avatar &&
      updates.avatar.startsWith('data:') &&
      dbAvailable &&
      isAuthenticated
    ) {
      // Legacy base64 → upload to Storage
      try {
        const file = dataUrlToFile(updates.avatar)
        const { url, error: uploadErr } = await uploadAvatar(supabase, currentUser.id, file)
        if (!uploadErr && url) finalUpdates.avatar = url
      } catch (e) {
        console.warn('[useProfiles] base64 avatar conversion error:', e.message)
      }
    }

    // Optimistic local update
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...finalUpdates } : u))

    // Supabase DB update
    if (dbAvailable && isAuthenticated) {
      const { error } = await dbUpdateProfile(supabase, currentUser.id, finalUpdates)
      if (error) console.warn('[useProfiles] updateProfile DB error:', error.message)
    }

    // Always sync to auth metadata so buildAppUser stays fresh
    if (updateUserMetadata) {
      try {
        await updateUserMetadata({
          name: finalUpdates.name,
          bio: finalUpdates.bio,
          phone: finalUpdates.phone,
          avatar: finalUpdates.avatar,
          location: finalUpdates.location,
        })
      } catch (e) {
        console.warn('[useProfiles] updateUserMetadata error:', e.message)
      }
    }

    return { error: null }
  }, [supabase, currentUser?.id, dbAvailable, isAuthenticated, updateUserMetadata])

  // ── Admin mutations ────────────────────────────────────────────────────────
  const suspendUser = useCallback(async (userId) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, suspended: true, banned: false } : u))
    if (dbAvailable) await adminUpdateProfile(supabase, userId, { suspended: true, banned: false })
  }, [supabase, dbAvailable])

  const banUser = useCallback(async (userId) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: true, suspended: false } : u))
    if (dbAvailable) await adminUpdateProfile(supabase, userId, { banned: true, suspended: false })
  }, [supabase, dbAvailable])

  const restoreUser = useCallback(async (userId) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: false, suspended: false } : u))
    if (dbAvailable) await adminUpdateProfile(supabase, userId, { banned: false, suspended: false })
  }, [supabase, dbAvailable])

  const incrementUserSales = useCallback(async (userId, by = 1) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, sales: (u.sales || 0) + by } : u))
    if (dbAvailable) await incrementSalesCount(supabase, userId, by)
  }, [supabase, dbAvailable])

  // ── Lookups (sync, in-memory) ──────────────────────────────────────────────
  const getUserById = useCallback((id) => users.find(u => u.id === id), [users])
  const getUserByUsername = useCallback((username) =>
    users.find(u => u.username?.toLowerCase() === username?.toLowerCase()),
    [users]
  )

  return {
    users,
    dbAvailable,
    refreshCurrentProfile,
    updateProfile,
    suspendUser,
    banUser,
    restoreUser,
    incrementUserSales,
    getUserById,
    getUserByUsername,
  }
}
