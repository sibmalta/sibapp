const DEFAULT_SCAN_PATH = '/scan-dropoff'

export function normalizeOrderCode(value) {
  return String(value || '')
    .trim()
    .replace(/^#/, '')
    .replace(/\s+/g, '')
    .toUpperCase()
}

export function getOrderCode(order = {}) {
  const explicit = order?.orderRef || order?.order_ref || order?.orderNumber || order?.order_number
  if (explicit) return normalizeOrderCode(explicit)

  const id = order?.id || order?.orderId || order?.order_id
  const shortId = String(id || '').replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase()
  return shortId ? `SIB-${shortId}` : 'SIB-UNKNOWN'
}

export function getDropoffScanToken(order = {}) {
  return String(order?.dropoffScanToken || order?.dropoff_scan_token || '').trim()
}

export function orderCodeMatches(order, code) {
  return normalizeOrderCode(code) === getOrderCode(order)
}

export function buildDropoffScanPath(order, basePath = DEFAULT_SCAN_PATH) {
  const orderId = order?.id || order?.orderId || order?.order_id || ''
  const code = getOrderCode(order)
  const token = getDropoffScanToken(order)
  const params = new URLSearchParams({ orderId, code })
  if (token) params.set('token', token)
  return `${basePath}?${params.toString()}`
}

export function buildDropoffScanUrl(order, origin = '') {
  const path = buildDropoffScanPath(order)
  const safeOrigin = String(origin || '').replace(/\/+$/, '')
  return safeOrigin ? `${safeOrigin}${path}` : path
}

export function getQrCodeImageUrl(value, size = 220) {
  const encoded = encodeURIComponent(String(value || ''))
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`
}

export function isDropoffConfirmed({ order = {}, shipment = {} } = {}) {
  return Boolean(
    order?.dropoffConfirmedAt ||
    shipment?.dropoffConfirmedAt ||
    shipment?.status === 'dropped_off' ||
    order?.fulfilmentStatus === 'dropped_off'
  )
}
