import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Search, Tag, Grid3X3, ShoppingBag, Sparkles, ArrowUpRight, User, LogIn } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateSuggestions } from '../data/searchConfig'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const SearchAutocomplete = forwardRef(function SearchAutocomplete(
  { query, onSelect, onActiveIndexChange, className = '', renderInline = false },
  ref
) {
  const { listings, users, currentUser } = useApp()
  const isAuthenticated = !!currentUser
  const debouncedQuery = useDebounce(query, 150)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listRef = useRef(null)
  const suggestionsRef = useRef([])

  const suggestions = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) return []
    console.log('generateSuggestions called', {
      query: debouncedQuery,
      listingsCount: listings.length,
      usersCount: users.length,
    })
    return generateSuggestions(debouncedQuery, listings, 8, users, { isAuthenticated })
  }, [debouncedQuery, listings, users, isAuthenticated])

  useEffect(() => {
    console.log('suggestions', suggestions)
  }, [suggestions])

  // Keep ref in sync for imperative access
  suggestionsRef.current = suggestions

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1)
  }, [suggestions])

  // Notify parent of activeIndex changes
  useEffect(() => {
    if (onActiveIndexChange) onActiveIndexChange(activeIndex)
  }, [activeIndex, onActiveIndexChange])

  // Expose imperative methods for TopBar keyboard handling
  useImperativeHandle(ref, () => ({
    handleKeyNav(key) {
      const len = suggestionsRef.current.length
      if (len === 0) return
      if (key === 'ArrowDown') {
        setActiveIndex(prev => (prev + 1) % len)
      } else if (key === 'ArrowUp') {
        setActiveIndex(prev => (prev <= 0 ? len - 1 : prev - 1))
      }
    },
    selectActive() {
      const s = suggestionsRef.current
      setActiveIndex(current => {
        if (current >= 0 && current < s.length) {
          onSelect(s[current])
        }
        return current
      })
    }
  }), [onSelect])

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`)
      if (el) el.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  // ── Inline mode (TopBar full-screen overlay) — always render, show placeholder when no suggestions ──
  if (renderInline) {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <Search size={32} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-400 font-medium">Type at least 2 characters to search</p>
          <p className="text-xs text-gray-300 mt-1">Try "nike", "golf", "apple", or "lego"</p>
        </div>
      )
    }
    if (suggestions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <Search size={32} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-400 font-medium">No results for "{debouncedQuery}"</p>
          <p className="text-xs text-gray-300 mt-1">Try a different search term</p>
        </div>
      )
    }
    return (
      <div ref={listRef}>
        {renderSuggestionList(suggestions, activeIndex, setActiveIndex, onSelect, debouncedQuery)}
      </div>
    )
  }

  // ── Dropdown mode (BrowsePage) ──
  if (!debouncedQuery || debouncedQuery.trim().length < 2 || suggestions.length === 0) return null

  return (
    <div
      onMouseDown={e => e.preventDefault()}
      className={`absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#202b28] rounded-xl shadow-lg border border-sib-stone/40 dark:border-[rgba(242,238,231,0.10)] overflow-hidden z-[9999] max-h-[60vh] overflow-y-auto ${className}`}
      ref={listRef}
    >
      {renderSuggestionList(suggestions, activeIndex, setActiveIndex, onSelect, query)}
    </div>
  )
})

export default SearchAutocomplete

/* ── Shared suggestion list rendering ─────────────────────── */

function SuggestionIcon({ type }) {
  switch (type) {
    case 'smart':       return <Sparkles size={14} className="text-sib-secondary flex-shrink-0" />
    case 'brand':       return <Tag size={14} className="text-sib-primary flex-shrink-0" />
    case 'category':
    case 'subcategory': return <Grid3X3 size={14} className="text-sib-accent flex-shrink-0" />
    case 'user':        return <User size={14} className="text-sib-primary flex-shrink-0" />
    default:            return <ShoppingBag size={14} className="text-sib-muted flex-shrink-0" />
  }
}

