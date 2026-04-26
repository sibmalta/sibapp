/**
 * useOrders — Supabase-only hook for orders, disputes, payouts, and shipments.
 *
 * NO localStorage fallback. If the database is unavailable or a write fails,
 * the error is surfaced to callers. Transaction data never persists locally.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabase } from '../lib/useSupabase'
import {
  fetchAllOrders, insertOrder, updateOrder,
  fetchAllDisputes, insertDispute, updateDispute,
  fetchAllPayouts, insertPayout, updatePayout,
  fetchAllShipments, insertShipment, updateShipment,
} from '../lib/db/orders'

export function useOrders() {
  const { supabase, withAuthRetry } = useSupabase()

  const [orders, setOrders] = useState([])
  const [disputes, setDisputes] = useState([])
  const [payouts, setPayouts] = useState([])
  const [shipments, setShipments] = useState([])
  const [dbAvailable, setDbAvailable] = useState(null) // null = loading, true/false after first fetch
  const [dbError, setDbError] = useState(null)
  const fetchedRef = useRef(false)

  // ── Load from Supabase on mount (no fallback) ────────────────────────────
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function load() {
      const [ordersRes, disputesRes, payoutsRes, shipmentsRes] = await Promise.all([
        fetchAllOrders(supabase),
        fetchAllDisputes(supabase),
        fetchAllPayouts(supabase),
        fetchAllShipments(supabase),
      ])

      if (ordersRes.error) {
        console.error('[useOrders] DB unavailable:', ordersRes.error.message)
        setDbAvailable(false)
        setDbError(ordersRes.error.message || 'Database connection failed')
        return
      }

      setDbAvailable(true)
      setDbError(null)
      setOrders(ordersRes.data || [])
      setDisputes(disputesRes.data || [])
      setPayouts(payoutsRes.data || [])
      setShipments(shipmentsRes.data || [])
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── DB guard — all mutations fail if DB is down ─────────────────────────
  const requireDb = useCallback(() => {
    if (dbAvailable === false) {
      return { ok: false, reason: 'Database is unavailable. Transaction data cannot be saved locally.' }
    }
    return { ok: true }
  }, [dbAvailable])

  // ── Order mutations (DB-only, no optimistic local fallback) ─────────────

  /** Insert a new order. Returns { data, error }. Fails if DB is down. */
  const createOrder = useCallback(async (orderData) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => insertOrder(client, orderData))
    if (error) {
      console.error('[useOrders] insertOrder failed:', error.message)
      return { data: null, error }
    }
    setOrders(prev => [data, ...prev])
    return { data, error: null }
  }, [withAuthRetry, requireDb])

  /** Update an existing order by id. Returns { data, error }. */
  const patchOrder = useCallback(async (orderId, updates) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => updateOrder(client, orderId, updates))
    if (error) {
      console.error('[useOrders] updateOrder failed:', error.message)
      return { data: null, error }
    }
    setOrders(prev => prev.map(o => o.id === orderId ? data : o))
    return { data, error: null }
  }, [withAuthRetry, requireDb])

  // ── Dispute mutations ────────────────────────────────────────────────────

  const createDispute = useCallback(async (disputeData) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => insertDispute(client, disputeData))
    if (error) {
      console.error('[useOrders] insertDispute failed:', error.message)
      return { data: null, error }
    }
    setDisputes(prev => [data, ...prev])
    return { data, error: null }
  }, [withAuthRetry, requireDb])

  const patchDispute = useCallback(async (disputeId, updates) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => updateDispute(client, disputeId, updates))
    if (error) {
      console.error('[useOrders] updateDispute failed:', error.message)
      return { data: null, error }
    }
    setDisputes(prev => prev.map(d => d.id === disputeId ? data : d))
    return { data, error: null }
  }, [withAuthRetry, requireDb])

  // ── Payout mutations ─────────────────────────────────────────────────────

  const createPayout = useCallback(async (payoutData) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => insertPayout(client, payoutData))
    if (error) {
      console.error('[useOrders] insertPayout failed:', error.message)
      return { data: null, error }
    }
    setPayouts(prev => [data, ...prev])
    return { data, error: null }
  }, [withAuthRetry, requireDb])

  const patchPayout = useCallback(async (payoutId, updates) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => updatePayout(client, payoutId, updates))
    if (error) {
      console.error('[useOrders] updatePayout failed:', error.message)
      return { data: null, error }
    }
    setPayouts(prev => prev.map(p => p.id === payoutId ? data : p))
    return { data, error: null }
  }, [withAuthRetry, requireDb])

  // ── Shipment mutations ───────────────────────────────────────────────────

  const createShipment = useCallback(async (shipmentData) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => insertShipment(client, shipmentData))
    if (error) {
      console.error('[useOrders] insertShipment failed:', error.message)
      return { data: null, error }
    }
    setShipments(prev => [data, ...prev])
    return { data, error: null }
  }, [withAuthRetry, requireDb])

  const patchShipment = useCallback(async (shipmentId, updates) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => updateShipment(client, shipmentId, updates))
    if (error) {
      console.error('[useOrders] updateShipment failed:', error.message)
      return { data: null, error }
    }
    setShipments(prev => prev.map(s => s.id === shipmentId ? data : s))
    return { data, error: null }
  }, [withAuthRetry, requireDb])

  const patchShipmentByOrderId = useCallback(async (orderId, updates) => {
    const shipment = shipments.find(s => s.orderId === orderId)
    if (!shipment) return { data: null, error: { message: 'Shipment not found for this order.' } }
    return patchShipment(shipment.id, updates)
  }, [shipments, patchShipment])

  // ── Refresh from DB ──────────────────────────────────────────────────────
  const refreshOrders = useCallback(async () => {
    if (!dbAvailable) return
    const { data } = await fetchAllOrders(supabase)
    if (data) setOrders(data)
  }, [supabase, dbAvailable])

  const refreshDisputes = useCallback(async () => {
    if (!dbAvailable) return
    const { data } = await fetchAllDisputes(supabase)
    if (data) setDisputes(data)
  }, [supabase, dbAvailable])

  const refreshShipments = useCallback(async () => {
    if (!dbAvailable) return
    const { data } = await fetchAllShipments(supabase)
    if (data) setShipments(data)
  }, [supabase, dbAvailable])

  return {
    orders,
    disputes,
    payouts,
    shipments,
    dbAvailable,
    dbError,
    // Setters exposed for AppContext backward compat — prefer DB mutations for new code
    setOrders,
    setDisputes,
    setShipments,
    // Order
    createOrder,
    patchOrder,
    // Dispute
    createDispute,
    patchDispute,
    // Payout
    createPayout,
    patchPayout,
    // Shipment
    createShipment,
    patchShipment,
    patchShipmentByOrderId,
    // Refresh
    refreshOrders,
    refreshDisputes,
    refreshShipments,
  }
}
