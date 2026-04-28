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
