import React, { useMemo, useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { SlidersHorizontal, X, Search, Sparkles, Tag, TrendingUp, Gem, Clock, DollarSign } from 'lucide-react'
import { useApp } from '../context/AppContext'
import ListingCard from '../components/ListingCard'
import SearchAutocomplete from '../components/SearchAutocomplete'
import FilterPanel from '../components/FilterPanel'
import FilterModal from '../components/FilterModal'
import VintageVerifiedIcon from '../components/VintageVerifiedIcon'
import useScrollRestore from '../hooks/useScrollRestore'
import useBrowseState from '../hooks/useBrowseState'
import useInfiniteScroll from '../hooks/useInfiniteScroll'
import { classifyListing, getStyleLabel, STYLE_RULES } from '../lib/styleClassifier'
import { classifyCollection, COLLECTION_IDS, getCollectionLabel } from '../lib/collectionClassifier'

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Women', value: 'women' },
  { label: 'Men', value: 'men' },
  { label: 'Kids', value: 'kids' },
  { label: 'Shoes', value: 'shoes' },
  { label: 'Vintage', value: 'vintage' },
  { label: 'Accessories', value: 'accessories' },
]

const SORT_OPTIONS = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Most popular', value: 'liked' },
]

const QUICK_FILTERS = [
  { label: 'Under €25', value: 'under25', Icon: DollarSign },
  { label: 'Under €50', value: 'under50', Icon: DollarSign },
  { label: 'New with tags', value: 'newTags', Icon: Sparkles },
  { label: 'Vintage', value: 'vintage', Icon: Tag },
  { label: 'Designer', value: 'designer', Icon: Gem },
  { label: 'Trending', value: 'trending', Icon: TrendingUp },
  { label: 'New arrivals', value: 'newArrivals', Icon: Clock },
]

const DESIGNER_BRANDS = ['Gucci', 'Prada', 'Ralph Lauren', 'Calvin Klein', 'Tommy Hilfiger', 'Versace', 'Burberry', 'Dior', 'Balenciaga', 'Louis Vuitton']

