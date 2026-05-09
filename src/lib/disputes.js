export const ACTIVE_DISPUTE_STATUSES = ['open', 'in_review', 'under_review', 'escalated']

export function isActiveDisputeStatus(status) {
  return ACTIVE_DISPUTE_STATUSES.includes(status)
}

export function sortDisputesForAdmin(disputes = []) {
  return [...disputes].sort((a, b) => {
    const aActive = isActiveDisputeStatus(a.status)
    const bActive = isActiveDisputeStatus(b.status)
    if (aActive !== bActive) return aActive ? -1 : 1
    return new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime()
  })
}

export function rowToDisputeMessage(row) {
  if (!row) return null
  return {
    id: row.id,
    disputeId: row.dispute_id || '',
    conversationId: row.conversation_id || null,
    orderId: row.order_id || '',
    senderProfileId: row.sender_profile_id || null,
    senderRole: row.sender_role || 'system',
    message: row.message || '',
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    visibility: row.visibility || 'public',
    messageType: row.message_type || (row.sender_role === 'system' ? 'system' : 'message'),
    createdAt: row.created_at || new Date().toISOString(),
  }
}

export function disputeMessageToRow(message = {}) {
  const row = {}
  if (message.disputeId !== undefined) row.dispute_id = message.disputeId
  if (message.conversationId !== undefined) row.conversation_id = message.conversationId
  if (message.orderId !== undefined) row.order_id = message.orderId
  if (message.senderProfileId !== undefined) row.sender_profile_id = message.senderProfileId
  if (message.senderRole !== undefined) row.sender_role = message.senderRole
  if (message.message !== undefined) row.message = message.message
  if (message.attachments !== undefined) row.attachments = Array.isArray(message.attachments) ? message.attachments : []
  if (message.visibility !== undefined) row.visibility = message.visibility || 'public'
  if (message.messageType !== undefined) row.message_type = message.messageType || 'message'
  return row
}

export function getDisputeMessagesForDispute(messages = [], disputeId, { includeInternal = true } = {}) {
  return [...messages]
    .filter(message => message.disputeId === disputeId || message.dispute_id === disputeId)
    .filter(message => includeInternal || (message.visibility || 'public') !== 'internal')
    .sort((a, b) => new Date(a.createdAt || a.created_at || 0).getTime() - new Date(b.createdAt || b.created_at || 0).getTime())
}

export function isInternalDisputeMessage(message) {
  return message?.visibility === 'internal' || message?.messageType === 'note'
}

export function disputeConversationId(disputeId) {
  return disputeId ? `dispute_${disputeId}` : ''
}

export function buildDisputeThreadConversation({ dispute, messages = [], currentUserId, isAdmin = false, users = [], listing = null, order = null } = {}) {
  if (!dispute?.id) return null
  const isParticipant = currentUserId && [dispute.buyerId, dispute.buyer_id, dispute.sellerId, dispute.seller_id].includes(currentUserId)
  const canViewAsAdmin = isAdmin || users.find(user => user.id === currentUserId)?.isAdmin
  if (!isParticipant && !canViewAsAdmin) return null

  const buyerId = dispute.buyerId || dispute.buyer_id
  const sellerId = dispute.sellerId || dispute.seller_id
  const participantIds = [buyerId, sellerId].filter(Boolean)
  const visibleMessages = getDisputeMessagesForDispute(messages, dispute.id, { includeInternal: !!canViewAsAdmin })
    .filter(message => canViewAsAdmin || !isInternalDisputeMessage(message))
    .map(message => ({
      id: message.id,
      senderId: message.senderRole === 'system' ? 'system' : (message.senderProfileId || message.sender_profile_id || message.senderRole),
      recipientId: null,
      text: message.message || '',
      timestamp: message.createdAt || message.created_at || new Date().toISOString(),
      type: message.messageType === 'system' || message.senderRole === 'system' ? 'system' : 'dispute_message',
      eventType: message.messageType === 'system' || message.senderRole === 'system' ? 'dispute_event' : 'dispute_message',
      read: true,
      disputeId: dispute.id,
      orderId: dispute.orderId || dispute.order_id,
      senderRole: message.senderRole,
      attachments: message.attachments || [],
      visibility: message.visibility || 'public',
      messageType: message.messageType || 'message',
      title: message.senderRole === 'system' ? message.message : undefined,
      lines: [],
    }))

  return {
    id: disputeConversationId(dispute.id),
    participants: participantIds,
    listingId: dispute.listingId || dispute.listing_id || order?.listingId || order?.listing_id || null,
    orderId: dispute.orderId || dispute.order_id || null,
    messages: visibleMessages,
    createdAt: dispute.createdAt || dispute.created_at || null,
    updatedAt: visibleMessages[visibleMessages.length - 1]?.timestamp || dispute.updatedAt || dispute.updated_at || dispute.createdAt || null,
    metadata: {
      type: 'dispute',
      disputeId: dispute.id,
      orderId: dispute.orderId || dispute.order_id || null,
      status: dispute.status || 'open',
      listingTitle: listing?.title || order?.listingTitle || order?.itemTitle || '',
      orderCode: order?.orderRef || order?.order_code || order?.orderCode || '',
    },
  }
}

export function getEvidenceSenderRole({ dispute, currentUserId }) {
  if (!dispute || !currentUserId) return null
  if (dispute.buyerId === currentUserId || dispute.buyer_id === currentUserId) return 'buyer'
  if (dispute.sellerId === currentUserId || dispute.seller_id === currentUserId) return 'seller'
  return null
}

export function canReadDisputeMessage({ dispute, currentUserId, isAdmin = false }) {
  if (isAdmin) return true
  return Boolean(dispute && currentUserId && (
    dispute.buyerId === currentUserId ||
    dispute.buyer_id === currentUserId ||
    dispute.sellerId === currentUserId ||
    dispute.seller_id === currentUserId
  ))
}

export function canInsertDisputeEvidence({ dispute, currentUserId, senderRole }) {
  if (!dispute || !currentUserId) return false
  if (senderRole === 'buyer') return dispute.buyerId === currentUserId || dispute.buyer_id === currentUserId
  if (senderRole === 'seller') return dispute.sellerId === currentUserId || dispute.seller_id === currentUserId
  return false
}

export async function openDisputeCase(supabase, {
  orderId,
  reason,
  details,
  type = 'admin_review',
} = {}) {
  const { data, error } = await supabase.rpc('open_dispute_case', {
    p_order_id: orderId,
    p_reason: reason || 'Dispute opened',
    p_details: details || reason || null,
    p_type: type,
  })

  return { data, error }
}

export async function fetchDisputeMessages(supabase) {
  const { data, error } = await supabase
    .from('dispute_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1000)

  return {
    data: error ? null : (data || []).map(rowToDisputeMessage),
    error,
  }
}

export async function insertDisputeMessage(supabase, message) {
  const attachments = Array.isArray(message?.attachments) ? message.attachments : []
  const useThreadRpc = message?.useThreadRpc !== false
  const { data, error } = useThreadRpc
    ? await supabase.rpc('add_dispute_thread_message', {
        p_dispute_id: message.disputeId,
        p_message: message.message || '',
        p_visibility: message.visibility || 'public',
        p_message_type: message.messageType || 'message',
        p_attachments: attachments,
      })
    : await supabase
        .from('dispute_messages')
        .insert(disputeMessageToRow({ ...message, attachments }))
        .select()
        .single()

  return {
    data: error ? null : rowToDisputeMessage(data),
    error,
  }
}
