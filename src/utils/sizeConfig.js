/**
 * Category-based size system for Sib marketplace.
 * Sizes are determined by the listing category, not gender.
 * Men's trousers/jeans use a Waist + Length (W/L) system.
 */

export const SIZES_BY_CATEGORY = {
  women: {
    label: 'Women',
    sizes: ['4', '6', '8', '10', '12', '14', '16', 'XS', 'S', 'M', 'L', 'XL'],
  },
  men: {
    label: 'Men',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  },
  kids: {
    label: 'Kids',
    sizes: [
      '0-3M', '3-6M', '6-12M',
      '1-2Y', '2-3Y', '3-4Y', '4-5Y', '5-6Y',
      '6-7Y', '7-8Y', '8-9Y', '9-10Y',
      '10-11Y', '11-12Y', '12-13Y', '13-14Y',
    ],
  },
  shoes: {
    label: 'Shoes',
    sizes: [
      '36', '37', '38', '39', '40', '41',
      '42', '43', '44', '45', '46',
    ],
  },
  vintage: {
    label: 'Vintage',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'One Size'],
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

export const WAIST_SIZES = ['26', '28', '29', '30', '31', '32', '33', '34', '36', '38', '40', '42']
export const LENGTH_SIZES = ['28', '30', '32', '34', '36']

/**
 * Sub-types that use W/L sizing instead of standard letter sizes.
 */
export const WL_SUB_TYPES = ['trousers', 'shorts']

/**
 * Returns true if a men's sub-type uses waist/length sizing.
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
 * Returns all unique sizes across all categories (for an "All" filter).
 */
export function getAllSizes() {
  const all = new Set()
  Object.values(SIZES_BY_CATEGORY).forEach(c => c.sizes.forEach(s => all.add(s)))
  return [...all]
}


