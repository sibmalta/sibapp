import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'sib_browsing_history'
const MAX_VIEWED = 30
const MAX_SEARCHES = 20
const MAX_CATEGORIES = 10

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

function defaultHistory() {
  return {
    viewedListingIds: [],   // most recent first
    searches: [],           // most recent first
    clickedCategories: [],  // most recent first
    clickedStyles: [],      // most recent first
  }
}

/**
 * Hook to track and retrieve browsing history for personalisation.
 * All data is stored in localStorage — no auth required.
 */
export default function useBrowsingHistory() {
  const [history, setHistory] = useState(() => load() || defaultHistory())

  // Persist on change
  useEffect(() => {
    save(history)
  }, [history])

  /** Record a listing view (by ID) */
  const recordView = useCallback((listingId) => {
    if (!listingId) return
    setHistory(prev => {
      const filtered = prev.viewedListingIds.filter(id => id !== listingId)
      return {
        ...prev,
        viewedListingIds: [listingId, ...filtered].slice(0, MAX_VIEWED),
      }
    })
  }, [])

  /** Record a search query */
  const recordSearch = useCallback((query) => {
    if (!query || !query.trim()) return
    const q = query.trim().toLowerCase()
    setHistory(prev => {
      const filtered = prev.searches.filter(s => s !== q)
      return {
        ...prev,
        searches: [q, ...filtered].slice(0, MAX_SEARCHES),
      }
    })
  }, [])

  /** Record a category click */
  const recordCategory = useCallback((category) => {
    if (!category) return
    setHistory(prev => {
      const filtered = prev.clickedCategories.filter(c => c !== category)
      return {
        ...prev,
        clickedCategories: [category, ...filtered].slice(0, MAX_CATEGORIES),
      }
    })
  }, [])

  /** Record a style click */
  const recordStyle = useCallback((styleId) => {
    if (!styleId) return
    setHistory(prev => {
      const filtered = (prev.clickedStyles || []).filter(s => s !== styleId)
      return {
        ...prev,
        clickedStyles: [styleId, ...filtered].slice(0, MAX_CATEGORIES),
      }
    })
  }, [])

  /** Whether any history exists */
  const hasHistory = history.viewedListingIds.length > 0 ||
    history.searches.length > 0 ||
    history.clickedCategories.length > 0 ||
    (history.clickedStyles || []).length > 0

  /** Clear all browsing history */
  const clearHistory = useCallback(() => {
    setHistory(defaultHistory())
  }, [])

  return {
    viewedListingIds: history.viewedListingIds,
    searches: history.searches,
    clickedCategories: history.clickedCategories,
    clickedStyles: history.clickedStyles || [],
    hasHistory,
    recordView,
    recordSearch,
    recordCategory,
    recordStyle,
    clearHistory,
  }
}
