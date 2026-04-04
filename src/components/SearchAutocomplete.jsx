import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, Tag, Grid3X3, ShoppingBag } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { CATEGORIES as SEARCH_CATEGORIES, SELL_CATEGORIES } from '../lib/constants'

// Combine unique category names for suggestion matching
const ALL_CATEGORY_NAMES = (() => {
  const map = new Map()
  SELL_CATEGORIES.forEach(c => map.set(c.id, c.name))
  SEARCH_CATEGORIES.filter(c => c.id !== 'all').forEach(c => map.set(c.id, c.name))
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
})()

// Well-known fashion brands for autocomplete (supplementary to listing brands)
const KNOWN_BRANDS = [
  'Nike', 'Adidas', 'Zara', 'H&M', 'Mango', 'Levi\'s', 'Ralph Lauren',
  'Tommy Hilfiger', 'Calvin Klein', 'Gucci', 'Prada', 'Puma', 'New Balance',
  'Converse', 'Vans', 'North Face', 'Uniqlo', 'ASOS', 'Pull & Bear',
  'Stradivarius', 'Bershka', 'Massimo Dutti', 'Wrangler', 'Vintage',
]

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function SearchAutocomplete({ query, onSelect, className = '' }) {
  const { listings } = useApp()
  const debouncedQuery = useDebounce(query, 300)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listRef = useRef(null)

  // Extract unique brands from current listings
  const listingBrands = useMemo(() => {
    const brands = new Set()
    listings.forEach(l => {
      if (l.brand) brands.add(l.brand)
    })
    return Array.from(brands)
  }, [listings])

  // Merge listing brands with known brands (no duplicates)
  const allBrands = useMemo(() => {
    const set = new Set(listingBrands.map(b => b.toLowerCase()))
    const merged = [...listingBrands]
    KNOWN_BRANDS.forEach(b => {
      if (!set.has(b.toLowerCase())) {
        merged.push(b)
        set.add(b.toLowerCase())
      }
    })
    return merged.sort()
  }, [listingBrands])

  const suggestions = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) return null

    const q = debouncedQuery.toLowerCase().trim()

    // Match listings by title
    const itemMatches = listings
      .filter(l => l.status === 'active' && l.title.toLowerCase().includes(q))
      .slice(0, 5)
      .map(l => ({ type: 'item', id: l.id, label: l.title, price: l.price, image: l.images?.[0] }))

    // Match brands
    const brandMatches = allBrands
      .filter(b => b.toLowerCase().includes(q))
      .slice(0, 3)
      .map(b => ({ type: 'brand', id: `brand-${b}`, label: b }))

    // Match categories
    const catMatches = ALL_CATEGORY_NAMES
      .filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
      .slice(0, 3)
      .map(c => ({ type: 'category', id: `cat-${c.id}`, label: c.name, catId: c.id }))

    const all = [...itemMatches, ...brandMatches, ...catMatches]
    return all.length > 0 ? { items: itemMatches, brands: brandMatches, categories: catMatches, all } : { items: [], brands: [], categories: [], all: [] }
  }, [debouncedQuery, listings, allBrands])

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1)
  }, [suggestions])

  const handleKeyDown = useCallback((e) => {
    if (!suggestions || suggestions.all.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev + 1) % suggestions.all.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev <= 0 ? suggestions.all.length - 1 : prev - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      onSelect(suggestions.all[activeIndex])
    }
  }, [suggestions, activeIndex, onSelect])

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`)
      if (el) el.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  // Don't render if no query or less than 2 chars
  if (!debouncedQuery || debouncedQuery.trim().length < 2 || !suggestions) return null

  const hasResults = suggestions.all.length > 0

  const SuggestionIcon = ({ type }) => {
    switch (type) {
      case 'brand': return <Tag size={14} className="text-sib-primary flex-shrink-0" />
      case 'category': return <Grid3X3 size={14} className="text-sib-accent flex-shrink-0" />
      default: return <ShoppingBag size={14} className="text-sib-muted flex-shrink-0" />
    }
  }

  const renderGroup = (label, items, startIndex) => {
    if (items.length === 0) return null
    return (
      <div key={label}>
        <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-sib-muted/70">{label}</p>
        {items.map((item, i) => {
          const globalIndex = startIndex + i
          const isActive = globalIndex === activeIndex
          return (
            <button
              key={item.id}
              data-index={globalIndex}
              onMouseEnter={() => setActiveIndex(globalIndex)}
              onClick={() => onSelect(item)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                isActive ? 'bg-sib-sand' : 'hover:bg-sib-sand/50'
              }`}
            >
              {item.image ? (
                <img src={item.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-sib-sand flex items-center justify-center flex-shrink-0">
                  <SuggestionIcon type={item.type} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-sib-text truncate">{highlightMatch(item.label, debouncedQuery)}</p>
                {item.type === 'brand' && (
                  <p className="text-[11px] text-sib-muted">Brand</p>
                )}
                {item.type === 'category' && (
                  <p className="text-[11px] text-sib-muted">Category</p>
                )}
              </div>
              {item.price != null && (
                <span className="text-xs font-bold text-sib-primary flex-shrink-0">€{item.price}</span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // Calculate start indices for each group
  const itemsStart = 0
  const brandsStart = suggestions.items.length
  const catsStart = brandsStart + suggestions.brands.length

  return (
    <div
      className={`absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-sib-stone/40 overflow-hidden z-50 max-h-[60vh] overflow-y-auto ${className}`}
      ref={listRef}
      onKeyDown={handleKeyDown}
    >
      {hasResults ? (
        <>
          {renderGroup('Items', suggestions.items, itemsStart)}
          {renderGroup('Brands', suggestions.brands, brandsStart)}
          {renderGroup('Categories', suggestions.categories, catsStart)}
        </>
      ) : (
        <div className="px-4 py-6 text-center">
          <Search size={20} className="mx-auto text-sib-muted/40 mb-2" />
          <p className="text-sm text-sib-muted">No results found</p>
          <p className="text-xs text-sib-muted/60 mt-0.5">Try a different keyword</p>
        </div>
      )}
    </div>
  )
}

function highlightMatch(text, query) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-sib-primary">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

// Export the keyboard handler hook for parent components
export function useAutocompleteKeyboard(ref) {
  return useCallback((e) => {
    if (ref.current) {
      const event = new KeyboardEvent('keydown', { key: e.key, bubbles: true })
      ref.current.dispatchEvent(event)
    }
  }, [ref])
}
