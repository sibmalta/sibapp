import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDeliveryNextStep, handleSupportRequest, runTool, TOOL_DEFINITIONS } from '../../api/ai/support.js'

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

function setupFetchMock({ order = orderRow(), orders, profileRows = [], logisticsRows = [], shipmentRows = [], failOrders = false, failOpenAi = false, openAiResponses = [] } = {}) {
  const orderRows = orders || (order ? [order] : [])
  const calls = []
  let openAiIndex = 0
  vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
    const href = String(url)
    calls.push({ url: href, init })

    if (href === 'https://api.openai.com/v1/responses') {
      if (failOpenAi) return jsonResponse({ error: { message: 'model unavailable' } }, 500)
      return jsonResponse(openAiResponses[openAiIndex++] || { output_text: 'Support answer.' })
    }

    if (href.endsWith('/auth/v1/user')) {
      return jsonResponse({ id: USER_ID })
    }

    if (href.includes('/rest/v1/orders')) {
      if (failOrders) return jsonResponse({ message: 'orders unavailable' }, 500)
      if (href.includes('or=(')) return jsonResponse(orderRows)
      const match = href.match(/id=eq\.([^&]+)/)
      if (match) {
        const id = decodeURIComponent(match[1])
        return jsonResponse(orderRows.filter(row => row.id === id))
      }
      return jsonResponse(orderRows)
    }

    if (href.includes('/rest/v1/support_escalations')) {
      return jsonResponse([{ id: 'esc-1', status: 'open', created_at: '2026-05-07T09:05:00.000Z' }])
    }

    if (href.includes('/rest/v1/profiles')) return jsonResponse(profileRows)
    if (href.includes('/rest/v1/shipments')) return jsonResponse(shipmentRows)
    if (href.includes('/rest/v1/logistics_delivery_sheet')) return jsonResponse(logisticsRows)
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

  it('answers where is my order directly when the user has one active order', async () => {
    setupFetchMock({
      orders: [orderRow({
        id: ORDER_ID,
        order_ref: 'SIB-ONE',
        listing_title: 'Blue jacket',
        status: 'paid',
        tracking_status: 'awaiting_delivery',
      })],
      logisticsRows: [{ delivery_status: 'dropped_off', dropoff_store_name: 'MYConvenience Sliema' }],
    })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: "Where's my order?",
      context: 'General support',
    })

    expect(result.answer).toContain('SIB-ONE')
    expect(result.answer).toContain('Blue jacket')
    expect(result.answer).toContain('Delivery status: Dropped Off')
    expect(result.usedTools).toEqual(['getUserOrders', 'getLogisticsStatus'])
  })

  it('answers where is my delivery with no orders using helpful recovery guidance', async () => {
    setupFetchMock({ orders: [] })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: 'Where is my delivery?',
      context: 'General support',
    })

    expect(result.answer).toContain("I can help, but I can't see any orders on this account yet.")
    expect(result.answer).toContain('send the item name or seller name')
    expect(result.answer).not.toContain('trouble checking')
    expect(result.answer).not.toContain('I could not reach Sib Support AI')
  })

  it('treats a delayed purchase as an order delivery question', async () => {
    setupFetchMock({
      orders: [orderRow({
        id: ORDER_ID,
        order_ref: 'SIB-DRESS',
        listing_title: 'Summer dress',
        status: 'paid',
        tracking_status: 'awaiting_delivery',
      })],
    })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: "I bought a dress but it hasn't arrived",
      context: 'General support',
    })

    expect(result.answer).toContain('Summer dress')
    expect(result.answer).toContain('SIB-DRESS')
    expect(result.answer).toContain('Next step')
    expect(result.usedTools).toEqual(['getUserOrders', 'getLogisticsStatus'])
  })

  it('asks which order the user means when multiple recent orders match', async () => {
    setupFetchMock({
      orders: [
        orderRow({ id: ORDER_ID, order_ref: 'SIB-FIRST', listing_title: 'Blue jacket', status: 'paid' }),
        orderRow({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', order_ref: 'SIB-SECOND', listing_title: 'Black boots', status: 'shipped' }),
      ],
    })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: 'Where is my order?',
      context: 'General support',
    })

    expect(result.answer).toContain('Which one do you mean?')
    expect(result.answer).toContain('SIB-FIRST - Blue jacket')
    expect(result.answer).toContain('SIB-SECOND - Black boots')
    expect(result.answer).not.toContain('I could not reach Sib Support AI')
    expect(result.usedTools).toEqual(['getUserOrders', 'getLogisticsStatus'])
  })

  it('gives order status when one order has no logistics rows', async () => {
    setupFetchMock({
      orders: [orderRow({
        id: ORDER_ID,
        order_ref: 'SIB-NO-LOGISTICS',
        listing_title: '',
        status: 'paid',
        tracking_status: null,
        fulfilment_status: null,
      })],
      logisticsRows: [],
      shipmentRows: [],
    })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: 'When will delivery be?',
      context: 'General support',
    })

    expect(result.answer).toContain('SIB-NO-LOGISTICS')
    expect(result.answer).toContain('your item')
    expect(result.answer).toContain('Live delivery tracking is not available yet')
    expect(result.answer).toContain('order is still on your account')
    expect(result.answer).not.toContain('trouble checking')
    expect(result.answer).not.toContain('I could not reach Sib Support AI')
  })

  it('returns a friendly empty state when the user has no orders', async () => {
    setupFetchMock({ orders: [] })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: "Where's my order?",
      context: 'General support',
    })

    expect(result.answer).toContain("I can help, but I can't see any orders on this account yet.")
    expect(result.answer).toContain('another account')
    expect(result.answer).toContain('seller name')
    expect(result.usedTools).toEqual(['getUserOrders'])
  })

  it('returns a proper escalation message when order lookup fails', async () => {
    setupFetchMock({ failOrders: true })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: "Where's my order?",
      context: 'General support',
    })

    expect(result.answer).toContain("I'm having trouble checking live order details right now")
    expect(result.answer).toContain('send this to Sib support')
    expect(result.usedTools).toEqual(['getUserOrders'])
  })

  it('maps delivery statuses to plain-English next steps', () => {
    expect(getDeliveryNextStep('awaiting_pickup')).toBe('The seller still needs to drop off or hand over the item.')
    expect(getDeliveryNextStep('dropped_off')).toBe('The item has been dropped off and is waiting for courier pickup.')
    expect(getDeliveryNextStep('collected')).toBe('The courier has collected the item.')
    expect(getDeliveryNextStep('out_for_delivery')).toBe('The courier is delivering it.')
    expect(getDeliveryNextStep('delivered')).toBe('This order is marked as delivered.')
    expect(getDeliveryNextStep('paid')).toBe('The order is paid and waiting to enter the delivery flow.')
    expect(getDeliveryNextStep('')).toBe('Live delivery tracking is not available yet, but the order is still on your account.')
  })

  it('gives no-completed-sales payout guidance without sounding broken', async () => {
    setupFetchMock({
      orders: [orderRow({
        id: ORDER_ID,
        buyer_id: OTHER_ID,
        seller_id: USER_ID,
        order_ref: 'SIB-PAYOUT-NOT-READY',
        listing_title: 'Green jumper',
        status: 'paid',
        payout_status: null,
        seller_payout_status: null,
      })],
    })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: 'When will I get paid?',
      context: 'General support',
    })

    expect(result.answer).toContain('You do not have any completed sales ready for payout yet.')
    expect(result.answer).toContain('Payouts are normally released after delivery is confirmed')
    expect(result.answer).not.toContain('trouble checking')
    expect(result.answer).not.toContain('I could not reach Sib Support AI')
  })

  it('explains payout pending for delivered seller sales', async () => {
    setupFetchMock({
      orders: [orderRow({
        id: ORDER_ID,
        buyer_id: OTHER_ID,
        seller_id: USER_ID,
        order_ref: 'SIB-PAYOUT-PENDING',
        listing_title: 'Silver dress',
        status: 'delivered',
        delivered_at: '2026-05-07T10:00:00.000Z',
        payout_status: 'pending',
      })],
    })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: 'Where is my payout?',
      context: 'General support',
    })

    expect(result.answer).toContain('Your payout is currently processing.')
    expect(result.answer).toContain('Silver dress')
    expect(result.answer).toContain('Delivery confirmation is recorded')
    expect(result.answer).toContain('Buyer protection may temporarily delay payout release')
    expect(result.answer).not.toContain('trouble checking')
  })

  it('explains incomplete payout onboarding', async () => {
    setupFetchMock({
      profileRows: [{ id: USER_ID, stripe_onboarding_complete: false, payouts_enabled: false, charges_enabled: true }],
      orders: [orderRow({
        id: ORDER_ID,
        buyer_id: OTHER_ID,
        seller_id: USER_ID,
        order_ref: 'SIB-PAYOUT-SETUP',
        listing_title: 'Brown boots',
        status: 'delivered',
        delivered_at: '2026-05-07T10:00:00.000Z',
        payout_status: 'pending',
      })],
    })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: 'When do payouts arrive?',
      context: 'General support',
    })

    expect(result.answer).toContain('To receive payouts, you still need to complete your payout verification setup.')
    expect(result.answer).toContain('Stripe verification')
    expect(result.answer).not.toContain('trouble checking')
  })

  it('explains payout account restrictions when setup is complete but payouts are disabled', async () => {
    setupFetchMock({
      profileRows: [{ id: USER_ID, stripe_onboarding_complete: true, payouts_enabled: false, charges_enabled: true }],
      orders: [orderRow({
        id: ORDER_ID,
        buyer_id: OTHER_ID,
        seller_id: USER_ID,
        order_ref: 'SIB-PAYOUT-ATTENTION',
        listing_title: 'Black bag',
        status: 'delivered',
        delivered_at: '2026-05-07T10:00:00.000Z',
        payout_status: 'pending',
      })],
    })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: "Why haven't I been paid?",
      context: 'General support',
    })

    expect(result.answer).toContain('Your payout account needs attention before payouts can be sent.')
    expect(result.answer).not.toContain('trouble checking')
  })

  it('gives no-payout-activity guidance when the seller has no seller orders', async () => {
    setupFetchMock({ orders: [] })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: 'seller payment',
      context: 'General support',
    })

    expect(result.answer).toContain('I cannot see any payout activity yet on this account.')
    expect(result.answer).toContain('Bank transfers can take several business days')
    expect(result.answer).not.toContain('trouble checking')
  })

  it('uses technical payout failure wording only when the order lookup errors', async () => {
    setupFetchMock({ failOrders: true })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: 'payout pending',
      context: 'General support',
    })

    expect(result.answer).toContain("I'm having trouble checking payout details right now")
    expect(result.answer).toContain('send this to Sib support')
  })

  it('never refunds automatically and recommends human support for refund requests', async () => {
    const calls = setupFetchMock({
      orders: [orderRow({ id: ORDER_ID, order_ref: 'SIB-REFUND', listing_title: 'Red bag', status: 'paid' })],
    })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: 'I want a refund',
      context: 'General support',
    })

    expect(result.answer).toContain('Refunds are always reviewed')
    expect(result.answer).toContain('I can connect you with Sib support for this issue.')
    expect(result.usedTools).toEqual(['getUserOrders'])
    expect(calls.some(call => call.url.includes('/rest/v1/support_escalations'))).toBe(false)
    expect(calls.some(call => call.url.includes('create-refund'))).toBe(false)
  })

  it('still returns a deterministic order reply when OpenAI fails', async () => {
    setupFetchMock({
      failOpenAi: true,
      orders: [orderRow({ id: ORDER_ID, order_ref: 'SIB-NO-AI', listing_title: 'Green coat', status: 'shipped' })],
    })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: 'Where is my package?',
      context: 'General support',
    })

    expect(result.answer).toContain('SIB-NO-AI')
    expect(result.answer).toContain('Green coat')
    expect(result.answer).not.toContain('I could not reach Sib Support AI')
  })

  it('responds warmly to a generic greeting when OpenAI fails', async () => {
    setupFetchMock({ failOpenAi: true })

    const result = await handleSupportRequest({
      accessToken: 'user-token',
      message: 'Hello',
      context: 'General support',
    })

    expect(result.answer).toContain("Hi, I'm Sib Support")
    expect(result.answer).toContain('order, delivery, payout, refund, or dispute')
    expect(result.answer).not.toContain('I could not reach Sib Support AI')
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
