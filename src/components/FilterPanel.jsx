import React, { useState, useMemo } from 'react'
import { X, Tag, Sparkles, Star, ThumbsUp, Eye, Search, RotateCcw, Truck, MapPin, ChevronDown, DollarSign, Gem, TrendingUp, Clock } from 'lucide-react'
import {
  WOMEN_LETTER_SIZES, WOMEN_EU_SIZES, MEN_LETTER_SIZES, KIDS_SIZES,
  SHOE_SIZES, SHOE_SUBCATEGORIES, TROUSER_SUBCATEGORIES, CLOTHING_ONLY_SUBCATEGORIES,
  NO_SIZE_SUBCATEGORIES, BELT_SUBCATEGORIES, BELT_SIZES, WATCH_SUBCATEGORIES,
  getWaistFilterSizes, getLengthFilterSizes,
  getSizesForCategory,
} from '../utils/sizeConfig'
import { getBrandsForCategory, POPULAR_BRANDS } from '../lib/brands'
import { getCategoryFilters, LEGACY_CATEGORY_MAP } from '../data/categories'
import { getSportChildren, getSportFilterGroups, getSportBrands } from '../data/sportsFilters'
import { getShoeChildren, getShoeBrands } from '../data/shoeFilters'

// ── Fashion-specific condition labels ───────────────────────
const FASHION_CONDITIONS = [
  { label: 'New with tags', value: 'new', Icon: Tag },
  { label: 'Like new', value: 'likeNew', Icon: Sparkles },
  { label: 'Good condition', value: 'good', Icon: Star },
  { label: 'Worn', value: 'fair', Icon: Eye },
]

const FASHION_CONDITION_DESCRIPTIONS = {
  new: 'Unworn, tags still attached',
  likeNew: 'Worn once or twice, no signs of wear',
  good: 'Gently used, minor signs of wear',
  fair: 'Well-loved, visible signs of use',
}

// ── Generic condition labels (used for "All" and non-fashion categories) ──
const GENERIC_CONDITIONS = [
  { label: 'New', value: 'new', Icon: Tag },
  { label: 'Like new', value: 'likeNew', Icon: Sparkles },
  { label: 'Good', value: 'good', Icon: Star },
  { label: 'Used', value: 'fair', Icon: Eye },
]

const GENERIC_CONDITION_DESCRIPTIONS = {
  new: 'Brand new, unused',
  likeNew: 'Barely used, excellent condition',
  good: 'Some signs of use, fully functional',
  fair: 'Visible wear, still works well',
}

/**
 * Returns the correct conditions list and descriptions for the active category.
 * Fashion gets detailed labels; everything else (including "All") gets generic.
 */
function getConditionConfig(category) {
  const isFashionCategory = category === 'fashion' || ['women', 'men', 'shoes', 'accessories', 'vintage'].includes(category)
  return {
    conditions: isFashionCategory ? FASHION_CONDITIONS : GENERIC_CONDITIONS,
    descriptions: isFashionCategory ? FASHION_CONDITION_DESCRIPTIONS : GENERIC_CONDITION_DESCRIPTIONS,
  }
}

const COLOURS = [
  { label: 'Black', value: 'black', hex: '#1a1a1a' },
  { label: 'White', value: 'white', hex: '#FFFFFF', border: true },
  { label: 'Grey', value: 'grey', hex: '#9CA3AF' },
  { label: 'Blue', value: 'blue', hex: '#3B82F6' },
  { label: 'Red', value: 'red', hex: '#EF4444' },
  { label: 'Green', value: 'green', hex: '#22C55E' },
  { label: 'Beige', value: 'beige', hex: '#D4C5A9' },
  { label: 'Brown', value: 'brown', hex: '#92400E' },
  { label: 'Pink', value: 'pink', hex: '#EC4899' },
  { label: 'Orange', value: 'orange', hex: '#F97316' },
  { label: 'Yellow', value: 'yellow', hex: '#EAB308' },
  { label: 'Purple', value: 'purple', hex: '#A855F7' },
  { label: 'Multi', value: 'multi', hex: 'conic-gradient(red, yellow, green, blue, red)', isGradient: true },
]

const AGE_GROUPS = [
  { label: '0–2 yrs', value: '0-2' },
  { label: '3–5 yrs', value: '3-5' },
  { label: '6–9 yrs', value: '6-9' },
  { label: '10–14 yrs', value: '10-14' },
]

