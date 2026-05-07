const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = process.env.OPENAI_SUPPORT_MODEL || 'gpt-4.1-mini'

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
}

function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
}

function getSupabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
}

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const match = String(header).match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

async function supabaseFetch(path, { method = 'GET', token, body, serviceRole = false } = {}) {
  const url = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  const serviceKey = getSupabaseServiceKey()
  const authToken = serviceRole ? serviceKey : token

  if (!url || !anonKey || !authToken) {
    throw new Error('Server Supabase environment is not configured.')
  }

  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: serviceRole ? serviceKey : anonKey,
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    const message = data?.message || data?.error_description || data?.error || `Supabase request failed (${response.status})`
    throw new Error(message)
  }
  return data
}

async function verifyUser(accessToken) {
  const data = await supabaseFetch('/auth/v1/user', { token: accessToken })
  if (!data?.id) throw new Error('Invalid user session.')
  return data
}

function sanitizeProfile(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username || '',
    name: row.name || row.username || 'Sib user',
    location: row.location || '',
    isShop: !!row.is_shop,
    isAdmin: !!row.is_admin,
    stripeOnboardingComplete: !!row.stripe_onboarding_complete,
    chargesEnabled: !!row.charges_enabled,
    payoutsEnabled: !!row.payouts_enabled,
  }
}

function summarizeOrder(row) {
  if (!row) return null
  const isBuyer = row.__viewer_id === row.buyer_id
  const summary = {
    id: row.id,
    orderRef: row.order_ref,
    role: isBuyer ? 'buyer' : 'seller',
    item: row.listing_title || 'Order item',
    status: row.status,
    trackingStatus: row.tracking_status,
    fulfilmentStatus: row.fulfilment_status,
    fulfilmentMethod: row.fulfilment_method || row.delivery_method,
    paidAt: row.paid_at,
    dropoffConfirmedAt: row.dropoff_confirmed_at,
    dropoffStoreName: row.dropoff_store_name || row.dropoff_location_name,
    deliveryTiming: row.delivery_timing,
    deliveredAt: row.delivered_at,
    buyerConfirmedAt: row.buyer_confirmed_at,
    disputedAt: row.disputed_at,
    paymentStatus: row.payment_status,
    refundedAt: row.refunded_at,
    totalPrice: row.total_price,
    deliveryFeeAmount: row.delivery_fee_amount || row.delivery_fee,
  }
  if (!isBuyer) {
    summary.payoutStatus = row.payout_status
    summary.sellerPayoutStatus = row.seller_payout_status
    summary.sellerPayoutAmount = row.seller_payout_amount || row.seller_payout
    summary.platformFeeAmount = row.platform_fee_amount || row.platform_fee
  }
  return summary
}

