import React, { useState, useMemo } from 'react'
import { X, Sparkles, Flame, ThumbsUp, Feather, Search, RotateCcw } from 'lucide-react'
import { getSizesForCategory, getWaistFilterSizes } from '../utils/sizeConfig'
import { BRAND_LIST } from '../lib/brands'

const CONDITIONS = [
  { label: 'New', value: 'new', Icon: Sparkles },
  { label: 'Like New', value: 'likeNew', Icon: Flame },
  { label: 'Good', value: 'good', Icon: ThumbsUp },
  { label: 'Fair', value: 'fair', Icon: Feather },
]

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

// Use canonical brand list — BRAND_LIST is already sorted alphabetically
const POPULAR_BRANDS = BRAND_LIST

const DEFAULT_FILTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export default function FilterPanel({
  category,
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
  clearFilters,
  activeFilterCount,
  allBrands = [],
}) {
  const [brandSearch, setBrandSearch] = useState('')
  const [showAllBrands, setShowAllBrands] = useState(false)
  const [priceInput, setPriceInput] = useState(String(maxPrice))

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

  // Merge popular + all listing brands, filter by search
  const combinedBrands = useMemo(() => {
    const set = new Set([...POPULAR_BRANDS, ...allBrands])
    let arr = [...set].sort()
    if (brandSearch) {
      const q = brandSearch.toLowerCase()
      arr = arr.filter(b => b.toLowerCase().includes(q))
    }
    return arr
  }, [allBrands, brandSearch])

  const displayBrands = showAllBrands ? combinedBrands : combinedBrands.slice(0, 12)

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

  // Keep priceInput in sync with slider
  const handleSlider = (e) => {
    const v = Number(e.target.value)
    setMaxPrice(v)
    setPriceInput(String(v))
  }

  const currentSizes = category ? getSizesForCategory(category) : DEFAULT_FILTER_SIZES

  return (
    <div className="space-y-5">
      {/* Clear filters — always visible at top */}
      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 text-xs font-semibold text-sib-secondary hover:text-red-600 transition-colors"
        >
          <RotateCcw size={13} /> Clear all filters ({activeFilterCount})
        </button>
      )}

      {/* ── Condition ── */}
      <section>
        <h3 className="text-xs font-bold text-sib-text uppercase tracking-wide mb-2.5">Condition</h3>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map(c => {
            const active = conditions.includes(c.value)
            return (
              <button
                key={c.value}
                onClick={() => toggleCondition(c.value)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-150 ${
                  active
                    ? 'bg-sib-primary text-white shadow-sm shadow-sib-primary/30'
                    : 'bg-white text-sib-text border border-sib-stone hover:border-sib-primary/40 hover:bg-sib-warm'
                }`}
              >
                <c.Icon size={13} className={active ? 'text-white' : 'text-sib-muted'} />
                {c.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Size (category-aware) ── */}
      <section>
        <h3 className="text-xs font-bold text-sib-text uppercase tracking-wide mb-1">Size</h3>
        {category && (
          <p className="text-[10px] text-sib-muted mb-2 capitalize">
            {category === 'shoes' ? 'EU sizing' : category === 'kids' ? 'Age ranges' : `${category}'s sizing`}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {currentSizes.map(s => {
            const active = sizes.includes(s)
            return (
              <button
                key={s}
                onClick={() => toggleSize(s)}
                className={`min-w-[40px] px-2.5 py-1.5 rounded-lg text-xs font-medium text-center transition-all duration-150 ${
                  active
                    ? 'bg-sib-primary text-white shadow-sm shadow-sib-primary/30'
                    : 'bg-white text-sib-text border border-sib-stone hover:border-sib-primary/40 hover:bg-sib-warm'
                }`}
              >
                {s}
              </button>
            )
          })}
        </div>

        {/* Waist sizes for men */}
        {category === 'men' && (
          <div className="mt-3">
            <p className="text-[10px] text-sib-muted mb-1.5 font-medium">Waist (trousers/shorts)</p>
            <div className="flex flex-wrap gap-1.5">
              {getWaistFilterSizes().map(s => {
                const active = sizes.includes(s)
                return (
                  <button
                    key={s}
                    onClick={() => toggleSize(s)}
                    className={`min-w-[40px] px-2.5 py-1.5 rounded-lg text-xs font-medium text-center transition-all duration-150 ${
                      active
                        ? 'bg-sib-primary text-white shadow-sm shadow-sib-primary/30'
                        : 'bg-white text-sib-text border border-sib-stone hover:border-sib-primary/40 hover:bg-sib-warm'
                    }`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── Colour ── */}
      <section>
        <h3 className="text-xs font-bold text-sib-text uppercase tracking-wide mb-2.5">Colour</h3>
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
                      ? 'ring-2 ring-sib-primary ring-offset-2 scale-110'
                      : c.border
                        ? 'border border-gray-300 hover:scale-105'
                        : 'hover:scale-105'
                  }`}
                  style={{
                    background: c.isGradient ? c.hex : c.hex,
                  }}
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
      </section>

      {/* ── Price ── */}
      <section>
        <h3 className="text-xs font-bold text-sib-text uppercase tracking-wide mb-2.5">Price</h3>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-bold text-sib-primary">
            Up to
          </span>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-sib-muted font-medium">€</span>
            <input
              type="text"
              inputMode="numeric"
              value={priceInput}
              onChange={handlePriceInput}
              onBlur={handlePriceBlur}
              className="w-20 pl-6 pr-2 py-1.5 text-sm font-bold text-sib-text bg-white border border-sib-stone rounded-lg outline-none focus:border-sib-primary transition-colors"
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
      </section>

      {/* ── Brand ── */}
      <section>
        <h3 className="text-xs font-bold text-sib-text uppercase tracking-wide mb-2.5">Brand</h3>
        <div className="relative mb-2.5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sib-muted" />
          <input
            type="text"
            value={brandSearch}
            onChange={e => setBrandSearch(e.target.value)}
            placeholder="Search brands..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-sib-stone rounded-lg outline-none focus:border-sib-primary placeholder-sib-muted transition-colors"
          />
        </div>

        {/* Selected brands chips */}
        {brands.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {brands.map(b => (
              <span
                key={b}
                className="flex items-center gap-1 px-2.5 py-1 bg-sib-primary/10 text-sib-primary rounded-full text-xs font-semibold"
              >
                {b}
                <button onClick={() => toggleBrand(b)} className="hover:text-sib-secondary transition-colors">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {displayBrands.map(b => {
            const active = brands.includes(b)
            if (active) return null // already shown above
            return (
              <button
                key={b}
                onClick={() => toggleBrand(b)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-sib-text border border-sib-stone hover:border-sib-primary/40 hover:bg-sib-warm transition-all duration-150"
              >
                {b}
              </button>
            )
          })}
        </div>
        {!showAllBrands && combinedBrands.length > 12 && !brandSearch && (
          <button
            onClick={() => setShowAllBrands(true)}
            className="mt-2 text-xs text-sib-primary font-semibold hover:underline"
          >
            Show all ({combinedBrands.length})
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
      </section>
    </div>
  )
}
