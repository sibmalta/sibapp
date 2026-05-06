/**
 * notifications.js - Supabase data layer for in-app notifications.
 *
 * Notifications are persisted in Supabase so they are shared across devices.
 * All functions accept an authenticated supabase client.
 */

export function rowToNotification(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id || '',
    type: row.type || 'generic',
    title: row.title || '',
    message: row.message || '',
    read: row.read || false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    orderId: row.order_id || null,
    listingId: row.listing_id || null,
    conversationId: row.conversation_id || null,
    actionTarget: row.action_target || null,
    targetPath: row.target_path || null,
    status: row.status || null,
    metadata: row.metadata || {},
    data: row.data || {},
  }
}

export function notificationToRow(notification) {
  const row = {}
  if (notification.userId !== undefined) row.user_id = notification.userId
  if (notification.type !== undefined) row.type = notification.type
  if (notification.title !== undefined) row.title = notification.title
  if (notification.message !== undefined) row.message = notification.message
  if (notification.read !== undefined) row.read = notification.read
  if (notification.orderId !== undefined) row.order_id = notification.orderId
  if (notification.listingId !== undefined) row.listing_id = notification.listingId
  if (notification.conversationId !== undefined) row.conversation_id = notification.conversationId
  if (notification.actionTarget !== undefined) row.action_target = notification.actionTarget
  if (notification.targetPath !== undefined) row.target_path = notification.targetPath
  if (notification.status !== undefined) row.status = notification.status
  if (notification.metadata !== undefined) row.metadata = notification.metadata
  if (notification.data !== undefined) row.data = notification.data
  return row
}

const ORDER_SCOPED_DEDUPE_TYPES = new Set(['new_sale', 'bundle_sold', 'overdue_warning'])

export async function fetchUserNotifications(supabase, userId) {
  try {
    if (!userId) return { data: [], error: null }
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) return { data: null, error }
    return { data: (data || []).map(rowToNotification), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function insertNotification(supabase, notification) {
  try {
    const row = notificationToRow(notification)
    const { data, error } = await supabase
      .from('notifications')
      .insert(row)
      .select('*')
      .single()

    if (!error) return { data: rowToNotification(data), error: null }

    if (error.code === '23505' && row.user_id && row.type && row.order_id && ORDER_SCOPED_DEDUPE_TYPES.has(row.type)) {
      const { data: existing, error: existingError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', row.user_id)
        .eq('type', row.type)
        .eq('order_id', row.order_id)
        .limit(1)
        .maybeSingle()

      if (existingError) return { data: null, error: existingError }
      return { data: rowToNotification(existing), error: null }
    }

    const idempotencyKey = row.metadata?.idempotencyKey
    if (error.code === '23505' && row.type === 'offer_countered' && idempotencyKey) {
      const { data: existing, error: existingError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', row.user_id)
        .eq('type', row.type)
        .eq('metadata->>idempotencyKey', idempotencyKey)
        .limit(1)
        .maybeSingle()

      if (existingError) return { data: null, error: existingError }
      if (existing) return { data: rowToNotification(existing), error: null }
    }

    return { data: null, error }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function markNotificationRead(supabase, notificationId) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .select('*')
      .single()

    if (error) return { data: null, error }
    return { data: rowToNotification(data), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function markAllNotificationsRead(supabase, userId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    return { error: error || null }
  } catch (e) {
    return { error: { message: e.message } }
  }
}