export default function BrowsePage() {
  const { listings } = useApp()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [searchFocused, setSearchFocused] = useState(false)
  const [filterModalOpen, setFilterModalOpen] = useState(false)

  const {
    query, setQuery,
    category, setCategory,
    conditions, setConditions,
    sizes, setSizes,
    maxPrice, setMaxPrice,
    sort, setSort,
    colors, setColors,
    brands, setBrands,
    quickFilter, setQuickFilter,
    styleTag, setStyleTag,
    clearFilters,
  } = useBrowseState({
    query: searchParams.get('q') || '',
    sort: searchParams.get('sort') || 'newest',
    styleTag: searchParams.get('style') || '',
  })

  // Sync URL param overrides — these represent explicit user intent (e.g. homepage price tile click)
  useEffect(() => {
    const urlMaxPrice = searchParams.get('maxPrice')
    if (urlMaxPrice) {
      const val = Number(urlMaxPrice)
      if (!isNaN(val) && val > 0) setMaxPrice(val)
    }

    const urlStyle = searchParams.get('style')
    if (urlStyle && (STYLE_RULES.some(r => r.id === urlStyle) || COLLECTION_IDS.includes(urlStyle))) {
      setStyleTag(urlStyle)
    }
  }, []) // only on mount — don't re-run on every searchParams change

  useScrollRestore('/browse')

  const activeListings = listings.filter(l => l.status === 'active')

  const allBrands = useMemo(() => {
    const set = new Set()
    activeListings.forEach(l => { if (l.brand) set.add(l.brand) })
    return [...set].sort()
  }, [activeListings])

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
        if (l.size && l.size.startsWith('W')) {
          const waistPart = l.size.split('/')[0]
          return sizes.includes(waistPart)
        }
        return false
      })
    }

    if (colors.length) {
      filtered = filtered.filter(l => {
        // Check new multi-color array first, then legacy single color
        const itemColors = Array.isArray(l.colors) && l.colors.length > 0 ? l.colors : (l.color ? [l.color] : [])
        if (itemColors.some(ic => colors.includes(ic))) return true
        const text = `${l.title} ${l.description || ''}`.toLowerCase()
        return colors.some(c => text.includes(c))
      })
    }

    if (brands.length) {
      filtered = filtered.filter(l => {
        if (!l.brand) return false
        return brands.some(b => l.brand.toLowerCase() === b.toLowerCase())
      })
    }

    filtered = filtered.filter(l => l.price <= maxPrice)

    // Style tag filter (from homepage style tiles AND collection tiles)
    if (styleTag) {
      const isCollectionOnly = COLLECTION_IDS.includes(styleTag) && !STYLE_RULES.some(r => r.id === styleTag)
      filtered = filtered.filter(l => {
        // Check style tags first (covers style IDs that overlap with collections)
        const sTags = l.manualStyleTags?.length ? l.manualStyleTags : (l.styleTags?.length ? l.styleTags : classifyListing(l))
        if (sTags.includes(styleTag)) return true
        // For collection-only IDs (beachwear, going-out, loungewear) also check collection tags
        if (isCollectionOnly || COLLECTION_IDS.includes(styleTag)) {
          const cTags = l.collectionTags?.length ? l.collectionTags : (l.collection_tags?.length ? l.collection_tags : classifyCollection(l))
          if (cTags.includes(styleTag)) return true
        }
        return false
      })
    }

    // Quick filters
    if (quickFilter === 'under25') {
      filtered = filtered.filter(l => l.price < 25)
    } else if (quickFilter === 'under50') {
      filtered = filtered.filter(l => l.price < 50)
    } else if (quickFilter === 'newTags') {
      filtered = filtered.filter(l => l.condition === 'new')
    } else if (quickFilter === 'vintage') {
      filtered = filtered.filter(l =>
        l.category === 'vintage' ||
        l.title?.toLowerCase().includes('vintage') ||
        l.description?.toLowerCase().includes('vintage')
      )
    } else if (quickFilter === 'designer') {
      filtered = filtered.filter(l =>
        l.brand && DESIGNER_BRANDS.some(d => l.brand.toLowerCase() === d.toLowerCase())
      )
    } else if (quickFilter === 'newArrivals') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(l => new Date(l.createdAt) >= sevenDaysAgo)
    } else if (quickFilter === 'trending') {
      filtered = [...filtered].sort((a, b) => b.likes - a.likes)
      return filtered
    }

    switch (sort) {
      case 'price_asc': return [...filtered].sort((a, b) => a.price - b.price)
      case 'price_desc': return [...filtered].sort((a, b) => b.price - a.price)
      case 'liked': return [...filtered].sort((a, b) => b.likes - a.likes)
      default: return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
  }, [activeListings, query, category, conditions, sizes, colors, brands, maxPrice, sort, quickFilter, styleTag])

  // Infinite scroll
  const { visibleItems, hasMore, sentinelRef } = useInfiniteScroll(results)

  const activeFilterCount =
    conditions.length +
    sizes.length +
    colors.length +
    brands.length +
    (maxPrice < 500 ? 1 : 0) +
    (styleTag ? 1 : 0)

  // Active style rule (for header label) — check both style rules and collection IDs
  const activeStyleRule = useMemo(() => {
    if (!styleTag) return null
    const sr = STYLE_RULES.find(r => r.id === styleTag)
    if (sr) return sr
    // Collection-only IDs (beachwear, going-out, loungewear)
    if (COLLECTION_IDS.includes(styleTag)) {
      const COLLECTION_EMOJI = { beachwear: '🏖️', 'going-out': '🪩', loungewear: '🛋️' }
      return { id: styleTag, label: getCollectionLabel(styleTag), emoji: COLLECTION_EMOJI[styleTag] || '🏷️' }
    }
    return null
  }, [styleTag])

  // Active filter chips (excluding quick filter + category which have their own UI)
  const activeChips = useMemo(() => {
    const chips = []
    if (styleTag) {
      const rule = activeStyleRule
      chips.push({
        key: 'style',
        label: `${rule?.emoji || ''} ${rule?.label || styleTag}`.trim(),
        clear: () => setStyleTag(''),
      })
    }
    conditions.forEach(c => {
      const label = c === 'likeNew' ? 'Like New' : c.charAt(0).toUpperCase() + c.slice(1)
      chips.push({ key: `cond-${c}`, label, clear: () => setConditions(prev => prev.filter(x => x !== c)) })
    })
    sizes.forEach(s => {
      chips.push({ key: `sz-${s}`, label: `Size ${s}`, clear: () => setSizes(prev => prev.filter(x => x !== s)) })
    })
    colors.forEach(c => {
      chips.push({ key: `col-${c}`, label: c.charAt(0).toUpperCase() + c.slice(1), clear: () => setColors(prev => prev.filter(x => x !== c)) })
    })
    brands.forEach(b => {
      chips.push({ key: `br-${b}`, label: b, clear: () => setBrands(prev => prev.filter(x => x !== b)) })
    })
    if (maxPrice < 500) {
      chips.push({ key: 'price', label: `Under €${maxPrice}`, clear: () => setMaxPrice(500) })
    }
    return chips
  }, [conditions, sizes, colors, brands, maxPrice, styleTag])

  return (
    <div className="min-h-screen bg-[#F5F5F4] lg:max-w-7xl lg:mx-auto">
      {/* ── Sticky search bar — white band, tight to header ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200/60 lg:static lg:bg-transparent lg:border-none">
        <div className="px-3 pt-2 pb-1.5 lg:px-8 lg:py-3">
          <div className="relative lg:max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              placeholder="Search brands, styles, items..."
              className="w-full bg-[#EDEDEB] rounded-lg pl-9 pr-9 py-2 text-[14px] text-sib-text placeholder-gray-400 outline-none border border-transparent focus:border-gray-300 focus:bg-white focus:shadow-sm transition-all"
            />
            {query && (
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-sib-text transition-colors"
              >
                <X size={14} />
              </button>
            )}
            {searchFocused && (
              <SearchAutocomplete
                query={query}
                onSelect={(suggestion) => {
                  if (suggestion.type === 'item') {
                    navigate(`/listing/${suggestion.id}`)
                  } else {
                    setQuery(suggestion.label)
                  }
                  setSearchFocused(false)
                }}
              />
            )}
          </div>
        </div>

        {/* ── Category chips — inside the white band ── */}
        <div className="flex gap-1.5 overflow-x-auto px-3 pt-1 pb-2 scrollbar-none lg:px-8 lg:py-3">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-150 ${
                category === c.value
                  ? 'bg-sib-text text-white'
                  : 'bg-[#EDEDEB] text-gray-600 hover:text-sib-text hover:bg-gray-200/80'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Quick filters — on the grey background ── */}
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none lg:px-8 lg:py-2">
        {QUICK_FILTERS.map(qf => {
          const active = quickFilter === qf.value
          return (
            <button
              key={qf.value}
              onClick={() => setQuickFilter(qf.value)}
              className={`flex items-center gap-1 flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                active
                  ? 'bg-sib-secondary text-white shadow-sm shadow-sib-secondary/20'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              <qf.Icon size={12} className={active ? 'text-white' : 'text-gray-400'} />
              {qf.label}
            </button>
          )
        })}
      </div>

      {/* ── Active filter chips ── */}
      {activeChips.length > 0 && (
        <div className="flex gap-1 overflow-x-auto px-3 py-1.5 scrollbar-none lg:px-8">
          {activeChips.map(chip => (
            <span
              key={chip.key}
              className="flex items-center gap-0.5 flex-shrink-0 px-2 py-1 bg-sib-primary/10 text-sib-primary rounded-full text-[10px] font-bold"
            >
              {chip.label}
              <button onClick={chip.clear} className="hover:text-sib-secondary transition-colors ml-0.5">
                <X size={10} />
              </button>
            </span>
          ))}
          <button
            onClick={clearFilters}
            className="flex-shrink-0 px-2 py-1 text-[10px] font-bold text-sib-secondary hover:text-red-600 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Desktop: sidebar + grid. Mobile: just grid ── */}
      <div className="lg:flex lg:gap-6 lg:px-8 lg:py-4">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0">
          <div className="sticky top-4 space-y-5 bg-white rounded-xl p-4 border border-gray-200/60 max-h-[calc(100vh-80px)] overflow-y-auto pb-4 scrollbar-none">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-sib-text">Filters</p>
              {activeFilterCount > 0 && (
                <span className="text-[10px] bg-sib-primary text-white px-2 py-0.5 rounded-full font-bold">{activeFilterCount}</span>
              )}
            </div>

            <FilterPanel
              category={category}
              conditions={conditions}
              setConditions={setConditions}
              sizes={sizes}
              setSizes={setSizes}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
              colors={colors}
              setColors={setColors}
              brands={brands}
              setBrands={setBrands}
              clearFilters={clearFilters}
              activeFilterCount={activeFilterCount}
              allBrands={allBrands}
            />

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs font-bold text-sib-text uppercase tracking-wide mb-2">Sort by</p>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="w-full text-sm font-medium text-sib-text bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-sib-primary transition-colors"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </aside>

        {/* Results grid */}
        <div className="flex-1 px-2.5 pt-1.5 pb-24 lg:px-0 lg:pt-0 lg:pb-6">
          {/* Style header banner */}
          {activeStyleRule && (
            <div className="flex items-center gap-2 px-1 mb-2">
              <span className="text-xl">{activeStyleRule.emoji}</span>
              <h2 className="text-lg font-bold text-sib-text">{activeStyleRule.label}</h2>
              <span className="text-xs text-sib-muted ml-1">{results.length} item{results.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Desktop result count */}
          {!activeStyleRule && (
            <p className="hidden lg:block text-sm text-sib-muted font-medium mb-3">{results.length} item{results.length !== 1 ? 's' : ''}</p>
          )}

          {/* Vintage trust banner */}
          {(category === 'vintage' || quickFilter === 'vintage') && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 mb-2.5 lg:mb-3 bg-amber-50 border border-amber-200/60 rounded-xl">
              <VintageVerifiedIcon size={18} className="mt-0.5" />
              <p className="text-[12px] lg:text-[13px] leading-snug text-amber-800">
                Shop genuine vintage with confidence — look for the <span className="font-bold">Vintage Verified</span> badge.
              </p>
            </div>
          )}

          {results.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-200 flex items-center justify-center">
                <Search size={24} className="text-gray-400" />
              </div>
              <p className="text-base font-bold text-sib-text">No items found</p>
              <p className="text-[13px] text-gray-500 mt-1 max-w-[220px] mx-auto leading-snug">Try adjusting your filters or search terms</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                {(activeFilterCount > 0 || quickFilter) && (
                  <button
                    onClick={() => { clearFilters(); setQuickFilter(''); }}
                    className="px-4 py-2 text-[13px] font-bold text-white bg-sib-text rounded-full hover:bg-gray-800 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
                <button
                  onClick={() => { clearFilters(); setQuickFilter(''); setQuery(''); setCategory(''); }}
                  className="px-4 py-2 text-[13px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                >
                  Browse all
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
                {visibleItems.map(listing => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-8">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: '0.15s' }} />
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Floating filter FAB — mobile only ── */}
      <button
        onClick={() => setFilterModalOpen(true)}
        className="fixed bottom-20 right-4 z-30 lg:hidden flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-sib-text text-white font-bold text-sm shadow-lg shadow-black/12 active:scale-95 transition-transform"
      >
        <SlidersHorizontal size={15} />
        Filters
        {activeFilterCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-sib-secondary text-white text-[10px] font-bold flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* ── Full-screen filter modal — mobile ── */}
      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        category={category}
        conditions={conditions}
        setConditions={setConditions}
        sizes={sizes}
        setSizes={setSizes}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        colors={colors}
        setColors={setColors}
        brands={brands}
        setBrands={setBrands}
        sort={sort}
        setSort={setSort}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        allBrands={allBrands}
        resultCount={results.length}
      />
    </div>
  )
}
