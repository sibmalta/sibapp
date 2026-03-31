import React, { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import ListingCard from '../components/ListingCard'
import { getSizesForCategory, getWaistFilterSizes } from '../utils/sizeConfig'
import useScrollRestore from '../hooks/useScrollRestore'
import useBrowseState from '../hooks/useBrowseState'

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Women', value: 'women' },
  { label: 'Men', value: 'men' },
  { label: 'Kids', value: 'kids' },
  { label: 'Shoes', value: 'shoes' },
  { label: 'Vintage', value: 'vintage' },
  { label: 'Accessories', value: 'accessories' },
]

const CONDITIONS = [
  { label: 'New', value: 'new' },
  { label: 'Like New', value: 'likeNew' },
  { label: 'Good', value: 'good' },
  { label: 'Fair', value: 'fair' },
]

const DEFAULT_FILTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low–High', value: 'price_asc' },
  { label: 'Price: High–Low', value: 'price_desc' },
  { label: 'Most Liked', value: 'liked' },
]

export default function BrowsePage() {
  const { listings } = useApp()
  const [searchParams] = useSearchParams()

  // Persist filter/search/sort state across navigations
  const {
    query, setQuery,
    category, setCategory,
    conditions, setConditions,
    sizes, setSizes,
    maxPrice, setMaxPrice,
    sort, setSort,
    showFilters, setShowFilters,
    clearFilters,
  } = useBrowseState({
    query: searchParams.get('q') || '',
    sort: searchParams.get('sort') || 'newest',
  })

  // Restore scroll position when returning from listing detail
  useScrollRestore('/browse')

  const activeListings = listings.filter(l => l.status === 'active')

  const results = useMemo(() => {
    let filtered = activeListings

    if (query) {
      const q = query.toLowerCase()
      filtered = filtered.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.brand?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q)
      )
    }

    if (category) {
      filtered = filtered.filter(l => l.category === category)
    }

    if (conditions.length) {
      filtered = filtered.filter(l => conditions.includes(l.condition))
    }

    if (sizes.length) {
      filtered = filtered.filter(l => {
        if (sizes.includes(l.size)) return true
        // For W/L sizes, match waist component (e.g. "W32" matches "W32/L32")
        if (l.size && l.size.startsWith('W')) {
          const waistPart = l.size.split('/')[0]
          return sizes.includes(waistPart)
        }
        return false
      })
    }

    filtered = filtered.filter(l => l.price <= maxPrice)

    switch (sort) {
      case 'price_asc': return [...filtered].sort((a, b) => a.price - b.price)
      case 'price_desc': return [...filtered].sort((a, b) => b.price - a.price)
      case 'liked': return [...filtered].sort((a, b) => b.likes - a.likes)
      default: return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
  }, [activeListings, query, category, conditions, sizes, maxPrice, sort])

  const toggleCondition = (c) => {
    setConditions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }
  const toggleSize = (s) => {
    setSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const activeFilterCount = (category ? 1 : 0) + conditions.length + sizes.length + (maxPrice < 300 ? 1 : 0)

  const filterPanel = (
    <div className="space-y-4">
      {/* Condition */}
      <div>
        <p className="text-xs font-semibold text-sib-text mb-2">Condition</p>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map(c => (
            <button
              key={c.value}
              onClick={() => toggleCondition(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                conditions.includes(c.value) ? 'bg-sib-primary text-white' : 'bg-white text-sib-muted border border-sib-stone'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <p className="text-xs font-semibold text-sib-text mb-2">
          Size
          {category && <span className="ml-1 font-normal text-sib-muted capitalize">({category === 'shoes' ? 'EU' : category})</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          {(category ? getSizesForCategory(category) : DEFAULT_FILTER_SIZES).map(s => (
            <button
              key={s}
              onClick={() => toggleSize(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium text-center transition-colors ${
                sizes.includes(s) ? 'bg-sib-primary text-white' : 'bg-white text-sib-muted border border-sib-stone'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {category === 'men' && (
          <div className="mt-3">
            <p className="text-xs text-sib-muted mb-1.5">Waist (trousers/shorts)</p>
            <div className="flex flex-wrap gap-2">
              {getWaistFilterSizes().map(s => (
                <button
                  key={s}
                  onClick={() => toggleSize(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium text-center transition-colors ${
                    sizes.includes(s) ? 'bg-sib-primary text-white' : 'bg-white text-sib-muted border border-sib-stone'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Price */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-sib-text">Max Price</p>
          <p className="text-xs font-bold text-sib-primary">€{maxPrice}</p>
        </div>
        <input
          type="range"
          min={5}
          max={300}
          step={5}
          value={maxPrice}
          onChange={e => setMaxPrice(Number(e.target.value))}
          className="w-full accent-sib-primary"
        />
        <div className="flex justify-between text-[10px] text-sib-muted mt-1">
          <span>€5</span><span>€300</span>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 text-xs text-red-500 font-medium"
        >
          <X size={13} /> Clear filters
        </button>
      )}
    </div>
  )

  return (
    <div className="lg:max-w-7xl lg:mx-auto">
      {/* Search bar */}
      <div className="px-4 py-3 border-b border-sib-stone lg:px-8">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search brands, styles, items..."
          className="w-full bg-sib-sand rounded-xl px-4 py-2.5 text-sm text-sib-text placeholder-sib-muted outline-none lg:max-w-md"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none border-b border-sib-stone lg:px-8">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === c.value ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted hover:bg-sib-stone/50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Sort & filter bar — mobile only */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-sib-stone lg:hidden">
        <p className="text-xs text-sib-muted font-medium">{results.length} items</p>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="text-xs font-medium text-sib-text bg-transparent outline-none"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              activeFilterCount > 0 || showFilters ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'
            }`}
          >
            <SlidersHorizontal size={13} />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-white text-sib-primary w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile filter panel */}
      {showFilters && (
        <div className="px-4 py-4 border-b border-sib-stone bg-sib-warm lg:hidden">
          {filterPanel}
        </div>
      )}

      {/* Desktop: sidebar filters + grid. Mobile: just grid */}
      <div className="lg:flex lg:gap-8 lg:px-8 lg:py-6">
        {/* Desktop sidebar filters */}
        <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0">
          <div className="sticky top-24 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-sib-text">Filters</p>
              {activeFilterCount > 0 && (
                <span className="text-[10px] bg-sib-primary text-white px-2 py-0.5 rounded-full font-bold">{activeFilterCount}</span>
              )}
            </div>
            {filterPanel}

            <div className="pt-4 border-t border-sib-stone">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-sib-text">Sort by</p>
              </div>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="mt-2 w-full text-sm font-medium text-sib-text bg-white border border-sib-stone rounded-xl px-3 py-2 outline-none focus:border-sib-primary"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 px-4 py-4 lg:px-0 lg:py-0">
          <p className="hidden lg:block text-sm text-sib-muted font-medium mb-4">{results.length} items</p>
          {results.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-3xl mb-3">🔍</p>
              <p className="font-semibold text-sib-text">Nothing found</p>
              <p className="text-sm text-sib-muted mt-1">Try different keywords or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4 lg:gap-5">
              {results.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