const LANGUAGES = [
  { label: 'English', value: 'english' },
  { label: 'Maltese', value: 'maltese' },
  { label: 'Italian', value: 'italian' },
  { label: 'French', value: 'french' },
  { label: 'German', value: 'german' },
  { label: 'Other', value: 'other' },
]

const MATERIALS = [
  { label: 'Wood', value: 'wood' },
  { label: 'Metal', value: 'metal' },
  { label: 'Fabric', value: 'fabric' },
  { label: 'Glass', value: 'glass' },
  { label: 'Plastic', value: 'plastic' },
  { label: 'Leather', value: 'leather' },
  { label: 'Stone', value: 'stone' },
]

const DELIVERY_TYPES = [
  { label: 'Delivery', value: 'delivery', Icon: Truck },
  { label: 'Collection', value: 'collection', Icon: MapPin },
]

// Gender tabs for fashion category
const GENDER_TABS = [
  { label: 'Women', value: 'women' },
  { label: 'Men', value: 'men' },
  { label: 'Kids', value: 'kids' },
]

// Gender tabs for Kids & Baby category
const KIDS_GENDER_TABS = [
  { label: 'Boy', value: 'boy' },
  { label: 'Girl', value: 'girl' },
  { label: 'Unisex', value: 'unisex' },
]

// Kids age-based sizes (matching SellPage)
const KIDS_AGE_SIZES = [
  '0-3 months', '3-6 months', '6-9 months', '9-12 months',
  '1-2 years', '2-3 years', '3-4 years', '4-5 years',
  '5-6 years', '6-7 years', '7-8 years', '8-9 years',
  '9-10 years', '10-12 years', '12-14 years',
]

const DEFAULT_FILTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

/**
 * Resolve which filter keys to show for the given category.
 */
function resolveFilterKeys(category) {
  if (!category) return ['condition', 'price']
  const resolved = LEGACY_CATEGORY_MAP[category] || category
  return getCategoryFilters(resolved)
}

/**
 * Resolve which key to pass to sizeConfig.
 */
function resolveSizeCategory(category) {
  if (!category) return null
  const direct = getSizesForCategory(category)
  if (direct.length > 0) return category
  return null
}

/**
 * Determine which size sections to show based on gender + subcategory.
 */
function getSizeSections(genderFilter, subcategory) {
  const NONE = { showClothing: false, showShoe: false, showWaist: false, showLength: false, showBelt: false }

  // Subcategory-specific overrides (regardless of gender)
  if (subcategory && NO_SIZE_SUBCATEGORIES.includes(subcategory)) {
    return NONE // bags, jewellery, sunglasses, wallets, scarves, hats — no size
  }
  if (subcategory && WATCH_SUBCATEGORIES.includes(subcategory)) {
    return NONE // watches — One Size, no picker
  }
  if (subcategory && BELT_SUBCATEGORIES.includes(subcategory)) {
    return { ...NONE, showBelt: true }
  }
  if (subcategory && SHOE_SUBCATEGORIES.includes(subcategory)) {
    return { ...NONE, showShoe: true }
  }
  if (subcategory && TROUSER_SUBCATEGORIES.includes(subcategory)) {
    return { ...NONE, showWaist: true, showLength: true }
  }
  if (subcategory && CLOTHING_ONLY_SUBCATEGORIES.includes(subcategory)) {
    return { ...NONE, showClothing: true }
  }

  // Gender-based defaults (no specific subcategory or generic subcategory)
  if (genderFilter === 'kids') {
    return { ...NONE, showClothing: true, showShoe: true }
  }

  // Women & Men: show clothing + shoe sizes; also waist/length for trousers
  return { showClothing: true, showShoe: true, showWaist: true, showLength: true, showBelt: false }
}

/**
 * Get the appropriate clothing sizes based on gender filter.
 */
function getClothingSizes(genderFilter) {
  switch (genderFilter) {
    case 'women': return { letter: WOMEN_LETTER_SIZES, eu: WOMEN_EU_SIZES }
    case 'men': return { letter: MEN_LETTER_SIZES, eu: [] }
    case 'kids': return { letter: [], eu: [], kids: KIDS_SIZES }
    default: return { letter: WOMEN_LETTER_SIZES, eu: WOMEN_EU_SIZES }
  }
}

