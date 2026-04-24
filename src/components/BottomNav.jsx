import React, { useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Search, Plus, MessageCircle, User, LogIn } from 'lucide-react'
import { useApp } from '../context/AppContext'

const authLeft = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/browse', icon: Search, label: 'Browse' },
]
const authRight = [
  { path: '/messages', icon: MessageCircle, label: 'Messages' },
  { path: '/profile', icon: User, label: 'Profile' },
]

const guestLeft = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/browse', icon: Search, label: 'Browse' },
]
const guestRight = [
  { path: '/auth', icon: LogIn, label: 'Sign In' },
]

function NavItem({ item, badge }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors duration-150 relative ${
          isActive ? 'text-sib-secondary' : 'text-sib-muted'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className="relative">
            <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            {badge > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 leading-none">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium leading-none">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function BottomNav() {
  const { currentUser, getUnreadConversationCount } = useApp()
  const navigate = useNavigate()

  const left = useMemo(() => (currentUser ? authLeft : guestLeft), [currentUser])
  const right = useMemo(() => (currentUser ? authRight : guestRight), [currentUser])
  const unreadMessages = currentUser ? getUnreadConversationCount(currentUser.id) : 0

  const handleSellClick = (e) => {
    if (!currentUser) {
      e.preventDefault()
      navigate('/auth', { state: { from: '/sell' } })
    }
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 safe-area-bottom">
      {/* Background bar */}
      <div className="bg-white/95 backdrop-blur-xl border-t border-sib-stone/30 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] dark:bg-[#131918]/95 dark:border-[#2d3635] dark:shadow-[0_-4px_18px_rgba(0,0,0,0.28)] transition-colors">
        <div className="flex items-center h-16 px-1">
          {/* Left section */}
          <div className="flex flex-1 items-center justify-evenly h-full">
            {left.map(item => <NavItem key={item.path} item={item} />)}
          </div>

          {/* Center spacer for the floating Sell button */}
          <div className="w-[76px] shrink-0" />

          {/* Right section */}
          <div className="flex flex-1 items-center justify-evenly h-full">
            {right.map(item => (
              <NavItem
                key={item.path}
                item={item}
                badge={item.path === '/messages' ? unreadMessages : 0}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Sell button — raised above the bar */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-6 z-50 flex flex-col items-center">
        <NavLink
          to="/sell"
          onClick={handleSellClick}
          className="group flex flex-col items-center"
        >
          <div className="w-[56px] h-[56px] rounded-full bg-gradient-to-br from-sib-primaryDark to-sib-primaryLight flex items-center justify-center shadow-lg shadow-sib-primary/25 ring-[3.5px] ring-white dark:ring-[#131918] transition-all duration-200 active:scale-90 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-sib-primary/30">
            <Plus size={26} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-semibold text-sib-text mt-1 leading-none">Sell</span>
        </NavLink>
      </div>
    </nav>
  )
}
