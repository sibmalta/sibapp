import React, { useState, useCallback } from 'react'
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

  const isHome = location.pathname === '/'
  const isBack = !isHome &&
    !['/', '/browse', '/sell', '/orders', '/messages', '/profile'].includes(location.pathname)

  const title = ROUTE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/profile') ? 'Profile' : null)

  const handleBellTap = () => {
    if (currentUser) {
      navigate('/notifications')
    } else {
      navigate('/auth', { state: { from: '/notifications' } })
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/browse?q=${encodeURIComponent(query.trim())}`)
      setSearchOpen(false)
      setQuery('')
    }
  }

  const handleSuggestionSelect = useCallback((suggestion) => {
    if (suggestion.type === 'item') {
      navigate(`/listing/${suggestion.id}`)
    } else if (suggestion.type === 'brand') {
      navigate(`/browse?q=${encodeURIComponent(suggestion.label)}`)
    } else if (suggestion.type === 'category') {
      navigate(`/browse?q=${encodeURIComponent(suggestion.label)}`)
    }
    setSearchOpen(false)
    setQuery('')
  }, [navigate])

  if (searchOpen) {
    return (
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200/80 px-4 h-11 flex items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative flex items-center gap-3">
          <Search size={17} className="text-gray-400 flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search brands, styles..."
            className="flex-1 text-[15px] outline-none text-sib-text placeholder-gray-400 bg-transparent"
          />
          <SearchAutocomplete query={query} onSelect={handleSuggestionSelect} className="left-0 right-0 top-8" />
        </form>
        <button onClick={() => { setSearchOpen(false); setQuery('') }} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={18} />
        </button>
      </header>
    )
  }

  // On the home page: float the action icons over the dark hero
  if (isHome) {
    return (
      <header className="sticky top-0 z-50 flex justify-between px-3 h-14 items-center bg-transparent pointer-events-none -mb-14">
        <div className="pointer-events-auto -ml-0.5">
          <img
            src={`${import.meta.env.BASE_URL}assets/sib-3.png`}
            alt="Sib"
            className="header-logo drop-shadow-md"
          />
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 backdrop-blur-md shadow-sm border border-sib-stone/20"
          >
            <Search size={18} className="text-sib-text" />
          </button>
          <NotifBell
            onClick={handleBellTap}
            size={18}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 backdrop-blur-md shadow-sm border border-sib-stone/20 text-sib-text"
          />
        </div>
      </header>
    )
  }

  const isBrowse = location.pathname === '/browse'

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/70 px-4 h-11 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {isBack ? (
          <button onClick={() => navigate(-1)} className="text-gray-500 -ml-1.5 p-0.5 hover:text-gray-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
        ) : null}
        <span className="text-[15px] font-medium text-gray-900 tracking-[-0.01em]">{title || ''}</span>
      </div>

      <div className="flex items-center gap-1">
        {isBrowse && (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <Search size={18} className="text-gray-600" />
          </button>
        )}
        <NotifBell
          onClick={handleBellTap}
          size={18}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600"
        />
      </div>
    </header>
  )
}
