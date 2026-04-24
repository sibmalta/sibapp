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
  subcategory,
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
  genderFilter,
  setGenderFilter,
  materials,
  setMaterials,
  deliveryType,
  setDeliveryType,
  sportDetail,
  setSportDetail,
  sportAttributes,
  setSportAttributes,
  quickFilter,
  setQuickFilter,
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
    <>
      {/* Backdrop — mobile: translucent overlay; desktop: same */}
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
      />

      {/* Sheet container — bottom-sheet on mobile, centred panel on desktop */}
      <div className="fixed inset-x-0 bottom-0 z-50 lg:inset-0 lg:flex lg:items-center lg:justify-center pointer-events-none">
        <div className="pointer-events-auto flex flex-col bg-white dark:bg-[#202b28] rounded-t-2xl lg:rounded-2xl shadow-2xl animate-sheet-up lg:animate-none max-h-[85vh] lg:max-h-[80vh] lg:w-[460px] lg:max-w-[90vw] border border-transparent dark:border-[rgba(242,238,231,0.10)] transition-colors">
          {/* Handle (mobile only) + header */}
          <div className="pt-2 pb-0 lg:pt-0">
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-[#42514d] mx-auto mb-2 lg:hidden" />
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-[rgba(242,238,231,0.10)]">
              <h2 className="text-[15px] font-bold text-sib-text dark:text-[#f4efe7]">Filters & Sort</h2>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-semibold text-sib-secondary"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#26322f] transition-colors"
                >
                  <X size={18} className="text-gray-500 dark:text-[#aeb8b4]" />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Sort */}
            <section>
                <h3 className="text-[11px] font-bold text-gray-400 dark:text-[#aeb8b4] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <ArrowDownUp size={12} className="text-gray-400 dark:text-[#aeb8b4]" />
                Sort by
              </h3>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setSort(o.value)}
                    className={`px-3.5 py-2 rounded-full text-[12px] font-semibold transition-all duration-150 ${
                      sort === o.value
                        ? 'bg-sib-text dark:bg-sib-primary text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-[#26322f] text-gray-600 dark:text-[#aeb8b4] hover:bg-gray-200 dark:hover:bg-[#30403c]'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-[rgba(242,238,231,0.10)]" />

            {/* Filter panel */}
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
          </div>

          {/* Footer — sticky CTA */}
          <div className="px-5 py-3.5 border-t border-gray-100 dark:border-[rgba(242,238,231,0.10)] safe-area-bottom">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-sib-primary text-white font-bold text-[14px] shadow-md shadow-sib-primary/20 active:scale-[0.98] transition-transform"
            >
              Show {resultCount} result{resultCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
