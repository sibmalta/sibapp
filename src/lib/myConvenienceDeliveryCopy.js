export const MYCONVENIENCE_DELIVERY_ESTIMATE_TITLE = 'Estimated delivery'

export const MYCONVENIENCE_DELIVERY_ESTIMATE_INTRO =
  'Delivery timing starts once the seller drops off the parcel at MYConvenience.'

export const MYCONVENIENCE_DELIVERY_ESTIMATE_BULLETS = [
  'Dropped off before 12pm → same-day delivery attempt',
  'Dropped off after 12pm → next-day delivery attempt',
]

export const MYCONVENIENCE_DELIVERY_ESTIMATE_COMPACT =
  'Timing starts once the seller drops off at MYConvenience.'

export function getMyConvenienceDeliveryAttemptLabel(scannedAtOrTiming) {
  if (scannedAtOrTiming === 'same_day') return 'same-day delivery attempt'
  if (scannedAtOrTiming === 'next_day') return 'next-day delivery attempt'

  const date = new Date(scannedAtOrTiming)
  if (Number.isNaN(date.getTime())) return null

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Malta',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const hour = Number(parts.find(part => part.type === 'hour')?.value)
  if (Number.isNaN(hour)) return null
  return hour < 12 ? 'same-day delivery attempt' : 'next-day delivery attempt'
}
