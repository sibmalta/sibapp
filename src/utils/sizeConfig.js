/**
 * Category-based size system for Sib marketplace.
 *
 * Fashion-specific sizing:
 *   - Women: letter sizes (XXS–XXXL) + EU numeric (32–46+)
 *   - Men: letter sizes (XS–XXXL)
 *   - Kids: age-based (0-3M … 13-14Y)
 *   - Shoes: EU 35–46
 *   - Trousers/Jeans: Waist (W24–W42) + Length (L28–L36)
 */

// ── Women's clothing sizes ──────────────────────────────────
export const WOMEN_LETTER_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
export const WOMEN_EU_SIZES = ['32', '34', '36', '38', '40', '42', '44', '46+']

// ── Men's clothing sizes ────────────────────────────────────
export const MEN_LETTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

// ── Kids sizes (age-based) ──────────────────────────────────
export const KIDS_SIZES = [
  '0-3M', '3-6M', '6-12M',
  '1-2Y', '2-3Y', '3-4Y', '4-5Y', '5-6Y',
  '6-7Y', '7-8Y', '8-9Y', '9-10Y',
  '10-11Y', '11-12Y', '12-13Y', '13-14Y',
]

// ── Shoe sizes (EU) ─────────────────────────────────────────
export const SHOE_SIZES = [
  '35', '35.5', '36', '36.5', '37', '37.5', '38', '38.5',
  '39', '39.5', '40', '40.5', '41', '41.5', '42', '42.5',
  '43', '43.5', '44', '44.5', '45', '46',
]

export function parseNumericSize(size) {
  if (size === null || size === undefined) return null
  const normalized = String(size)
    .trim()
    .replace(/^EU\s+/i, '')
    .replace(',', '.')
    .replace(/\+$/, '')

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

export function compareNumericSizes(a, b) {
  const aNum = parseNumericSize(a)
  const bNum = parseNumericSize(b)
  if (aNum !== null && bNum !== null) return aNum - bNum
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

export function sizeFilterMatchesListing(filterSize, listingSize) {
  if (filterSize === null || filterSize === undefined || listingSize === null || listingSize === undefined) return false

  const filter = String(filterSize).trim()
  const listing = String(listingSize).trim()
  if (!filter || !listing) return false
  if (filter.toLowerCase() === listing.toLowerCase()) return true

  const normalizedFilter = filter.replace(/^EU\s+/i, '')
  const normalizedListing = listing.replace(/^EU\s+/i, '')
  if (normalizedFilter.toLowerCase() === normalizedListing.toLowerCase()) return true

  const filterNum = parseNumericSize(normalizedFilter)
  const listingNum = parseNumericSize(normalizedListing)
  if (filter.endsWith('+') && filterNum !== null && listingNum !== null) {
    return listingNum >= filterNum
  }

  return filterNum !== null && listingNum !== null && filterNum === listingNum
}

// ── Trouser/Jean waist & length ─────────────────────────────
export const WAIST_SIZES = ['24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '36', '38', '40', '42']
export const LENGTH_SIZES = ['28', '29', '30', '31', '32', '33', '34', '36']

// ── Legacy mapping — used by existing code ──────────────────
export const SIZES_BY_CATEGORY = {
  women: {
    label: 'Women',
    sizes: [...WOMEN_LETTER_SIZES, ...WOMEN_EU_SIZES],
  },
  men: {
    label: 'Men',
    sizes: MEN_LETTER_SIZES,
  },
  kids: {
    label: 'Kids',
    sizes: KIDS_SIZES,
  },
  shoes: {
    label: 'Shoes',
    sizes: SHOE_SIZES,
  },
  vintage: {
    label: 'Vintage',
    sizes: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'],
  },
  accessories: {
    label: 'Accessories',
    sizes: ['One Size'],
  },
}

/**
 * Sub-types for men's clothing. Trousers/Jeans use W/L sizing.
 */
export const MEN_SUB_TYPES = [
  { value: 'tops', label: 'Tops / T-Shirts' },
  { value: 'shirts', label: 'Shirts' },
  { value: 'trousers', label: 'Trousers / Jeans' },
  { value: 'hoodies', label: 'Hoodies / Sweaters' },
  { value: 'jackets', label: 'Jackets / Coats' },
  { value: 'shorts', label: 'Shorts' },
  { value: 'other', label: 'Other' },
]

/**
 * Sub-types that use W/L sizing instead of standard letter sizes.
 */
export const WL_SUB_TYPES = ['trousers', 'shorts', 'jeans']

/**
 * Returns true if a sub-type uses waist/length sizing.
 */
export function usesWaistLength(subType) {
  return WL_SUB_TYPES.includes(subType)
}

/**
 * Combines waist + length into a display string: "W32/L32" or "W32"
 */
export function formatWL(waist, length) {
  if (!waist) return ''
  if (!length) return `W${waist}`
  return `W${waist}/L${length}`
}

/**
 * Parses a "W32/L32" or "W32" string back into { waist, length }.
 */
export function parseWL(sizeStr) {
  if (!sizeStr || !sizeStr.startsWith('W')) return null
  const match = sizeStr.match(/^W(\d+)(?:\/L(\d+))?$/)
  if (!match) return null
  return { waist: match[1], length: match[2] || '' }
}

/**
 * Returns the size options for a given category.
 * Falls back to a generic set if category is unknown.
 */
export function getSizesForCategory(category) {
  if (!category) return []
  const config = SIZES_BY_CATEGORY[category]
  return config ? config.sizes : ['XS', 'S', 'M', 'L', 'XL', 'One Size']
}

/**
 * Returns filter-friendly waist sizes prefixed with W for browse page.
 */
export function getWaistFilterSizes() {
  return WAIST_SIZES.map(w => `W${w}`)
}

/**
 * Returns filter-friendly length sizes prefixed with L for browse page.
 */
export function getLengthFilterSizes() {
  return LENGTH_SIZES.map(l => `L${l}`)
}

/**
 * Returns all unique sizes across all categories (for an "All" filter).
 */
export function getAllSizes() {
  const all = new Set()
  Object.values(SIZES_BY_CATEGORY).forEach(c => c.sizes.forEach(s => all.add(s)))
  return [...all].sort(compareNumericSizes)
}

/**
 * Subcategories that should show ONLY shoe sizes (no clothing sizes).
 */
export const SHOE_SUBCATEGORIES = ['shoes']

/**
 * Subcategories that should show waist + length sizing (no letter sizes).
 */
export const TROUSER_SUBCATEGORIES = ['jeans', 'trousers', 'shorts']

/**
 * Subcategories that should show ONLY clothing sizes (no waist/length).
 */
export const CLOTHING_ONLY_SUBCATEGORIES = ['dresses', 'tops', 'shirts', 'coats', 'hoodies', 'skirts', 'activewear', 'swimwear', 'lingerie', 'suits']

/**
 * Subcategories that have NO size at all (bags, jewellery, sunglasses, etc.).
 */
export const NO_SIZE_SUBCATEGORIES = ['bags', 'jewellery', 'sunglasses', 'wallets', 'scarves', 'hats']

/**
 * Belt subcategory uses its own XS–XL range.
 */
export const BELT_SUBCATEGORIES = ['belts']
export const BELT_SIZES = ['XS', 'S', 'M', 'L', 'XL']

/**
 * Watches are "One Size" — no selectable size.
 */
export const WATCH_SUBCATEGORIES = ['watches']
