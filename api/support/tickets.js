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
    throw new Error(data?.message || data?.error_description || data?.error || `Supabase request failed (${response.status})`)
  }
  return data
}

async function verifyUser(accessToken) {
  const data = await supabaseFetch('/auth/v1/user', { token: accessToken })
  if (!data?.id) throw new Error('Invalid user session.')
  return data
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : []
}

function getTicketSubject(category, subject, order) {
  const orderCode = order?.order_ref || order?.order_code || order?.id?.slice(0, 8)
  return `[Sib Support] ${category} - ${orderCode ? `Order ${orderCode}` : subject}`
}

async function getAuthorizedOrder(userId, orderId) {
  if (!orderId) return null
  const rows = await supabaseFetch(`/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,order_ref,order_code,buyer_id,seller_id,listing_title,status,tracking_status&limit=1`, { serviceRole: true })
  const order = rows?.[0] || null
  if (!order || (order.buyer_id !== userId && order.seller_id !== userId)) return null
  return order
}

async function sendSupportEmail(ticket, order) {
  const url = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  const serviceKey = getSupabaseServiceKey()
  if (!url || !anonKey || !serviceKey) return { success: false, emailSent: false, error: 'email_not_configured' }

  const response = await fetch(`${url}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'support_ticket',
      to: 'info@sibmalta.com',
      data: {
        ticketId: ticket.id,
        name: ticket.name,
        email: ticket.email,
        category: ticket.category,
        subject: ticket.subject,
        message: ticket.message,
        orderRef: order?.order_ref || order?.order_code || '',
        orderStatus: order?.status || '',
        itemTitle: order?.listing_title || '',
        attachmentUrls: normalizeArray(ticket.attachment_urls),
        aiConversation: normalizeArray(ticket.ai_conversation),
      },
      meta: {
        supportTicketId: ticket.id,
        orderId: ticket.order_id,
        userId: ticket.user_id,
        dedupe_key: `support-ticket-${ticket.id}`,
      },
      related_entity_type: 'support_ticket',
      related_entity_id: ticket.id,
    }),
  })
  return response.json().catch(() => ({ success: response.ok, emailSent: response.ok }))
}

export async function createSupportTicket({ accessToken, body }) {
  const authUser = await verifyUser(accessToken)
  const userId = authUser.id
  const category = String(body.category || 'Other').trim()
  const subject = String(body.subject || '').trim()
  const message = String(body.message || '').trim()
  const name = String(body.name || authUser.user_metadata?.name || authUser.email || 'Sib user').trim()
  const email = String(body.email || authUser.email || '').trim()
  const order = body.orderId ? await getAuthorizedOrder(userId, body.orderId) : null

  if (!email || !subject || !message) {
    throw new Error('Please complete email, subject, and message.')
  }

  const rows = await supabaseFetch('/rest/v1/support_tickets?select=*', {
    method: 'POST',
    serviceRole: true,
    body: [{
      user_id: userId,
      name,
      email,
      category,
      subject,
      message,
      order_id: order?.id || null,
      attachment_urls: normalizeArray(body.attachmentUrls),
      ai_conversation: normalizeArray(body.aiConversation).slice(-20),
      status: 'open',
    }],
  })
  const ticket = rows?.[0]
  if (!ticket?.id) throw new Error('Could not create support ticket.')
  const emailResult = await sendSupportEmail(ticket, order)
  return { ticket, email: emailResult }
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
    const result = await createSupportTicket({ accessToken, body })
    return json(res, 200, result)
  } catch (error) {
    console.error('[support-ticket] request failed:', error?.message || error)
    return json(res, 400, { error: error?.message || 'Could not create support ticket.' })
  }
}
