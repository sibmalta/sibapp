import React, { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react'
import { BRAND_LIST, normalizeBrand } from '../lib/brands'

/**
 * Popular brands shown as prominent tiles at the top of the section.
 * Each entry maps a canonical brand name to a short colour class
 * so the tiles feel varied without requiring external images.
 */
const POPULAR_BRANDS = [
  { name: 'Nike',            accent: 'bg-gray-900 text-white' },
  { name: 'Adidas',          accent: 'bg-gray-800 text-white' },
  { name: 'Zara',            accent: 'bg-stone-800 text-white' },
  { name: 'H&M',             accent: 'bg-red-600  text-white' },
  { name: 'Ralph Lauren',    accent: 'bg-blue-900 text-white' },
  { name: 'GAP',             accent: 'bg-blue-700 text-white' },
  { name: 'Tommy Hilfiger',  accent: 'bg-red-700  text-white' },
  { name: "Levi's",          accent: 'bg-red-800  text-white' },
  { name: 'Mango',           accent: 'bg-amber-700 text-white' },
  { name: 'Gucci',           accent: 'bg-emerald-900 text-white' },
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

      {/* ── Popular brand tiles — horizontal scroll on mobile, wrap on desktop ── */}
      <div className="flex gap-2 overflow-x-auto px-3 pb-2 scrollbar-none lg:px-0 lg:flex-wrap lg:overflow-x-visible">
        {POPULAR_BRANDS.map(pb => {
          const active = isActive(pb.name)
          const count = brandCounts[pb.name]
          return (
            <button
              key={pb.name}
              onClick={() => onSelectBrand(pb.name)}
              className={`
                flex-shrink-0 relative px-4 py-3 rounded-xl text-left transition-all duration-150
                min-w-[110px] lg:min-w-0
                ${active
                  ? 'ring-2 ring-sib-secondary ring-offset-1 shadow-md scale-[1.02]'
                  : 'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                }
                ${pb.accent}
              `}
            >
              <span className="block text-[13px] font-bold leading-tight truncate">{pb.name}</span>
              {count != null && count > 0 && (
                <span className="block text-[10px] font-medium opacity-70 mt-0.5">
                  {count} item{count !== 1 ? 's' : ''}
                </span>
              )}
              {active && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-sib-secondary flex items-center justify-center">
                  <X size={10} className="text-white" />
                </span>
              )}
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
