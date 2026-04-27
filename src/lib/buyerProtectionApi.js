import { supabase, ensureFreshSupabaseSession } from './supabase'

async function invokeBuyerProtection(action, payload = {}) {
  const session = await ensureFreshSupabaseSession()
  const { data, error } = await supabase.functions.invoke('buyer-protection', {
    body: { action, ...payload },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export function confirmBuyerProtectionOrder(orderId) {
  return invokeBuyerProtection('confirm_order', { orderId })
}

export function disputeBuyerProtectionOrder(orderId, { type, reason } = {}) {
  return invokeBuyerProtection('dispute_order', { orderId, type, reason })
}

export function autoReleaseBuyerProtectionOrders() {
  return invokeBuyerProtection('auto_release_due')
}