function getSubtext(item) {
  if (item.type === 'smart') {
    const parts = []
    if (item.brand) parts.push(item.brand)
    if (item.category) {
      const catLabel = item.category.charAt(0).toUpperCase() + item.category.slice(1)
      parts.push(catLabel)
    }
    return parts.length > 0 ? parts.join(' · ') : null
  }
  if (item.type === 'category') return 'Category'
  if (item.type === 'subcategory') return 'Subcategory'
  if (item.type === 'user') {
    if (item.displayName && item.displayName !== item.label) return item.displayName
    return 'Seller'
  }
  return null
}

function getSectionHeader(suggestions, item, i) {
  if (i === 0 && item.type === 'smart') return 'Suggestions'
  if (i === 0 && item.type === 'user') return 'Sellers'
  if (i === 0 && item.type === 'item') return 'Items'
  if (i === 0 && (item.type === 'category' || item.type === 'subcategory')) return 'Categories'

  const prev = suggestions[i - 1]
  if (prev.type !== item.type) {
    if (item.type === 'user') return 'Sellers'
    if (item.type === 'item') return 'Items'
    if (item.type === 'category' || item.type === 'subcategory') return 'Categories'
    if (item.type === 'smart') return 'Suggestions'
  }
  return null
}

function renderSuggestionList(suggestions, activeIndex, setActiveIndex, onSelect, query) {
  return suggestions.map((item, i) => {
    const isActive = i === activeIndex
    const sectionHeader = getSectionHeader(suggestions, item, i)
    const subtext = getSubtext(item)

    // Special rendering for auth_prompt (sign-up nudge for logged-out @-queries)
    if (item.type === 'auth_prompt') {
      return (
        <React.Fragment key={`${item.type}-${i}`}>
          <button
            data-index={i}
            onMouseEnter={() => setActiveIndex(i)}
            onClick={() => onSelect(item)}
            className={`w-full flex items-center gap-3 px-3 py-3.5 text-left transition-colors ${
              isActive ? 'bg-sib-primary/5 dark:bg-sib-primary/12' : 'hover:bg-sib-sand/50 dark:hover:bg-[#26322f]'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-sib-primary/10 flex items-center justify-center flex-shrink-0">
              <LogIn size={14} className="text-sib-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-sib-text font-medium leading-snug">{item.label}</p>
              <p className="text-[11px] text-sib-primary font-semibold mt-0.5">Sign up free</p>
            </div>
            <ArrowUpRight size={12} className="text-sib-primary/50 flex-shrink-0" />
          </button>
        </React.Fragment>
      )
    }

    return (
      <React.Fragment key={`${item.type}-${item.label}-${i}`}>
        {sectionHeader && (
          <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-sib-muted/70 dark:text-[#aeb8b4]">
            {sectionHeader}
          </p>
        )}
        <button
          data-index={i}
          onMouseEnter={() => setActiveIndex(i)}
          onClick={() => onSelect(item)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
            isActive ? 'bg-sib-sand dark:bg-[#26322f]' : 'hover:bg-sib-sand/50 dark:hover:bg-[#26322f]'
          }`}
        >
          {item.type === 'user' && item.avatar ? (
            <img src={item.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          ) : item.type === 'user' ? (
            <div className="w-8 h-8 rounded-full bg-sib-primary/10 flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-sib-primary" />
            </div>
          ) : item.image ? (
            <img src={item.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-sib-sand dark:bg-[#26322f] flex items-center justify-center flex-shrink-0">
              <SuggestionIcon type={item.type} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-sib-text dark:text-[#f4efe7] truncate">
              {item.type === 'user' ? (
                <>@{highlightMatch(item.label, query.replace(/^@/, ''))}</>
              ) : (
                highlightMatch(item.label, query)
              )}
            </p>
            {subtext && (
              <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] truncate">{subtext}</p>
            )}
          </div>
          {item.price != null && (
            <span className="text-xs font-bold text-sib-primary flex-shrink-0">€{item.price}</span>
          )}
          {item.type === 'smart' && !item.id && (
            <ArrowUpRight size={12} className="text-sib-muted/50 flex-shrink-0" />
          )}
        </button>
      </React.Fragment>
    )
  })
}

function highlightMatch(text, query) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim())
  if (idx === -1) return text
  const matchLen = query.trim().length
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-sib-primary">{text.slice(idx, idx + matchLen)}</span>
      {text.slice(idx + matchLen)}
    </>
  )
}