async function getCurrentUserProfile(userId) {
  const rows = await supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,username,name,location,is_shop,is_admin,stripe_onboarding_complete,charges_enabled,payouts_enabled`, { serviceRole: true })
  return sanitizeProfile(rows?.[0])
}

async function getUserOrders(userId) {
  const select = [
    'id', 'order_ref', 'buyer_id', 'seller_id', 'listing_title', 'status', 'tracking_status',
    'fulfilment_status', 'fulfilment_method', 'delivery_method', 'paid_at', 'dropoff_confirmed_at',
    'dropoff_store_name', 'dropoff_location_name', 'delivery_timing', 'delivered_at', 'buyer_confirmed_at',
    'disputed_at', 'payout_status', 'payment_status', 'seller_payout_status', 'refunded_at',
    'total_price', 'seller_payout_amount', 'seller_payout', 'platform_fee_amount', 'platform_fee',
    'delivery_fee_amount', 'delivery_fee', 'created_at',
  ].join(',')
  const query = `/rest/v1/orders?or=(buyer_id.eq.${encodeURIComponent(userId)},seller_id.eq.${encodeURIComponent(userId)})&select=${select}&order=created_at.desc&limit=20`
  const rows = await supabaseFetch(query, { serviceRole: true })
  return (rows || []).map(row => summarizeOrder({ ...row, __viewer_id: userId }))
}

async function getAuthorizedOrder(userId, orderId) {
  if (!orderId) return null
  const select = '*'
  const rows = await supabaseFetch(`/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=${select}&limit=1`, { serviceRole: true })
  const order = rows?.[0]
  if (!order || (order.buyer_id !== userId && order.seller_id !== userId)) return null
  return order
}

async function getOrderStatus(userId, orderId) {
  const order = await getAuthorizedOrder(userId, orderId)
  if (!order) return { error: 'Order not found for this user.' }
  return summarizeOrder({ ...order, __viewer_id: userId })
}

async function getLogisticsStatus(userId, orderId) {
  const order = await getAuthorizedOrder(userId, orderId)
  if (!order) return { error: 'Order not found for this user.' }
  const [shipments, deliveryRows] = await Promise.all([
    supabaseFetch(`/rest/v1/shipments?order_id=eq.${encodeURIComponent(orderId)}&select=id,status,tracking_number,ship_by_deadline,shipped_at,delivered_at,dropoff_store_name,dropoff_store_address,dropped_off_at,current_location,fulfilment_status,delivery_timing&limit=1`, { serviceRole: true }).catch(() => []),
    supabaseFetch(`/rest/v1/logistics_delivery_sheet?order_id=eq.${encodeURIComponent(orderId)}&select=delivery_status,dropoff_store_name,dropoff_store_address,dropped_off_at,delivery_timing,pickup_zone,buyer_locality,confirmed_at,updated_at&limit=1`, { serviceRole: true }).catch(() => []),
  ])
  return {
    order: summarizeOrder({ ...order, __viewer_id: userId }),
    shipment: shipments?.[0] || null,
    logistics: deliveryRows?.[0] || null,
  }
}

async function getDisputeStatus(userId, orderId) {
  const order = await getAuthorizedOrder(userId, orderId)
  if (!order) return { error: 'Order not found for this user.' }
  const disputes = await supabaseFetch(`/rest/v1/disputes?order_id=eq.${encodeURIComponent(orderId)}&select=id,status,reason,details,source,created_at,resolved_at&order=created_at.desc&limit=1`, { serviceRole: true })
  const dispute = disputes?.[0] || null
  if (!dispute) return { order: summarizeOrder({ ...order, __viewer_id: userId }), dispute: null, messages: [] }
  const messages = await supabaseFetch(`/rest/v1/dispute_messages?dispute_id=eq.${encodeURIComponent(dispute.id)}&select=sender_role,message,created_at,attachments&order=created_at.asc&limit=50`, { serviceRole: true })
  return {
    order: summarizeOrder({ ...order, __viewer_id: userId }),
    dispute,
    messages: (messages || []).map(message => ({
      senderRole: message.sender_role,
      message: message.message,
      createdAt: message.created_at,
      attachmentsCount: Array.isArray(message.attachments) ? message.attachments.length : 0,
    })),
  }
}

async function createSupportEscalation(userId, orderId, reason) {
  let authorizedOrderId = null
  if (orderId) {
    const order = await getAuthorizedOrder(userId, orderId)
    if (!order) return { error: 'Order not found for this user.' }
    authorizedOrderId = order.id
  }
  const rows = await supabaseFetch('/rest/v1/support_escalations?select=id,status,created_at', {
    method: 'POST',
    serviceRole: true,
    body: [{
      user_id: userId,
      order_id: authorizedOrderId,
      reason: String(reason || 'Support requested').slice(0, 1000),
      source: 'support_ai',
      metadata: { channel: 'ask_sib' },
    }],
  })
  return rows?.[0] || { status: 'open' }
}

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    name: 'getCurrentUserProfile',
    description: 'Get the authenticated Sib user profile. Does not include email, phone, or private payment details.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    type: 'function',
    name: 'getUserOrders',
    description: "Get summaries of the authenticated user's own recent orders only.",
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    type: 'function',
    name: 'getOrderStatus',
    description: "Get commercial/payment/order status for one of the authenticated user's own orders.",
    parameters: { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'getLogisticsStatus',
    description: "Get delivery, drop-off, shipment, and courier status for one of the authenticated user's own orders.",
    parameters: { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'getDisputeStatus',
    description: "Get dispute status and safe timeline summaries for one of the authenticated user's own orders.",
    parameters: { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'createSupportEscalation',
    description: 'Create a human support escalation. Use when the user asks for admin/financial action, seems upset, or the answer is uncertain.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['reason'],
      additionalProperties: false,
    },
  },
]

export async function runTool(name, args, userId) {
  switch (name) {
    case 'getCurrentUserProfile': return getCurrentUserProfile(userId)
    case 'getUserOrders': return getUserOrders(userId)
    case 'getOrderStatus': return getOrderStatus(userId, args.orderId)
    case 'getLogisticsStatus': return getLogisticsStatus(userId, args.orderId)
    case 'getDisputeStatus': return getDisputeStatus(userId, args.orderId)
    case 'createSupportEscalation': return createSupportEscalation(userId, args.orderId, args.reason)
    default: return { error: `Unsupported tool: ${name}` }
  }
}

function extractOutputText(response) {
  if (response?.output_text) return response.output_text
  const parts = []
  for (const item of response?.output || []) {
    if (item.type === 'message') {
      for (const content of item.content || []) {
        if (content.type === 'output_text' && content.text) parts.push(content.text)
      }
    }
  }
  return parts.join('\n').trim()
}

async function createOpenAIResponse(payload) {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return {
      output_text: 'Sib Support AI is not configured yet. I can still help once the OpenAI API key is added on the server.',
      output: [],
    }
  }
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI request failed (${response.status})`)
  }
  return data
}

