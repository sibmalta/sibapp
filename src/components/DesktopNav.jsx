import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Search, Home, ShoppingBag, PlusSquare, MessageCircle, User, Bell, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

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
  const { currentUser } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/browse?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
    }
  }

  const handleAuthNav = (path) => {
    if (!currentUser) {
      navigate('/auth')
    } else {
      navigate(path)
    }
  }

  const handleBellTap = () => {
    if (currentUser) {
      navigate('/notifications')
    } else {
      navigate('/auth')
    }
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
      isActive ? 'text-sib-primary bg-sib-primary/5' : 'text-sib-muted hover:text-sib-text hover:bg-sib-sand'
    }`

  return (
    <header className="hidden lg:block sticky top-0 z-50 bg-white border-b border-sib-stone/60">
      <div className="max-w-7xl mx-auto px-6 xl:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo — fixed 40px desktop via .header-logo */}
          <NavLink to="/" className="flex items-center flex-shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}assets/sib-3.png`}
              alt="Sib"
              className="header-logo"
            />
          </NavLink>

          {/* Search bar */}
          <div className="flex-1 max-w-md mx-10">
            <form onSubmit={handleSearch} className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sib-muted" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search brands, styles, items..."
                className="w-full bg-sib-sand rounded-xl pl-10 pr-4 py-2.5 text-sm text-sib-text placeholder-sib-muted outline-none focus:ring-2 focus:ring-sib-primary/20 transition-shadow"
              />
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
            <button
              onClick={() => handleAuthNav('/messages')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-sib-muted hover:text-sib-text hover:bg-sib-sand transition-colors"
            >
              <MessageCircle size={18} />
              <span className="hidden xl:inline">Messages</span>
            </button>

            {/* Notification bell — always visible on desktop */}
            <DesktopNotifBell
              onClick={handleBellTap}
              size={18}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-sib-muted hover:text-sib-text hover:bg-sib-sand transition-colors"
            />

            {currentUser ? (
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-sib-muted hover:text-sib-text hover:bg-sib-sand transition-colors"
              >
                <User size={18} />
                <span className="hidden xl:inline">Profile</span>
              </button>
            ) : (
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
