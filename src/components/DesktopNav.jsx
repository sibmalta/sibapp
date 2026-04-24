import React, { useState, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Search, Home, ShoppingBag, PlusSquare, MessageCircle, User, Bell, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import SearchAutocomplete from './SearchAutocomplete'

function DesktopNotifBell({ onClick, className, size = 18 }) {
  const { currentUser, getUserNotifications } = useApp()
  const unread = currentUser ? getUserNotifications(currentUser.id).filter(n => !n.read).length : 0

  return (
    <button onClick={onClick} className={`relative ${className}`} aria-label="Notifications">
      <Bell size={size} />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}

export default function DesktopNav() {
  const { currentUser, getUnreadConversationCount } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/browse?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
      setSearchFocused(false)
    }
  }

  const handleSuggestionSelect = useCallback((suggestion) => {
    if (suggestion.type === 'auth_prompt') {
      navigate('/auth')
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
      navigate(`/browse?${params.toString()}`)
    }
    setQuery('')
    setSearchFocused(false)
  }, [navigate])

  const handleAuthNav = (path) => {
    if (!currentUser) {
      navigate('/auth', { state: { from: path } })
    } else {
      navigate(path)
    }
  }

  const handleBellTap = () => {
    if (currentUser) {
      navigate('/notifications')
    } else {
      navigate('/auth', { state: { from: '/notifications' } })
    }
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
      isActive ? 'text-sib-primary bg-sib-primary/5 dark:bg-sib-primary/15' : 'text-sib-muted hover:text-sib-text hover:bg-sib-sand dark:hover:bg-[#1d2625]'
    }`

  return (
    <header className="hidden lg:block sticky top-0 z-50 bg-white border-b border-sib-stone/60 dark:bg-[#131918] dark:border-[#2d3635] transition-colors">
      <div className="max-w-7xl mx-auto px-6 xl:px-10">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo — enlarged, tight padding */}
          <NavLink to="/" className="flex items-center flex-shrink-0 -ml-1">
            <img
              src={`${import.meta.env.BASE_URL}assets/sib-3.png`}
              alt="Sib"
              className="header-logo"
            />
          </NavLink>

          {/* Search bar with autocomplete */}
          <div className="flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sib-muted pointer-events-none" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
                placeholder="Search brands, styles, items..."
                className="w-full bg-sib-sand rounded-xl pl-10 pr-9 py-2.5 text-sm text-sib-text placeholder-sib-muted outline-none focus:ring-2 focus:ring-sib-primary/20 transition-shadow dark:bg-[#1c2423] dark:text-[#f2eee7] dark:placeholder:text-[#94a19e]"
              />
              {query && (
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setQuery(''); setSearchFocused(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sib-muted hover:text-sib-text transition-colors"
                >
                  <X size={14} />
                </button>
              )}
              {searchFocused && query.trim().length >= 2 && (
                <SearchAutocomplete
                  query={query}
                  onSelect={handleSuggestionSelect}
                />
              )}
            </form>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              <Home size={18} />
              <span className="hidden xl:inline">Home</span>
            </NavLink>
            <NavLink to="/browse" className={linkClass}>
              <ShoppingBag size={18} />
              <span className="hidden xl:inline">Browse</span>
            </NavLink>
            <button
              onClick={() => handleAuthNav('/sell')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sib-secondary text-white text-sm font-bold hover:bg-sib-secondary/90 transition-colors mx-1"
            >
              <PlusSquare size={18} />
              <span className="hidden xl:inline">Sell</span>
            </button>

            {currentUser && (
              <>
                <button
                  onClick={() => navigate('/messages')}
                  className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-sib-muted hover:text-sib-text hover:bg-sib-sand dark:hover:bg-[#1d2625] transition-colors"
                >
                  <div className="relative">
                    <MessageCircle size={18} />
                    {(() => {
                      const unread = getUnreadConversationCount(currentUser.id)
                      return unread > 0 ? (
                        <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      ) : null
                    })()}
                  </div>
                  <span className="hidden xl:inline">Messages</span>
                </button>

                <DesktopNotifBell
                  onClick={handleBellTap}
                  size={18}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-sib-muted hover:text-sib-text hover:bg-sib-sand dark:hover:bg-[#1d2625] transition-colors"
                />

                <button
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-sib-muted hover:text-sib-text hover:bg-sib-sand dark:hover:bg-[#1d2625] transition-colors"
                >
                  <User size={18} />
                  <span className="hidden xl:inline">Profile</span>
                </button>
              </>
            )}

            {!currentUser && (
              <NavLink to="/auth" className={linkClass}>
                <User size={18} />
                <span className="hidden xl:inline">Sign In</span>
              </NavLink>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
