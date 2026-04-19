/**
 * Shoe-specific filter configurations for the Sib marketplace.
 *
 * Mirrors the pattern used by sportsFilters.js — provides third-level
 * drill-down children (shoe types), shoe-specific brands, and helper
 * functions consumed by BrowsePage and FilterPanel.
 */

/* ── Shoe type children (third-level drill-down) ───────────── */

export const SHOE_CHILDREN = [
  { id: 'trainers', label: 'Trainers / Sneakers' },
  { id: 'boots', label: 'Boots' },
  { id: 'sandals', label: 'Sandals & Sliders' },
  { id: 'heels', label: 'Heels' },
  { id: 'formal_shoes', label: 'Formal Shoes' },
  { id: 'flats', label: 'Flats & Loafers' },
  { id: 'platforms', label: 'Platforms & Wedges' },
  { id: 'slippers', label: 'Slippers' },
  { id: 'sports_shoes', label: 'Sports Shoes' },
  { id: 'other_shoes', label: 'Other' },
]

/* ── Shoe brands ──────────────────────────────────────────── */

export const SHOE_BRANDS = [
  'Nike', 'Adidas', 'New Balance', 'Converse', 'Vans',
  'Puma', 'Reebok', 'ASICS', 'Dr. Martens', 'Timberland',
  'Clarks', 'Birkenstock', 'Skechers', 'Hoka', 'On Running',
  'Fila', 'Jordan', 'UGG', 'Steve Madden', 'Zara',
  'H&M', 'Mango', 'Gucci', 'Prada', 'Balenciaga',
  'Versace', 'Jimmy Choo', 'Christian Louboutin', 'Stuart Weitzman',
]

/* ── All shoe child IDs (for validation) ───────────────────── */

export const ALL_SHOE_CHILDREN_IDS = SHOE_CHILDREN.map(c => c.id)

/* ── Helper: get shoe children ─────────────────────────────── */

export function getShoeChildren() {
  return SHOE_CHILDREN
}

/* ── Helper: get shoe brands ───────────────────────────────── */

export function getShoeBrands() {
  return SHOE_BRANDS
}
