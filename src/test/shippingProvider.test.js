import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createShippingProvider } from '../lib/shippingProvider'
import { getTrackingUrl, mapMaltaPostStatus } from '../lib/maltapost'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: 'session-token' } } })),
    },
  },
}))

describe('shippingProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the Supabase Edge Function for shipment creation without MaltaPost API keys in frontend', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      success: true,
      provider: 'MaltaPost',
      shipment: {
        shipmentId: 'mp-1',
        trackingNumber: 'TRACK-1',
      },
    }), { status: 200 }))

    const provider = createShippingProvider({ accessToken: 'user-token', fetchImpl })
    const result = await provider.createShipment({ id: 'order-1' })

    expect(result.success).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toContain('/functions/v1/maltapost')
    expect(init.headers.Authorization).toBe('Bearer user-token')
    expect(init.body).toBe(JSON.stringify({ action: 'createShipment', orderId: 'order-1' }))
    expect(init.body).not.toContain('MALTAPOST_API_KEY')
  })

  it('supports provider actions for rates, tracking, and cancellation', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }))
    const provider = createShippingProvider({ accessToken: 'user-token', fetchImpl })

    await provider.getRates('order-1')
    await provider.trackShipment('TRACK-1')
    await provider.cancelShipment('mp-1')

    expect(fetchImpl.mock.calls.map(([, init]) => JSON.parse(init.body).action)).toEqual([
      'getRates',
      'trackShipment',
      'cancelShipment',
    ])
  })
})

describe('MaltaPost frontend helpers', () => {
  it('maps tracking statuses and creates public tracking URLs without secrets', () => {
    expect(mapMaltaPostStatus('IN_TRANSIT')).toBe('in_transit')
    expect(mapMaltaPostStatus('DELIVERED')).toBe('delivered')
    expect(getTrackingUrl('ABC 123')).toBe('https://www.maltapost.com/track/?id=ABC%20123')
  })
})
