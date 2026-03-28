/**
 * Category-based size system for Sib marketplace.
 * Sizes are determined by the listing category, not gender.
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
 * Returns the size options for a given category.
 * Falls back to a generic set if category is unknown.
 */
export function getSizesForCategory(category) {
  if (!category) return []
  const config = SIZES_BY_CATEGORY[category]
  return config ? config.sizes : ['XS', 'S', 'M', 'L', 'XL', 'One Size']
}

/**
 * Returns all unique sizes across all categories (for an "All" filter).
 */
export function getAllSizes() {
  const all = new Set()
  Object.values(SIZES_BY_CATEGORY).forEach(c => c.sizes.forEach(s => all.add(s)))
  return [...all]
}
