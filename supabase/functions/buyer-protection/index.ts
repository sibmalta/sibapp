import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WINDOW_MS = 48 * 60 * 60 * 1000

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getEnv(...names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name)
    if (value) return value
  }
  return ''
}

function getBearerToken(req: Request) {
  const header = req.headers.get('authorization') || ''
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
}

async function authenticate(req: Request) {
  const supabaseUrl = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
  const anonKey = getEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY')
  const token = getBearerToken(req)
  if (!supabaseUrl || !anonKey || !token) return { user: null, error: 'Missing auth configuration or token.' }
  const authClient = createClient(supabaseUrl, anonKey)
  const { data, error } = await authClient.auth.getUser(token)
  return { user: data?.user || null, error: error?.message || null }
}

function serviceClient() {
  return createClient(
    getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL'),
    getEnv('SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'),
  )
}

function deadlineFor(deliveredAt: string) {
  return new Date(new Date(deliveredAt).getTime() + WINDOW_MS).toISOString()
}

function releasePatch(now: string, autoConfirmed: boolean) {
  return {
    status: 'completed',
    tracking_status: 'completed',
    fulfilment_status: 'completed',
    payout_status: 'releasable',
    seller_payout_status: 'available',
    buyer_confirmed_at: autoConfirmed ? null : now,
    confirmed_at: now,
    completed_at: now,
    auto_confirmed: autoConfirmed,
    updated_at: now,
  }
}

async function ensurePayoutRecord(supabase: ReturnType<typeof createClient>, order: Record<string, any>) {
  const { data: existing, error: existingError } = await supabase
    .from('payouts')
    .select('id,status')
    .eq('order_id', order.id)
    .limit(1)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) return existing

  const { data, error } = await supabase
    .from('payouts')
    .insert({
      order_id: order.id,
      seller_id: order.seller_id,
      amount: order.seller_payout || order.item_price || 0,
      status: 'pending',
      method: 'stripe_connect',
      reference: order.order_ref || order.id,
    })
    .select('id,status')
    .single()
  if (error) throw error
  return data
}

