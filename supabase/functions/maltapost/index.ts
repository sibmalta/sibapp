import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Json = Record<string, any>

class MaltaPostFunctionError extends Error {
  status: number
  code: string
  details?: Json

  constructor(message: string, status = 400, code = 'maltapost_error', details?: Json) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

function jsonResponse(body: Json, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getEnv(name: string, fallback?: string) {
  return Deno.env.get(name) || (fallback ? Deno.env.get(fallback) : undefined)
}

function getServiceClient() {
  const url = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    throw new MaltaPostFunctionError('Supabase service role environment variables are missing.', 500, 'missing_service_role_env')
  }
  return createClient(url, serviceRoleKey)
}

async function authenticateUser(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new MaltaPostFunctionError('Missing bearer token.', 401, 'missing_bearer_token')

  const url = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
  const anonKey = getEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY')
  if (!url || !anonKey) {
    throw new MaltaPostFunctionError('Supabase auth environment variables are missing.', 500, 'missing_supabase_auth_env')
  }

  const authClient = createClient(url, anonKey)
  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data?.user?.id) {
    console.error('[maltapost] auth failed', { message: error?.message || null })
    throw new MaltaPostFunctionError('Invalid or expired token.', 401, 'invalid_or_expired_token')
  }

  return data.user
}

function isOrderParticipant(order: Json, userId: string) {
  return order?.buyer_id === userId || order?.seller_id === userId
}

function mapMaltaPostStatus(status: string | null | undefined) {
  const map: Record<string, string> = {
    ACCEPTED: 'awaiting_shipment',
    CREATED: 'awaiting_shipment',
    READY_FOR_PICKUP: 'ready_for_pickup',
    COLLECTED: 'picked_up',
    PICKED_UP: 'picked_up',
    SHIPPED: 'shipped',
    IN_TRANSIT: 'in_transit',
    OUT_FOR_DELIVERY: 'in_transit',
    DELIVERED: 'delivered',
    DELIVERY_FAILED: 'failed',
    RETURNED_TO_SENDER: 'returned',
    HELD_AT_DEPOT: 'in_transit',
    CANCELLED: 'cancelled',
  }
  return map[String(status || '').toUpperCase()] || 'awaiting_shipment'
}

function normalizeShipmentResponse(data: Json, fallbackRef: string) {
  const shipmentId =
    data.shipmentId || data.shipment_id || data.consignmentId || data.consignment_id || data.id || null
  const barcode = data.barcode || data.maltapostBarcode || data.maltapost_barcode || null
  const trackingNumber =
    data.trackingNumber || data.tracking_number || data.tracking || barcode || shipmentId || null
  const labelUrl = data.labelUrl || data.label_url || data.label || null
  const rawStatus = data.status || data.trackingStatus || data.tracking_status || 'CREATED'

  return {
    shipmentId: shipmentId || `MP-${fallbackRef}`,
    barcode,
    trackingNumber,
    labelUrl,
    rawStatus,
    status: mapMaltaPostStatus(rawStatus),
    raw: data,
  }
}

function buildShipmentPayload(order: Json, shipment: Json | null) {
  const shippingAddress = typeof order.shipping_address === 'object' && order.shipping_address
    ? order.shipping_address
    : {}
  return {
    reference: order.order_ref || order.id,
    orderId: order.id,
    service: order.fulfilment_method === 'locker' ? 'LOCKER' : 'DELIVERY',
    fulfilmentProvider: order.fulfilment_provider || 'MaltaPost',
    fulfilmentMethod: order.fulfilment_method || 'delivery',
    fulfilmentPrice: order.fulfilment_price,
    sender: {
      name: order.seller_name,
      phone: order.seller_phone,
      address: order.seller_address,
    },
    recipient: {
      name: order.buyer_full_name,
      phone: order.buyer_phone,
      address: order.address || shippingAddress.raw || order.delivery_address_snapshot?.raw,
      city: order.buyer_city || shippingAddress.buyerCity,
      postcode: order.buyer_postcode || shippingAddress.buyerPostcode,
    },
    lockerLocation: order.locker_location || shipment?.locker_location || null,
    parcel: {
      size: shipment?.parcel_size || order.delivery_size || 'medium',
      weightGrams: shipment?.weight_grams || null,
      description: order.is_bundle ? 'Sib bundle order' : 'Sib marketplace order',
    },
  }
}

function createMockShipment(order: Json) {
  const ref = String(order.order_ref || order.id || Date.now()).replace(/[^A-Z0-9]/gi, '').toUpperCase()
  const trackingNumber = `MP${ref.slice(-10)}`
  return normalizeShipmentResponse({
    consignmentId: `MP-${ref}`,
    barcode: trackingNumber,
    trackingNumber,
    labelUrl: null,
    status: 'CREATED',
    mock: true,
  }, ref)
}

