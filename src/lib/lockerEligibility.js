import { resolveCategory } from '../data/categories'

const ALWAYS_LOCKER_ELIGIBLE_CATEGORIES = new Set([
  'fashion',
  'books',
])

const LOCKER_ELIGIBLE_SUBCATEGORIES = {
  home: new Set(['decor', 'kitchenware', 'bedding', 'bathroom', 'lighting', 'storage', 'other_home']),
  toys: new Set(['action_figures', 'board_games', 'lego', 'educational', 'plush', 'collectibles']),
  kids: new Set(['baby_clothing', 'kids_clothing', 'maternity']),
}

const LOCKER_ELIGIBILITY_FIX_DATE = new Date('2026-04-27T00:00:00.000Z')

function isBeforeLockerEligibilityFix(value) {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date < LOCKER_ELIGIBILITY_FIX_DATE
}

export function getDefaultLockerEligibility(listing) {
  const category = resolveCategory(listing?.category || '')
  const subcategory = listing?.subcategory || listing?.type || listing?.categoryType || ''

  if (ALWAYS_LOCKER_ELIGIBLE_CATEGORIES.has(category)) return true
  if (LOCKER_ELIGIBLE_SUBCATEGORIES[category]?.has(subcategory)) return true

  return false
}

function readExplicitLockerEligibility(listing) {
  if (!listing || typeof listing !== 'object') return null
  const value = listing.lockerEligible ?? listing.locker_eligible
  if (typeof value !== 'boolean') return null

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
