import React, { useMemo } from 'react'
import { Plus, ArrowRight } from 'lucide-react'
import { getCategoryById } from '../data/categories'

/**
 * Builds a human-readable label for the current search context.
 * E.g. "Nike trainers", "Gucci bags", "shoes", "fashion" etc.
 */
function buildSearchLabel({ query, brands, activeSubLabel, category }) {
  const parts = []
  if (brands.length === 1) parts.push(brands[0])
  if (query) parts.push(query)
  if (parts.length === 0 && activeSubLabel) parts.push(activeSubLabel.toLowerCase())
  if (parts.length === 0 && category) {
    const cat = getCategoryById(category)
    if (cat) parts.push(cat.label.toLowerCase())
  }
  return parts.join(' ').trim()
}

/**
 * Context-aware empty state for the Browse page.
 *
 * Shows a dynamic headline, contextual next-action buttons,
 * and a primary CTA to list an item.
 */
export default function EmptyBrowseState({
  query,
  category,
  subcategory,
  brands,
  activeSubLabel,
  activeFilterCount,
  quickFilter,
  styleTag,
  activeStyleRule,
  clearFilters,
  setQuickFilter,
  setQuery,
  setCategory,
  setSubcategory,
  setBrands,
  setStyleTag,
  navigate,
  authNav,
}) {
  const searchLabel = useMemo(
    () => buildSearchLabel({ query, brands, activeSubLabel, category }),
    [query, brands, activeSubLabel, category],
  )

  // Derive the headline — dynamic when there's context, generic otherwise
  const headline = searchLabel
    ? `No ${searchLabel} listed yet`
    : 'Nothing here yet'

  const subtitle = searchLabel
    ? 'Sib is growing fast — this will fill up soon.'
    : 'Try a different search or explore other categories.'

  // Helper to reset all filters, then apply optional overrides
  const resetAll = (overrides = {}) => {
    clearFilters()
    setQuickFilter('')
    setQuery('')
    setCategory(overrides.category || '')
    setSubcategory(overrides.subcategory || '')
    setBrands(overrides.brands || [])
    setStyleTag('')
  }

  // Build max 3 smart suggestion pills (contextual + Browse all)
  const suggestions = useMemo(() => {
    const items = []

    // "View all [Brand]" — brand + other filters narrow it to zero
    if (brands.length === 1 && (query || subcategory || activeFilterCount > 1)) {
      items.push({
        key: 'brand-only',
        label: `View all ${brands[0]}`,
        action: () => resetAll({ brands: [brands[0]] }),
      })
    }

    // "Browse [Subcategory]" — extra filters narrow a subcategory to zero
    if (activeSubLabel && (query || brands.length || activeFilterCount > 0)) {
      items.push({
        key: 'sub-only',
        label: `Browse ${activeSubLabel}`,
        action: () => resetAll({ category, subcategory }),
      })
    }

    // "Browse [Category]" — inside a category with extra filters
    if (category) {
      const cat = getCategoryById(category)
      if (cat && (query || subcategory || brands.length || activeFilterCount > 0)) {
        items.push({
          key: 'cat-only',
          label: `Browse ${cat.label}`,
          action: () => resetAll({ category }),
        })
      }
    }

    // Always include "Browse all" as final escape hatch
    items.push({
      key: 'browse-all',
      label: 'Browse all',
      action: () => resetAll(),
    })

    // Dedupe by key and cap at 3
    const seen = new Set()
    return items.filter(i => {
      if (seen.has(i.key)) return false
      seen.add(i.key)
      return true
    }).slice(0, 3)
  }, [brands, query, subcategory, category, activeSubLabel, activeFilterCount])

  const hasActiveFilters = activeFilterCount > 0 || quickFilter

  return (
    <div className="text-center py-16 px-4">
      {/* Warm illustration */}
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sib-primary/8 flex items-center justify-center">
        <span className="text-[28px] leading-none">🏷️</span>
      </div>

      {/* Dynamic headline */}
      <p className="text-[17px] font-bold text-sib-text leading-tight">
        {headline}
      </p>

      {/* Subtitle */}
      <p className="text-[13px] text-gray-500 mt-1.5 max-w-[280px] mx-auto leading-snug">
        {subtitle}
      </p>

      {/* Primary CTA */}
      <button
        onClick={() => authNav('/sell')}
        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-sib-primary text-white text-[13px] font-bold hover:bg-sib-primary/90 active:scale-[0.97] transition-all shadow-sm"
      >
        <Plus size={15} strokeWidth={2.5} />
        Be the first to list one
      </button>

      {/* Encouraging nudge */}
      <p className="text-[12px] text-sib-muted mt-2.5">
        You could be the first seller here 👀
      </p>

      {/* Smart suggestion pills — max 3 */}
      <div className="flex items-center justify-center flex-wrap gap-2 mt-5">
        {suggestions.map(s => (
          <button
            key={s.key}
            onClick={s.action}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold rounded-full transition-colors ${
              s.key === 'browse-all'
                ? 'text-gray-400 bg-gray-100 hover:bg-gray-200 hover:text-gray-600'
                : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            {s.label}
            <ArrowRight size={11} className="text-gray-400" />
          </button>
        ))}
      </div>

      {/* De-emphasized clear filters — only when filters are active */}
      {hasActiveFilters && (
        <button
          onClick={() => { clearFilters(); setQuickFilter('') }}
          className="mt-3 text-[11px] text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}
