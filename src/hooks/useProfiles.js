/**
 * useProfiles — data hook for the `profiles` table.
 *
 * Tries Supabase first; falls back to localStorage/seed user array
 * from AppContext when the backend is unavailable.
 *
 * Exposes the same shape and function names that AppContext currently
 * provides for `users`, `getUserById`, `getUserByUsername`, `updateProfile`.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSupabase } from '../lib/useSupabase'
import { useAuth } from '../lib/auth-context'
import { createAuthenticatedClient } from '../lib/supabase'
import {
  fetchAllProfiles,
  fetchProfileById,
  updateProfile as dbUpdateProfile,
  adminUpdateProfile,
  incrementSalesCount,
} from '../lib/db/profiles'
import { uploadAvatar, dataUrlToFile } from '../lib/storage'
import { SEED_USERS as FALLBACK_SEED_USERS } from '../data/seedData'

const SUPABASE_ENABLED = true
const PROFILE_SESSION_EXPIRED_MESSAGE = 'Your session expired. Please log in again to update your profile.'

function isSessionExpiredError(error) {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
  return (
    message.includes('jwt expired') ||
    message.includes('invalid jwt') ||
    (message.includes('expired') && message.includes('jwt')) ||
    (message.includes('session') && message.includes('expired')) ||
    error?.code === 'PGRST301'
  )
}

function getProfileUpdateErrorMessage(error, fallback = 'Failed to update profile.') {
  if (isSessionExpiredError(error)) return PROFILE_SESSION_EXPIRED_MESSAGE
  const message = error?.message || ''
  if (message.toLowerCase().includes('bucket')) return 'Profile photo upload is not available right now. Please try again shortly.'
  if (message.toLowerCase().includes('storage')) return 'Profile photo upload failed. Please try again.'
  return message || fallback
}

/**
 * useProfiles(localUsers, currentUser)
 *
 * @param {Array}  localUsers  - users array from AppContext localStorage state
 * @param {object} currentUser - current user derived from Supabase auth
 */
