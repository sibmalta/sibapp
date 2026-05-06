/**
 * useLogistics — Application-level logistics data with localStorage persistence.
 * Stores pickup/delivery scheduling, driver assignments, logistics statuses,
 * and internal notes keyed by order ID.
 *
 * TODO: Migrate to Supabase `logistics` table when DB schema is extended.
 */
import { useState, useCallback, useEffect, useRef } from 'react'

const STORAGE_KEY = 'sib_logistics'
const NOTIF_KEY = 'sib_logistics_notifications'

export const LOGISTICS_STATUSES = [
  { id: 'paid',                   label: 'Paid',                    color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'awaiting_pickup',        label: 'Awaiting Pickup',         color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { id: 'pickup_booked',          label: 'Pickup Booked',           color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'collected',              label: 'Collected',               color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'dropped_off',            label: 'Awaiting courier pickup', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'at_hub',                 label: 'At Hub',                  color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { id: 'out_for_delivery',       label: 'Out for Delivery',        color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'delivered',              label: 'Delivered',               color: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'pickup_failed',          label: 'Pickup Failed',           color: 'bg-red-50 text-red-600 border-red-200' },
  { id: 'delivery_failed',        label: 'Delivery Failed',         color: 'bg-red-50 text-red-600 border-red-200' },
  { id: 'hold_dispute',           label: 'Hold / Dispute',          color: 'bg-orange-50 text-orange-700 border-orange-200' },
]

export const LOGISTICS_FILTER_PRESETS = [
  { id: 'all',               label: 'All' },
  { id: 'paid',              label: 'New Orders' },
  { id: 'awaiting_pickup',   label: 'Awaiting Pickup' },
  { id: 'pickup_booked',     label: 'Pickup Booked' },
  { id: 'collected',         label: 'Collected' },
  { id: 'dropped_off',       label: 'Dropped Off' },
  { id: 'out_for_delivery',  label: 'Out for Delivery' },
  { id: 'delivered',         label: 'Delivered' },
  { id: 'failed',            label: 'Failed / Exception' },
]

function loadLS(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback } catch { return fallback }
}
function saveLS(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch {}
}

export function useLogistics() {
  const [data, setData] = useState(() => loadLS(STORAGE_KEY, {}))
  const [notifications, setNotifications] = useState(() => loadLS(NOTIF_KEY, []))
  const prevRef = useRef(data)

  // Persist on change
  useEffect(() => { saveLS(STORAGE_KEY, data) }, [data])
  useEffect(() => { saveLS(NOTIF_KEY, notifications) }, [notifications])

  // Get logistics record for an order (or defaults)
  const getLogistics = useCallback((orderId) => {
    return data[orderId] || {
      logisticsStatus: 'paid',
      pickupDay: '',
      deliveryDay: '',
      assignedDriver: '',
      internalNotes: '',
      history: [],
    }
  }, [data])

  // Add logistics notification
  const addLogisticsNotif = useCallback((orderId, type, message) => {
    const notif = {
      id: `ln_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      orderId,
      type,
      message,
      createdAt: new Date().toISOString(),
      read: false,
    }
    setNotifications(prev => [notif, ...prev])
    return notif
  }, [])

  // Mark notification as read
  const markNotifRead = useCallback((notifId) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n))
  }, [])

  // Clear all notifications
  const clearNotifs = useCallback(() => setNotifications([]), [])

  // Update logistics record for an order
  const updateLogistics = useCallback((orderId, updates) => {
    setData(prev => {
      const existing = prev[orderId] || {
        logisticsStatus: 'paid',
        pickupDay: '',
        deliveryDay: '',
        assignedDriver: '',
        internalNotes: '',
        history: [],
      }
      const historyEntry = {
        ts: new Date().toISOString(),
        changes: {},
      }
      for (const [k, v] of Object.entries(updates)) {
        if (k !== 'history' && existing[k] !== v) {
          historyEntry.changes[k] = { from: existing[k], to: v }
        }
      }
      const newHistory = historyEntry.changes && Object.keys(historyEntry.changes).length > 0
        ? [...(existing.history || []), historyEntry]
        : existing.history || []

      // Auto-generate notifications for status changes
      if (updates.logisticsStatus && updates.logisticsStatus !== existing.logisticsStatus) {
        const statusLabel = LOGISTICS_STATUSES.find(s => s.id === updates.logisticsStatus)?.label || updates.logisticsStatus
        const notifTypes = ['paid', 'pickup_booked', 'collected', 'out_for_delivery', 'delivered', 'pickup_failed', 'delivery_failed']
        if (notifTypes.includes(updates.logisticsStatus)) {
          addLogisticsNotif(orderId, updates.logisticsStatus, `Order #${orderId.slice(-8)}: ${statusLabel}`)
        }
      }

      return {
        ...prev,
        [orderId]: { ...existing, ...updates, history: newHistory, updatedAt: new Date().toISOString() },
      }
    })
  }, [addLogisticsNotif])

  // Initialise a paid order into the logistics pipeline
  const initOrder = useCallback((orderId) => {
    setData(prev => {
      if (prev[orderId]) return prev
      addLogisticsNotif(orderId, 'paid', `New paid order #${orderId.slice(-8)}`)
      return {
        ...prev,
        [orderId]: {
          logisticsStatus: 'paid',
          pickupDay: '',
          deliveryDay: '',
          assignedDriver: '',
          internalNotes: '',
          history: [{ ts: new Date().toISOString(), changes: { logisticsStatus: { from: null, to: 'paid' } } }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    })
  }, [addLogisticsNotif])

  return {
    logisticsData: data,
    logisticsNotifications: notifications,
    getLogistics,
    updateLogistics,
    initOrder,
    addLogisticsNotif,
    markNotifRead,
    clearNotifs,
  }
}
