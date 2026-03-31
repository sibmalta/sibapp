import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Bell, ArrowLeft, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

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
      navigate('/auth')
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
      <header className="sticky top-0 z-50 flex justify-between px-4 h-12 items-center bg-transparent pointer-events-none -mb-12">
        <div className="pointer-events-auto">
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

  return (
    <header className="sticky top-0 z-50 bg-sib-secondary border-b border-sib-secondary/80 px-4 h-14 flex items-center justify-between toolbar-pattern">
      <div className="flex items-center gap-3">
        {isBack ? (
          <button onClick={() => navigate(-1)} className="text-white/80 -ml-1 p-1">
            <ArrowLeft size={22} />
          </button>
        ) : null}
        <span className="text-base font-semibold text-white">{title || ''}</span>
      </div>

      <div className="flex items-center gap-2">
        {location.pathname === '/browse' && (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <Search size={20} className="text-white" />
          </button>
        )}
        <NotifBell
          onClick={handleBellTap}
          size={20}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
        />
      </div>
    </header>
  )
}
