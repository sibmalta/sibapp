import { supabase } from './supabase'

function normalizeScanPayload({ orderId, token, code } = {}) {
  return {
    p_order_id: String(orderId || '').trim(),
    p_token: String(token || '').trim(),
    p_code: code ? String(code).trim() : null,
  }
}

export async function getPublicDropoffScan(payload) {
  const { data, error } = await supabase.rpc('get_public_dropoff_scan', normalizeScanPayload(payload))
  return { data, error }
}

export async function confirmPublicDropoffScan(payload) {
  const { data, error } = await supabase.rpc('confirm_public_dropoff_scan', normalizeScanPayload(payload))
  return { data, error }
}
