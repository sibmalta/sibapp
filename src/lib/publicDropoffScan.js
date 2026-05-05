import { supabase } from './supabase'
import { getCourierDeliveryTimingPublicLabel } from './courierDeliveryTiming'

const INVALID_MESSAGE = 'Invalid or expired QR code.'
const READY_MESSAGE = 'Ready to confirm this parcel.'
const CONFIRMED_MESSAGE = 'Parcel already confirmed.'

export function sanitizePublicStore(row = {}) {
  return {
    id: row.id,
    name: row.name || '',
    address: row.address || '',
    locality: row.locality || '',
    pickupZone: row.pickup_zone || row.pickupZone || null,
    active: row.active !== false,
  }
}

function normalizeScanPayload({ orderId, token, code } = {}) {
  return {
    p_order_id: String(orderId || '').trim(),
    p_token: String(token || '').trim(),
    p_code: code ? String(code).trim() : null,
  }
}

function normalizeConfirmPayload(payload = {}) {
  const base = normalizeScanPayload(payload)
  return {
    ...base,
    p_store_pin: String(payload.storePin || '').trim() || null,
  }
}

function normalizeStorePinPayload({ storePin } = {}) {
  return {
    p_store_pin: String(storePin || '').trim(),
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

  const confirmed = Boolean(scan.confirmed || scan.alreadyConfirmed || scan.confirmedNow)

  if (confirmed) {
    const deliveryTiming = scan.deliveryTiming || scan.delivery_timing || null
    const storeName = scan.storeName || scan.dropoffStoreName || scan.dropoff_location_name || scan.dropoffLocationName || scan.dropoff_location || scan.dropoffLocation || null
    return {
      invalid: false,
      confirmed: true,
      canConfirm: false,
      statusLabel: scan.confirmedNow ? 'Parcel confirmed' : 'Parcel already confirmed',
      message: scan.confirmedNow ? 'Parcel confirmed.' : CONFIRMED_MESSAGE,
      storeName,
      confirmedAt: scan.confirmedAt || scan.dropoffConfirmedAt || scan.dropoff_confirmed_at || null,
      deliveryTimingLabel: deliveryTiming ? getCourierDeliveryTimingPublicLabel(deliveryTiming) : null,
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

export async function identifyPublicDropoffStoreByPin(payload) {
  const { data, error } = await supabase.rpc('identify_public_dropoff_store_by_pin', normalizeStorePinPayload(payload))
  return {
    data: data?.valid ? sanitizePublicStore(data.store || {}) : null,
    error: error || (data?.valid === false ? { message: data.message || 'Invalid store PIN' } : null),
  }
}

export async function confirmPublicDropoffScan(payload) {
  const { data, error } = await supabase.rpc('confirm_public_dropoff_scan', normalizeConfirmPayload(payload))
  if (!error && data?.error === 'invalid_store_pin') {
    return { data: null, error: { message: data.message || 'Invalid store PIN' } }
  }
  if (!error && data?.confirmedNow && !data?.logisticsRowCreated) {
    console.warn('[dropoff-scan] confirmation succeeded but logistics delivery sheet row was not created', {
      orderId: payload?.orderId || data?.orderId,
      storeId: data?.storeId,
    })
  }
  return { data, error }
}