// ── Collapsible section component ───────────────────────────
function CollapsibleSection({ title, defaultOpen = true, count = 0, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-1 group"
      >
        <h3 className="text-xs font-bold text-sib-text uppercase tracking-wide flex items-center gap-1.5">
          {title}
          {count > 0 && (
            <span className="inline-flex items-center justify-center w-4.5 h-4.5 min-w-[18px] px-1 rounded-full bg-sib-primary text-white text-[9px] font-bold">
              {count}
            </span>
          )}
        </h3>
        <ChevronDown
          size={14}
          className={`text-sib-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-[80vh] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </section>
  )
}

const QUICK_FILTER_OPTIONS = [
  { label: 'Under €25', value: 'under25', Icon: DollarSign },
  { label: 'Under €50', value: 'under50', Icon: DollarSign },
  { label: 'New with tags', value: 'newTags', Icon: Sparkles },
  { label: 'Vintage', value: 'vintage', Icon: Tag },
  { label: 'Designer', value: 'designer', Icon: Gem },
  { label: 'Trending', value: 'trending', Icon: TrendingUp },
  { label: 'New arrivals', value: 'newArrivals', Icon: Clock },
]

export default function FilterPanel({
  category,
  subcategory = '',
  conditions,
  setConditions,
  sizes,
  setSizes,
  maxPrice,
  setMaxPrice,
  colors,
  setColors,
  brands,
  setBrands,
  genderFilter = '',
  setGenderFilter,
  materials = [],
  setMaterials,
  deliveryType = '',
  setDeliveryType,
  sportDetail = '',
  setSportDetail,
  sportAttributes = [],
  setSportAttributes,
  quickFilter = '',
  setQuickFilter,
  clearFilters,
  activeFilterCount,
  allBrands = [],
}) {
  const [brandSearch, setBrandSearch] = useState('')
  const [showAllBrands, setShowAllBrands] = useState(false)
  const [priceInput, setPriceInput] = useState(String(maxPrice))
  const [showEuSizes, setShowEuSizes] = useState(false)

  // ── Condition config (fashion vs generic labels) ──
  const { conditions: CONDITIONS, descriptions: CONDITION_DESCRIPTIONS } = getConditionConfig(category)

  // ── Which filter sections to render ──
  const filterKeys = useMemo(() => resolveFilterKeys(category), [category])
  const show = (key) => filterKeys.includes(key)

  // Is this a fashion category?
  const isFashion = category === 'fashion' || ['women', 'men', 'shoes', 'accessories', 'vintage'].includes(category)
  const isKids = category === 'kids'
  const isSports = category === 'sports'

  // Sport-specific data (third-level children + dynamic filter groups)
  const sportChildren = useMemo(() => isSports && subcategory ? getSportChildren(subcategory) : [], [isSports, subcategory])
  const sportFilterGroups = useMemo(() => isSports && subcategory ? getSportFilterGroups(subcategory) : [], [isSports, subcategory])
  const sportBrandList = useMemo(() => isSports && subcategory ? getSportBrands(subcategory) : [], [isSports, subcategory])

  // Shoe-specific data (third-level shoe types)
  const isShoes = category === 'fashion' && subcategory === 'shoes'
  const shoeChildren = useMemo(() => isShoes ? getShoeChildren() : [], [isShoes])
  const shoeBrandList = useMemo(() => isShoes ? getShoeBrands() : [], [isShoes])

  // Unified third-level children (sport OR shoe)
  const thirdLevelChildren = sportChildren.length > 0 ? sportChildren : shoeChildren
  const hasThirdLevel = thirdLevelChildren.length > 0

  const toggleSportAttribute = (key, val) => {
    if (!setSportAttributes) return
    setSportAttributes(prev => {
      const tag = `${key}:${val}`
      return prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag]
    })
  }

  const toggleCondition = (c) => {
    setConditions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }
  const toggleSize = (s) => {
    setSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  const toggleColor = (c) => {
    setColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }
  const toggleBrand = (b) => {
    setBrands(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])
  }
  const toggleMaterial = (m) => {
    if (setMaterials) setMaterials(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  // Category-aware brand list: resolve legacy category, then get matching brands
  const resolvedCategory = LEGACY_CATEGORY_MAP[category] || category
  const categoryBrands = useMemo(
    () => getBrandsForCategory(resolvedCategory),
    [resolvedCategory],
  )

  // Merge category brands + any listing brands found in data, filter by search
  // Show popular brands first, then alphabetical
  const combinedBrands = useMemo(() => {
    const set = new Set([...categoryBrands, ...allBrands])
    let arr = [...set]
    if (brandSearch) {
      const q = brandSearch.toLowerCase()
      arr = arr.filter(b => b.toLowerCase().includes(q))
      // When searching, sort by relevance (starts-with first, then contains)
      arr.sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(q) ? 0 : 1
        const bStarts = b.toLowerCase().startsWith(q) ? 0 : 1
        if (aStarts !== bStarts) return aStarts - bStarts
        return a.localeCompare(b)
      })
    } else {
      // No search: popular brands first, then alphabetical
      const popularSet = new Set(POPULAR_BRANDS)
      const popular = arr.filter(b => popularSet.has(b))
      const rest = arr.filter(b => !popularSet.has(b)).sort()
      arr = [...popular, ...rest]
    }
    return arr
  }, [categoryBrands, allBrands, brandSearch])

  const displayBrands = showAllBrands || brandSearch ? combinedBrands : combinedBrands.slice(0, 16)

  const handlePriceInput = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setPriceInput(val)
    const num = parseInt(val, 10)
    if (!isNaN(num) && num >= 5 && num <= 500) {
      setMaxPrice(num)
    }
  }

  const handlePriceBlur = () => {
    const num = parseInt(priceInput, 10)
    if (isNaN(num) || num < 5) {
      setMaxPrice(5)
      setPriceInput('5')
    } else if (num > 500) {
      setMaxPrice(500)
      setPriceInput('500')
    } else {
      setMaxPrice(num)
      setPriceInput(String(num))
    }
  }

  const handleSlider = (e) => {
    const v = Number(e.target.value)
    setMaxPrice(v)
    setPriceInput(String(v))
  }

  // Dynamic size sections based on gender + subcategory
  const sizeSections = useMemo(
    () => getSizeSections(genderFilter || 'women', subcategory),
    [genderFilter, subcategory],
  )
  const clothingSizes = useMemo(
    () => getClothingSizes(genderFilter || 'women'),
    [genderFilter],
  )

  // Legacy size logic for non-fashion categories
  const sizeCategory = resolveSizeCategory(category)
  const currentSizes = sizeCategory ? getSizesForCategory(sizeCategory) : DEFAULT_FILTER_SIZES

  // ── Reusable size pill ──
  const SizePill = ({ size, small = false }) => {
    const active = sizes.includes(size)
    return (
      <button
        onClick={() => toggleSize(size)}
        className={`${small ? 'min-w-[36px] px-2 py-1.5 text-[11px]' : 'min-w-[40px] px-2.5 py-1.5 text-xs'} rounded-lg font-medium text-center transition-all duration-150 ${
          active
            ? 'bg-sib-primary text-white shadow-sm shadow-sib-primary/30'
            : 'bg-white dark:bg-[#26322f] text-sib-text dark:text-[#f4efe7] border border-sib-stone dark:border-[rgba(242,238,231,0.10)] hover:border-sib-primary/40 hover:bg-sib-warm dark:hover:bg-[#30403c]'
        }`}
      >
        {size}
      </button>
    )
  }

  // ── Reusable pill button ──
  const Pill = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-150 ${
        active
          ? 'bg-sib-primary text-white shadow-sm shadow-sib-primary/30'
          : 'bg-white dark:bg-[#26322f] text-sib-text dark:text-[#f4efe7] border border-sib-stone dark:border-[rgba(242,238,231,0.10)] hover:border-sib-primary/40 hover:bg-sib-warm dark:hover:bg-[#30403c]'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="space-y-4">
      {/* Clear filters — always visible at top */}
      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 text-xs font-semibold text-sib-secondary hover:text-red-600 transition-colors"
        >
          <RotateCcw size={13} /> Clear all filters ({activeFilterCount})
        </button>
      )}

      {/* ── Quick Filters ── */}
      {setQuickFilter && (
        <CollapsibleSection title="Quick Filters" count={quickFilter ? 1 : 0}>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_FILTER_OPTIONS.map(qf => {
              const active = quickFilter === qf.value
              return (
                <button
                  key={qf.value}
                  onClick={() => setQuickFilter(active ? '' : qf.value)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-sib-secondary text-white shadow-sm shadow-sib-secondary/25'
                      : 'bg-white dark:bg-[#26322f] text-sib-text dark:text-[#f4efe7] border border-sib-stone dark:border-[rgba(242,238,231,0.10)] hover:border-sib-secondary/40 hover:bg-sib-warm dark:hover:bg-[#30403c]'
                  }`}
                >
                  <qf.Icon size={12} className={active ? 'text-white' : 'text-sib-muted'} />
                  {qf.label}
                </button>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Gender Switch (fashion categories only) ── */}
      {isFashion && setGenderFilter && (
        <section>
          <div className="flex bg-sib-sand dark:bg-[#26322f] rounded-xl p-0.5">
            {GENDER_TABS.map(g => {
              const active = genderFilter === g.value
              return (
                <button
                  key={g.value}
                  onClick={() => setGenderFilter(active ? '' : g.value)}
                  className={`flex-1 py-2.5 rounded-[10px] text-xs font-bold text-center transition-all duration-200 ${
                    active
                      ? 'bg-white dark:bg-[#30403c] text-sib-text dark:text-[#f4efe7] shadow-sm'
                      : 'text-sib-muted dark:text-[#aeb8b4] hover:text-sib-text dark:hover:text-[#f4efe7]'
                  }`}
                >
                  {g.label}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Gender Switch (Kids & Baby — Boy / Girl / Unisex) ── */}
      {isKids && show('kids_gender') && setGenderFilter && (
        <section>
          <div className="flex bg-sib-sand dark:bg-[#26322f] rounded-xl p-0.5">
            {KIDS_GENDER_TABS.map(g => {
              const active = genderFilter === g.value
              return (
                <button
                  key={g.value}
                  onClick={() => setGenderFilter(active ? '' : g.value)}
                  className={`flex-1 py-2.5 rounded-[10px] text-xs font-bold text-center transition-all duration-200 ${
                    active
                      ? 'bg-white dark:bg-[#30403c] text-sib-text dark:text-[#f4efe7] shadow-sm'
                      : 'text-sib-muted dark:text-[#aeb8b4] hover:text-sib-text dark:hover:text-[#f4efe7]'
                  }`}
                >
                  {g.label}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Fashion Sizes (dynamic by gender + subcategory) ── */}
      {isFashion && show('size') && (sizeSections.showClothing || sizeSections.showShoe || sizeSections.showWaist || sizeSections.showLength || sizeSections.showBelt) && (
        <CollapsibleSection title="Size" count={sizes.length}>
          {/* Clothing sizes */}
          {sizeSections.showClothing && (
            <div className="space-y-3">
              {/* Kids sizes */}
              {clothingSizes.kids && clothingSizes.kids.length > 0 && (
                <div>
                  <p className="text-[10px] text-sib-muted mb-1.5 font-semibold uppercase tracking-wide">Age</p>
                  <div className="flex flex-wrap gap-1.5">
                    {clothingSizes.kids.map(s => <SizePill key={s} size={s} small />)}
                  </div>
                </div>
              )}

              {/* Letter sizes */}
              {clothingSizes.letter && clothingSizes.letter.length > 0 && (
                <div>
                  <p className="text-[10px] text-sib-muted mb-1.5 font-semibold uppercase tracking-wide">Clothing</p>
                  <div className="flex flex-wrap gap-1.5">
                    {clothingSizes.letter.map(s => <SizePill key={s} size={s} />)}
                  </div>
                </div>
              )}

              {/* EU numeric sizes (Women only) */}
              {clothingSizes.eu && clothingSizes.eu.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowEuSizes(!showEuSizes)}
                    className="flex items-center gap-1 text-[10px] text-sib-primary font-semibold mb-1.5 hover:underline"
                  >
                    EU numeric sizes
                    <ChevronDown size={10} className={`transition-transform ${showEuSizes ? 'rotate-180' : ''}`} />
                  </button>
                  {showEuSizes && (
                    <div className="flex flex-wrap gap-1.5">
                      {clothingSizes.eu.map(s => <SizePill key={`eu-${s}`} size={s} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Waist sizes (trousers/jeans) */}
          {sizeSections.showWaist && (
            <div className="mt-3">
              <p className="text-[10px] text-sib-muted mb-1.5 font-semibold uppercase tracking-wide">Waist</p>
              <div className="flex flex-wrap gap-1.5">
                {getWaistFilterSizes().map(s => <SizePill key={s} size={s} small />)}
              </div>
            </div>
          )}

          {/* Length sizes (trousers/jeans) */}
          {sizeSections.showLength && (
            <div className="mt-3">
              <p className="text-[10px] text-sib-muted mb-1.5 font-semibold uppercase tracking-wide">Length</p>
              <div className="flex flex-wrap gap-1.5">
                {getLengthFilterSizes().map(s => <SizePill key={s} size={s} small />)}
              </div>
            </div>
          )}

          {/* Shoe sizes */}
          {sizeSections.showShoe && (
            <div className="mt-3">
              <p className="text-[10px] text-sib-muted mb-1.5 font-semibold uppercase tracking-wide">Shoe size (EU)</p>
              <div className="flex flex-wrap gap-1.5">
                {SHOE_SIZES.map(s => <SizePill key={`shoe-${s}`} size={s} small />)}
              </div>
            </div>
          )}

          {/* Belt sizes (XS–XL) */}
          {sizeSections.showBelt && (
            <div className="mt-3">
              <p className="text-[10px] text-sib-muted mb-1.5 font-semibold uppercase tracking-wide">Belt size</p>
              <div className="flex flex-wrap gap-1.5">
                {BELT_SIZES.map(s => <SizePill key={`belt-${s}`} size={s} />)}
              </div>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* ── Non-fashion Size (category-aware) ── */}
      {!isFashion && show('size') && (
        <CollapsibleSection title="Size" count={sizes.length}>
          <div className="flex flex-wrap gap-1.5">
            {currentSizes.map(s => <SizePill key={s} size={s} />)}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Shoe Size (shown separately when size is not in filter keys) ── */}
      {show('shoe_size') && !show('size') && (
        <CollapsibleSection title="Shoe Size" count={sizes.filter(s => SHOE_SIZES.includes(s)).length}>
          <p className="text-[10px] text-sib-muted mb-2">EU sizing</p>
          <div className="flex flex-wrap gap-1.5">
            {SHOE_SIZES.map(s => <SizePill key={s} size={s} small />)}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Kids Age-Based Size (Kids & Baby category) ── */}
      {isKids && show('kids_size') && (
        <CollapsibleSection title="Size" count={sizes.length}>
          <div className="flex flex-wrap gap-1.5">
            {KIDS_AGE_SIZES.map(s => <SizePill key={s} size={s} small />)}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Brand (with search, multi-select, popular first) ── */}
      {show('brand') && (
        <CollapsibleSection title="Brand" count={brands.filter(b => !b.startsWith('lang:')).length}>
          <div className="relative mb-2.5">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sib-muted" />
            <input
              type="text"
              value={brandSearch}
              onChange={e => setBrandSearch(e.target.value)}
              placeholder="Search brands..."
              className="w-full pl-8 pr-8 py-2 text-xs bg-white dark:bg-[#26322f] border border-sib-stone dark:border-[rgba(242,238,231,0.10)] rounded-xl outline-none focus:border-sib-primary placeholder-sib-muted dark:placeholder:text-[#aeb8b4] transition-colors"
            />
            {brandSearch && (
              <button
                onClick={() => setBrandSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sib-muted hover:text-sib-text"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Selected brands chips (exclude lang: tags) */}
          {brands.filter(b => !b.startsWith('lang:')).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {brands.filter(b => !b.startsWith('lang:')).map(b => (
                <span
                  key={b}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-sib-primary text-white rounded-full text-[11px] font-semibold"
                >
                  {b}
                  <button onClick={() => toggleBrand(b)} className="hover:text-white/70 transition-colors">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Popular label */}
          {!brandSearch && !showAllBrands && (
            <p className="text-[9px] text-sib-muted font-semibold uppercase tracking-wider mb-1.5">Popular</p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {displayBrands.map(b => {
              const active = brands.includes(b)
              if (active) return null
              return (
                <button
                  key={b}
                  onClick={() => toggleBrand(b)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-white dark:bg-[#26322f] text-sib-text dark:text-[#f4efe7] border border-sib-stone dark:border-[rgba(242,238,231,0.10)] hover:border-sib-primary/40 hover:bg-sib-warm dark:hover:bg-[#30403c] transition-all duration-150"
                >
                  {b}
                </button>
              )
            })}
          </div>
          {!showAllBrands && combinedBrands.length > 16 && !brandSearch && (
            <button
              onClick={() => setShowAllBrands(true)}
              className="mt-2 text-xs text-sib-primary font-semibold hover:underline"
            >
              Show all brands ({combinedBrands.length})
            </button>
          )}
          {showAllBrands && !brandSearch && (
            <button
              onClick={() => setShowAllBrands(false)}
              className="mt-2 text-xs text-sib-muted font-semibold hover:underline"
            >
              Show less
            </button>
          )}
        </CollapsibleSection>
      )}

      {/* ── Age Group (toys, kids) ── */}
      {show('age_group') && (
        <CollapsibleSection title="Age Group">
          <div className="flex flex-wrap gap-2">
            {AGE_GROUPS.map(a => {
              const active = conditions.includes(`age:${a.value}`)
              return (
                <Pill key={a.value} active={active} onClick={() => toggleCondition(`age:${a.value}`)}>
                  {a.label}
                </Pill>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Language (books) ── */}
      {show('language') && (
        <CollapsibleSection title="Language">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => {
              const active = brands.includes(`lang:${l.value}`)
              return (
                <Pill key={l.value} active={active} onClick={() => toggleBrand(`lang:${l.value}`)}>
                  {l.label}
                </Pill>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Colour ── */}
      {show('colour') && (
        <CollapsibleSection title="Colour" count={colors.length}>
          <div className="flex flex-wrap gap-2.5">
            {COLOURS.map(c => {
              const active = colors.includes(c.value)
              return (
                <button
                  key={c.value}
                  onClick={() => toggleColor(c.value)}
                  className="flex flex-col items-center gap-1 group"
                  title={c.label}
                >
                  <div
                    className={`w-7 h-7 rounded-full transition-all duration-150 ${
                      active
                        ? 'ring-2 ring-sib-primary ring-offset-2 dark:ring-offset-[#202b28] scale-110'
                        : c.border
                          ? 'border border-gray-300 hover:scale-105'
                          : 'hover:scale-105'
                    }`}
                    style={{ background: c.hex }}
                  />
                  <span className={`text-[9px] font-medium transition-colors ${
                    active ? 'text-sib-primary' : 'text-sib-muted group-hover:text-sib-text'
                  }`}>
                    {c.label}
                  </span>
                </button>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Condition (context-aware labels) ── */}
      {show('condition') && (() => {
        const condConfig = getConditionConfig(category)
        return (
          <CollapsibleSection title="Condition" count={conditions.length}>
            <div className="space-y-1.5">
              {condConfig.conditions.map(c => {
                const active = conditions.includes(c.value)
                return (
                  <button
                    key={c.value}
                    onClick={() => toggleCondition(c.value)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 ${
                      active
                        ? 'bg-sib-primary/10 border border-sib-primary/30'
                        : 'bg-white dark:bg-[#26322f] border border-sib-stone dark:border-[rgba(242,238,231,0.10)] hover:border-sib-primary/30 hover:bg-sib-warm dark:hover:bg-[#30403c]'
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      active ? 'border-sib-primary bg-sib-primary' : 'border-sib-stone'
                    }`}>
                      {active && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${active ? 'text-sib-primary' : 'text-sib-text'}`}>
                        {c.label}
                      </p>
                      <p className="text-[10px] text-sib-muted leading-tight mt-0.5">
                        {condConfig.descriptions[c.value]}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </CollapsibleSection>
        )
      })()}

      {/* ── Price ── */}
      {show('price') && (
        <CollapsibleSection title="Price" count={maxPrice < 500 ? 1 : 0}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-bold text-sib-primary">Up to</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-sib-muted font-medium">€</span>
              <input
                type="text"
                inputMode="numeric"
                value={priceInput}
                onChange={handlePriceInput}
                onBlur={handlePriceBlur}
                className="w-20 pl-6 pr-2 py-1.5 text-sm font-bold text-sib-text dark:text-[#f4efe7] bg-white dark:bg-[#26322f] border border-sib-stone dark:border-[rgba(242,238,231,0.10)] rounded-lg outline-none focus:border-sib-primary transition-colors"
              />
            </div>
          </div>
          <input
            type="range"
            min={5}
            max={500}
            step={5}
            value={maxPrice}
            onChange={handleSlider}
            className="w-full accent-sib-primary h-1.5"
          />
          <div className="flex justify-between text-[10px] text-sib-muted mt-1">
            <span>€5</span>
            <span>€500</span>
          </div>
        </CollapsibleSection>
      )}

      {/* ── Material (furniture, home) ── */}
      {show('material') && (
        <CollapsibleSection title="Material" count={materials.length}>
          <div className="flex flex-wrap gap-2">
            {MATERIALS.map(m => {
              const active = materials.includes(m.value)
              return (
                <Pill key={m.value} active={active} onClick={() => toggleMaterial(m.value)}>
                  {m.label}
                </Pill>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Delivery (furniture) ── */}
      {show('delivery') && setDeliveryType && (
        <CollapsibleSection title="Delivery">
          <div className="flex flex-wrap gap-2">
            {DELIVERY_TYPES.map(d => {
              const active = deliveryType === d.value
              return (
                <button
                  key={d.value}
                  onClick={() => setDeliveryType(active ? '' : d.value)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-sib-primary text-white shadow-sm shadow-sib-primary/30'
                      : 'bg-white dark:bg-[#26322f] text-sib-text dark:text-[#f4efe7] border border-sib-stone dark:border-[rgba(242,238,231,0.10)] hover:border-sib-primary/40 hover:bg-sib-warm dark:hover:bg-[#30403c]'
                  }`}
                >
                  <d.Icon size={13} className={active ? 'text-white' : 'text-sib-muted'} />
                  {d.label}
                </button>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Third-level type pills (sport children OR shoe types) ── */}
      {hasThirdLevel && setSportDetail && (
        <CollapsibleSection title={isShoes ? 'Shoe type' : 'Type'} count={sportDetail ? 1 : 0}>
          <div className="flex flex-wrap gap-1.5">
            {thirdLevelChildren.map(c => {
              const active = sportDetail === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setSportDetail(active ? '' : c.id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-sib-primary text-white shadow-sm shadow-sib-primary/30'
                      : 'bg-white dark:bg-[#26322f] text-sib-text dark:text-[#f4efe7] border border-sib-stone dark:border-[rgba(242,238,231,0.10)] hover:border-sib-primary/40 hover:bg-sib-warm dark:hover:bg-[#30403c]'
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Shoe Brands (shown when shoes subcategory is active) ── */}
      {isShoes && shoeBrandList.length > 0 && !show('brand') && (
        <CollapsibleSection title="Brand" count={brands.filter(b => !b.startsWith('lang:')).length} defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {shoeBrandList.map(b => {
              const active = brands.includes(b)
              return (
                <button
                  key={b}
                  onClick={() => toggleBrand(b)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-150 ${
                    active
                      ? 'bg-sib-primary text-white shadow-sm shadow-sib-primary/30'
                      : 'bg-white dark:bg-[#26322f] text-sib-text dark:text-[#f4efe7] border border-sib-stone dark:border-[rgba(242,238,231,0.10)] hover:border-sib-primary/40 hover:bg-sib-warm dark:hover:bg-[#30403c]'
                  }`}
                >
                  {b}
                </button>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Sport Attribute Filters (dynamic per subcategory) ── */}
      {isSports && subcategory && sportFilterGroups.map(group => {
        const activeCount = sportAttributes.filter(a => a.startsWith(`${group.key}:`)).length
        return (
          <CollapsibleSection key={group.key} title={group.label} count={activeCount} defaultOpen={false}>
            <div className="flex flex-wrap gap-1.5">
              {group.options.map(opt => {
                const tag = `${group.key}:${opt.value}`
                const active = sportAttributes.includes(tag)
                return (
                  <Pill key={opt.value} active={active} onClick={() => toggleSportAttribute(group.key, opt.value)}>
                    {opt.label}
                  </Pill>
                )
              })}
            </div>
          </CollapsibleSection>
        )
      })}

      {/* ── Sport Brands (shown when sport_filters is in filter keys) ── */}
      {isSports && show('sport_filters') && sportBrandList.length > 0 && (
        <CollapsibleSection title="Brand" count={brands.filter(b => !b.startsWith('lang:')).length} defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {sportBrandList.map(b => {
              const active = brands.includes(b)
              return (
                <button
                  key={b}
                  onClick={() => toggleBrand(b)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-150 ${
                    active
                      ? 'bg-sib-primary text-white shadow-sm shadow-sib-primary/30'
                      : 'bg-white dark:bg-[#26322f] text-sib-text dark:text-[#f4efe7] border border-sib-stone dark:border-[rgba(242,238,231,0.10)] hover:border-sib-primary/40 hover:bg-sib-warm dark:hover:bg-[#30403c]'
                  }`}
                >
                  {b}
                </button>
              )
            })}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}
