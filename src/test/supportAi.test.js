import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSupportRequest, runTool, TOOL_DEFINITIONS } from '../../api/ai/support.js'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const BUYER_ID = USER_ID
const SELLER_ID = '22222222-2222-4222-8222-222222222222'
const OTHER_ID = '33333333-3333-4333-8333-333333333333'
const ORDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function orderRow(overrides = {}) {
  return {
    id: ORDER_ID,
    order_ref: 'SIB-AI-TEST',
    buyer_id: BUYER_ID,
    seller_id: SELLER_ID,
    listing_title: 'Test parcel',
    status: 'paid',
    tracking_status: 'awaiting_delivery',
    fulfilment_status: 'awaiting_dropoff',
    payment_status: 'paid',
    payout_status: 'held',
    total_price: 18.9,
    created_at: '2026-05-07T09:00:00.000Z',
    ...overrides,
  }
}

function setupEnv() {
  vi.stubEnv('SUPABASE_URL', 'https://supabase.test')
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key')
  vi.stubEnv('OPENAI_API_KEY', 'openai-key')
}

function setupFetchMock({ order = orderRow(), openAiResponses = [] } = {}) {
  const calls = []
  let openAiIndex = 0
  vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
    const href = String(url)
    calls.push({ url: href, init })

    if (href === 'https://api.openai.com/v1/responses') {
      return jsonResponse(openAiResponses[openAiIndex++] || { output_text: 'Support answer.' })
    }

    if (href.endsWith('/auth/v1/user')) {
      return jsonResponse({ id: USER_ID })
    }

    if (href.includes('/rest/v1/orders')) {
      return jsonResponse(order ? [order] : [])
    }

    if (href.includes('/rest/v1/support_escalations')) {
      return jsonResponse([{ id: 'esc-1', status: 'open', created_at: '2026-05-07T09:05:00.000Z' }])
    }

    if (href.includes('/rest/v1/profiles')) return jsonResponse([])
    if (href.includes('/rest/v1/shipments')) return jsonResponse([])
    if (href.includes('/rest/v1/logistics_delivery_sheet')) return jsonResponse([])
    if (href.includes('/rest/v1/disputes')) return jsonResponse([])
    if (href.includes('/rest/v1/dispute_messages')) return jsonResponse([])

    throw new Error(`Unexpected fetch: ${href}`)
  }))
  return calls
}

beforeEach(() => {
  setupEnv()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Sib Support AI tools', () => {
  it('does not expose financial or admin mutation tools', () => {
    expect(TOOL_DEFINITIONS.map(tool => tool.name)).toEqual([
      'getCurrentUserProfile',
      'getUserOrders',
      'getOrderStatus',
      'getLogisticsStatus',
      'getDisputeStatus',
      'createSupportEscalation',
    ])
    expect(TOOL_DEFINITIONS.map(tool => tool.name).join(' ')).not.toMatch(/refund|release|close|cancel|changeOrderStatus/i)
  })

  it('lets the assistant explain an authenticated user order', async () => {
    setupFetchMock({
      openAiResponses: [
        {
          output: [{
            type: 'function_call',
            name: 'getOrderStatus',
            call_id: 'call-order-status',
            arguments: JSON.stringify({ orderId: ORDER_ID }),
          }],
        },
        { output_text: 'Your order is paid and waiting for drop-off confirmation.' },
      ],
    })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: 'What is happening with my order?',
      orderId: ORDER_ID,
      context: 'Order support',
    })

    expect(result.answer).toContain('waiting for drop-off')
    expect(result.usedTools).toEqual(['getOrderStatus'])
  })

  it('blocks access to another user order at the tool boundary', async () => {
    setupFetchMock({
      order: orderRow({ buyer_id: OTHER_ID, seller_id: '44444444-4444-4444-8444-444444444444' }),
    })

    await expect(runTool('getOrderStatus', { orderId: ORDER_ID }, USER_ID))
      .resolves.toEqual({ error: 'Order not found for this user.' })
  })

  it('does not expose seller payout amounts to buyers', async () => {
    setupFetchMock({
      order: orderRow({
        seller_payout_amount: 13,
        platform_fee_amount: 1.4,
        payout_status: 'held',
        seller_payout_status: 'pending',
      }),
    })

    const result = await runTool('getOrderStatus', { orderId: ORDER_ID }, USER_ID)

    expect(result.role).toBe('buyer')
    expect(result.sellerPayoutAmount).toBeUndefined()
    expect(result.platformFeeAmount).toBeUndefined()
    expect(result.payoutStatus).toBeUndefined()
    expect(result.sellerPayoutStatus).toBeUndefined()
  })

  it('escalates financial/admin requests instead of mutating orders', async () => {
    const calls = setupFetchMock({
      openAiResponses: [
        {
          output: [{
            type: 'function_call',
            name: 'createSupportEscalation',
            call_id: 'call-escalate',
            arguments: JSON.stringify({
              orderId: ORDER_ID,
              reason: 'User requested a buyer refund.',
            }),
          }],
        },
        { output_text: 'I have escalated this to Sib Support for human review.' },
      ],
    })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: 'Refund this buyer now.',
      orderId: ORDER_ID,
      context: 'Order support',
    })

    expect(result.answer).toContain('escalated')
    expect(result.usedTools).toEqual(['createSupportEscalation'])
    expect(calls.some(call => call.url.includes('/rest/v1/support_escalations') && call.init.method === 'POST')).toBe(true)
    expect(calls.some(call => call.url.includes('/rest/v1/orders') && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(call.init.method))).toBe(false)
  })
})
