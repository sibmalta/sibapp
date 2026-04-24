import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { BRAND_LIST, normalizeBrand } from '../lib/brands'

/**
 * Autocomplete brand input for the sell flow.
 *
 * Features:
 * - Suggests from canonical brand list as user types
 * - Normalises to canonical casing on blur / selection
 * - Allows custom brands not in the dictionary
 * - Keyboard navigation (arrow keys + enter)
 */
export default function BrandInput({ value, onChange, error, className = '', placeholder = "e.g. Zara, Nike, Levi's, No Brand..." }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapperRef = useRef(null)
  const listRef = useRef(null)

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    setQuery(value || '')
  }, [value])

  // Filter suggestions
  const suggestions = useMemo(() => {
    if (!query || query.length < 1) return []
    const q = query.toLowerCase().trim()
    if (!q) return []
    const matches = BRAND_LIST.filter(b => b.toLowerCase().includes(q))
    // Sort: starts-with first, then contains
    matches.sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(q) ? 0 : 1
      const bStarts = b.toLowerCase().startsWith(q) ? 0 : 1
      if (aStarts !== bStarts) return aStarts - bStarts
      return a.localeCompare(b)
    })
    return matches.slice(0, 8)
  }, [query])

  const showDropdown = open && suggestions.length > 0

  // Select a brand from the dropdown
  const selectBrand = useCallback((brand) => {
    setQuery(brand)
    onChange(brand)
    setOpen(false)
    setActiveIdx(-1)
  }, [onChange])

  // Normalise on blur
  const handleBlur = useCallback(() => {
    // Small delay so click on dropdown item fires first
    setTimeout(() => {
      setOpen(false)
      if (query.trim()) {
        const normalized = normalizeBrand(query)
        setQuery(normalized)
        onChange(normalized)
      }
    }, 150)
  }, [query, onChange])

  // Handle input changes
  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setOpen(true)
    setActiveIdx(-1)
    // Don't call onChange yet — wait for blur/select to normalise
  }

  // Keyboard nav
  const handleKeyDown = (e) => {
    if (!showDropdown) {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (query.trim()) {
          const normalized = normalizeBrand(query)
          setQuery(normalized)
          onChange(normalized)
          setOpen(false)
        }
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIdx(prev => Math.min(prev + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIdx(prev => Math.max(prev - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIdx >= 0 && suggestions[activeIdx]) {
          selectBrand(suggestions[activeIdx])
        } else if (query.trim()) {
          const normalized = normalizeBrand(query)
          setQuery(normalized)
          onChange(normalized)
          setOpen(false)
        }
        break
      case 'Escape':
        setOpen(false)
        setActiveIdx(-1)
        break
      default:
        break
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const item = listRef.current.children[activeIdx]
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIdx])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Highlight matching text
  const highlight = (text) => {
    if (!query) return text
    const q = query.trim().toLowerCase()
    const idx = text.toLowerCase().indexOf(q)
    if (idx < 0) return text
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-bold text-sib-text dark:text-[#f4efe7]">{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => { if (query.length >= 1) setOpen(true) }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text dark:text-[#f4efe7] placeholder-sib-muted dark:placeholder:text-[#aeb8b4] bg-white dark:bg-[#26322f] ${error ? 'border-red-400' : 'border-sib-stone dark:border-[rgba(242,238,231,0.10)]'} ${className}`}
      />

      {showDropdown && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-[#202b28] border border-sib-stone/60 dark:border-[rgba(242,238,231,0.10)] rounded-xl shadow-lg max-h-52 overflow-y-auto py-1"
        >
          {suggestions.map((brand, i) => (
            <li
              key={brand}
              onMouseDown={(e) => { e.preventDefault(); selectBrand(brand) }}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                i === activeIdx
                  ? 'bg-sib-primary/10 text-sib-text'
                  : 'text-sib-muted dark:text-[#aeb8b4] hover:bg-gray-50 dark:hover:bg-[#26322f]'
              }`}
            >
              {highlight(brand)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
