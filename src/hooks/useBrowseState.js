import { useState, useCallback, useRef, useEffect } from 'react'

const STORAGE_KEY = 'sib_browse_state'

function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveState(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

/**
 * Persists browse page filter/search/sort state in sessionStorage
 * so it survives navigation to listing detail and back.
 *
 * @param {object} defaults - default values from URL search params
 * @returns state + setters that auto-persist
 */
export default function useBrowseState(defaults = {}) {
  const saved = useRef(loadState())

  const [query, setQueryRaw] = useState(
    saved.current?.query ?? defaults.query ?? ''
  )
  const [category, setCategoryRaw] = useState(
    saved.current?.category ?? ''
  )
  const [conditions, setConditionsRaw] = useState(
    saved.current?.conditions ?? []
  )
  const [sizes, setSizesRaw] = useState(
    saved.current?.sizes ?? []
  )
  const [maxPrice, setMaxPriceRaw] = useState(
    saved.current?.maxPrice ?? 500
  )
  const [sort, setSortRaw] = useState(
    saved.current?.sort ?? defaults.sort ?? 'newest'
  )
  const [showFilters, setShowFilters] = useState(
    saved.current?.showFilters ?? false
  )
  const [colors, setColorsRaw] = useState(
    saved.current?.colors ?? []
  )
  const [brands, setBrandsRaw] = useState(
    saved.current?.brands ?? []
  )
  const [quickFilter, setQuickFilterRaw] = useState(
    saved.current?.quickFilter ?? ''
  )
  const [styleTag, setStyleTagRaw] = useState(
    saved.current?.styleTag ?? defaults.styleTag ?? ''
  )

  // Persist every time any value changes
  useEffect(() => {
    saveState({ query, category, conditions, sizes, maxPrice, sort, showFilters, colors, brands, quickFilter, styleTag })
  }, [query, category, conditions, sizes, maxPrice, sort, showFilters, colors, brands, quickFilter, styleTag])

  // Wrapped setters
  const setQuery = useCallback((v) => setQueryRaw(v), [])
  const setCategory = useCallback((v) => {
    setCategoryRaw(v)
    setSizesRaw([]) // reset sizes when category changes
  }, [])
  const setConditions = useCallback((v) => setConditionsRaw(v), [])
  const setSizes = useCallback((v) => setSizesRaw(v), [])
  const setMaxPrice = useCallback((v) => setMaxPriceRaw(v), [])
  const setSort = useCallback((v) => setSortRaw(v), [])
  const setColors = useCallback((v) => setColorsRaw(v), [])
  const setBrands = useCallback((v) => setBrandsRaw(v), [])
  const setQuickFilter = useCallback((v) => setQuickFilterRaw(prev => prev === v ? '' : v), [])
  const setStyleTag = useCallback((v) => setStyleTagRaw(v), [])

  const clearFilters = useCallback(() => {
    setConditionsRaw([])
    setSizesRaw([])
    setMaxPriceRaw(500)
    setColorsRaw([])
    setBrandsRaw([])
    setQuickFilterRaw('')
    setStyleTagRaw('')
  }, [])

  return {
    query, setQuery,
    category, setCategory,
    conditions, setConditions,
    sizes, setSizes,
    maxPrice, setMaxPrice,
    sort, setSort,
    showFilters, setShowFilters,
    colors, setColors,
    brands, setBrands,
    quickFilter, setQuickFilter,
    styleTag, setStyleTag,
    clearFilters,
  }
}
