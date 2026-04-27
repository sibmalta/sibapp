const MALTAPOST_STATUS_MAP = {
  ACCEPTED: 'awaiting_shipment',
  CREATED: 'awaiting_shipment',
  READY_FOR_PICKUP: 'ready_for_pickup',
  COLLECTED: 'picked_up',
  PICKED_UP: 'picked_up',
  SHIPPED: 'shipped',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'in_transit',
  DELIVERED: 'delivered',
  DELIVERY_FAILED: 'failed',
  RETURNED_TO_SENDER: 'returned',
  HELD_AT_DEPOT: 'in_transit',
  CANCELLED: 'cancelled',
}

export const PARCEL_SIZES = [
  { id: 'small', label: 'Small (up to 500g)', maxWeight: 500, price: 3.25 },
  { id: 'medium', label: 'Medium (500g-2kg)', maxWeight: 2000, price: 4.50 },
  { id: 'large', label: 'Large (2kg-5kg)', maxWeight: 5000, price: 7.50 },
  { id: 'xlarge', label: 'Extra Large (5kg-10kg)', maxWeight: 10000, price: 12.00 },
]

export function mapMaltaPostStatus(maltapostStatus) {
  return MALTAPOST_STATUS_MAP[String(maltapostStatus || '').toUpperCase()] || 'awaiting_shipment'
}

export function getTrackingUrl(trackingNumber) {
  if (!trackingNumber) return null
  return `https://www.maltapost.com/track/?id=${encodeURIComponent(trackingNumber)}`
}

export function estimateDeliveryDate(shippedAt) {
  if (!shippedAt) return null
  const shipped = new Date(shippedAt)
  let daysAdded = 0
  const estimated = new Date(shipped)
  while (daysAdded < 2) {
    estimated.setDate(estimated.getDate() + 1)
    const day = estimated.getDay()
    if (day !== 0 && day !== 6) daysAdded += 1
  }
  return estimated.toISOString()
}

export function validateMaltaAddress(address) {
  if (!address || String(address).trim().length < 10) {
    return { valid: false, error: 'Address is too short. Include street, city, and postcode.' }
  }

  const postcodeRegex = /[A-Z]{2,4}\s?\d{4}/i
  const hasPostcode = postcodeRegex.test(address)
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

  const lowerAddr = String(address).toLowerCase()
  const hasLocality = localities.some(loc => lowerAddr.includes(loc))

  return {
    valid: hasPostcode || hasLocality,
    hasPostcode,
    hasLocality,
    error: (!hasPostcode && !hasLocality) ? 'Please include a Malta locality or postcode.' : null,
  }
}

export async function createConsignment(order, options = {}) {
  const { createShippingProvider } = await import('./shippingProvider')
  return createShippingProvider(options).createShipment(order)
}

export async function trackShipment(trackingNumber, options = {}) {
  const { createShippingProvider } = await import('./shippingProvider')
  return createShippingProvider(options).trackShipment(trackingNumber)
}
