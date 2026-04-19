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
    saved.current?.category ?? 'fashion'
  )
  const [subcategory, setSubcategoryRaw] = useState(
    saved.current?.subcategory ?? ''
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
  const [materials, setMaterialsRaw] = useState(
    saved.current?.materials ?? []
  )
  const [deliveryType, setDeliveryTypeRaw] = useState(
    saved.current?.deliveryType ?? ''
  )
  const [genderFilter, setGenderFilterRaw] = useState(
    saved.current?.genderFilter ?? ''
  )
  const [sportDetail, setSportDetailRaw] = useState(
    saved.current?.sportDetail ?? ''
  )
  const [sportAttributes, setSportAttributesRaw] = useState(
    saved.current?.sportAttributes ?? []
  )

  // Persist every time any value changes
  useEffect(() => {
    saveState({ query, category, subcategory, conditions, sizes, maxPrice, sort, showFilters, colors, brands, quickFilter, styleTag, materials, deliveryType, genderFilter, sportDetail, sportAttributes })
  }, [query, category, subcategory, conditions, sizes, maxPrice, sort, showFilters, colors, brands, quickFilter, styleTag, materials, deliveryType, genderFilter, sportDetail, sportAttributes])

  // Wrapped setters
  const setQuery = useCallback((v) => setQueryRaw(v), [])
  const setCategory = useCallback((v) => {
    setCategoryRaw(v)
    setSubcategoryRaw('')  // reset subcategory when top-level category changes
    setSizesRaw([])        // reset sizes when category changes
    setColorsRaw([])       // reset category-specific filters
    setMaterialsRaw([])    // reset material filter
    setDeliveryTypeRaw('') // reset delivery filter
    setBrandsRaw([])       // reset brand filter
    setSportDetailRaw('')  // reset sport detail
    setSportAttributesRaw([]) // reset sport attributes
  }, [])
  const setSubcategory = useCallback((v) => {
    setSubcategoryRaw(prev => prev === v ? '' : v)
    setSportDetailRaw('')    // reset sport detail when subcategory changes
    setSportAttributesRaw([]) // reset sport attributes
  }, [])
  const setConditions = useCallback((v) => setConditionsRaw(v), [])
  const setSizes = useCallback((v) => setSizesRaw(v), [])
  const setMaxPrice = useCallback((v) => setMaxPriceRaw(v), [])
  const setSort = useCallback((v) => setSortRaw(v), [])
  const setColors = useCallback((v) => setColorsRaw(v), [])
  const setBrands = useCallback((v) => setBrandsRaw(v), [])
  const setQuickFilter = useCallback((v) => setQuickFilterRaw(prev => prev === v ? '' : v), [])
  const setStyleTag = useCallback((v) => setStyleTagRaw(v), [])
  const setMaterials = useCallback((v) => setMaterialsRaw(v), [])
  const setDeliveryType = useCallback((v) => setDeliveryTypeRaw(v), [])
  const setGenderFilter = useCallback((v) => {
    setGenderFilterRaw(v)
    setSizesRaw([]) // reset sizes when gender changes (different size sets)
  }, [])

  const setSportDetail = useCallback((v) => setSportDetailRaw(prev => prev === v ? '' : v), [])
  const setSportAttributes = useCallback((v) => setSportAttributesRaw(v), [])

  const clearFilters = useCallback(() => {
    setSubcategoryRaw('')
    setConditionsRaw([])
    setSizesRaw([])
    setMaxPriceRaw(500)
    setColorsRaw([])
    setBrandsRaw([])
    setQuickFilterRaw('')
    setStyleTagRaw('')
    setMaterialsRaw([])
    setDeliveryTypeRaw('')
    setGenderFilterRaw('')
    setSportDetailRaw('')
    setSportAttributesRaw([])
  }, [])

  return {
    query, setQuery,
    category, setCategory,
    subcategory, setSubcategory,
    conditions, setConditions,
    sizes, setSizes,
    maxPrice, setMaxPrice,
    sort, setSort,
    showFilters, setShowFilters,
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
  }
}
