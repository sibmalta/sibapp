const SAME_DAY_CUTOFF_HOUR = 12

export function getCourierDeliveryTiming(scannedAt = new Date()) {
  const date = scannedAt instanceof Date ? scannedAt : new Date(scannedAt)
  if (Number.isNaN(date.getTime())) return 'next_day'
  return date.getHours() < SAME_DAY_CUTOFF_HOUR ? 'same_day' : 'next_day'
}

export function getCourierDeliveryTimingLabel(scannedAtOrTiming) {
  const timing = scannedAtOrTiming === 'same_day' || scannedAtOrTiming === 'next_day'
    ? scannedAtOrTiming
    : getCourierDeliveryTiming(scannedAtOrTiming)
  return timing === 'same_day' ? 'Same-day' : 'Next-day'
}
