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
    orderId: row.order_id || '',
    senderProfileId: row.sender_profile_id || null,
    senderRole: row.sender_role || 'system',
    message: row.message || '',
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdAt: row.created_at || new Date().toISOString(),
  }
}

export function disputeMessageToRow(message = {}) {
  const row = {}
  if (message.disputeId !== undefined) row.dispute_id = message.disputeId
  if (message.orderId !== undefined) row.order_id = message.orderId
  if (message.senderProfileId !== undefined) row.sender_profile_id = message.senderProfileId
  if (message.senderRole !== undefined) row.sender_role = message.senderRole
  if (message.message !== undefined) row.message = message.message
  if (message.attachments !== undefined) row.attachments = Array.isArray(message.attachments) ? message.attachments : []
  return row
}

export function getDisputeMessagesForDispute(messages = [], disputeId) {
  return [...messages]
    .filter(message => message.disputeId === disputeId || message.dispute_id === disputeId)
    .sort((a, b) => new Date(a.createdAt || a.created_at || 0).getTime() - new Date(b.createdAt || b.created_at || 0).getTime())
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
  const { data, error } = await supabase
    .from('dispute_messages')
    .insert(disputeMessageToRow(message))
    .select()
    .single()

  return {
    data: error ? null : rowToDisputeMessage(data),
    error,
  }
}