function buildSystemPrompt() {
  return [
    'You are Sib Support, a concise marketplace support assistant for Sib Malta.',
    'Help with orders, MYConvenience drop-off logistics, courier delivery, payouts, refunds, and disputes.',
    "Use tools to inspect the authenticated user's own orders when needed.",
    "Never reveal another user's private data. Do not infer data you do not have.",
    'Never refund a buyer, release funds, close a dispute, change order status, or promise a financial/admin outcome.',
    'If the user asks for refund/release/close/admin action, explain that a human admin must review it and create a support escalation.',
    'For disputes, guide users to provide evidence: clear photos, item condition, parcel label/order ID, delivery/drop-off details, and a concise timeline.',
    'Keep answers short, practical, and reassuring. If uncertain, escalate to human admin.',
  ].join('\n')
}

export async function handleSupportRequest({ accessToken, message, orderId, context }) {
  const authUser = await verifyUser(accessToken)
  const userId = authUser.id
  const initialInput = [
    {
      role: 'user',
      content: [
        `User message: ${String(message || '').slice(0, 2000)}`,
        orderId ? `Current order id: ${orderId}` : '',
        context ? `UI context: ${String(context).slice(0, 500)}` : '',
      ].filter(Boolean).join('\n'),
    },
  ]

  let response = await createOpenAIResponse({
    model: DEFAULT_MODEL,
    instructions: buildSystemPrompt(),
    input: initialInput,
    tools: TOOL_DEFINITIONS,
    tool_choice: 'auto',
  })

  const toolCalls = (response.output || []).filter(item => item.type === 'function_call')
  const usedTools = []
  if (toolCalls.length > 0) {
    const toolOutputs = []
    for (const call of toolCalls.slice(0, 6)) {
      const args = call.arguments ? JSON.parse(call.arguments) : {}
      const output = await runTool(call.name, args, userId)
      usedTools.push(call.name)
      toolOutputs.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify(output),
      })
    }
    response = await createOpenAIResponse({
      model: DEFAULT_MODEL,
      instructions: buildSystemPrompt(),
      input: [...initialInput, ...response.output, ...toolOutputs],
      tools: TOOL_DEFINITIONS,
    })
  }

  return {
    answer: extractOutputText(response) || 'I could not generate an answer. I can escalate this to Sib Support.',
    usedTools,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  try {
    const accessToken = getBearerToken(req)
    if (!accessToken) return json(res, 401, { error: 'Missing bearer token.' })
    const body = await readJsonBody(req)
    if (!body?.message || String(body.message).trim().length < 2) {
      return json(res, 400, { error: 'Message is required.' })
    }
    const result = await handleSupportRequest({
      accessToken,
      message: body.message,
      orderId: body.orderId,
      context: body.context,
    })
    return json(res, 200, result)
  } catch (error) {
    console.error('[support-ai] request failed:', error?.message || error)
    return json(res, 500, { error: 'Sib Support is unavailable right now. Please try again or escalate to support.' })
  }
}