function createMockRates(order: Json) {
  return {
    provider: 'MaltaPost',
    rates: [
      { method: 'locker', label: 'MaltaPost Locker', price: 3.25, currency: 'EUR' },
      { method: 'delivery', label: 'MaltaPost Delivery', price: 4.50, currency: 'EUR' },
    ],
    selectedMethod: order.fulfilment_method || 'delivery',
    mock: true,
  }
}

function createMockTracking(trackingNumber: string) {
  return {
    trackingNumber,
    rawStatus: 'IN_TRANSIT',
    status: 'in_transit',
    events: [
      {
        timestamp: new Date().toISOString(),
        status: 'IN_TRANSIT',
        description: 'Mock MaltaPost tracking event',
      },
    ],
    mock: true,
  }
}

function createMaltaPostProvider() {
  const apiKey = Deno.env.get('MALTAPOST_API_KEY')
  const apiBaseUrl = Deno.env.get('MALTAPOST_API_BASE_URL') || 'https://api.maltapost.com/v1'
  const mockMode = Deno.env.get('MALTAPOST_MOCK') === 'true'

  async function request(path: string, init: RequestInit = {}) {
    if (!apiKey) {
      throw new MaltaPostFunctionError('MALTAPOST_API_KEY is not configured.', 500, 'missing_maltapost_api_key')
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(init.headers || {}),
      },
    })

    const text = await response.text()
    let data: Json = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { raw: text }
    }

    if (!response.ok) {
      console.error('[maltapost] API error', {
        status: response.status,
        path,
        response: data,
      })
      throw new MaltaPostFunctionError('MaltaPost API request failed.', 502, 'maltapost_api_error', {
        status: response.status,
        path,
        response: data,
      })
    }

    return data
  }

  return {
    async createShipment(order: Json, shipment: Json | null) {
      if (mockMode) return createMockShipment(order)
      const path = Deno.env.get('MALTAPOST_CREATE_SHIPMENT_PATH') || '/shipments'
      const data = await request(path, {
        method: 'POST',
        body: JSON.stringify(buildShipmentPayload(order, shipment)),
      })
      return normalizeShipmentResponse(data, order.order_ref || order.id)
    },

    async getRates(order: Json) {
      if (mockMode) return createMockRates(order)
      const path = Deno.env.get('MALTAPOST_RATES_PATH') || '/rates'
      return request(path, {
        method: 'POST',
        body: JSON.stringify(buildShipmentPayload(order, null)),
      })
    },

    async trackShipment(trackingNumber: string) {
      if (mockMode) return createMockTracking(trackingNumber)
      const template = Deno.env.get('MALTAPOST_TRACKING_PATH_TEMPLATE') || '/tracking/{trackingNumber}'
      const path = template.replace('{trackingNumber}', encodeURIComponent(trackingNumber))
      const data = await request(path)
      return {
        ...data,
        trackingNumber,
        rawStatus: data.status || data.rawStatus || null,
        status: mapMaltaPostStatus(data.status || data.rawStatus),
      }
    },

    async cancelShipment(shipmentId: string) {
      if (mockMode) {
        return { shipmentId, status: 'cancelled', rawStatus: 'CANCELLED', mock: true }
      }
      const template = Deno.env.get('MALTAPOST_CANCEL_PATH_TEMPLATE') || '/shipments/{shipmentId}/cancel'
      const path = template.replace('{shipmentId}', encodeURIComponent(shipmentId))
      const data = await request(path, { method: 'POST' })
      return {
        ...data,
        shipmentId,
        rawStatus: data.status || 'CANCELLED',
        status: mapMaltaPostStatus(data.status || 'CANCELLED'),
      }
    },
  }
}

