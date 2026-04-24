import React, { useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Bell, ArrowLeft, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import SearchAutocomplete from './SearchAutocomplete'

function NotifBell({ onClick, className, size = 17 }) {
  const { currentUser, getUserNotifications } = useApp()
  const unread = currentUser ? getUserNotifications(currentUser.id).filter(n => !n.read).length : 0

  return (
    <button onClick={onClick} className={`relative ${className}`}>
      <Bell size={size} />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}

const ROUTE_TITLES = {
  '/browse': 'Browse',
  '/sell': 'New Listing',
  '/orders': 'My Orders',
  '/messages': 'Messages',
  '/notifications': 'Notifications',
  '/auth': 'Sign In',
  '/admin': 'Admin Panel',
}

export default function TopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser } = useApp()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const activeIndexRef = useRef(-1)
  const autocompleteRef = useRef(null)

  const isHome = location.pathname === '/'
  const isBack = !isHome &&
    !['/', '/browse', '/sell', '/orders', '/messages', '/profile'].includes(location.pathname)

  const title = ROUTE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/profile') ? 'Profile' : null)

  const handleBellTap = () => {
    if (currentUser) navigate('/notifications')
    else navigate('/auth', { state: { from: '/notifications' } })
  }

  const closeAndReset = useCallback(() => {
    setSearchOpen(false)
    setQuery('')
    activeIndexRef.current = -1
  }, [])

  const handleSuggestionSelect = useCallback((suggestion) => {
    if (suggestion.type === 'auth_prompt') {
      navigate('/auth', { state: { from: location.pathname } })
    } else if (suggestion.type === 'user' && suggestion.username) {
      navigate(`/profile/${suggestion.username}`)
    } else if (suggestion.type === 'item' && suggestion.id) {
      navigate(`/listing/${suggestion.id}`)
    } else {
      const params = new URLSearchParams()
      if (suggestion.query) params.set('q', suggestion.query)
      if (suggestion.category) params.set('cat', suggestion.category)
      if (suggestion.subcategory) params.set('sub', suggestion.subcategory)
      if (suggestion.brand) params.set('brand', suggestion.brand)
      if (!suggestion.query && !suggestion.category && !suggestion.brand) {
        params.set('q', suggestion.label)
      }
      navigate(`/browse?${params.toString()}`)
    }
    closeAndReset()
  }, [navigate, closeAndReset, location.pathname])

  // Called by SearchAutocomplete whenever activeIndex changes
  const handleActiveIndexChange = useCallback((idx) => {
    activeIndexRef.current = idx
  }, [])

  const handleInputKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (autocompleteRef.current?.handleKeyNav) {
        autocompleteRef.current.handleKeyNav(e.key)
      }
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndexRef.current >= 0 && autocompleteRef.current?.selectActive) {
        autocompleteRef.current.selectActive()
        return
      }
      if (query.trim()) {
        navigate(`/browse?q=${encodeURIComponent(query.trim())}`)
        closeAndReset()
      }
    }
  }, [query, navigate, closeAndReset])

  if (searchOpen) {
    return (
      <div className="fixed inset-0 z-[999] flex flex-col bg-white dark:bg-[#111716] transition-colors">
        {/* Search input bar */}
        <div className="px-3 pt-3 pb-2 border-b border-gray-200/60 dark:border-[#2d3635] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#8d9896] pointer-events-none" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search brands, styles, items..."
                className="w-full bg-[#EDEDEB] dark:bg-[#1c2423] rounded-lg pl-9 pr-9 py-2.5 text-[14px] text-sib-text dark:text-[#f2eee7] placeholder-gray-400 dark:placeholder:text-[#8d9896] outline-none border border-transparent focus:border-gray-300 dark:focus:border-[#374241] focus:bg-white dark:focus:bg-[#1c2423] focus:shadow-sm transition-all"
              />
              {query && (
                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#8d9896] hover:text-sib-text transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={closeAndReset}
              className="text-sm font-semibold text-gray-500 dark:text-[#a0aaa8] hover:text-gray-800 dark:hover:text-[#f2eee7] transition-colors px-1 flex-shrink-0"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Suggestions list */}
        <div className="flex-1 overflow-y-auto">
          <SearchAutocomplete
            ref={autocompleteRef}
            query={query}
            onSelect={handleSuggestionSelect}
            onActiveIndexChange={handleActiveIndexChange}
            renderInline
          />
        </div>
      </div>
    )
  }

  // On the home page: use a compact app header.
  if (isHome) {
    return (
      <header className="sticky top-0 z-50 flex justify-between px-3 h-12 items-center bg-white/95 dark:bg-[#131918]/95 backdrop-blur-md border-b border-gray-200/70 dark:border-[#2d3635] transition-colors">
        <div className="-ml-0.5">
          <img
            src={`${import.meta.env.BASE_URL}assets/sib-3.png`}
            alt="Sib"
            className="header-logo"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#1d2625] active:bg-gray-200 dark:active:bg-[#222c2b] transition-colors"
          >
            <Search size={18} className="text-sib-text" />
          </button>
          {currentUser && (
            <NotifBell
              onClick={handleBellTap}
              size={18}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#1d2625] active:bg-gray-200 dark:active:bg-[#222c2b] transition-colors text-sib-text"
            />
          )}
        </div>
      </header>
    )
  }

  const isBrowse = location.pathname === '/browse'

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#131918]/95 backdrop-blur-md border-b border-gray-200/70 dark:border-[#2d3635] px-4 h-11 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-2.5">
        {isBack ? (
          <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-[#a0aaa8] -ml-1.5 p-0.5 hover:text-gray-800 dark:hover:text-[#f2eee7] transition-colors">
            <ArrowLeft size={20} />
          </button>
        ) : null}
        <span className="text-[15px] font-medium text-gray-900 dark:text-[#f2eee7] tracking-[-0.01em]">{title || ''}</span>
      </div>

      <div className="flex items-center gap-1">
        {isBrowse && (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#1d2625] active:bg-gray-200 dark:active:bg-[#222c2b] transition-colors"
          >
            <Search size={18} className="text-gray-600 dark:text-[#a0aaa8]" />
          </button>
        )}
        {currentUser && (
          <NotifBell
            onClick={handleBellTap}
            size={18}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#1d2625] active:bg-gray-200 dark:active:bg-[#222c2b] transition-colors text-gray-600 dark:text-[#a0aaa8]"
          />
        )}
      </div>
    </header>
  )
}
