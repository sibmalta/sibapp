/**
 * MaltaPost API Integration Layer for Sib Delivery
 *
 * This module provides a ready-to-connect interface to MaltaPost's
 * tracking and consignment APIs. Currently uses simulated responses
 * for development. Replace the mock implementations with real API
 * calls when MaltaPost API credentials are available.
 *
 * MaltaPost API docs: https://www.maltapost.com/
 * Expected endpoints:
 *   - POST /consignments      — Create a new shipment consignment
 *   - GET  /consignments/:id  — Get consignment details + tracking
 *   - GET  /tracking/:barcode — Public tracking by barcode
 *   - POST /labels/:id        — Generate shipping label PDF
 */

// ── Configuration ─────────────────────────────────────────────────
const MALTAPOST_API_BASE = import.meta.env.VITE_MALTAPOST_API_URL || 'https://api.maltapost.com/v1'
const MALTAPOST_API_KEY = import.meta.env.VITE_MALTAPOST_API_KEY || ''

// MaltaPost parcel size categories (Malta domestic)
export const PARCEL_SIZES = [
  { id: 'small', label: 'Small (up to 500g)', maxWeight: 500, price: 3.50 },
  { id: 'medium', label: 'Medium (500g–2kg)', maxWeight: 2000, price: 5.00 },
  { id: 'large', label: 'Large (2kg–5kg)', maxWeight: 5000, price: 7.50 },
  { id: 'xlarge', label: 'Extra Large (5kg–10kg)', maxWeight: 10000, price: 12.00 },
]

// MaltaPost tracking status map → Sib shipment status
const MALTAPOST_STATUS_MAP = {
  'ACCEPTED': 'awaiting_shipment',
  'COLLECTED': 'shipped',
  'IN_TRANSIT': 'in_transit',
  'OUT_FOR_DELIVERY': 'in_transit',
  'DELIVERED': 'delivered',
  'DELIVERY_FAILED': 'failed_delivery',
  'RETURNED_TO_SENDER': 'returned',
  'HELD_AT_DEPOT': 'in_transit',
}

// ── API Client ────────────────────────────────────────────────────
async function maltapostFetch(endpoint, options = {}) {
  const url = `${MALTAPOST_API_BASE}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...(MALTAPOST_API_KEY ? { 'Authorization': `Bearer ${MALTAPOST_API_KEY}` } : {}),
    ...options.headers,
  }

  try {
    const response = await fetch(url, { ...options, headers })
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new Error(`MaltaPost API error ${response.status}: ${errorBody}`)
    }
    return await response.json()
  } catch (err) {
    console.error('[MaltaPost]', err.message)
    throw err
  }
}

// ── Create Consignment ────────────────────────────────────────────
// Creates a new shipment consignment with MaltaPost.
// Returns { consignmentId, barcode, trackingNumber, labelUrl }
export async function createConsignment({
  senderName,
  senderAddress,
  senderPhone,
  recipientName,
  recipientAddress,
  recipientPhone,
  weightGrams,
  parcelSize,
  orderRef,
  description,
}) {
  // ── MOCK: Replace with real API call ──
  if (!MALTAPOST_API_KEY) {
    await new Promise(r => setTimeout(r, 800))
    const barcode = `MT${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    return {
      consignmentId: `CON-${Date.now()}`,
      barcode,
      trackingNumber: barcode,
      labelUrl: null, // Would be a PDF URL from MaltaPost
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    }
  }

  // ── REAL API call (uncomment when ready) ──
  // return maltapostFetch('/consignments', {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     sender: { name: senderName, address: senderAddress, phone: senderPhone },
  //     recipient: { name: recipientName, address: recipientAddress, phone: recipientPhone },
  //     parcel: { weight: weightGrams, size: parcelSize, description },
  //     reference: orderRef,
  //     service: 'TRACKED_DOMESTIC',
  //   }),
  // })
}

