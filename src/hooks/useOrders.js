/**
 * useOrders - Supabase-only hook for orders, disputes, payouts, shipments,
 * and the MVP logistics delivery sheet.
 *
 * Admin/order tables are intentionally lazy-loaded. Marketplace pages should
 * not pay for heavy admin queries during initial app boot.
 */
import { useState, useCallback } from 'react'
import { useSupabase } from '../lib/useSupabase'
import {
  fetchAllOrders, insertOrder, updateOrder,
  fetchAllDisputes, insertDispute, updateDispute,
  fetchAllPayouts, insertPayout, updatePayout,
  fetchAllShipments, insertShipment, updateShipment,
  fetchLogisticsDeliverySheet, upsertLogisticsDeliverySheetRow,
  insertDropoffScanLog,
} from '../lib/db/orders'
import {
  fetchDisputeMessages,
  insertDisputeMessage,
  openDisputeCase,
} from '../lib/disputes'
import { requireVerifiedEmail } from '../lib/emailVerification'

const ORDERS_FETCH_TIMEOUT_MS = 8000
const AUTH_LOOKUP_TIMEOUT_MS = 3000

function withTimeout(promise, timeoutMs, label) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

export function useOrders(currentUser = null) {
  const { supabase, withAuthRetry } = useSupabase()

  const [orders, setOrders] = useState([])
  const [disputes, setDisputes] = useState([])
  const [disputeMessages, setDisputeMessages] = useState([])
  const [payouts, setPayouts] = useState([])
  const [shipments, setShipments] = useState([])
  const [logisticsDeliverySheet, setLogisticsDeliverySheet] = useState([])
  const [dbAvailable, setDbAvailable] = useState(null)
  const [dbError, setDbError] = useState(null)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [disputesLoading, setDisputesLoading] = useState(false)
  const [disputeMessagesLoading, setDisputeMessagesLoading] = useState(false)
  const [payoutsLoading, setPayoutsLoading] = useState(false)
  const [shipmentsLoading, setShipmentsLoading] = useState(false)
  const [logisticsDeliverySheetLoading, setLogisticsDeliverySheetLoading] = useState(false)

  const markDbOk = useCallback(() => {
    setDbAvailable(true)
    setDbError(null)
  }, [])

  const requireDb = useCallback(() => {
    if (dbAvailable === false) {
      return { ok: false, reason: 'Database is unavailable. Transaction data cannot be saved locally.' }
    }
    return { ok: true }
  }, [dbAvailable])

  const requireVerifiedWrite = useCallback(() => {
    const gate = requireVerifiedEmail(currentUser)
    if (!gate.ok) return { ok: false, reason: gate.error }
    return { ok: true }
  }, [currentUser])

  const createOrder = useCallback(async (orderData) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }
    const verified = requireVerifiedWrite()
    if (!verified.ok) return { data: null, error: { message: verified.reason } }

    const { data, error } = await withAuthRetry((client) => insertOrder(client, orderData))
    if (error) {
      console.error('[useOrders] insertOrder failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    setOrders(prev => [data, ...prev])
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk, requireVerifiedWrite])

  const patchOrder = useCallback(async (orderId, updates) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => updateOrder(client, orderId, updates))
    if (error) {
      console.error('[useOrders] updateOrder failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    setOrders(prev => prev.map(o => o.id === orderId ? data : o))
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk])

  const createDispute = useCallback(async (disputeData) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }
    const verified = requireVerifiedWrite()
    if (!verified.ok) return { data: null, error: { message: verified.reason } }

    const { data, error, status, statusText } = await withAuthRetry((client) => insertDispute(client, disputeData))
    if (error) {
      console.error('[useOrders] insertDispute failed:', { error, status, statusText })
      return { data: null, error, status, statusText }
    }
    if (!data) {
      const missingRowError = { message: 'Dispute insert returned no row.' }
      console.error('[useOrders] insertDispute failed:', { error: missingRowError, status, statusText })
      return { data: null, error: missingRowError, status, statusText }
    }
    markDbOk()
    setDisputes(prev => [data, ...prev])
    return { data, error: null, status, statusText }
  }, [withAuthRetry, requireDb, markDbOk, requireVerifiedWrite])

  const patchDispute = useCallback(async (disputeId, updates) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => updateDispute(client, disputeId, updates))
    if (error) {
      console.error('[useOrders] updateDispute failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    setDisputes(prev => prev.map(d => d.id === disputeId ? data : d))
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk])

  const createDisputeMessage = useCallback(async (message) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }
    const verified = requireVerifiedWrite()
    if (!verified.ok) return { data: null, error: { message: verified.reason } }

    const { data, error } = await withAuthRetry((client) => insertDisputeMessage(client, message))
    if (error) {
      console.error('[useOrders] insertDisputeMessage failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    setDisputeMessages(prev => [...prev, data])
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk, requireVerifiedWrite])

  const createPayout = useCallback(async (payoutData) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }
    const verified = requireVerifiedWrite()
    if (!verified.ok) return { data: null, error: { message: verified.reason } }

    const { data, error } = await withAuthRetry((client) => insertPayout(client, payoutData))
    if (error) {
      console.error('[useOrders] insertPayout failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    setPayouts(prev => [data, ...prev])
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk, requireVerifiedWrite])

  const patchPayout = useCallback(async (payoutId, updates) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => updatePayout(client, payoutId, updates))
    if (error) {
      console.error('[useOrders] updatePayout failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    setPayouts(prev => prev.map(p => p.id === payoutId ? data : p))
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk])

  const createShipment = useCallback(async (shipmentData) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }
    const verified = requireVerifiedWrite()
    if (!verified.ok) return { data: null, error: { message: verified.reason } }

    const { data, error } = await withAuthRetry((client) => insertShipment(client, shipmentData))
    if (error) {
      console.error('[useOrders] insertShipment failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    setShipments(prev => [data, ...prev])
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk, requireVerifiedWrite])

  const patchShipment = useCallback(async (shipmentId, updates) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => updateShipment(client, shipmentId, updates))
    if (error) {
      console.error('[useOrders] updateShipment failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    setShipments(prev => prev.map(s => s.id === shipmentId ? data : s))
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk])

  const patchShipmentByOrderId = useCallback(async (orderId, updates) => {
    const shipment = shipments.find(s => s.orderId === orderId)
    if (!shipment) return { data: null, error: { message: 'Shipment not found for this order.' } }
    return patchShipment(shipment.id, updates)
  }, [shipments, patchShipment])

  const upsertDeliverySheetRow = useCallback(async (row) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => upsertLogisticsDeliverySheetRow(client, row))
    if (error) {
      console.error('[useOrders] upsertLogisticsDeliverySheetRow failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    setLogisticsDeliverySheet(prev => {
      const existingIndex = prev.findIndex(item => item.shipmentId === data.shipmentId)
      if (existingIndex === -1) return [data, ...prev]
      return prev.map((item, index) => index === existingIndex ? data : item)
    })
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk])

  const createDropoffScanLog = useCallback(async (scan) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => insertDropoffScanLog(client, scan))
    if (error) {
      console.error('[useOrders] insertDropoffScanLog failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk])

  const refreshOrders = useCallback(async () => {
    if (dbAvailable === false) {
      console.info('orders_loading_false', { reason: 'db_unavailable' })
      setOrdersLoading(false)
      return
    }
    setOrdersLoading(true)
    const startedAt = Date.now()
    let authUserId = null
    try {
      const { data: authData } = await withTimeout(supabase.auth.getUser(), AUTH_LOOKUP_TIMEOUT_MS, 'orders auth lookup')
      authUserId = authData?.user?.id || null
    } catch (authError) {
      console.warn('[useOrders] auth user lookup failed before orders fetch:', authError?.message)
    }
    console.info('orders_load_start', { authUserId })
    console.info('[useOrders] orders fetch start', { authUserId })

    try {
      const { data, error } = await withTimeout(fetchAllOrders(supabase), ORDERS_FETCH_TIMEOUT_MS, 'orders fetch')
      if (error) {
        console.error('orders_load_error', {
          authUserId,
          message: error.message,
          code: error.code,
          status: error.status,
          statusText: error.statusText,
        })
        console.error('[useOrders] fetchAllOrders failed:', {
          authUserId,
          message: error.message,
          code: error.code,
          status: error.status,
          statusText: error.statusText,
        })
        setDbAvailable(false)
        setDbError(error.message || 'Database connection failed')
        return
      }
      markDbOk()
      const nextOrders = data || []
      setOrders(nextOrders)
      console.info('orders_load_success', {
        authUserId,
        totalOrders: nextOrders.length,
        durationMs: Date.now() - startedAt,
      })
      console.info('[useOrders] orders fetch end', {
        authUserId,
        profileId: authUserId,
        buyerOrders: authUserId ? nextOrders.filter(order => order.buyerId === authUserId).length : 0,
        sellerOrders: authUserId ? nextOrders.filter(order => order.sellerId === authUserId).length : 0,
        totalOrders: nextOrders.length,
        durationMs: Date.now() - startedAt,
      })
    } catch (error) {
      const isTimeout = /timed out/i.test(error.message || '')
      console.error(isTimeout ? 'orders_load_timeout' : 'orders_load_error', {
        authUserId,
        message: error.message,
      })
      console.error('[useOrders] fetchAllOrders failed:', {
        authUserId,
        message: error.message,
        kind: isTimeout ? 'timeout' : 'exception',
      })
      setDbAvailable(false)
      setDbError(isTimeout ? 'Orders request timed out' : (error.message || 'Database connection failed'))
    } finally {
      console.info('orders_loading_false', {
        authUserId,
        durationMs: Date.now() - startedAt,
      })
      setOrdersLoading(false)
    }
  }, [supabase, dbAvailable, markDbOk])

  const refreshDisputes = useCallback(async () => {
    if (dbAvailable === false) return
    setDisputesLoading(true)
    try {
      const { data, error } = await fetchAllDisputes(supabase)
      if (error) {
        console.error('[useOrders] fetchAllDisputes failed:', error.message)
      } else {
        markDbOk()
        setDisputes(data || [])
      }
    } finally {
      setDisputesLoading(false)
    }
  }, [supabase, dbAvailable, markDbOk])

  const refreshDisputeMessages = useCallback(async () => {
    if (dbAvailable === false) return
    setDisputeMessagesLoading(true)
    try {
      const { data, error } = await fetchDisputeMessages(supabase)
      if (error) {
        console.error('[useOrders] fetchDisputeMessages failed:', error.message)
      } else {
        markDbOk()
        setDisputeMessages(data || [])
      }
    } finally {
      setDisputeMessagesLoading(false)
    }
  }, [supabase, dbAvailable, markDbOk])

  const createDisputeCase = useCallback(async (payload) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }
    const verified = requireVerifiedWrite()
    if (!verified.ok) return { data: null, error: { message: verified.reason } }

    const { data, error } = await withAuthRetry((client) => openDisputeCase(client, payload))
    if (error) {
      console.error('[useOrders] openDisputeCase failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    await refreshDisputes()
    await refreshDisputeMessages()
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk, refreshDisputes, refreshDisputeMessages, requireVerifiedWrite])

  const refreshPayouts = useCallback(async () => {
    if (dbAvailable === false) return
    setPayoutsLoading(true)
    try {
      const { data, error } = await fetchAllPayouts(supabase)
      if (error) {
        console.error('[useOrders] fetchAllPayouts failed:', error.message)
      } else {
        markDbOk()
        setPayouts(data || [])
      }
    } finally {
      setPayoutsLoading(false)
    }
  }, [supabase, dbAvailable, markDbOk])

  const refreshShipments = useCallback(async () => {
    if (dbAvailable === false) return
    setShipmentsLoading(true)
    try {
      const { data, error } = await fetchAllShipments(supabase)
      if (error) {
        console.error('[useOrders] fetchAllShipments failed:', error.message)
      } else {
        markDbOk()
        setShipments(data || [])
      }
    } finally {
      setShipmentsLoading(false)
    }
  }, [supabase, dbAvailable, markDbOk])

  const refreshLogisticsDeliverySheet = useCallback(async () => {
    if (dbAvailable === false) return
    setLogisticsDeliverySheetLoading(true)
    try {
      const { data, error } = await fetchLogisticsDeliverySheet(supabase)
      if (error) {
        console.error('[useOrders] fetchLogisticsDeliverySheet failed:', error.message)
      } else {
        markDbOk()
        setLogisticsDeliverySheet(data || [])
      }
    } finally {
      setLogisticsDeliverySheetLoading(false)
    }
  }, [supabase, dbAvailable, markDbOk])

  return {
    orders,
    disputes,
    disputeMessages,
    payouts,
    shipments,
    logisticsDeliverySheet,
    dbAvailable,
    dbError,
    ordersLoading,
    disputesLoading,
    disputeMessagesLoading,
    payoutsLoading,
    shipmentsLoading,
    logisticsDeliverySheetLoading,
    setOrders,
    setDisputes,
    setShipments,
    createOrder,
    patchOrder,
    createDispute,
    patchDispute,
    createDisputeCase,
    createDisputeMessage,
    createPayout,
    patchPayout,
    createShipment,
    patchShipment,
    patchShipmentByOrderId,
    upsertDeliverySheetRow,
    createDropoffScanLog,
    refreshOrders,
    refreshDisputes,
    refreshDisputeMessages,
    refreshPayouts,
    refreshShipments,
    refreshLogisticsDeliverySheet,
  }
}
