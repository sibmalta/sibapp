export const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'grid' },
  { id: 'dresses', name: 'Dresses', icon: 'shirt' },
  { id: 'tops', name: 'Tops & T-Shirts', icon: 'shirt' },
  { id: 'shirts', name: 'Shirts & Blouses', icon: 'shirt' },
  { id: 'jeans', name: 'Jeans', icon: 'shirt' },
  { id: 'trousers', name: 'Trousers', icon: 'shirt' },
  { id: 'coats', name: 'Coats & Jackets', icon: 'shirt' },
  { id: 'hoodies', name: 'Hoodies & Sweatshirts', icon: 'shirt' },
  { id: 'shoes', name: 'Shoes', icon: 'footprints' },
  { id: 'accessories', name: 'Accessories', icon: 'gem' },
  { id: 'activewear', name: 'Activewear', icon: 'dumbbell' },
]

export const SELL_CATEGORIES = [
  { id: 'women', name: 'Women' },
  { id: 'men', name: 'Men' },
  { id: 'kids', name: 'Kids' },
  { id: 'shoes', name: 'Shoes' },
  { id: 'accessories', name: 'Accessories' },
  { id: 'vintage', name: 'Vintage' },
]

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