async function notify(supabase: ReturnType<typeof createClient>, row: Record<string, unknown>) {
  const { error } = await supabase.from('notifications').insert({
    read: false,
    target_path: row.order_id ? `/orders/${row.order_id}` : null,
    ...row,
  })
  if (error && error.code !== '23505') console.error('[buyer-protection] notification failed:', error.message)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const { user, error: authError } = await authenticate(req)
    if (authError || !user) return jsonResponse({ error: 'Invalid or expired token.' }, 401)

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '')
    const supabase = serviceClient()
    const now = new Date().toISOString()

    if (action === 'confirm_order') {
      const orderId = String(body.orderId || '')
      const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single()
      if (error || !order) return jsonResponse({ error: 'Order not found.' }, 404)
      if (order.buyer_id !== user.id) return jsonResponse({ error: 'Only the buyer can confirm this order.' }, 403)
      if (!order.delivered_at || !['delivered', 'completed', 'confirmed'].includes(order.tracking_status)) {
        return jsonResponse({ error: 'Order is not ready for buyer confirmation.' }, 400)
      }
      if (order.disputed_at || order.payout_status === 'disputed') return jsonResponse({ error: 'Order is disputed.' }, 409)

      await ensurePayoutRecord(supabase, order)
      const { data: updated, error: updateError } = await supabase
        .from('orders')
        .update(releasePatch(now, false))
        .eq('id', orderId)
        .neq('payout_status', 'released')
        .select('*')
        .single()
      if (updateError) throw updateError

      await notify(supabase, {
        user_id: order.seller_id,
        order_id: order.id,
        type: 'buyer_confirmed_order',
        title: 'Payment available',
        message: 'The buyer confirmed everything is OK. Seller payout is now available.',
      })

      return jsonResponse({ success: true, order: updated })
    }

    if (action === 'dispute_order') {
      const orderId = String(body.orderId || '')
      const type = String(body.type || 'not_as_described')
      const normalizedType = type === 'not_received' ? 'item_not_received' : type
      const reason = String(body.reason || normalizedType)
      const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single()
      if (error || !order) return jsonResponse({ error: 'Order not found.' }, 404)
      if (order.buyer_id !== user.id) return jsonResponse({ error: 'Only the buyer can report an issue.' }, 403)
      if (!order.delivered_at) return jsonResponse({ error: 'Issues can be reported after delivery.' }, 400)
      if (order.completed_at || order.payout_status === 'released') return jsonResponse({ error: 'This order is already completed.' }, 409)

      const { data: existing } = await supabase
        .from('disputes')
        .select('*')
        .eq('order_id', orderId)
        .in('status', ['open', 'under_review', 'escalated'])
        .limit(1)
        .maybeSingle()
      let dispute = existing
      if (!dispute) {
        const { data, error: disputeError } = await supabase
          .from('disputes')
          .insert({
            order_id: order.id,
            buyer_id: order.buyer_id,
            seller_id: order.seller_id,
            type: normalizedType,
            reason,
            description: reason,
            status: 'open',
            source: 'buyer',
          })
          .select('*')
          .single()
        if (disputeError) throw disputeError
        dispute = data
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'disputed',
          tracking_status: 'under_review',
          fulfilment_status: 'under_review',
          payout_status: 'disputed',
          disputed_at: now,
          updated_at: now,
        })
        .eq('id', order.id)
      if (orderError) throw orderError

      await notify(supabase, {
        user_id: order.seller_id,
        order_id: order.id,
        type: 'dispute_opened',
        title: 'Buyer reported an issue',
        message: `The buyer reported an issue: "${reason}". Funds remain held while Sib reviews it.`,
      })
      console.warn('[buyer-protection] support review required', { orderId: order.id, disputeId: dispute.id })

      return jsonResponse({ success: true, dispute })
    }

    if (action === 'mark_delivered') {
      const orderId = String(body.orderId || '')
      const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single()
      if (error || !order) return jsonResponse({ error: 'Order not found.' }, 404)
      if (![order.buyer_id, order.seller_id].includes(user.id)) return jsonResponse({ error: 'Forbidden.' }, 403)
      const deliveredAt = order.delivered_at || now
      const { data: updated, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          tracking_status: 'delivered',
          fulfilment_status: 'delivered',
          delivered_at: deliveredAt,
          buyer_confirmation_deadline: order.buyer_confirmation_deadline || deadlineFor(deliveredAt),
          payout_status: 'held',
          updated_at: now,
        })
        .eq('id', orderId)
        .select('*')
        .single()
      if (updateError) throw updateError
      return jsonResponse({ success: true, order: updated })
    }

    if (action === 'auto_release_due') {
      const nowMs = Date.now()
      const { data: dueOrders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tracking_status', 'delivered')
        .eq('payout_status', 'held')
        .is('disputed_at', null)
        .is('completed_at', null)
      if (error) throw error

      const completed: Array<Record<string, string>> = []
      for (const order of dueOrders || []) {
        const deadline = order.buyer_confirmation_deadline || (order.delivered_at ? deadlineFor(order.delivered_at) : null)
        if (!deadline || nowMs < new Date(deadline).getTime()) continue
        await ensurePayoutRecord(supabase, order)
        const { error: updateError } = await supabase
          .from('orders')
          .update(releasePatch(now, true))
          .eq('id', order.id)
          .eq('payout_status', 'held')
        if (updateError) throw updateError
        completed.push({ orderId: order.id })
      }
      return jsonResponse({ success: true, completed })
    }

    return jsonResponse({ error: 'Unknown action.' }, 400)
  } catch (error) {
    console.error('[buyer-protection] unexpected failure:', error)
    return jsonResponse({ error: error instanceof Error ? error.message : 'Buyer protection action failed.' }, 500)
  }
})
