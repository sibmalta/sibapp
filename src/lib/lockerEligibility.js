import { DELIVERY_ELIGIBILITY_REASONS, getDeliveryEligibility } from './deliveryEligibility'

const LOCKER_ELIGIBILITY_FIX_DATE = new Date('2026-04-27T00:00:00.000Z')

function isBeforeLockerEligibilityFix(value) {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date < LOCKER_ELIGIBILITY_FIX_DATE
}

export function getDefaultLockerEligibility(listing) {
  return getDeliveryEligibility(listing, { ignoreExplicitLockerEligible: true }).eligible
}

function readExplicitLockerEligibility(listing) {
  if (!listing || typeof listing !== 'object') return null
  const value = listing.lockerEligible ?? listing.locker_eligible
  if (typeof value !== 'boolean') return null
  if (value === true) {
    const baseline = getDeliveryEligibility(listing, { ignoreExplicitLockerEligible: true })
    if (
      !baseline.eligible &&
      baseline.reason !== DELIVERY_ELIGIBILITY_REASONS.MISSING_WEIGHT
    ) {
      return false
    }
  }

  // A short-lived migration defaulted legacy rows to false. For older rows that
  // belong to locker-friendly categories, treat that false as unknown so the
  // category default can recover them. Explicit seller "No" saves remain false.
  if (
    value === false &&
    getDefaultLockerEligibility(listing) &&
    isBeforeLockerEligibilityFix(listing.createdAt || listing.created_at)
  ) {
    return null
  }

  return value
}

export function isLockerEligible(listing) {
  const explicit = readExplicitLockerEligibility(listing)
  if (explicit !== null) return explicit
  return getDefaultLockerEligibility(listing)
}
