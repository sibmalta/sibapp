import { supabase } from './supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function getOrderId(orderOrId) {
  return typeof orderOrId === 'string' ? orderOrId : orderOrId?.id
}

export function createShippingProvider({ accessToken, fetchImpl = fetch } = {}) {
  async function call(action, payload = {}) {
    const session = accessToken
      ? { access_token: accessToken }
      : (await supabase.auth.getSession())?.data?.session

    if (!session?.access_token) {
      return { success: false, error: 'You must be signed in to manage shipping.' }
    }

    const response = await fetchImpl(`${SUPABASE_URL}/functions/v1/maltapost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    })

    const text = await response.text()
    const data = text ? JSON.parse(text) : {}
    if (!response.ok) {
      console.error('[shippingProvider] backend request failed', {
        action,
        status: response.status,
        response: data,
      })
      return { success: false, error: data?.error || 'Shipping request failed.', details: data }
    }

    return data
  }

  return {
    createShipment(order) {
      return call('createShipment', { orderId: getOrderId(order) })
    },
    getRates(order) {
      return call('getRates', { orderId: getOrderId(order) })
    },
    trackShipment(trackingNumber) {
      return call('trackShipment', { trackingNumber })
    },
    cancelShipment(shipmentId) {
      return call('cancelShipment', { shipmentId })
    },
  }
}

export const shippingProvider = createShippingProvider()