// ── Track Shipment ────────────────────────────────────────────────
// Returns { status, events: [{ timestamp, status, location, description }] }
export async function trackShipment(trackingNumber) {
  // ── MOCK: Replace with real API call ──
  if (!MALTAPOST_API_KEY) {
    await new Promise(r => setTimeout(r, 500))
    return {
      trackingNumber,
      status: 'IN_TRANSIT',
      sibStatus: 'in_transit',
      events: [
        {
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'IN_TRANSIT',
          location: 'Marsa Sorting Centre',
          description: 'Parcel in transit to delivery area',
        },
        {
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'COLLECTED',
          location: 'MaltaPost Office - Valletta',
          description: 'Parcel collected from sender',
        },
        {
          timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          status: 'ACCEPTED',
          location: 'MaltaPost Office - Valletta',
          description: 'Consignment created',
        },
      ],
    }
  }

  // ── REAL API call ──
  // const data = await maltapostFetch(`/tracking/${trackingNumber}`)
  // return {
  //   ...data,
  //   sibStatus: MALTAPOST_STATUS_MAP[data.status] || 'awaiting_shipment',
  // }
}

// ── Get Shipping Label ────────────────────────────────────────────
// Returns { labelUrl } — a URL to a PDF shipping label
export async function getShippingLabel(consignmentId) {
  if (!MALTAPOST_API_KEY) {
    await new Promise(r => setTimeout(r, 300))
    return { labelUrl: null, message: 'MaltaPost API not configured. Print label manually.' }
  }

  // return maltapostFetch(`/labels/${consignmentId}`, { method: 'POST' })
}

// ── Validate Malta Address ────────────────────────────────────────
// Basic Malta address validation
export function validateMaltaAddress(address) {
  if (!address || address.trim().length < 10) {
    return { valid: false, error: 'Address is too short. Include street, city, and postcode.' }
  }

  // Malta postcodes are 3-4 letters + 4 digits (e.g., VLT 1234, MST 1122)
  const postcodeRegex = /[A-Z]{2,4}\s?\d{4}/i
  const hasPostcode = postcodeRegex.test(address)

  // Common Malta localities
  const localities = [
    'valletta', 'sliema', 'st julians', "st julian's", 'gzira', 'msida', 'mosta',
    'naxxar', 'birkirkara', 'qormi', 'hamrun', 'marsa', 'paola', 'tarxien',
    'zabbar', 'zejtun', 'birgu', 'cospicua', 'senglea', 'floriana', 'pieta',
    'attard', 'balzan', 'lija', 'rabat', 'mdina', 'dingli', 'siggiewi',
    'mellieha', 'st pauls bay', "st paul's bay", 'bugibba', 'qawra',
    'marsascala', 'marsaxlokk', 'birzebbuga', 'gudja', 'luqa', 'kirkop',
    'safi', 'mqabba', 'zurrieq', 'fgura', 'santa venera', 'san gwann',
    'pembroke', 'swieqi', 'iklin', 'gharghur', 'xemxija',
    'victoria', 'gozo', 'xaghra', 'nadur', 'sannat', 'xlendi', 'marsalforn',
    'xewkija', 'ghajnsielem', 'munxar', 'fontana', 'kercem', 'zebbug',
  ]

  const lowerAddr = address.toLowerCase()
  const hasLocality = localities.some(loc => lowerAddr.includes(loc))

  return {
    valid: hasPostcode || hasLocality,
    hasPostcode,
    hasLocality,
    error: (!hasPostcode && !hasLocality) ? 'Please include a Malta locality or postcode.' : null,
  }
}

// ── Map MaltaPost status to Sib status ────────────────────────────
export function mapMaltaPostStatus(maltapostStatus) {
  return MALTAPOST_STATUS_MAP[maltapostStatus] || 'awaiting_shipment'
}

// ── Generate tracking URL for buyers ──────────────────────────────
export function getTrackingUrl(trackingNumber) {
  if (!trackingNumber) return null
  return `https://www.maltapost.com/track/?id=${encodeURIComponent(trackingNumber)}`
}

// ── Estimate delivery date ────────────────────────────────────────
// Malta domestic: typically 1-3 business days after shipping
export function estimateDeliveryDate(shippedAt) {
  if (!shippedAt) return null
  const shipped = new Date(shippedAt)
  // Add 2 business days
  let daysAdded = 0
  const estimated = new Date(shipped)
  while (daysAdded < 2) {
    estimated.setDate(estimated.getDate() + 1)
    const day = estimated.getDay()
    if (day !== 0 && day !== 6) daysAdded++ // Skip weekends
  }
  return estimated.toISOString()
}
