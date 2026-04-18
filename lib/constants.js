/**
 * Category data is now defined in src/data/categories.js.
 * CATEGORIES and SELL_CATEGORIES are derived from the scalable category tree
 * so existing imports (SearchPage, SearchAutocomplete, etc.) keep working.
 */
import { CATEGORY_TREE, getCategoryOptions } from '../data/categories'

export const CATEGORIES = getCategoryOptions({ includeAll: true })

export const SELL_CATEGORIES = CATEGORY_TREE.map(c => ({
  id: c.id,
  name: c.label,
}))

export const CONDITIONS = [
  { id: 'new_with_tags', name: 'New with tags', desc: 'Brand new, tags still attached' },
  { id: 'like_new', name: 'Like new', desc: 'Worn once or twice, no signs of wear' },
  { id: 'very_good', name: 'Very good', desc: 'Gently used, minimal signs of wear' },
  { id: 'good', name: 'Good', desc: 'Used but well maintained' },
  { id: 'fair', name: 'Fair', desc: 'Visible signs of wear' },
]

export const SIZES = {
  women: {
    label: 'Women',
    letter: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'],
    numeric: ['4', '6', '8', '10', '12', '14', '16', '18', '20', '22'],
  },
  men: {
    label: 'Men',
    letter: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  },
  kids: {
    label: 'Kids',
    ages: [
      '0-3M', '3-6M', '6-12M',
      '1-2Y', '2-3Y', '3-4Y', '4-5Y',
      '5-6Y', '7-8Y', '9-10Y',
      '11-12Y', '13-14Y',
    ],
  },
}

export const LOCATIONS = [
  'Valletta', 'Sliema', 'St Julian\'s', 'Birkirkara', 'Mosta',
  'Rabat', 'Zebbug', 'Msida', 'Hamrun', 'Naxxar',
  'Mellieha', 'Gozo', 'Marsaskala', 'Bugibba', 'Attard',
]

export const LOGO_PRIMARY = `${import.meta.env.BASE_URL}assets/sib-3.png`
