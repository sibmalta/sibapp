/**
 * Category-aware metadata extraction for listing display.
 *
 * Returns a compact "subtitle" string and an array of pill-worthy metadata
 * for ListingCard and ListingPage, driven by the listing's resolved category.
 *
 * Supports both new-schema listings (with `attributes` object, `subcategory`,
 * etc.) and legacy fashion-only listings (flat fields like brand, size, color).
 */

import { resolveCategory, getCategoryById, ALL_SUBCATEGORIES } from '../data/categories'

/* ── Condition labels (shared) ───────────────────────────── */
export const CONDITION_LABELS = {
  new: 'New',
  likeNew: 'Like New',
  good: 'Good',
  fair: 'Fair',
}

export const CONDITION_LABELS_LONG = {
  new: 'New with tags',
  likeNew: 'Like New',
  good: 'Good condition',
  fair: 'Fair — some signs of wear',
}

export const CONDITION_DOT = {
  new: 'bg-emerald-400',
  likeNew: 'bg-sky-400',
  good: 'bg-amber-400',
  fair: 'bg-orange-400',
}

/* ── Attribute accessor — works with both flat fields and nested `attributes` ── */
function attr(listing, key) {
  // Try top-level first (legacy / convenience)
  if (listing[key] !== undefined && listing[key] !== null && listing[key] !== '') {
    return listing[key]
  }
  // Try nested attributes object (new schema)
  if (listing.attributes && listing.attributes[key] !== undefined && listing.attributes[key] !== null && listing.attributes[key] !== '') {
    return listing.attributes[key]
  }
  return null
}

/* ── Resolve a human-readable subcategory label ────────────── */
function subcategoryLabel(listing) {
  const subId = listing.subcategory || attr(listing, 'subcategory')
  if (!subId) return null
  const found = ALL_SUBCATEGORIES.find(s => s.id === subId)
  return found?.label || null
}

/**
 * Get the single most-useful secondary line for a card (below title, above price).
 * Returns a short string like "Zara · Size M" or "Apple · iPhone 14" or "Fiction · English".
 */
