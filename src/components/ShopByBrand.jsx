import React, { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react'
import { BRAND_LIST, normalizeBrand } from '../lib/brands'

/**
 * Popular brands shown as compact neutral pills at the top of the section.
 * Limited to 7 brands for a clean, non-dominant appearance.
 */
const POPULAR_BRANDS = [
  'Nike',
  'Adidas',
  'Zara',
  'H&M',
  'Ralph Lauren',
  "Levi's",
  'Mango',
]

/**
 * "Shop by Brand" section for BrowsePage.
 *
 * - Popular brands: horizontal scroll of coloured tiles (mobile) / wrapped grid (desktop)
 * - View all: expandable alphabetical list with search
 * - Clicking a brand calls `onSelectBrand(canonicalName)`
 *
 * @param {{ onSelectBrand: (brand: string) => void, activeBrands: string[], brandCounts: Record<string,number> }} props
 */
export default function ShopByBrand({ onSelectBrand, activeBrands = [], brandCounts = {} }) {
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')

  // Filter full brand list (excluding specials like "No Brand", "Handmade", "Vintage")
  const EXCLUDED = new Set(['No Brand', 'Handmade', 'Vintage'])
  const allBrands = useMemo(
    () => BRAND_LIST.filter(b => !EXCLUDED.has(b)),
    [],
  )

  const filteredBrands = useMemo(() => {
    if (!search.trim()) return allBrands
    const q = search.trim().toLowerCase()
    return allBrands.filter(b => b.toLowerCase().includes(q))
  }, [allBrands, search])

  // Group filtered brands alphabetically
  const grouped = useMemo(() => {
    const map = {}
    for (const b of filteredBrands) {
      const letter = b.charAt(0).toUpperCase()
      if (!map[letter]) map[letter] = []
      map[letter].push(b)
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredBrands])

  const isActive = (brand) => activeBrands.some(b => b.toLowerCase() === brand.toLowerCase())

  return (
    <section className="mb-3">
      {/* ── Section header ── */}
      <div className="flex items-center justify-between px-3 lg:px-0 mb-2">
        <h3 className="text-[15px] font-bold text-sib-text tracking-tight">Shop by Brand</h3>
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-0.5 text-[12px] font-semibold text-sib-secondary hover:text-sib-primary transition-colors"
        >
          {expanded ? 'Hide' : 'View all'}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* ── Popular brand pills — horizontal scroll on mobile, wrap on desktop ── */}
      <div className="flex gap-1.5 overflow-x-auto px-3 pb-1.5 scrollbar-none lg:px-0 lg:flex-wrap lg:overflow-x-visible">
        {POPULAR_BRANDS.map(name => {
          const active = isActive(name)
          const count = brandCounts[name]
          return (
            <button
              key={name}
              onClick={() => onSelectBrand(name)}
              className={`
                flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold
                border transition-all duration-150
                ${active
                  ? 'bg-sib-text text-white border-sib-text'
                  : 'bg-[#F7F7F6] text-gray-700 border-gray-200/80 hover:bg-gray-200 hover:text-gray-900 active:bg-gray-300'
                }
              `}
            >
              {name}
              {count != null && count > 0 && (
                <span className={`text-[10px] font-medium ${active ? 'text-gray-300' : 'text-gray-400'}`}>
                  {count}
                </span>
              )}
              {active && <X size={10} className="ml-0.5 text-gray-300" />}
            </button>
          )
        })}
      </div>

      {/* ── Expanded: full searchable brand list ── */}
      {expanded && (
        <div className="mx-3 lg:mx-0 mt-1 bg-white rounded-xl border border-gray-200/60 overflow-hidden">
          {/* Search */}
          <div className="relative px-3 pt-3 pb-2">
            <Search size={14} className="absolute left-5.5 top-1/2 mt-[2px] -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search brands..."
              className="w-full bg-[#F5F5F4] rounded-lg pl-8 pr-8 py-2 text-[13px] text-sib-text placeholder-gray-400 outline-none border border-transparent focus:border-gray-300 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-5 top-1/2 mt-[2px] -translate-y-1/2 text-gray-400 hover:text-sib-text"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Alphabetical groups */}
          <div className="max-h-[320px] overflow-y-auto px-3 pb-3 scrollbar-none">
            {grouped.length === 0 && (
              <p className="text-center text-[12px] text-gray-400 py-4">No brands found</p>
            )}
            {grouped.map(([letter, brands]) => (
              <div key={letter} className="mb-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 sticky top-0 bg-white py-0.5">
                  {letter}
                </p>
                <div className="flex flex-wrap gap-1">
                  {brands.map(b => {
                    const active = isActive(b)
                    const count = brandCounts[b]
                    return (
                      <button
                        key={b}
                        onClick={() => onSelectBrand(b)}
                        className={`
                          px-2.5 py-1 rounded-full text-[12px] font-semibold transition-all duration-150
                          ${active
                            ? 'bg-sib-text text-white'
                            : 'bg-[#F5F5F4] text-gray-700 hover:bg-gray-200 hover:text-sib-text'
                          }
                        `}
                      >
                        {b}
                        {count != null && count > 0 && (
                          <span className={`ml-1 text-[10px] ${active ? 'text-gray-300' : 'text-gray-400'}`}>
                            ({count})
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