export function useProfiles(localUsers, currentUser) {
  const { supabase, isAuthenticated } = useSupabase()
  const { updateUserMetadata, refreshSession } = useAuth()

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

  const ensureUserById = useCallback(async (userId) => {
    if (!userId) return null
    const existing = users.find(u => u.id === userId)
    if (existing?.email) return existing
    if (!SUPABASE_ENABLED) return existing || null

    const { data, error } = await fetchProfileById(supabase, userId)
    if (error) {
      console.error('[useProfiles] ensureUserById failed:', {
        userId,
        message: error.message,
        code: error.code || null,
      })
      return existing || null
    }

    if (data) {
      setUsers(prev => prev.some(u => u.id === data.id)
        ? prev.map(u => u.id === data.id ? { ...u, ...data } : u)
        : [...prev, data])
      return data
    }

    return existing || null
  }, [supabase, users])

  const prepareProfileUpdates = useCallback(async (client, updates, avatarFile = null) => {
    let finalUpdates = { ...updates }

    if (avatarFile) {
      const { url, error: uploadErr } = await uploadAvatar(client, currentUser.id, avatarFile)
      if (uploadErr) {
        console.error('[useProfiles] avatar upload failed:', {
          bucket: 'avatars',
          message: uploadErr.message,
          userId: currentUser.id,
        })
        return { finalUpdates: null, error: uploadErr }
      }
      finalUpdates.avatar = url
    } else if (updates.avatar && updates.avatar.startsWith('data:')) {
      try {
        const file = dataUrlToFile(updates.avatar)
        const { url, error: uploadErr } = await uploadAvatar(client, currentUser.id, file)
        if (uploadErr) {
          console.error('[useProfiles] base64 avatar upload failed:', {
            bucket: 'avatars',
            message: uploadErr.message,
            userId: currentUser.id,
          })
          return { finalUpdates: null, error: uploadErr }
        }
        finalUpdates.avatar = url
      } catch (error) {
        console.error('[useProfiles] base64 avatar conversion failed:', error.message)
        return { finalUpdates: null, error }
      }
    }

    return { finalUpdates, error: null }
  }, [currentUser?.id])

  // ── Update profile ─────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (updates, avatarFile = null) => {
    if (!currentUser?.id) return { error: 'Not logged in' }

    let finalUpdates = { ...updates }
    let client = supabase
    let savedProfile = null

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { finalUpdates: preparedUpdates, error: prepareError } = await prepareProfileUpdates(client, updates, avatarFile)
      if (prepareError) {
        if (attempt === 0 && isSessionExpiredError(prepareError)) {
          try {
            const refreshedSession = await refreshSession()
            client = createAuthenticatedClient(refreshedSession.access_token)
            continue
          } catch (refreshError) {
            console.error('[useProfiles] session refresh failed during avatar upload:', refreshError.message)
            return { error: PROFILE_SESSION_EXPIRED_MESSAGE }
          }
        }
        return { error: getProfileUpdateErrorMessage(prepareError, 'Failed to upload profile photo.') }
      }

      finalUpdates = preparedUpdates

      if (dbAvailable && isAuthenticated) {
        const { data, error } = await dbUpdateProfile(client, currentUser.id, finalUpdates)
        if (error) {
          console.error('[useProfiles] updateProfile DB error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            userId: currentUser.id,
          })
          if (attempt === 0 && isSessionExpiredError(error)) {
            try {
              const refreshedSession = await refreshSession()
              client = createAuthenticatedClient(refreshedSession.access_token)
              continue
            } catch (refreshError) {
              console.error('[useProfiles] session refresh failed during profile update:', refreshError.message)
              return { error: PROFILE_SESSION_EXPIRED_MESSAGE }
            }
          }
          return { error: getProfileUpdateErrorMessage(error) }
        }
        savedProfile = data
      }

      break
    }

    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...(savedProfile || finalUpdates) } : u))

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
        console.error('[useProfiles] updateUserMetadata error:', e.message)
        return { error: getProfileUpdateErrorMessage(e) }
      }
    }

    return { error: null }
  }, [supabase, currentUser?.id, dbAvailable, isAuthenticated, prepareProfileUpdates, refreshSession, updateUserMetadata])

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

  // ── Admin: update seller badges ─────────────────────────────────────────────
  const updateSellerBadges = useCallback(async (userId, badges) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, sellerBadges: badges } : u))
    if (dbAvailable) await adminUpdateProfile(supabase, userId, { sellerBadges: badges })
  }, [supabase, dbAvailable])

  // ── Admin: update trust tags ────────────────────────────────────────────────
  const updateTrustTags = useCallback(async (userId, tags) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, trustTags: tags } : u))
    if (dbAvailable) await adminUpdateProfile(supabase, userId, { trustTags: tags })
  }, [supabase, dbAvailable])

  // ── Admin: update admin role ────────────────────────────────────────────────
  const updateAdminRole = useCallback(async (userId, role) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, adminRole: role, isAdmin: !!role } : u))
    if (dbAvailable) await adminUpdateProfile(supabase, userId, { adminRole: role, isAdmin: !!role })
  }, [supabase, dbAvailable])

  // ── Seed-user index for fallback lookups (keyed by id and username) ────────
  const seedIndex = useMemo(() => {
    const byId = {}
    const byUsername = {}
    for (const u of FALLBACK_SEED_USERS) {
      byId[u.id] = u
      if (u.username) byUsername[u.username.toLowerCase()] = u
    }
    return { byId, byUsername }
  }, [])

  // ── Lookups (sync, in-memory) — fall back to seed users for legacy IDs ────
  const getUserById = useCallback((id) => {
    if (!id) return undefined
    return users.find(u => u.id === id) || seedIndex.byId[id]
  }, [users, seedIndex])

  const getUserByUsername = useCallback((username) => {
    if (!username) return undefined
    const lc = username.toLowerCase()
    return users.find(u => u.username?.toLowerCase() === lc) || seedIndex.byUsername[lc]
  }, [users, seedIndex])

  return {
    users,
    dbAvailable,
    refreshCurrentProfile,
    ensureUserById,
    updateProfile,
    suspendUser,
    banUser,
    restoreUser,
    incrementUserSales,
    updateSellerBadges,
    updateTrustTags,
    updateAdminRole,
    getUserById,
    getUserByUsername,
  }
}
