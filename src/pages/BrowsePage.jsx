import React, { useMemo, useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { SlidersHorizontal, X, Search, Sparkles, Tag, TrendingUp, Gem, Clock, DollarSign, Plus, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import ListingCard from '../components/ListingCard'
import SearchAutocomplete from '../components/SearchAutocomplete'
import FilterPanel from '../components/FilterPanel'
import FilterModal from '../components/FilterModal'
import SubcategorySheet from '../components/SubcategorySheet'
import EmptyBrowseState from '../components/EmptyBrowseState'
import VintageVerifiedIcon from '../components/VintageVerifiedIcon'
import useScrollRestore from '../hooks/useScrollRestore'
import useBrowseState from '../hooks/useBrowseState'
import useInfiniteScroll from '../hooks/useInfiniteScroll'
import useAuthNav from '../hooks/useAuthNav'
import { classifyListing, getStyleLabel, STYLE_RULES } from '../lib/styleClassifier'
import { classifyCollection, COLLECTION_IDS, getCollectionLabel } from '../lib/collectionClassifier'
import { normalizeBrand } from '../lib/brands'
import { CATEGORY_TREE, getSubcategories, normalizeSubcategoryValue, resolveCategory, getCategoryById } from '../data/categories'
import { getSportChildren, getSportBrands } from '../data/sportsFilters'
import { getShoeChildren } from '../data/shoeFilters'
import { getSubcategoryChildren } from '../data/subcategoryChildren'
import { sizeFilterMatchesListing } from '../utils/sizeConfig'

const CATEGORIES = CATEGORY_TREE.map(c => ({ label: c.label, value: c.id }))

const SORT_OPTIONS = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Most popular', value: 'liked' },
]

const DESIGNER_BRANDS = ['Gucci', 'Prada', 'Ralph Lauren', 'Calvin Klein', 'Tommy Hilfiger', 'Versace', 'Burberry', 'Dior', 'Balenciaga', 'Louis Vuitton']

function isRenderableListing(listing) {
  return !!listing?.id && listing.price !== undefined && listing.price !== null && !Number.isNaN(Number(listing.price))
}

function BrowseGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i}>
          <div className="rounded-xl bg-gray-200 animate-pulse aspect-[3/4]" />
          <div className="h-3 w-24 bg-gray-200 rounded mt-2 animate-pulse" />
          <div className="h-3 w-14 bg-gray-100 rounded mt-1 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export default function BrowsePage() {
  const { listings, listingsLoading } = useApp()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [searchFocused, setSearchFocused] = useState(false)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [subcategorySheetOpen, setSubcategorySheetOpen] = useState(false)
  const authNav = useAuthNav()

  useEffect(() => {
    document.title = 'Browse items | Sib'
  }, [])

  const {
    query, setQuery,
    category, setCategory,
    subcategory, setSubcategory,
    conditions, setConditions,
    sizes, setSizes,
    maxPrice, setMaxPrice,
    sort, setSort,
    colors, setColors,
    brands, setBrands,
    quickFilter, setQuickFilter,
    styleTag, setStyleTag,
    materials, setMaterials,
    deliveryType, setDeliveryType,
    genderFilter, setGenderFilter,
    sportDetail, setSportDetail,
    sportAttributes, setSportAttributes,
    clearFilters,
  } = useBrowseState({
    query: searchParams.get('q') || '',
    sort: searchParams.get('sort') || 'newest',
    styleTag: searchParams.get('style') || '',
  })

  // Sync URL param overrides — these represent explicit user intent (e.g. homepage price tile click, smart search)
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

    // Smart search params — applied when user clicks an autocomplete suggestion
    const urlCat = searchParams.get('cat')
    if (urlCat) {
      const validCat = CATEGORY_TREE.find(c => c.id === urlCat)
      if (validCat) setCategory(urlCat)
    }

    const urlSub = searchParams.get('sub')
    if (urlSub) setSubcategory(urlSub)

    const urlBrandParam = searchParams.get('brand')
    if (urlBrandParam) {
      const canonical = normalizeBrand(urlBrandParam)
      if (canonical) setBrands([canonical])
    }
  }, []) // only on mount — don't re-run on every searchParams change

  useScrollRestore('/browse')

  const activeListings = listings.filter(l => l.status === 'active' && isRenderableListing(l))

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
      filtered = filtered.filter(l => {
        // Direct match (new-system listings)
        if (l.category === category) return true
        // Legacy category match (e.g. l.category='women' → resolves to 'fashion')
        if (resolveCategory(l.category) === category) return true
        return false
      })
    }

    if (subcategory) {
      const normalizedSelectedSubcategory = normalizeSubcategoryValue(subcategory, category)
      filtered = filtered.filter((l) => {
        const listingCategory = resolveCategory(l.category)
        const normalizedListingSubcategory = normalizeSubcategoryValue(
          l.subcategory || l.type || l.categoryType || l.attributes?.subcategory || l.attributes?.type || '',
          listingCategory,
        )
        return normalizedListingSubcategory === normalizedSelectedSubcategory
      })
    }

    // Third-level detail filter (sport children, shoe types, OR generic subcategory children)
    if (sportDetail) {
      filtered = filtered.filter(l => {
        // Check listing.sportDetail / shoeType / subcategoryDetail field directly
        if (l.sportDetail === sportDetail) return true
        if (l.sport_detail === sportDetail) return true
        if (l.shoeType === sportDetail) return true
        if (l.shoe_type === sportDetail) return true
        if (l.subcategoryDetail === sportDetail) return true
        if (l.subcategory_detail === sportDetail) return true
        // Fallback: resolve the children list (sport → shoe → generic) and text-match
        const sportKids = getSportChildren(subcategory || '')
        const shoeKids = subcategory === 'shoes' ? getShoeChildren() : []
        const genericKids = getSubcategoryChildren(category || '', subcategory || '')
        const allChildren = sportKids.length > 0 ? sportKids : (shoeKids.length > 0 ? shoeKids : genericKids)
        const child = allChildren.find(c => c.id === sportDetail)
        if (child) {
          const text = `${l.title} ${l.description || ''} ${l.brand || ''}`.toLowerCase()
          // Match full label or the primary keyword (first word)
          if (text.includes(child.label.toLowerCase())) return true
          const keyword = child.label.split(/[\s&/]+/)[0].toLowerCase()
          if (keyword.length >= 4 && text.includes(keyword)) return true
        }
        return false
      })
    }

    // Sport attributes filter (equipment type, weight range, etc.)
    if (sportAttributes.length > 0) {
      filtered = filtered.filter(l => {
        const attrs = l.sportAttributes || l.sport_attributes || []
        return sportAttributes.every(tag => {
          if (Array.isArray(attrs) && attrs.includes(tag)) return true
          // Fallback: check the text content for attribute value
          const val = tag.split(':')[1]
          if (val) {
            const text = `${l.title} ${l.description || ''}`.toLowerCase()
            if (text.includes(val.replace(/_/g, ' ').toLowerCase())) return true
          }
          return false
        })
      })
    }

    // Gender filter (fashion: filter by listing.gender field)
    if (genderFilter) {
      filtered = filtered.filter(l => {
        if (!l.gender) return true // include listings without gender set
        const g = l.gender.toLowerCase()
        if (g === genderFilter) return true
        if (g === 'unisex') return true
        return false
      })
    }

    if (conditions.length) {
      filtered = filtered.filter(l => conditions.includes(l.condition))
    }

    if (sizes.length) {
      filtered = filtered.filter(l => {
        // Match letter sizes, EU shoe/clothing sizes, half sizes, and legacy attribute storage.
        const listingSizes = [
          l.size,
          l.shoe_size,
          l.attributes?.size,
          l.attributes?.shoe_size,
          l.attributes?.kids_size,
        ].filter(Boolean)

        if (listingSizes.some(listingSize => sizes.some(size => sizeFilterMatchesListing(size, listingSize)))) {
          return true
        }
        // Waist match: listing.size is "W30", filter has "W30"
        if (l.size && l.size.startsWith('W')) {
          const waistPart = l.size.split('/')[0]
          if (sizes.includes(waistPart)) return true
        }
        // Length match: listing.attributes.trouser_length is "L32", filter has "L32"
        const trouserLen = l.attributes?.trouser_length || l.trouser_length
        if (trouserLen && sizes.includes(trouserLen)) return true
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
  }, [activeListings, query, category, subcategory, conditions, sizes, colors, brands, maxPrice, sort, quickFilter, styleTag, genderFilter, sportDetail, sportAttributes])

  // Infinite scroll
  const { visibleItems, hasMore, sentinelRef } = useInfiniteScroll(results)

  // Sport-specific derived data
  const isSports = category === 'sports'
  const sportChildren = useMemo(() => isSports && subcategory ? getSportChildren(subcategory) : [], [isSports, subcategory])

  // Shoe-specific derived data (third-level shoe types)
  const isShoes = category === 'fashion' && subcategory === 'shoes'
  const shoeChildren = useMemo(() => isShoes ? getShoeChildren() : [], [isShoes])

  // Generalized subcategory children (bags, tops, dresses, gaming, etc.)
  const genericChildren = useMemo(() => {
    if (!category || !subcategory) return []
    // Skip shoes & sports — they use their own dedicated lists above
    if (isShoes || isSports) return []
    return getSubcategoryChildren(category, subcategory)
  }, [category, subcategory, isShoes, isSports])

  // Unified third-level children (sport → shoe → generic)
  const thirdLevelChildren = sportChildren.length > 0 ? sportChildren : (shoeChildren.length > 0 ? shoeChildren : genericChildren)
  const hasThirdLevel = thirdLevelChildren.length > 0

  // Compute the active subcategory label for empty states
  const activeSubLabel = useMemo(() => {
    if (!subcategory || !category) return ''
    const subs = getSubcategories(category)
    const match = subs.find(s => s.id === subcategory)
    return match?.label || ''
  }, [category, subcategory])

  const activeSportDetailLabel = useMemo(() => {
    if (!sportDetail || !thirdLevelChildren.length) return ''
    const match = thirdLevelChildren.find(c => c.id === sportDetail)
    return match?.label || ''
  }, [sportDetail, thirdLevelChildren])

  const activeFilterCount =
    conditions.length +
    sizes.length +
    colors.length +
    brands.length +
    (maxPrice < 500 ? 1 : 0) +
    (styleTag ? 1 : 0) +
    (genderFilter ? 1 : 0) +
    (sportDetail ? 1 : 0) +
    sportAttributes.length

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
  const isFashionChip = category === 'fashion' || ['women', 'men', 'shoes', 'accessories', 'vintage'].includes(category)
  const CONDITION_CHIP_LABELS = isFashionChip
    ? { new: 'New with tags', likeNew: 'Like new', good: 'Good condition', fair: 'Worn' }
    : { new: 'New', likeNew: 'Like new', good: 'Good', fair: 'Used' }
  const GENDER_CHIP_LABELS = { women: 'Women', men: 'Men', kids: 'Kids' }

  const activeChips = useMemo(() => {
    const chips = []
    if (query) {
      chips.push({
        key: 'query',
        label: `"${query}"`,
        clear: () => setQuery(''),
      })
    }
    if (genderFilter) {
      chips.push({
        key: 'gender',
        label: GENDER_CHIP_LABELS[genderFilter] || genderFilter,
        clear: () => setGenderFilter(''),
      })
    }
    if (styleTag) {
      const rule = activeStyleRule
      chips.push({
        key: 'style',
        label: `${rule?.emoji || ''} ${rule?.label || styleTag}`.trim(),
        clear: () => setStyleTag(''),
      })
    }
    conditions.forEach(c => {
      const label = CONDITION_CHIP_LABELS[c] || c.charAt(0).toUpperCase() + c.slice(1)
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
    if (sportDetail && activeSportDetailLabel) {
      chips.push({
        key: 'sportDetail',
        label: activeSportDetailLabel,
        clear: () => setSportDetail(''),
      })
    }
    sportAttributes.forEach(attr => {
      const [, val] = attr.split(':')
      const label = val ? val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : attr
      chips.push({
        key: `sa-${attr}`,
        label,
        clear: () => setSportAttributes(prev => prev.filter(x => x !== attr)),
      })
    })
    return chips
  }, [query, conditions, sizes, colors, brands, maxPrice, styleTag, genderFilter, sportDetail, activeSportDetailLabel, sportAttributes, category])

  return (
    <div className="min-h-screen bg-[#F5F5F4] dark:bg-[#18211f] lg:max-w-7xl lg:mx-auto transition-colors">
      {/* ── Sticky search bar — white band, tight to header ── */}
      <div className={`sticky top-0 bg-white dark:bg-[#202b28] border-b border-gray-200/60 dark:border-[rgba(242,238,231,0.10)] lg:static lg:bg-transparent lg:dark:bg-transparent lg:border-none ${searchFocused ? 'z-[9999]' : 'z-30'} transition-colors`}>
        {/* Search input — hidden on mobile (TopBar overlay handles mobile search) */}
        <div className="hidden lg:block px-3 pt-2 pb-1.5 lg:px-8 lg:py-3">
          <div className="relative lg:max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 350)}
              placeholder="Search brands, styles, items..."
              className="w-full bg-[#EDEDEB] dark:bg-[#26322f] rounded-lg pl-9 pr-9 py-2 text-[14px] text-sib-text dark:text-[#f4efe7] placeholder-gray-400 dark:placeholder:text-[#aeb8b4] outline-none border border-transparent dark:border-[rgba(242,238,231,0.08)] focus:border-gray-300 dark:focus:border-[rgba(242,238,231,0.18)] focus:bg-white dark:focus:bg-[#30403c] focus:shadow-sm transition-all"
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
            {searchFocused && query.trim().length >= 2 && (
              <SearchAutocomplete
                query={query}
                onSelect={(suggestion) => {
                  if (suggestion.type === 'auth_prompt') {
                    navigate('/auth', { state: { from: '/browse' } })
                  } else if (suggestion.type === 'user' && suggestion.username) {
                    navigate(`/profile/${suggestion.username}`)
                  } else if (suggestion.type === 'item' && suggestion.id) {
                    navigate(`/listing/${suggestion.id}`)
                  } else {
                    if (suggestion.category) setCategory(suggestion.category)
                    if (suggestion.subcategory) setSubcategory(suggestion.subcategory)
                    if (suggestion.brand) setBrands([suggestion.brand])
                    setQuery(suggestion.query || '')
                  }
                  setSearchFocused(false)
                }}
              />
            )}
          </div>
        </div>

        {/* ── Row 1: Main category chips — horizontal scroll ── */}
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex gap-1.5 px-3 pt-1.5 pb-2.5 lg:px-8 lg:py-3 lg:flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => { setCategory(c.value); setSubcategory(''); setSportDetail(''); }}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold tracking-tight transition-all duration-150 whitespace-nowrap ${
                  category === c.value
                    ? 'bg-sib-text dark:bg-sib-primary text-white shadow-sm'
                    : 'bg-[#EDEDEB] dark:bg-[#26322f] text-gray-600 dark:text-[#aeb8b4] hover:text-sib-text dark:hover:text-[#f4efe7] hover:bg-gray-200/80 dark:hover:bg-[#30403c]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Row 2: Subcategory chips — horizontal scroll, max 6 visible on mobile ── */}
        {category && getSubcategories(category).length > 0 && (() => {
          const allSubs = getSubcategories(category)
          const MAX_VISIBLE = 6
          const visibleSubs = allSubs.slice(0, MAX_VISIBLE)
          const hasOverflow = allSubs.length > MAX_VISIBLE
          // If the selected sub is beyond the visible slice, swap it in
          const selectedInOverflow = subcategory && !visibleSubs.find(s => s.id === subcategory)
          const displaySubs = selectedInOverflow
            ? [...visibleSubs.slice(0, MAX_VISIBLE - 1), allSubs.find(s => s.id === subcategory)]
            : visibleSubs

          return (
            <div className="border-t border-gray-100 dark:border-[rgba(242,238,231,0.10)] pt-2 pb-2.5">
              <div className="overflow-x-auto scrollbar-none">
                <div className="flex gap-1.5 px-3 lg:px-8 lg:flex-wrap">
                  {displaySubs.map(sub => sub && (
                    <button
                      key={sub.id}
                      onClick={() => { setSubcategory(sub.id); setSportDetail(''); }}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150 whitespace-nowrap ${
                        subcategory === sub.id
                          ? 'bg-sib-primary/12 text-sib-primary border border-sib-primary/25'
                          : 'bg-white dark:bg-[#26322f] text-gray-500 dark:text-[#aeb8b4] border border-gray-200 dark:border-[rgba(242,238,231,0.10)] hover:border-gray-300 dark:hover:border-[rgba(242,238,231,0.18)] hover:text-gray-700 dark:hover:text-[#f4efe7]'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                  {hasOverflow && (
                    <button
                      onClick={() => setSubcategorySheetOpen(true)}
                      className="flex-shrink-0 flex items-center gap-0.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-white dark:bg-[#26322f] text-gray-500 dark:text-[#aeb8b4] border border-gray-200 dark:border-[rgba(242,238,231,0.10)] hover:border-gray-300 dark:hover:border-[rgba(242,238,231,0.18)] hover:text-gray-700 dark:hover:text-[#f4efe7] transition-all duration-150 whitespace-nowrap lg:hidden"
                    >
                      + More
                    </button>
                  )}
                  {/* Desktop: show all subcategories inline */}
                  {hasOverflow && allSubs.slice(MAX_VISIBLE).map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => { setSubcategory(sub.id); setSportDetail(''); }}
                      className={`hidden lg:inline-flex flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150 whitespace-nowrap ${
                        subcategory === sub.id
                          ? 'bg-sib-primary/12 text-sib-primary border border-sib-primary/25'
                          : 'bg-white dark:bg-[#26322f] text-gray-500 dark:text-[#aeb8b4] border border-gray-200 dark:border-[rgba(242,238,231,0.10)] hover:border-gray-300 dark:hover:border-[rgba(242,238,231,0.18)] hover:text-gray-700 dark:hover:text-[#f4efe7]'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Row 3: Third-level chips — horizontal scroll ── */}
      {hasThirdLevel && (
        <div className="bg-[#F5F5F4] dark:bg-[#18211f] border-b border-gray-200/40 dark:border-[rgba(242,238,231,0.10)] transition-colors">
          <div className="px-3 pt-2.5 pb-2.5 lg:px-8 lg:max-w-7xl lg:mx-auto">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-[#aeb8b4] uppercase tracking-wider mb-1.5">Type</p>
            <div className="overflow-x-auto scrollbar-none">
              <div className="flex gap-1.5 lg:flex-wrap">
                <button
                  onClick={() => setSportDetail('')}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 whitespace-nowrap ${
                    !sportDetail
                      ? 'bg-white dark:bg-[#26322f] text-sib-text dark:text-[#f4efe7] border border-gray-300 dark:border-[rgba(242,238,231,0.14)] shadow-sm'
                      : 'bg-transparent text-gray-400 dark:text-[#aeb8b4] border border-gray-200/60 dark:border-[rgba(242,238,231,0.10)] hover:border-gray-300 dark:hover:border-[rgba(242,238,231,0.18)] hover:text-gray-500 dark:hover:text-[#f4efe7]'
                  }`}
                >
                  All{isShoes ? ' shoes' : (activeSubLabel && !isSports ? ` ${activeSubLabel.toLowerCase()}` : '')}
                </button>
                {thirdLevelChildren.map(child => {
                  const active = sportDetail === child.id
                  return (
                    <button
                      key={child.id}
                      onClick={() => setSportDetail(active ? '' : child.id)}
                      className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 whitespace-nowrap ${
                        active
                          ? 'bg-white dark:bg-[#26322f] text-sib-text dark:text-[#f4efe7] border border-gray-300 dark:border-[rgba(242,238,231,0.14)] shadow-sm'
                          : 'bg-transparent text-gray-400 dark:text-[#aeb8b4] border border-gray-200/60 dark:border-[rgba(242,238,231,0.10)] hover:border-gray-300 dark:hover:border-[rgba(242,238,231,0.18)] hover:text-gray-500 dark:hover:text-[#f4efe7]'
                      }`}
                    >
                      {child.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Active filter chips + quick filter indicator — horizontal scroll ── */}
      {(activeChips.length > 0 || quickFilter) && (
        <div className="overflow-x-auto scrollbar-none">
        <div className="flex gap-1.5 px-3 pt-2.5 pb-1.5 lg:px-8 lg:flex-wrap">
          {quickFilter && (
            <span className="flex items-center gap-1 flex-shrink-0 px-2.5 py-1 bg-sib-secondary/10 text-sib-secondary rounded-full text-[11px] font-bold">
              {quickFilter === 'under25' && '€25'}
              {quickFilter === 'under50' && '€50'}
              {quickFilter === 'newTags' && 'New with tags'}
              {quickFilter === 'vintage' && 'Vintage'}
              {quickFilter === 'designer' && 'Designer'}
              {quickFilter === 'trending' && 'Trending'}
              {quickFilter === 'newArrivals' && 'New arrivals'}
              <button onClick={() => setQuickFilter('')} className="hover:text-red-500 transition-colors ml-0.5">
                <X size={10} />
              </button>
            </span>
          )}
          {activeChips.map(chip => (
            <span
              key={chip.key}
              className="flex items-center gap-0.5 flex-shrink-0 px-2.5 py-1 bg-sib-primary/8 text-sib-primary rounded-full text-[11px] font-bold"
            >
              {chip.label}
              <button onClick={chip.clear} className="hover:text-sib-secondary transition-colors ml-0.5">
                <X size={10} />
              </button>
            </span>
          ))}
          <button
            onClick={() => { clearFilters(); setQuickFilter(''); }}
            className="flex-shrink-0 px-2 py-1 text-[11px] font-bold text-sib-secondary hover:text-red-600 transition-colors"
          >
            Clear all
          </button>
        </div>
        </div>
      )}

      {/* ── Desktop: sidebar + grid. Mobile: just grid ── */}
      <div className="lg:flex lg:gap-6 lg:px-8 lg:py-4">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0">
          <div className="sticky top-4 space-y-5 bg-white dark:bg-[#202b28] rounded-xl p-4 border border-gray-200/60 dark:border-[rgba(242,238,231,0.10)] max-h-[calc(100vh-80px)] overflow-y-auto pb-4 scrollbar-none transition-colors">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-sib-text">Filters</p>
              {activeFilterCount > 0 && (
                <span className="text-[10px] bg-sib-primary text-white px-2 py-0.5 rounded-full font-bold">{activeFilterCount}</span>
              )}
            </div>

            <FilterPanel
              category={category}
              subcategory={subcategory}
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
              genderFilter={genderFilter}
              setGenderFilter={setGenderFilter}
              materials={materials}
              setMaterials={setMaterials}
              deliveryType={deliveryType}
              setDeliveryType={setDeliveryType}
              sportDetail={sportDetail}
              setSportDetail={setSportDetail}
              sportAttributes={sportAttributes}
              setSportAttributes={setSportAttributes}
              quickFilter={quickFilter}
              setQuickFilter={setQuickFilter}
              clearFilters={clearFilters}
              activeFilterCount={activeFilterCount}
              allBrands={allBrands}
            />

            <div className="pt-4 border-t border-gray-200 dark:border-[rgba(242,238,231,0.10)]">
              <p className="text-xs font-bold text-sib-text uppercase tracking-wide mb-2">Sort by</p>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="w-full text-sm font-medium text-sib-text dark:text-[#f4efe7] bg-white dark:bg-[#26322f] border border-gray-200 dark:border-[rgba(242,238,231,0.10)] rounded-lg px-3 py-2 outline-none focus:border-sib-primary transition-colors"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </aside>

        {/* Results grid */}
        <div className="flex-1 px-2.5 pt-1.5 pb-24 lg:px-0 lg:pt-0 lg:pb-6 dark:bg-[#202b28] dark:border dark:border-[rgba(242,238,231,0.10)] dark:rounded-2xl dark:p-3 transition-colors">
          {/* Style header banner */}
          {activeStyleRule && (
            <div className="flex items-center gap-2 px-1 mb-2">
              <span className="text-xl">{activeStyleRule.emoji}</span>
              <h2 className="text-lg font-bold text-sib-text">{activeStyleRule.label}</h2>
              <span className="text-xs text-sib-muted dark:text-[#aeb8b4] ml-1">{results.length} item{results.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Desktop result count */}
          {!activeStyleRule && (
            <p className="hidden lg:block text-sm text-sib-muted dark:text-[#aeb8b4] font-medium mb-3">{results.length} item{results.length !== 1 ? 's' : ''}</p>
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

          {listingsLoading ? (
            <BrowseGridSkeleton />
          ) : results.length === 0 ? (
            <EmptyBrowseState
              query={query}
              category={category}
              subcategory={subcategory}
              brands={brands}
              activeSubLabel={activeSubLabel}
              activeFilterCount={activeFilterCount}
              quickFilter={quickFilter}
              styleTag={styleTag}
              activeStyleRule={activeStyleRule}
              clearFilters={clearFilters}
              setQuickFilter={setQuickFilter}
              setQuery={setQuery}
              setCategory={setCategory}
              setSubcategory={setSubcategory}
              setBrands={setBrands}
              setStyleTag={setStyleTag}
              navigate={navigate}
              authNav={authNav}
            />
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
        subcategory={subcategory}
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
        genderFilter={genderFilter}
        setGenderFilter={setGenderFilter}
        materials={materials}
        setMaterials={setMaterials}
        deliveryType={deliveryType}
        setDeliveryType={setDeliveryType}
        sportDetail={sportDetail}
        setSportDetail={setSportDetail}
        sportAttributes={sportAttributes}
        setSportAttributes={setSportAttributes}
        quickFilter={quickFilter}
        setQuickFilter={setQuickFilter}
        sort={sort}
        setSort={setSort}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        allBrands={allBrands}
        resultCount={results.length}
      />

      {/* ── Subcategory bottom sheet — mobile only ── */}
      {category && (
        <SubcategorySheet
          open={subcategorySheetOpen}
          onClose={() => setSubcategorySheetOpen(false)}
          subcategories={getSubcategories(category)}
          selected={subcategory}
          categoryLabel={getCategoryById(category)?.label || 'Subcategories'}
          onSelect={(id) => {
            setSubcategory(id)
            setSportDetail('')
            setSubcategorySheetOpen(false)
          }}
        />
      )}
    </div>
  )
}
