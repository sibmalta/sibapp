import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '../lib/useSupabase'
import {
  fetchUserNotifications,
  insertNotification,
  markNotificationRead as dbMarkNotificationRead,
  markAllNotificationsRead as dbMarkAllNotificationsRead,
} from '../lib/db/notifications'

function sortNotifications(items) {
  return [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function useNotifications(currentUser) {
  const { supabase, isAuthenticated } = useSupabase()
  const [notifications, setNotifications] = useState([])
  const [dbAvailable, setDbAvailable] = useState(null)

  const refreshNotifications = useCallback(async () => {
    if (!currentUser?.id || !isAuthenticated) {
      setNotifications([])
      return []
    }

    const { data, error } = await fetchUserNotifications(supabase, currentUser.id)
    if (error) {
      console.error('[useNotifications] fetchUserNotifications failed:', error.message)
      setDbAvailable(false)
      return []
    }

    setDbAvailable(true)
    setNotifications(sortNotifications(data || []))
    return data || []
  }, [currentUser?.id, isAuthenticated, supabase])

  useEffect(() => {
    refreshNotifications()
  }, [refreshNotifications])

  useEffect(() => {
    if (!currentUser?.id || !isAuthenticated) return undefined

    const handleResume = () => {
      if (document.visibilityState === 'visible') {
        refreshNotifications()
      }
    }

    window.addEventListener('focus', handleResume)
    document.addEventListener('visibilitychange', handleResume)
    window.addEventListener('pageshow', handleResume)

    return () => {
      window.removeEventListener('focus', handleResume)
      document.removeEventListener('visibilitychange', handleResume)
      window.removeEventListener('pageshow', handleResume)
    }
  }, [currentUser?.id, isAuthenticated, refreshNotifications])

  const addNotification = useCallback(async (notif) => {
    if (!notif?.userId || !isAuthenticated) return null

    const payload = {
      read: false,
      ...notif,
      metadata: notif.metadata || {},
      data: notif.data || {},
    }

    const { data, error } = await insertNotification(supabase, payload)
    if (error) {
      console.error('[useNotifications] insertNotification failed:', {
        userId: notif.userId,
        type: notif.type,
        orderId: notif.orderId,
        message: error.message,
      })
      return null
    }

    if (notif.userId === currentUser?.id && data) {
      setNotifications(prev => prev.some(existing => existing.id === data.id) ? prev : sortNotifications([data, ...prev]))
    }

    return data
  }, [currentUser?.id, isAuthenticated, supabase])

  const markNotificationRead = useCallback(async (notifId) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n))
    const { error } = await dbMarkNotificationRead(supabase, notifId)
    if (error) {
      console.error('[useNotifications] markNotificationRead failed:', error.message)
      refreshNotifications()
    }
  }, [refreshNotifications, supabase])

  const markAllNotificationsRead = useCallback(async (userId) => {
    setNotifications(prev => prev.map(n => n.userId === userId ? { ...n, read: true } : n))
    const { error } = await dbMarkAllNotificationsRead(supabase, userId)
    if (error) {
      console.error('[useNotifications] markAllNotificationsRead failed:', error.message)
      refreshNotifications()
    }
  }, [refreshNotifications, supabase])

  const getUserNotifications = useCallback((userId) => {
    if (!userId || userId !== currentUser?.id) return []
    return notifications
  }, [currentUser?.id, notifications])

  return {
    notifications,
    dbAvailable,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    getUserNotifications,
    refreshNotifications,
  }
}
