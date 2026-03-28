import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Bell, ArrowLeft, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

const ROUTE_TITLES = {
  '/browse': 'Browse',
  '/sell': 'New Listing',
  '/orders': 'My Orders',
  '/messages': 'Messages',
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

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/browse?q=${encodeURIComponent(query.trim())}`)
      setSearchOpen(false)
      setQuery('')
    }
  }

  if (searchOpen) {
    return (
      <header className="sticky top-0 z-40 bg-gradient-to-b from-white to-sib-sand border-b border-sib-stone/30 px-4 h-14 flex items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-3">
          <Search size={18} className="text-sib-muted flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search brands, styles..."
            className="flex-1 text-sm outline-none text-sib-text placeholder-sib-muted"
          />
        </form>
        <button onClick={() => setSearchOpen(false)} className="text-sib-muted">
          <X size={20} />
        </button>
      </header>
    )
  }

  // On the home page: float the action icons over the dark hero
  if (isHome) {
    return (
      <header className="sticky top-0 z-40 flex justify-end px-4 h-12 items-center gap-2 bg-transparent pointer-events-none -mb-12">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-sib-text/10 backdrop-blur-sm"
          >
            <Search size={17} className="text-sib-text" />
          </button>
          {currentUser && (
            <button
              onClick={() => navigate('/messages')}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-sib-text/10 backdrop-blur-sm"
            >
              <Bell size={17} className="text-sib-text" />
            </button>
          )}
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 bg-sib-secondary border-b border-sib-secondary/80 px-4 h-14 flex items-center justify-between toolbar-pattern">
      <div className="flex items-center gap-3">
        {isBack ? (
          <button onClick={() => navigate(-1)} className="text-white/80 -ml-1 p-1">
            <ArrowLeft size={22} />
          </button>
        ) : null}
        <span className="text-base font-semibold text-white">{title || ''}</span>
      </div>

      <div className="flex items-center gap-3">
        {location.pathname === '/browse' && (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <Search size={20} className="text-white/80" />
          </button>
        )}
        {currentUser && (
          <button
            onClick={() => navigate('/messages')}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors relative"
          >
            <Bell size={20} className="text-white/80" />
          </button>
        )}
      </div>
    </header>
  )
}
