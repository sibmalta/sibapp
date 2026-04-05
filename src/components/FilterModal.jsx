import React, { useEffect } from 'react'
import { X, ArrowDownUp } from 'lucide-react'
import FilterPanel from './FilterPanel'

const SORT_OPTIONS = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Most popular', value: 'liked' },
]

export default function FilterModal({
  open,
  onClose,
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
  sort,
  setSort,
  clearFilters,
  activeFilterCount,
  allBrands,
  resultCount,
}) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-filter-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-sib-stone/60">
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-sib-sand transition-colors"
        >
          <X size={20} className="text-sib-text" />
        </button>
        <h2 className="text-base font-bold text-sib-text">Filters</h2>
        {activeFilterCount > 0 ? (
          <button
            onClick={clearFilters}
            className="text-xs font-semibold text-sib-secondary"
          >
            Reset
          </button>
        ) : (
          <div className="w-9" />
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {/* Sort */}
        <section>
          <h3 className="text-xs font-bold text-sib-text uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <ArrowDownUp size={13} className="text-sib-muted" />
            Sort by
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {SORT_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setSort(o.value)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-center transition-all duration-150 ${
                  sort === o.value
                    ? 'bg-sib-primary text-white shadow-sm shadow-sib-primary/25'
                    : 'bg-sib-sand text-sib-text hover:bg-sib-stone/40'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-sib-stone/50" />

        {/* Filter panel */}
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
      </div>

      {/* Footer */}
      <div className="px-4 py-3.5 border-t border-sib-stone/60 safe-area-bottom">
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-sib-primary text-white font-bold text-sm shadow-lg shadow-sib-primary/25 active:scale-[0.98] transition-transform"
        >
          Show {resultCount} item{resultCount !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  )
}
