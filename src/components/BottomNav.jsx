import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Search, PlusSquare, MessageCircle, User } from 'lucide-react'
import { useApp } from '../context/AppContext'

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/browse', icon: Search, label: 'Browse' },
  { path: '/sell', icon: PlusSquare, label: 'Sell', special: true },
  { path: '/messages', icon: MessageCircle, label: 'Messages' },
  { path: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  const { currentUser } = useApp()
  const navigate = useNavigate()

  const handleNavClick = (e, item) => {
    if ((item.path === '/sell' || item.path === '/messages' || item.path === '/profile') && !currentUser) {
      e.preventDefault()
      navigate('/auth', { state: { from: item.path } })
    }
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-white/80 backdrop-blur-lg border-t border-sib-stone/60 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={(e) => handleNavClick(e, item)}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-colors ${
                item.special ? '' : isActive ? 'text-sib-secondary' : 'text-sib-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {item.special ? (
                  <div className="w-10 h-10 rounded-xl bg-sib-secondary flex items-center justify-center shadow-sm">
                    <item.icon size={20} className="text-white" strokeWidth={2.5} />
                  </div>
                ) : (
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                )}
                <span className={`text-[10px] font-medium ${item.special ? 'text-sib-text' : ''}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
