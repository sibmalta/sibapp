import { supabase } from './supabase'
import { getCourierDeliveryTimingLabel } from './courierDeliveryTiming'

const INVALID_MESSAGE = 'Invalid or expired QR code.'
const READY_MESSAGE = 'Ready to confirm this parcel.'
const CONFIRMED_MESSAGE = 'Parcel already confirmed.'

function normalizeScanPayload({ orderId, token, code } = {}) {
  return {
    p_order_id: String(orderId || '').trim(),
    p_token: String(token || '').trim(),
    p_code: code ? String(code).trim() : null,
  }
}

export function getPublicDropoffScanState(scan = {}) {
  const invalid = !scan
    || scan.valid === false
    || scan.ok === false
    || scan.codeValid === false
    || scan.error === 'invalid_scan'
    || scan.error === 'code_mismatch'

  if (invalid) {
    return {
      invalid: true,
      confirmed: false,
      canConfirm: false,
      statusLabel: 'Invalid or expired QR code',
      message: INVALID_MESSAGE,
    }
  }

  const confirmed = Boolean(scan.confirmed || scan.alreadyConfirmed)

  if (confirmed) {
    const deliveryTiming = scan.deliveryTiming || scan.delivery_timing || null
    return {
      invalid: false,
      confirmed: true,
      canConfirm: false,
      statusLabel: 'Parcel already confirmed',
      message: CONFIRMED_MESSAGE,
      deliveryTimingLabel: deliveryTiming ? getCourierDeliveryTimingLabel(deliveryTiming) : null,
    }
  }

  return {
    invalid: false,
    confirmed: false,
    canConfirm: true,
    statusLabel: 'Ready for drop-off',
    message: READY_MESSAGE,
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