async function loadOrderAndShipment(supabase: ReturnType<typeof createClient>, orderId: string) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()
  if (orderError || !order) {
    throw new MaltaPostFunctionError('Order not found.', 404, 'order_not_found', { orderId, dbMessage: orderError?.message || null })
  }

  const { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle()
  if (shipmentError) {
    throw new MaltaPostFunctionError('Shipment lookup failed.', 500, 'shipment_lookup_failed', { orderId, dbMessage: shipmentError.message })
  }

  return { order, shipment }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method !== 'POST') {
      throw new MaltaPostFunctionError('Method not allowed.', 405, 'method_not_allowed')
    }

    const user = await authenticateUser(req)
    const payload = await req.json().catch(() => ({}))
    const action = payload.action
    const supabase = getServiceClient()
    const provider = createMaltaPostProvider()

    console.log('[maltapost] action start', {
      action,
      userId: user.id,
      orderId: payload.orderId || null,
      trackingNumber: payload.trackingNumber || null,
      shipmentId: payload.shipmentId || null,
    })

    if (action === 'createShipment' || action === 'getRates') {
      if (!payload.orderId) throw new MaltaPostFunctionError('orderId is required.', 400, 'missing_order_id')
      const { order, shipment } = await loadOrderAndShipment(supabase, payload.orderId)
      if (!isOrderParticipant(order, user.id)) {
        throw new MaltaPostFunctionError('You cannot manage this shipment.', 403, 'forbidden')
      }

      if (action === 'getRates') {
        const rates = await provider.getRates(order)
        return jsonResponse({ success: true, provider: 'MaltaPost', ...rates })
      }

      if (shipment?.maltapost_consignment_id || shipment?.tracking_number) {
        return jsonResponse({
          success: true,
          provider: 'MaltaPost',
          alreadyCreated: true,
          shipment: {
            shipmentId: shipment.maltapost_consignment_id,
            trackingNumber: shipment.tracking_number,
            barcode: shipment.maltapost_barcode,
            labelUrl: shipment.maltapost_label_url,
            status: shipment.status,
          },
        })
      }

      const result = await provider.createShipment(order, shipment)
      const now = new Date().toISOString()
      const shipmentUpdates = {
        status: result.status,
        fulfilment_status: result.status,
        tracking_number: result.trackingNumber,
        maltapost_consignment_id: result.shipmentId,
        maltapost_barcode: result.barcode,
        maltapost_label_url: result.labelUrl,
        maltapost_raw_status: result.rawStatus,
        maltapost_last_sync: now,
        updated_at: now,
      }

      let savedShipment = shipment
      if (shipment?.id) {
        const { data, error } = await supabase
          .from('shipments')
          .update(shipmentUpdates)
          .eq('id', shipment.id)
          .select('*')
          .single()
        if (error) throw new MaltaPostFunctionError('Failed to update shipment.', 500, 'shipment_update_failed', { dbMessage: error.message })
        savedShipment = data
      } else {
        const { data, error } = await supabase
          .from('shipments')
          .insert({
            order_id: order.id,
            order_ref: order.order_ref,
            seller_id: order.seller_id,
            buyer_id: order.buyer_id,
            courier: 'MaltaPost',
            fulfilment_provider: 'MaltaPost',
            fulfilment_method: order.fulfilment_method,
            fulfilment_price: order.fulfilment_price,
            ...shipmentUpdates,
          })
          .select('*')
          .single()
        if (error) throw new MaltaPostFunctionError('Failed to create shipment.', 500, 'shipment_insert_failed', { dbMessage: error.message })
        savedShipment = data
      }

      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          tracking_number: result.trackingNumber,
          fulfilment_status: result.status,
          updated_at: now,
        })
        .eq('id', order.id)
      if (orderUpdateError) {
        console.error('[maltapost] order update failed after shipment create', {
          orderId: order.id,
          message: orderUpdateError.message,
        })
      }

      return jsonResponse({
        success: true,
        provider: 'MaltaPost',
        shipment: {
          shipmentId: result.shipmentId,
          trackingNumber: result.trackingNumber,
          barcode: result.barcode,
          labelUrl: result.labelUrl,
          status: result.status,
          rawStatus: result.rawStatus,
        },
        dbShipmentId: savedShipment?.id || null,
      })
    }

    if (action === 'trackShipment') {
      if (!payload.trackingNumber) throw new MaltaPostFunctionError('trackingNumber is required.', 400, 'missing_tracking_number')
      const result = await provider.trackShipment(payload.trackingNumber)
      return jsonResponse({ success: true, provider: 'MaltaPost', tracking: result })
    }

    if (action === 'cancelShipment') {
      if (!payload.shipmentId) throw new MaltaPostFunctionError('shipmentId is required.', 400, 'missing_shipment_id')
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select('*, orders!inner(id, buyer_id, seller_id)')
        .or(`id.eq.${payload.shipmentId},maltapost_consignment_id.eq.${payload.shipmentId}`)
        .maybeSingle()
      if (shipmentError || !shipment) {
        throw new MaltaPostFunctionError('Shipment not found.', 404, 'shipment_not_found', { dbMessage: shipmentError?.message || null })
      }
      if (!isOrderParticipant(shipment.orders, user.id)) {
        throw new MaltaPostFunctionError('You cannot cancel this shipment.', 403, 'forbidden')
      }

      const result = await provider.cancelShipment(shipment.maltapost_consignment_id || shipment.id)
      const now = new Date().toISOString()
      await supabase
        .from('shipments')
        .update({
          status: result.status || 'cancelled',
          fulfilment_status: result.status || 'cancelled',
          maltapost_raw_status: result.rawStatus || 'CANCELLED',
          maltapost_last_sync: now,
          updated_at: now,
        })
        .eq('id', shipment.id)

      return jsonResponse({ success: true, provider: 'MaltaPost', cancellation: result })
    }

    throw new MaltaPostFunctionError('Unsupported MaltaPost action.', 400, 'unsupported_action', { action })
  } catch (err) {
    const error = err instanceof MaltaPostFunctionError
      ? err
      : new MaltaPostFunctionError(err instanceof Error ? err.message : 'Unknown MaltaPost error.', 500, 'unexpected_error')

    console.error('[maltapost] action failed', {
      code: error.code,
      message: error.message,
      status: error.status,
      details: error.details || {},
    })

    return jsonResponse({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details || {},
    }, error.status)
  }
})
