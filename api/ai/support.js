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
    const error = new Error(message)
    error.status = response.status
    error.statusText = response.statusText
    error.details = data
    throw error
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
    item: row.listing_title || 'your item',
    status: row.status,
    trackingStatus: row.tracking_status,
    fulfilmentStatus: row.fulfilment_status,
    fulfilmentMethod: row.fulfilment_method || row.delivery_method,
    createdAt: row.created_at,
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

const ACTIVE_ORDER_STATUSES = new Set([
  'paid',
  'payment_received_seller_payout_pending',
  'awaiting_delivery',
  'awaiting_fulfilment',
  'awaiting_shipment',
  'shipped',
  'dropped_off',
  'collected',
  'out_for_delivery',
  'under_review',
  'held',
  'disputed',
])

export function detectSupportIntent(message) {
  const text = String(message || '').toLowerCase()
  const normalized = text.replace(/[’]/g, "'")

  if (/\b(report a problem|problem with|contact support|contact sib support|escalate|human support|support ticket|talk to support)\b/.test(normalized)) return 'report_problem'
  if (/\b(refund|money back|cancel and refund|want my money back)\b/.test(normalized)) return 'refund'
  if (/\b(dispute|item not as described|not as described|fake|damaged|evidence|seller issue|buyer issue)\b/.test(normalized)) return 'dispute'
  if (/\b(payout|payout pending|where is my payout|seller payout|payment from sale|seller payment|when will i get paid|when do i get paid|when do payouts arrive|why haven't i been paid|why havent i been paid|funds|release funds|get paid)\b/.test(normalized)) return 'payout'
  if (/\b(where'?s my (order|delivery|parcel|package)|where is my (order|delivery|parcel|package)|when will delivery be|order|delivery|arrived|hasn't arrived|hasnt arrived|not arrived|tracking|parcel|package|shipped|bought|purchase)\b/.test(normalized)) return 'order'
  if (/\b(hi|hello|hey|help|support)\b/.test(normalized)) return 'generic'

  return 'generic'
}

function humanizeStatus(value) {
  if (!value) return ''
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

function getOrderCode(order) {
  return order?.orderRef || order?.orderCode || order?.id || 'Order'
}

function getLogisticsLabel(status) {
  const logistics = status?.logistics || null
  const shipment = status?.shipment || null
  const order = status?.order || status || {}

  if (logistics?.delivery_status) return humanizeStatus(logistics.delivery_status)
  if (shipment?.status) return humanizeStatus(shipment.status)
  if (order.dropoffConfirmedAt) return 'Dropped Off'
  if (order.deliveredAt) return 'Delivered'
  if (order.trackingStatus) return humanizeStatus(order.trackingStatus)
  if (order.fulfilmentStatus) return humanizeStatus(order.fulfilmentStatus)
  return 'Live delivery tracking is not available yet'
}

function formatOrderLine(status) {
  const order = status?.order || status || {}
  const code = getOrderCode(order)
  const item = order.item || 'Order item'
  const orderStatus = humanizeStatus(order.status) || 'Status pending'
  const logisticsStatus = getLogisticsLabel(status)
  const date = order.createdAt ? `; date: ${new Date(order.createdAt).toLocaleDateString('en-GB')}` : ''
  return `${code} - ${item}: ${orderStatus}; delivery: ${logisticsStatus}${date}.`
}

function isActiveOrder(order) {
  return ACTIVE_ORDER_STATUSES.has(order?.status)
    || ACTIVE_ORDER_STATUSES.has(order?.trackingStatus)
    || ACTIVE_ORDER_STATUSES.has(order?.fulfilmentStatus)
}

function buildSingleOrderStatusAnswer(status) {
  const order = status?.order || status || {}
  const code = getOrderCode(order)
  const nextStep = getNextStep(status)
  const lines = [
    `I found your order for ${order.item || 'your item'} (${code}).`,
    `Order status: ${humanizeStatus(order.status) || 'In progress'}.`,
    `Delivery status: ${getLogisticsLabel(status)}.`,
    `Next step: ${nextStep}`,
  ]
  if (!status?.logistics && !status?.shipment) {
    lines.splice(3, 0, 'Live delivery tracking is not available yet, but the order is still on your account.')
  }
  if (order.dropoffStoreName) lines.push(`Drop-off store: ${order.dropoffStoreName}.`)
  if (order.deliveryTiming) lines.push(`Delivery timing: ${humanizeStatus(order.deliveryTiming)}.`)
  lines.push('If this looks wrong, I can escalate it to Sib support.')
  return lines.join('\n')
}

export function getDeliveryNextStep(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'awaiting_pickup') return 'The seller still needs to drop off or hand over the item.'
  if (value === 'dropped_off') return 'The item has been dropped off and is waiting for courier pickup.'
  if (value === 'collected') return 'The courier has collected the item.'
  if (value === 'out_for_delivery') return 'The courier is delivering it.'
  if (value === 'delivered') return 'This order is marked as delivered.'
  if (value === 'paid' || value === 'awaiting_delivery') return 'The order is paid and waiting to enter the delivery flow.'
  return 'Live delivery tracking is not available yet, but the order is still on your account.'
}

function getNextStep(status) {
  const order = status?.order || status || {}
  const logistics = status?.logistics || null
  const shipment = status?.shipment || null
  const deliveryStatus = logistics?.delivery_status || shipment?.status || order.trackingStatus || order.fulfilmentStatus || order.status

  if (!deliveryStatus) return getDeliveryNextStep('unknown')

  if (order.refundedAt || order.paymentStatus === 'refunded') return 'The refund has already been recorded.'
  if (order.disputedAt || order.status === 'disputed') return 'Sib support will review the dispute and any evidence.'
  if (order.dropoffConfirmedAt && !logistics?.delivery_status && !shipment?.status) return getDeliveryNextStep('dropped_off')
  if (deliveryStatus === 'awaiting_shipment' || deliveryStatus === 'awaiting_fulfilment') return 'The seller still needs to drop off or hand over the item.'
  return getDeliveryNextStep(deliveryStatus)
}

async function loadUserOrdersForSupport(userId) {
  let orders
  try {
    orders = await getUserOrders(userId)
  } catch (error) {
    console.error('[support-ai] getUserOrders failed:', error?.message || error)
    return { error }
  }
  return { orders }
}

function logSupportEvent(event, payload = {}) {
  console.info('[support-ai]', JSON.stringify({ event, ...payload }))
}

function classifySupabaseError(error) {
  const message = String(error?.message || '')
  const status = error?.status
  const code = error?.details?.code
  if (status === 401 || status === 403 || /permission denied|rls|row-level/i.test(message)) return 'rls_or_permission'
  if (status === 404 || code === '42P01' || /relation .* does not exist|schema cache|could not find/i.test(message)) return 'missing_relation_or_column'
  if (status === 406) return 'not_acceptable_or_empty_single'
  if (status >= 500) return 'supabase_server_error'
  return 'query_error'
}

function logSupportQueryFailure({ section, table, userId, error }) {
  const payload = {
    event: 'support_query_failed',
    section,
    table,
    userId,
    status: error?.status || null,
    statusText: error?.statusText || null,
    code: error?.details?.code || null,
    kind: classifySupabaseError(error),
    message: error?.message || 'Unknown Supabase error',
  }
  console.error('[support-ai]', JSON.stringify(payload))
}

async function loadSupportSection({ section, table, userId, errors, fn, fallback }) {
  try {
    const data = await fn()
    logSupportEvent('support_query_loaded', {
      section,
      table,
      userId,
      count: Array.isArray(data) ? data.length : data ? 1 : 0,
    })
    return data
  } catch (error) {
    logSupportQueryFailure({ section, table, userId, error })
    errors.push({
      section,
      table,
      kind: classifySupabaseError(error),
      status: error?.status || null,
      message: error?.message || 'Unknown Supabase error',
    })
    return fallback
  }
}

function hasContextError(context, section) {
  return (context?.errors || []).some(error => error.section === section)
}

function summarizeSupportContext(context) {
  if (!context) {
    return {
      supportContextLoaded: false,
      contextCounts: null,
      sectionErrors: [],
    }
  }
  return {
    supportContextLoaded: true,
    contextCounts: {
      orders: context.orders?.length || 0,
      buyerOrders: context.buyerOrders?.length || 0,
      sellerOrders: context.sellerOrders?.length || 0,
      logistics: context.logisticsRecords?.length || 0,
      shipments: context.shipmentRecords?.length || 0,
      disputes: context.disputes?.length || 0,
      refunds: context.refunds?.length || 0,
      payoutOrders: context.payouts?.payoutOrders?.length || 0,
      supportTickets: context.supportTickets?.length || 0,
    },
    sectionErrors: (context.errors || []).map(error => ({
      section: error.section,
      table: error.table,
      kind: error.kind,
      status: error.status,
      message: error.message,
    })),
  }
}

function logSupportRequest({ userId, message, detectedIntent, hasSession, supportContext }) {
  logSupportEvent('support_request', {
    route: '/api/ai/support',
    userId,
    message: String(message || '').slice(0, 500),
    detectedIntent,
    hasSession,
    ...summarizeSupportContext(supportContext),
  })
}

function getOrderIdList(orders) {
  return [...new Set((orders || []).map(order => order.id).filter(Boolean))]
}

function byOrderId(rows = [], orderIds = []) {
  const map = new Map()
  for (const row of rows || []) {
    if (row?.order_id && !map.has(row.order_id)) map.set(row.order_id, row)
    if (!row?.order_id && orderIds.length === 1 && !map.has(orderIds[0])) map.set(orderIds[0], row)
  }
  return map
}

async function fetchRowsForOrders(table, select, orderIds, suffix = '') {
  if (!orderIds.length) return []
  const encodedIds = orderIds.map(id => `"${String(id).replace(/"/g, '')}"`).join(',')
  return supabaseFetch(`/rest/v1/${table}?order_id=in.(${encodedIds})&select=${select}${suffix}`, { serviceRole: true })
}

export async function getSupportContext(userId) {
  const errors = []
  logSupportEvent('support_context_start', { userId })
  const orders = await loadSupportSection({
    section: 'orders',
    table: 'orders',
    userId,
    errors,
    fallback: [],
    fn: () => getUserOrders(userId),
  })
  const orderIds = getOrderIdList(orders)
  const [
    profile,
    logisticsRecords,
    shipmentRecords,
    disputes,
    supportTickets,
  ] = await Promise.all([
    loadSupportSection({
      section: 'stripe_onboarding',
      table: 'profiles',
      userId,
      errors,
      fallback: null,
      fn: () => getCurrentUserProfile(userId),
    }),
    loadSupportSection({
      section: 'logistics',
      table: 'logistics_delivery_sheet',
      userId,
      errors,
      fallback: [],
      fn: () => fetchRowsForOrders('logistics_delivery_sheet', '*', orderIds, '&order=updated_at.desc'),
    }),
    loadSupportSection({
      section: 'logistics',
      table: 'shipments',
      userId,
      errors,
      fallback: [],
      fn: () => fetchRowsForOrders('shipments', '*', orderIds, '&order=updated_at.desc'),
    }),
    loadSupportSection({
      section: 'disputes',
      table: 'disputes',
      userId,
      errors,
      fallback: [],
      fn: () => fetchRowsForOrders('disputes', '*', orderIds, '&order=created_at.desc'),
    }),
    loadSupportSection({
      section: 'support_tickets',
      table: 'support_tickets',
      userId,
      errors,
      fallback: [],
      fn: () => supabaseFetch(`/rest/v1/support_tickets?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc&limit=10`, { serviceRole: true }),
    }),
  ])

  const buyerOrders = orders.filter(order => order.role === 'buyer')
  const sellerOrders = orders.filter(order => order.role === 'seller')
  const refunds = orders.filter(order => order.refundedAt || order.paymentStatus === 'refunded')
  const context = {
    profile,
    orders,
    buyerOrders,
    sellerOrders,
    logisticsRecords,
    shipmentRecords,
    disputes,
    refunds,
    supportTickets,
    payouts: {
      sellerOrders,
      payoutOrders: sellerOrders.filter(isPayoutRelevantOrder),
      profile,
    },
    errors,
    logisticsByOrderId: byOrderId(logisticsRecords, orderIds),
    shipmentsByOrderId: byOrderId(shipmentRecords, orderIds),
    disputesByOrderId: byOrderId(disputes, orderIds),
  }
  logSupportEvent('support_context_loaded', {
    buyerOrders: buyerOrders.length,
    sellerOrders: sellerOrders.length,
    logisticsRecords: logisticsRecords.length,
    shipmentRecords: shipmentRecords.length,
    disputes: disputes.length,
    refunds: refunds.length,
    payoutOrders: sellerOrders.filter(isPayoutRelevantOrder).length,
    supportTickets: supportTickets.length,
    errors: errors.map(error => `${error.section}:${error.kind}`),
  })
  return context
}

async function loadSupportContext(userId, intent) {
  try {
    const supportContext = await getSupportContext(userId)
    return { supportContext }
  } catch (error) {
    console.error('[support-ai] getSupportContext failed:', error?.message || error)
    logSupportEvent('support_context_failed', { intent, reason: error?.message || 'unknown' })
    return { error }
  }
}

function orderStatusFromContext(supportContext, order) {
  return {
    order,
    logistics: supportContext?.logisticsByOrderId?.get(order.id) || null,
    shipment: supportContext?.shipmentsByOrderId?.get(order.id) || null,
    dispute: supportContext?.disputesByOrderId?.get(order.id) || null,
  }
}

function getOrderTimingPhrase(order, logistics, shipment) {
  const dateValue = logistics?.dropped_off_at || logistics?.confirmed_at || shipment?.dropped_off_at || shipment?.shipped_at || order.dropoffConfirmedAt || order.createdAt
  if (!dateValue) return ''
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const ageMs = now.getTime() - date.getTime()
  if (ageMs >= 0 && ageMs < 36 * 60 * 60 * 1000) return 'today'
  if (ageMs >= 36 * 60 * 60 * 1000 && ageMs < 60 * 60 * 60 * 1000) return 'yesterday'
  return `on ${date.toLocaleDateString('en-GB')}`
}

function buildOperationalOrderReply(status) {
  const order = status?.order || {}
  const logistics = status?.logistics || null
  const shipment = status?.shipment || null
  const deliveryStatus = logistics?.delivery_status || shipment?.status || order.trackingStatus || order.fulfilmentStatus || order.status || 'unknown'
  const timing = getOrderTimingPhrase(order, logistics, shipment)
  const item = order.item || 'your item'
  const code = getOrderCode(order)

  if (deliveryStatus === 'dropped_off' || order.dropoffConfirmedAt) {
    return `Your order for ${item} (${code}) was dropped off${timing ? ` ${timing}` : ''} and is waiting for courier collection.`
  }
  if (deliveryStatus === 'collected') return `Your order for ${item} (${code}) has been collected by the courier.`
  if (deliveryStatus === 'out_for_delivery') return `Your order for ${item} (${code}) is currently out for delivery.`
  if (deliveryStatus === 'delivered' || order.deliveredAt) return `Your order for ${item} (${code}) is marked as delivered.`
  if (['awaiting_pickup', 'awaiting_shipment', 'awaiting_fulfilment', 'paid', 'awaiting_delivery'].includes(deliveryStatus)) {
    return `Your order for ${item} (${code}) is paid, but the seller has not yet handed over the item.`
  }
  return `I found your order for ${item} (${code}).`
}

async function buildOrderStatusReply(userId, supportContext) {
  const context = supportContext || (await loadSupportContext(userId, 'order')).supportContext
  if (!context) {
    return {
      answer: "I'm having trouble checking live order details right now. If this is urgent, I can send this to Sib support with your account details.",
      usedTools: ['getSupportContext'],
    }
  }

  if (hasContextError(context, 'orders')) {
    return {
      answer: "I can't currently access live delivery tracking. If this is urgent, I can send this to Sib support with your account details.",
      usedTools: ['getSupportContext'],
    }
  }

  const { orders } = context
  if (!orders.length) {
    logSupportEvent('support_fallback', { intent: 'order', reason: 'no_orders' })
    return {
      answer: "I can help, but I can't see any orders on this account yet. If you bought the item using another account, please log in with that account. Otherwise, send the item name or seller name and I can help you contact Sib support.",
      usedTools: ['getSupportContext'],
    }
  }

  const activeOrders = orders.filter(isActiveOrder)
  if (activeOrders.length === 1) {
    const status = orderStatusFromContext(context, activeOrders[0])
    const logisticsUnavailable = hasContextError(context, 'logistics')
    return {
      answer: [
        buildOperationalOrderReply(status),
        `Order status: ${humanizeStatus(activeOrders[0].status) || 'In progress'}.`,
        logisticsUnavailable ? "I can't currently access live delivery tracking." : `Delivery status: ${getLogisticsLabel(status)}.`,
        `Next step: ${getNextStep(status)}`,
        !logisticsUnavailable && !status.logistics && !status.shipment ? 'Live delivery tracking is not available yet, but the order is still on your account.' : '',
        activeOrders[0].dropoffStoreName ? `Drop-off store: ${activeOrders[0].dropoffStoreName}.` : '',
        activeOrders[0].deliveryTiming ? `Delivery timing: ${humanizeStatus(activeOrders[0].deliveryTiming)}.` : '',
      ].filter(Boolean).join('\n'),
      usedTools: ['getSupportContext'],
    }
  }

  const recentOrders = orders.slice(0, 5)
  const statuses = recentOrders.map(order => orderStatusFromContext(context, order))
  logSupportEvent('support_fallback', { intent: 'order', reason: 'multiple_orders', count: recentOrders.length })
  return {
    answer: [
      'I found a few recent orders. Which one do you mean?',
      hasContextError(context, 'logistics') ? "I can't currently access live delivery tracking, but I can still see your recent orders." : '',
      ...statuses.map(formatOrderLine),
    ].filter(Boolean).join('\n'),
    usedTools: ['getSupportContext'],
  }
}

async function buildPayoutReply(userId, message, supportContext) {
  const context = supportContext || (await loadSupportContext(userId, 'payout')).supportContext
  if (!context) {
    return {
      answer: "I'm having trouble checking payout details right now. If this is urgent, I can send this to Sib support with your account details.",
      usedTools: ['getSupportContext'],
    }
  }

  const profile = context.profile
  const sellerOrders = context.sellerOrders
  const asksManualRelease = /\b(release funds|release payout|release my funds|pay me now)\b/i.test(message || '')
  if (hasContextError(context, 'orders')) {
    return {
      answer: "I can't currently access payout information for your account. If this is urgent, I can send this to Sib support with your account details.",
      usedTools: ['getSupportContext'],
    }
  }
  if (asksManualRelease) {
    logSupportEvent('support_escalation_recommended', { intent: 'payout', reason: 'manual_release_request' })
    return {
      answer: 'Payout releases always need the normal buyer-protection/admin review. I can connect you with Sib support for this issue.',
      usedTools: ['getSupportContext'],
    }
  }

  if (!sellerOrders.length) {
    return {
      answer: [
        'I cannot see any payout activity yet on this account.',
        'Payouts are normally released after delivery is confirmed. Bank transfers can take several business days.',
      ].join('\n'),
      usedTools: ['getSupportContext'],
    }
  }

  const payoutOrders = sellerOrders.filter(isPayoutRelevantOrder).slice(0, 5)
  if (profile && !profile.stripeOnboardingComplete && payoutOrders.length) {
    return {
      answer: [
        'To receive payouts, you still need to complete your payout verification setup.',
        'Open your payout settings and finish Stripe verification. Once setup is complete, eligible payouts can be processed after delivery confirmation and buyer protection review.',
      ].join('\n'),
      usedTools: ['getSupportContext'],
    }
  }

  if (profile && profile.stripeOnboardingComplete && !profile.payoutsEnabled && payoutOrders.length) {
    return {
      answer: [
        'Your payout account needs attention before payouts can be sent.',
        'Please check your payout settings for any verification or restriction messages. Sib support can help if the account status looks unclear.',
      ].join('\n'),
      usedTools: ['getSupportContext'],
    }
  }

  if (!payoutOrders.length) {
    return {
      answer: [
        'You do not have any completed sales ready for payout yet.',
        'Payouts are normally released after delivery is confirmed. Buyer protection may temporarily delay payout release.',
      ].join('\n'),
      usedTools: ['getSupportContext'],
    }
  }

  const lines = payoutOrders.map(formatPayoutOrderLine)

  return {
    answer: [
      'Your payout is currently processing.',
      ...lines,
      'Payouts are normally released after delivery is confirmed. Buyer protection may temporarily delay payout release.',
      'Bank transfers can take several business days after release.',
    ].join('\n'),
    usedTools: ['getSupportContext'],
  }
}

function isPayoutRelevantOrder(order) {
  const status = String(order?.status || '').toLowerCase()
  const payout = String(order?.payoutStatus || order?.sellerPayoutStatus || '').toLowerCase()
  return Boolean(order?.deliveredAt || order?.buyerConfirmedAt || order?.sellerPayoutAmount)
    || ['delivered', 'completed', 'releasable', 'released', 'payment_received_seller_payout_pending'].includes(status)
    || ['pending', 'processing', 'held', 'under_review', 'releasable', 'released', 'paid', 'setup_pending', 'blocked_payouts', 'seller_setup_blocked', 'transfer_failed'].includes(payout)
}

function formatPayoutOrderLine(order) {
  const payout = order.payoutStatus || order.sellerPayoutStatus || 'pending'
  const deliveryConfirmed = Boolean(order.deliveredAt || order.buyerConfirmedAt || ['delivered', 'completed'].includes(String(order.status || '').toLowerCase()))
  const holdCopy = /held|under_review|dispute/i.test(payout)
    ? 'Buyer protection or review may still be holding this payout.'
    : 'Buyer protection may still apply until the release check is complete.'
  const deliveryCopy = deliveryConfirmed
    ? 'Delivery confirmation is recorded.'
    : 'Delivery confirmation is still pending.'
  return `${getOrderCode(order)} - ${order.item || 'your item'}: payout ${humanizeStatus(payout) || 'Pending'}. ${deliveryCopy} ${holdCopy}`
}

async function buildRefundReply(userId, message, supportContext) {
  const context = supportContext || (await loadSupportContext(userId, 'refund')).supportContext
  if (!context) {
    return {
      answer: "I'm having trouble checking refund details right now. If this is urgent, I can send this to Sib support with your account details.",
      usedTools: ['getSupportContext'],
    }
  }
  if (hasContextError(context, 'orders')) {
    return {
      answer: "I'm having trouble checking refund details right now. If this is urgent, I can send this to Sib support with your account details.",
      usedTools: ['getSupportContext'],
    }
  }
  const refundedOrder = context.refunds?.[0] || null
  const buyerOrder = refundedOrder || context.buyerOrders?.find(order => !order.refundedAt) || context.orders?.[0] || null
  return {
    answer: [
      refundedOrder
        ? `Refund status: ${getOrderCode(refundedOrder)} is already marked as ${humanizeStatus(refundedOrder.paymentStatus) || 'Refunded'}.`
        : 'Refunds are always reviewed by Sib support before any money is returned.',
      buyerOrder ? `I found ${getOrderCode(buyerOrder)} - ${buyerOrder.item || 'your item'}.` : 'I could not confidently match this to one order.',
      'I can connect you with Sib support for this issue.',
    ].join('\n'),
    usedTools: ['getSupportContext'],
  }
}

async function buildDisputeReply(userId, supportContext) {
  const context = supportContext || (await loadSupportContext(userId, 'dispute')).supportContext
  if (!context) {
    return {
      answer: "I'm having trouble checking your dispute status right now. If this is urgent, I can send this to Sib support with your account details.",
      usedTools: ['getSupportContext'],
    }
  }
  if (hasContextError(context, 'disputes')) {
    return {
      answer: "I can't currently load dispute details, but I can still help escalate this to Sib support.",
      usedTools: ['getSupportContext'],
    }
  }
  if (hasContextError(context, 'orders')) {
    return {
      answer: "I can't currently load dispute details, but I can still help escalate this to Sib support.",
      usedTools: ['getSupportContext'],
    }
  }

  const disputedOrders = context.orders.filter(order => order.disputedAt || order.status === 'disputed' || context.disputesByOrderId.has(order.id))
  if (disputedOrders.length === 1) {
    const dispute = context.disputesByOrderId.get(disputedOrders[0].id) || null
    const disputeStatus = dispute?.status ? humanizeStatus(dispute.status) : 'Under Review'
    return {
      answer: [
        `${getOrderCode(disputedOrders[0])}: dispute status is ${disputeStatus}.`,
        dispute?.reason ? `Reason: ${dispute.reason}.` : '',
        'Please provide clear photos, screenshots, a short explanation, and any delivery/drop-off details.',
        'A human admin reviews dispute outcomes. I cannot refund, release funds, or close the dispute.',
      ].filter(Boolean).join('\n'),
      usedTools: ['getSupportContext'],
    }
  }

  return {
    answer: [
      disputedOrders.length > 1
        ? 'I found more than one disputed order. Which one do you mean?'
        : "I can't see any open disputes on this account.",
      'Useful evidence: clear photos, screenshots, a short explanation, parcel/order details, and delivery or drop-off information.',
      'A human admin reviews dispute outcomes.',
    ].join('\n'),
    usedTools: ['getSupportContext'],
  }
}

function buildReportProblemReply(supportContext) {
  const recentOrder = supportContext?.orders?.[0] || null
  logSupportEvent('support_escalation_recommended', { intent: 'report_problem', reason: 'user_requested_support_contact' })
  return {
    answer: [
      'I can connect you with Sib support for this issue.',
      recentOrder ? `If this is about ${getOrderCode(recentOrder)} - ${recentOrder.item || 'your item'}, include that in the request.` : 'Add the item name, seller name, or order code if you have it.',
      'Use the support form to send the details to Sib support.',
    ].join('\n'),
    action: 'open_support_ticket',
    usedTools: ['getSupportContext'],
  }
}

function buildGenericHelpReply() {
  return {
    answer: "Hi, I'm Sib Support. I can help check an order, delivery, payout, refund, or dispute. What would you like help with?",
    usedTools: [],
  }
}

async function handleDeterministicIntent(intent, userId, message, supportContext, contextError) {
  if (!['order', 'payout', 'refund', 'dispute', 'report_problem'].includes(intent)) return null
  logSupportEvent('support_intent', { intent })
  if (contextError) {
    const failure = {
      order: "I'm having trouble checking live order details right now. If this is urgent, I can send this to Sib support with your account details.",
      payout: "I'm having trouble checking payout details right now. If this is urgent, I can send this to Sib support with your account details.",
      refund: "I'm having trouble checking refund details right now. If this is urgent, I can send this to Sib support with your account details.",
      dispute: "I'm having trouble checking your dispute status right now. If this is urgent, I can send this to Sib support with your account details.",
      report_problem: 'I can connect you with Sib support for this issue. Use the support form to send the details to Sib support.',
    }[intent]
    return {
      answer: failure,
      action: intent === 'report_problem' ? 'open_support_ticket' : undefined,
      usedTools: ['getSupportContext'],
    }
  }

  switch (intent) {
    case 'order':
      return buildOrderStatusReply(userId, supportContext)
    case 'payout':
      return buildPayoutReply(userId, message, supportContext)
    case 'refund':
      return buildRefundReply(userId, message, supportContext)
    case 'dispute':
      return buildDisputeReply(userId, supportContext)
    case 'report_problem':
      return buildReportProblemReply(supportContext)
    default:
      return null
  }
}

async function getCurrentUserProfile(userId) {
  const rows = await supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=*&limit=1`, { serviceRole: true })
  return sanitizeProfile(rows?.[0])
}

async function getUserOrders(userId) {
  const select = '*'
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
    'If the user asks where an order is without an order ID, use getUserOrders first. If there are multiple possible orders, summarize recent orders and ask which one they mean.',
    'Be specific about known order, payment, delivery, and logistics statuses. Do not say something is unavailable unless a backend/API call actually failed.',
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
  const intent = detectSupportIntent(message)
  const deterministicIntents = new Set(['order', 'payout', 'refund', 'dispute', 'report_problem'])

  if (deterministicIntents.has(intent)) {
    const { supportContext, error } = await loadSupportContext(userId, intent)
    logSupportRequest({
      userId,
      message,
      detectedIntent: intent,
      hasSession: Boolean(accessToken),
      supportContext,
    })
    const deterministic = await handleDeterministicIntent(intent, userId, message, supportContext, error)
    if (deterministic) {
      const debug = summarizeSupportContext(supportContext)
      return {
        ...deterministic,
        detectedIntent: intent,
        contextCounts: debug.contextCounts,
        sectionErrors: debug.sectionErrors,
      }
    }
  } else {
    logSupportRequest({
      userId,
      message,
      detectedIntent: intent,
      hasSession: Boolean(accessToken),
      supportContext: null,
    })
  }

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

  try {
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
        if (['getOrderStatus', 'getLogisticsStatus', 'getDisputeStatus'].includes(call.name) && !args.orderId) {
          const orders = await getUserOrders(userId).catch(() => [])
          usedTools.push('getUserOrders')
          toolOutputs.push({
            type: 'function_call_output',
            call_id: call.call_id,
            output: JSON.stringify({ error: 'orderId was missing', recentOrders: orders.slice(0, 5) }),
          })
          continue
        }
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
      answer: extractOutputText(response) || buildGenericHelpReply().answer,
      usedTools,
      detectedIntent: intent,
    }
  } catch (error) {
    console.error('[support-ai] OpenAI fallback failed:', error?.message || error)
    return { ...buildGenericHelpReply(), detectedIntent: intent }
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
