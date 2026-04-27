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

function readExplicitLockerEligibility(listing) {
  if (!listing || typeof listing !== 'object') return null
  const value = listing.lockerEligible ?? listing.locker_eligible
  return typeof value === 'boolean' ? value : null
}

export function getDefaultLockerEligibility(listing) {
  const category = resolveCategory(listing?.category || '')
  const subcategory = listing?.subcategory || listing?.type || listing?.categoryType || ''

  if (ALWAYS_LOCKER_ELIGIBLE_CATEGORIES.has(category)) return true
  if (LOCKER_ELIGIBLE_SUBCATEGORIES[category]?.has(subcategory)) return true

  return false
}

export function isLockerEligible(listing) {
  const explicit = readExplicitLockerEligibility(listing)
  if (explicit !== null) return explicit
  return getDefaultLockerEligibility(listing)
}
