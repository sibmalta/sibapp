import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
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

function validateCronSecret(req: Request, action: string) {
  if (action !== 'auto_release_due') {
    return { ok: false, status: 403, code: 'unauthorized', message: 'Cron auth is only allowed for auto_release_due.' }
  }

  const expectedSecret = getEnv('BUYER_PROTECTION_CRON_SECRET', 'INTERNAL_FUNCTION_SECRET')
  if (!expectedSecret) {
    return { ok: false, status: 500, code: 'missing_cron_secret', message: 'Buyer protection cron secret is not configured.' }
  }

  const receivedSecret = req.headers.get('x-cron-secret') || ''
  if (!receivedSecret) {
    return { ok: false, status: 401, code: 'missing_cron_secret', message: 'Missing x-cron-secret header.' }
  }

  if (receivedSecret !== expectedSecret) {
    return { ok: false, status: 403, code: 'invalid_cron_secret', message: 'Invalid x-cron-secret header.' }
  }

  return { ok: true, status: 200, code: '', message: '' }
}

async function authenticate(req: Request, action: string) {
  if (action === 'auto_release_due' || req.headers.get('x-cron-secret')) {
    const cronAuth = validateCronSecret(req, action)
    if (!cronAuth.ok) return { user: null, error: cronAuth.message, code: cronAuth.code, status: cronAuth.status }
    return { user: { id: 'system:auto-release', isCron: true }, error: null, code: '', status: 200 }
  }

  const supabaseUrl = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
  const anonKey = getEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY')
  const token = getBearerToken(req)
  if (!supabaseUrl || !anonKey || !token) return { user: null, error: 'Missing auth configuration or token.', code: 'unauthorized', status: 401 }
  const authClient = createClient(supabaseUrl, anonKey)
  const { data, error } = await authClient.auth.getUser(token)
  return { user: data?.user || null, error: error?.message || null, code: error ? 'unauthorized' : '', status: error ? 401 : 200 }
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

async function markPayoutReleasable(supabase: ReturnType<typeof createClient>, order: Record<string, any>) {
  const payout = await ensurePayoutRecord(supabase, order)
  const { data, error } = await supabase
    .from('payouts')
    .update({
      status: 'releasable',
      updated_at: new Date().toISOString(),
    })
    .eq('id', payout.id)
    .in('status', ['pending', 'held', 'releasable', 'transfer_failed'])
    .select('id,status')
    .single()
  if (error) throw error
  return data
}

async function recordAutoReleaseAttempt(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('orders')
    .update({
      auto_release_attempted_at: new Date().toISOString(),
      ...patch,
    })
    .eq('id', orderId)
  if (error) console.error('[buyer-protection] failed to record auto-release attempt:', { orderId, error: error.message })
}

async function triggerTransfer(orderId: string) {
  const supabaseUrl = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
  const serviceRoleKey = getEnv('SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY')
  const secret = getEnv('BUYER_PROTECTION_CRON_SECRET', 'INTERNAL_FUNCTION_SECRET')
  if (!supabaseUrl || !serviceRoleKey || !secret) {
    return {
      ok: false,
      status: 500,
      body: { error: 'Missing SUPABASE_URL, service role key, or BUYER_PROTECTION_CRON_SECRET for automatic transfer.' },
    }
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/create-transfer`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'x-cron-secret': secret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderId }),
  })
  const body = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, body }
}

async function notify(supabase: ReturnType<typeof createClient>, row: Record<string, unknown>) {
  const { error } = await supabase.from('notifications').insert({
    read: false,
    target_path: row.order_id ? `/orders/${row.order_id}` : null,
    ...row,
  })
  if (error && error.code !== '23505') console.error('[buyer-protection] notification failed:', error.message)
}

function displayName(profile: Record<string, any> | null | undefined, fallback = 'User') {
  return profile?.name || profile?.username || profile?.email || fallback
}

async function profileById(supabase: ReturnType<typeof createClient>, userId: string) {
  if (!userId) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,username,email')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('[buyer-protection] failed to load profile:', { userId, error: error.message })
    return null
  }
  return data
}

async function sendTransactionalEmail(type: string, to: string | null | undefined, data: Record<string, any>, meta: Record<string, any>) {
  if (!to) {
    console.error('[buyer-protection] missing email recipient', { type, meta })
    return { success: false, emailSent: false, error: 'missing_recipient' }
  }

  const supabaseUrl = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
  const serviceRoleKey = getEnv('SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[buyer-protection] cannot send email; missing function auth configuration', { type, to })
    return { success: false, emailSent: false, error: 'missing_function_auth' }
  }

  console.info('[buyer-protection] sending dispute email', { type, to, orderId: meta.orderId, disputeId: meta.disputeId })
  const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, to, data, meta }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body?.emailSent === false) {
    console.error('[buyer-protection] dispute email failed', { type, to, status: response.status, body })
  } else {
    console.info('[buyer-protection] dispute email sent', { type, to, response: body })
  }
  return { ok: response.ok, status: response.status, body }
}

async function insertDisputeWithFallback(supabase: ReturnType<typeof createClient>, row: Record<string, any>) {
  const { data, error } = await supabase.from('disputes').insert(row).select('*').single()
  if (!error) return { data, error: null }

  const message = error.message || ''
  const missingColumn = message.match(/Could not find the '([^']+)' column/i)?.[1]
  if (missingColumn && missingColumn in row && ['listing_id', 'details', 'admin_notes', 'resolved_at'].includes(missingColumn)) {
    console.warn('[buyer-protection] disputes schema missing optional column; retrying insert', { missingColumn })
    const { [missingColumn]: _removed, ...nextRow } = row
    return insertDisputeWithFallback(supabase, nextRow)
  }
  return { data: null, error }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '')
    const { user, error: authError, code: authCode, status: authStatus } = await authenticate(req, action)
    if (authError || !user) {
      return jsonResponse({ error: authError || 'Unauthorized.', code: authCode || 'unauthorized' }, authStatus || 401)
    }

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

      await markPayoutReleasable(supabase, order)
      const { data: updated, error: updateError } = await supabase
        .from('orders')
        .update(releasePatch(now, false))
        .eq('id', orderId)
        .neq('payout_status', 'released')
        .select('*')
        .single()
      if (updateError) throw updateError

      const transferResult = await triggerTransfer(order.id)
      if (!transferResult.ok) {
        console.error('[buyer-protection] buyer-confirm transfer failed:', {
          orderId: order.id,
          status: transferResult.status,
          body: transferResult.body,
        })
      }

      await notify(supabase, {
        user_id: order.seller_id,
        order_id: order.id,
        type: 'buyer_confirmed_order',
        title: 'Payment available',
        message: 'The buyer confirmed everything is OK. Seller payout is now available.',
      })

      return jsonResponse({ success: true, order: updated, transfer: transferResult.body })
    }

    if (action === 'dispute_order') {
      const orderId = String(body.orderId || '')
      const type = String(body.type || 'not_as_described')
      const normalizedType = type === 'not_received' ? 'item_not_received' : type
      const reason = String(body.reason || normalizedType)
      const details = String(body.details || body.description || reason)
      const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single()
      if (error || !order) return jsonResponse({ error: 'Order not found.' }, 404)
      if (order.buyer_id !== user.id) return jsonResponse({ error: 'Only the buyer can report an issue.' }, 403)
      if (!order.delivered_at) return jsonResponse({ error: 'Issues can be reported after delivery.' }, 400)
      if (order.completed_at || order.payout_status === 'released') return jsonResponse({ error: 'This order is already completed.' }, 409)

      const [buyerProfile, sellerProfile] = await Promise.all([
        profileById(supabase, order.buyer_id),
        profileById(supabase, order.seller_id),
      ])
      const listingTitle = order.listing_title || 'Unknown item'

      const { data: existing } = await supabase
        .from('disputes')
        .select('*')
        .eq('order_id', orderId)
        .in('status', ['open', 'in_review', 'under_review', 'escalated'])
        .limit(1)
        .maybeSingle()
      let dispute = existing
      if (!dispute) {
        const { data, error: disputeError } = await insertDisputeWithFallback(supabase, {
          order_id: order.id,
          buyer_id: order.buyer_id,
          seller_id: order.seller_id,
          listing_id: order.listing_id || null,
          type: normalizedType,
          reason,
          description: details,
          details,
          status: 'open',
          source: 'buyer',
        })
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
        listing_id: order.listing_id || null,
        type: 'dispute_opened',
        title: 'Buyer reported an issue',
        message: 'A dispute has been raised on this order. Sib is investigating and may contact you for more details. The payout for this order is temporarily held until the dispute is resolved.',
        metadata: { disputeId: dispute.id, reason, details },
      })
      await notify(supabase, {
        user_id: order.buyer_id,
        order_id: order.id,
        listing_id: order.listing_id || null,
        type: 'dispute_opened_buyer',
        title: 'Dispute raised',
        message: 'Your dispute has been raised. Sib is investigating and may contact you for more details. Funds will remain held while we review the issue.',
        metadata: { disputeId: dispute.id, reason, details },
      })

      const orderRef = order.order_ref || order.id
      const commonMeta = {
        related_entity_type: 'dispute',
        related_entity_id: dispute.id,
        disputeId: dispute.id,
        orderId: order.id,
        listingId: order.listing_id || null,
        buyerId: order.buyer_id,
        sellerId: order.seller_id,
      }
      await sendTransactionalEmail('dispute_admin_alert', 'info@sibmalta.com', {
        orderRef,
        orderId: order.id,
        listingTitle,
        buyerName: displayName(buyerProfile, 'Buyer'),
        buyerEmail: buyerProfile?.email || '',
        sellerName: displayName(sellerProfile, 'Seller'),
        sellerEmail: sellerProfile?.email || '',
        reason,
        details,
        createdAt: now,
      }, commonMeta)
      await sendTransactionalEmail('dispute_opened', buyerProfile?.email, {
        recipientName: displayName(buyerProfile, 'there'),
        orderRef,
        reason,
        role: 'buyer',
      }, commonMeta)
      await sendTransactionalEmail('dispute_opened', sellerProfile?.email, {
        recipientName: displayName(sellerProfile, 'there'),
        orderRef,
        reason,
        role: 'seller',
      }, commonMeta)

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
        .in('tracking_status', ['delivered', 'completed', 'confirmed'])
        .in('payout_status', ['held', 'releasable', 'transfer_failed'])
        .is('disputed_at', null)
        .is('payout_released_at', null)
      if (error) throw error

      const processed: Array<Record<string, unknown>> = []
      const skipped: Array<Record<string, unknown>> = []
      const failed: Array<Record<string, unknown>> = []
      for (const order of dueOrders || []) {
        if (order.payout_status === 'released' || order.seller_payout_status === 'paid') {
          skipped.push({ orderId: order.id, reason: 'already_released' })
          continue
        }
        if (order.disputed_at || order.payout_status === 'disputed') {
          skipped.push({ orderId: order.id, reason: 'disputed' })
          continue
        }
        const { data: openDispute, error: disputeCheckError } = await supabase
          .from('disputes')
          .select('id,status')
          .eq('order_id', order.id)
          .in('status', ['open', 'in_review', 'under_review', 'escalated'])
          .limit(1)
          .maybeSingle()
        if (disputeCheckError) {
          failed.push({ orderId: order.id, error: `dispute_check_failed: ${disputeCheckError.message}` })
          continue
        }
        if (openDispute) {
          skipped.push({ orderId: order.id, reason: `active_dispute:${openDispute.status}` })
          continue
        }
        const deadline = order.buyer_confirmation_deadline || (order.delivered_at ? deadlineFor(order.delivered_at) : null)
        if (order.payout_status !== 'releasable' && (!deadline || nowMs < new Date(deadline).getTime())) {
          skipped.push({ orderId: order.id, reason: 'deadline_not_due' })
          continue
        }

        try {
          await markPayoutReleasable(supabase, order)
          if (order.payout_status !== 'releasable') {
            const { error: updateError } = await supabase
              .from('orders')
              .update(releasePatch(now, true))
              .eq('id', order.id)
              .eq('payout_status', order.payout_status)
              .is('disputed_at', null)
              .is('payout_released_at', null)
            if (updateError) throw updateError
          }

          const transferResult = await triggerTransfer(order.id)
          if (!transferResult.ok) {
            const errorMessage = String(transferResult.body?.error || 'automatic_transfer_failed')
            await recordAutoReleaseAttempt(supabase, order.id, {
              auto_release_result: {
                success: false,
                status: transferResult.status,
                transfer: transferResult.body,
              },
              auto_release_error: errorMessage,
            })
            failed.push({ orderId: order.id, status: transferResult.status, error: errorMessage })
            continue
          }

          await recordAutoReleaseAttempt(supabase, order.id, {
            auto_release_result: {
              success: true,
              transfer: transferResult.body,
            },
            auto_release_error: null,
          })
          processed.push({ orderId: order.id, transfer: transferResult.body })
        } catch (releaseError) {
          const errorMessage = releaseError instanceof Error ? releaseError.message : String(releaseError)
          await recordAutoReleaseAttempt(supabase, order.id, {
            auto_release_result: {
              success: false,
              error: errorMessage,
            },
            auto_release_error: errorMessage,
          })
          failed.push({ orderId: order.id, error: errorMessage })
        }
      }
      console.info('[buyer-protection] auto_release_due processed', {
        processedOrderIds: processed.map((row) => row.orderId),
        failed,
        skippedCount: skipped.length,
      })
      return jsonResponse({ success: true, processed, failed, skipped })
    }

    return jsonResponse({ error: 'Unknown action.' }, 400)
  } catch (error) {
    console.error('[buyer-protection] unexpected failure:', error)
    return jsonResponse({ error: error instanceof Error ? error.message : 'Buyer protection action failed.' }, 500)
  }
})