export function getCardSubtitle(listing) {
  const cat = resolveCategory(listing.category)
  const parts = []

  switch (cat) {
    case 'fashion': {
      const brand = attr(listing, 'brand')
      if (brand) parts.push(brand)
      const size = attr(listing, 'shoe_size') || attr(listing, 'size')
      if (size) parts.push(`Size ${size}`)
      break
    }
    case 'electronics': {
      const brand = attr(listing, 'brand')
      if (brand) parts.push(brand)
      const model = attr(listing, 'model')
      if (model) parts.push(model)
      break
    }
    case 'books': {
      const author = attr(listing, 'author')
      if (author) parts.push(author)
      const lang = attr(listing, 'language')
      if (lang) parts.push(lang)
      break
    }
    case 'sports': {
      const brand = attr(listing, 'brand')
      if (brand) parts.push(brand)
      const sport = attr(listing, 'sport')
      if (sport) parts.push(sport)
      break
    }
    case 'home': {
      const brand = attr(listing, 'brand')
      if (brand) parts.push(brand)
      const material = attr(listing, 'material')
      if (material) parts.push(material)
      break
    }
    case 'furniture': {
      const brand = attr(listing, 'brand')
      if (brand) parts.push(brand)
      const material = attr(listing, 'material')
      if (material) parts.push(material)
      break
    }
    case 'toys': {
      const brand = attr(listing, 'brand')
      if (brand) parts.push(brand)
      const ageGroup = attr(listing, 'age_group')
      if (ageGroup) parts.push(`Ages ${ageGroup}`)
      break
    }
    case 'kids': {
      const brand = attr(listing, 'brand')
      if (brand) parts.push(brand)
      const size = attr(listing, 'size')
      if (size) parts.push(`Size ${size}`)
      const ageGroup = attr(listing, 'age_group')
      if (!size && ageGroup) parts.push(`Ages ${ageGroup}`)
      break
    }
    default: {
      // Generic fallback: brand if present, then subcategory
      const brand = attr(listing, 'brand')
      if (brand) parts.push(brand)
      const sub = subcategoryLabel(listing)
      if (sub) parts.push(sub)
    }
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

/**
 * Get the bottom-left overlay badge for the card image.
 *
 * For fashion: shows size (as before).
 * For electronics: shows model if available.
 * For books: shows format/language.
 * For most others: shows subcategory or nothing.
 *
 * Returns null if there's nothing useful to show.
 */
export function getCardBadge(listing) {
  const cat = resolveCategory(listing.category)

  switch (cat) {
    case 'fashion':
    case 'kids':
      return attr(listing, 'shoe_size') || attr(listing, 'size') || null
    case 'electronics':
      return attr(listing, 'model') || null
    case 'books':
      return attr(listing, 'language') || null
    case 'toys':
      return attr(listing, 'age_group') ? `Ages ${attr(listing, 'age_group')}` : null
    default:
      return null
  }
}

/**
 * Get an array of tag objects for the listing detail page.
 * Each tag: { label: string, variant: 'default' | 'condition' | 'category' }
 *
 * Shows category, subcategory, condition, and the most relevant 2–3 attributes.
 * Avoids duplication with the subtitle line.
 */
export function getDetailTags(listing) {
  const cat = resolveCategory(listing.category)
  const catObj = getCategoryById(cat)
  const tags = []

  // Category pill
  if (catObj) {
    tags.push({ label: catObj.label, variant: 'category' })
  } else if (listing.category) {
    tags.push({ label: listing.category, variant: 'category' })
  }

  // Subcategory pill
  const subLabel = subcategoryLabel(listing)
  if (subLabel) {
    tags.push({ label: subLabel, variant: 'default' })
  }

  // Condition pill
  if (listing.condition) {
    tags.push({
      label: CONDITION_LABELS_LONG[listing.condition] || listing.condition,
      variant: 'condition',
    })
  }

  // Category-specific attribute pills
  switch (cat) {
    case 'fashion': {
      const gender = attr(listing, 'gender')
      if (gender) tags.push({ label: gender, variant: 'default' })
      // Colours
      const colors = _getColors(listing)
      for (const c of colors) tags.push({ label: c, variant: 'default' })
      const material = attr(listing, 'material')
      if (material) tags.push({ label: material, variant: 'default' })
      break
    }
    case 'electronics': {
      const powerInfo = attr(listing, 'power_info')
      if (powerInfo) tags.push({ label: powerInfo, variant: 'default' })
      const colour = attr(listing, 'colour') || attr(listing, 'color')
      if (colour) tags.push({ label: colour, variant: 'default' })
      break
    }
    case 'books': {
      const isbn = attr(listing, 'isbn')
      if (isbn) tags.push({ label: `ISBN: ${isbn}`, variant: 'default' })
      break
    }
    case 'sports': {
      const sport = attr(listing, 'sport')
      if (sport) tags.push({ label: sport, variant: 'default' })
      break
    }
    case 'home':
    case 'furniture': {
      const colour = attr(listing, 'colour') || attr(listing, 'color')
      if (colour) tags.push({ label: colour, variant: 'default' })
      const material = attr(listing, 'material')
      if (material) tags.push({ label: material, variant: 'default' })
      const dims = attr(listing, 'dimensions')
      if (dims) tags.push({ label: dims, variant: 'default' })
      break
    }
    case 'toys': {
      break // age_group already in subtitle
    }
    case 'kids': {
      const gender = attr(listing, 'gender')
      if (gender) tags.push({ label: gender, variant: 'default' })
      const ageGroup = attr(listing, 'age_group')
      if (ageGroup) tags.push({ label: `Ages ${ageGroup}`, variant: 'default' })
      break
    }
    default:
      break
  }

  return tags
}

/**
 * Get the "headline detail" for the detail page subtitle line.
 * Richer version of getCardSubtitle, can include more fields.
 */
export function getDetailSubtitle(listing) {
  const cat = resolveCategory(listing.category)
  const parts = []

  const brand = attr(listing, 'brand')
  if (brand) parts.push(brand)

  switch (cat) {
    case 'fashion':
    case 'kids': {
      const size = attr(listing, 'shoe_size') || attr(listing, 'size')
      if (size) parts.push(`Size ${size}`)
      break
    }
    case 'electronics': {
      const model = attr(listing, 'model')
      if (model) parts.push(model)
      break
    }
    case 'books': {
      const author = attr(listing, 'author')
      if (!brand && author) parts.push(author) // avoid double if brand=author
      else if (author && author !== brand) parts.push(author)
      const lang = attr(listing, 'language')
      if (lang) parts.push(lang)
      break
    }
    case 'sports': {
      const sport = attr(listing, 'sport')
      if (sport) parts.push(sport)
      break
    }
    case 'home':
    case 'furniture': {
      const material = attr(listing, 'material')
      if (material) parts.push(material)
      break
    }
    case 'toys': {
      const ageGroup = attr(listing, 'age_group')
      if (ageGroup) parts.push(`Ages ${ageGroup}`)
      break
    }
    default:
      break
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

/* ── Private helpers ─────────────────────────────────────── */

function _getColors(listing) {
  if (Array.isArray(listing.colors) && listing.colors.length > 0) return listing.colors
  if (listing.color) return [listing.color]
  const c = attr(listing, 'colour')
  if (c) return [c]
  return []
}
