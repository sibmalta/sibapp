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

export function useOrders() {
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

  const createOrder = useCallback(async (orderData) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => insertOrder(client, orderData))
    if (error) {
      console.error('[useOrders] insertOrder failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    setOrders(prev => [data, ...prev])
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk])

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
  }, [withAuthRetry, requireDb, markDbOk])

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

    const { data, error } = await withAuthRetry((client) => insertDisputeMessage(client, message))
    if (error) {
      console.error('[useOrders] insertDisputeMessage failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    setDisputeMessages(prev => [...prev, data])
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk])

  const createPayout = useCallback(async (payoutData) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => insertPayout(client, payoutData))
    if (error) {
      console.error('[useOrders] insertPayout failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    setPayouts(prev => [data, ...prev])
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk])

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

    const { data, error } = await withAuthRetry((client) => insertShipment(client, shipmentData))
    if (error) {
      console.error('[useOrders] insertShipment failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    setShipments(prev => [data, ...prev])
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk])

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
    if (dbAvailable === false) return
    setOrdersLoading(true)
    const { data, error } = await fetchAllOrders(supabase)
    if (error) {
      console.error('[useOrders] fetchAllOrders failed:', error.message)
      setDbAvailable(false)
      setDbError(error.message || 'Database connection failed')
    } else {
      markDbOk()
      setOrders(data || [])
    }
    setOrdersLoading(false)
  }, [supabase, dbAvailable, markDbOk])

  const refreshDisputes = useCallback(async () => {
    if (dbAvailable === false) return
    setDisputesLoading(true)
    const { data, error } = await fetchAllDisputes(supabase)
    if (error) {
      console.error('[useOrders] fetchAllDisputes failed:', error.message)
    } else {
      markDbOk()
      setDisputes(data || [])
    }
    setDisputesLoading(false)
  }, [supabase, dbAvailable, markDbOk])

  const refreshDisputeMessages = useCallback(async () => {
    if (dbAvailable === false) return
    setDisputeMessagesLoading(true)
    const { data, error } = await fetchDisputeMessages(supabase)
    if (error) {
      console.error('[useOrders] fetchDisputeMessages failed:', error.message)
    } else {
      markDbOk()
      setDisputeMessages(data || [])
    }
    setDisputeMessagesLoading(false)
  }, [supabase, dbAvailable, markDbOk])

  const createDisputeCase = useCallback(async (payload) => {
    const check = requireDb()
    if (!check.ok) return { data: null, error: { message: check.reason } }

    const { data, error } = await withAuthRetry((client) => openDisputeCase(client, payload))
    if (error) {
      console.error('[useOrders] openDisputeCase failed:', error.message)
      return { data: null, error }
    }
    markDbOk()
    await refreshDisputes()
    await refreshDisputeMessages()
    return { data, error: null }
  }, [withAuthRetry, requireDb, markDbOk, refreshDisputes, refreshDisputeMessages])

  const refreshPayouts = useCallback(async () => {
    if (dbAvailable === false) return
    setPayoutsLoading(true)
    const { data, error } = await fetchAllPayouts(supabase)
    if (error) {
      console.error('[useOrders] fetchAllPayouts failed:', error.message)
    } else {
      markDbOk()
      setPayouts(data || [])
    }
    setPayoutsLoading(false)
  }, [supabase, dbAvailable, markDbOk])

  const refreshShipments = useCallback(async () => {
    if (dbAvailable === false) return
    setShipmentsLoading(true)
    const { data, error } = await fetchAllShipments(supabase)
    if (error) {
      console.error('[useOrders] fetchAllShipments failed:', error.message)
    } else {
      markDbOk()
      setShipments(data || [])
    }
    setShipmentsLoading(false)
  }, [supabase, dbAvailable, markDbOk])

  const refreshLogisticsDeliverySheet = useCallback(async () => {
    if (dbAvailable === false) return
    setLogisticsDeliverySheetLoading(true)
    const { data, error } = await fetchLogisticsDeliverySheet(supabase)
    if (error) {
      console.error('[useOrders] fetchLogisticsDeliverySheet failed:', error.message)
    } else {
      markDbOk()
      setLogisticsDeliverySheet(data || [])
    }
    setLogisticsDeliverySheetLoading(false)
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
