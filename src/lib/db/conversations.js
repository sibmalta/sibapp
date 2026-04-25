/**
 * Supabase data layer for chat conversations and messages.
 * All functions accept an authenticated Supabase client.
 */

function messageMetadata(row) {
  return row?.metadata && typeof row.metadata === 'object' ? row.metadata : {}
}

export function rowToMessage(row, currentUserId) {
  if (!row) return null
  const metadata = messageMetadata(row)
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id || null,
    text: row.text || '',
    timestamp: row.created_at || new Date().toISOString(),
    type: row.type || metadata.type || undefined,
    eventType: row.event_type || metadata.eventType || metadata.event_type || undefined,
    flagged: !!row.flagged,
    read: row.sender_id === currentUserId || !!row.read_at,
    readAt: row.read_at || null,
    ...metadata,
  }
}

export function rowToConversation(row, currentUserId) {
  if (!row) return null
  const messages = (row.messages || [])
    .map(message => rowToMessage(message, currentUserId))
    .filter(Boolean)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  return {
    id: row.id,
    participants: row.participant_ids || [],
    listingId: row.listing_id || null,
    messages,
    metadata: row.metadata || {},
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || row.created_at || null,
  }
}

export async function fetchUserConversations(supabase, userId) {
  try {
    if (!userId) return { data: [], error: null }
    const { data, error } = await supabase
      .from('conversations')
      .select('*, messages(*)')
      .contains('participant_ids', [userId])
      .order('updated_at', { ascending: false })
      .order('created_at', { referencedTable: 'messages', ascending: true })

    if (error) return { data: null, error }
    return { data: (data || []).map(row => rowToConversation(row, userId)), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function upsertConversation(supabase, conversation) {
  try {
    const row = {
      id: conversation.id,
      participant_ids: conversation.participants || [],
      listing_id: conversation.listingId || null,
      metadata: conversation.metadata || {},
    }

    const { data, error } = await supabase
      .from('conversations')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) return { data: null, error }
    return { data: rowToConversation({ ...data, messages: [] }, null), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function insertMessage(supabase, message) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: message.conversationId,
        sender_id: message.senderId,
        recipient_id: message.recipientId || null,
        text: message.text || '',
        type: message.type || 'message',
        event_type: message.eventType || null,
        flagged: !!message.flagged,
        metadata: message.metadata || {},
      })
      .select('*')
      .single()

    if (error) return { data: null, error }
    return { data: rowToMessage(data, message.senderId), error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export async function markConversationRead(supabase, conversationId, userId) {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('recipient_id', userId)
      .is('read_at', null)

    return { error: error || null }
  } catch (e) {
    return { error: { message: e.message } }
  }
}
