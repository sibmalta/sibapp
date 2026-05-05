const SAME_DAY_CUTOFF_HOUR = 12

function getMaltaHour(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Malta',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const hour = Number(parts.find(part => part.type === 'hour')?.value)
  return Number.isFinite(hour) ? hour : null
}

export function getCourierDeliveryTiming(scannedAt = new Date()) {
  const hour = getMaltaHour(scannedAt)
  if (hour === null) return 'next_day'
  return hour < SAME_DAY_CUTOFF_HOUR ? 'same_day' : 'next_day'
}

export function getCourierDeliveryTimingLabel(scannedAtOrTiming) {
  const timing = scannedAtOrTiming === 'same_day' || scannedAtOrTiming === 'next_day'
    ? scannedAtOrTiming
    : getCourierDeliveryTiming(scannedAtOrTiming)
  return timing === 'same_day' ? 'Same-day' : 'Next-day'
}

export function getCourierDeliveryTimingPublicLabel(scannedAtOrTiming) {
  const timing = scannedAtOrTiming === 'same_day' || scannedAtOrTiming === 'next_day'
    ? scannedAtOrTiming
    : getCourierDeliveryTiming(scannedAtOrTiming)
  return timing === 'same_day' ? 'Today' : 'Next working day'
}
