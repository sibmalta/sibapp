import React from 'react'
import { isOfficialAccount } from '../utils/officialAccount'

const LOGO_SIZES = { xs: 'w-4 h-4', sm: 'w-5 h-5', md: 'w-7 h-7', lg: 'w-9 h-9', xl: 'w-12 h-12' }

export default function UserAvatar({ user, size = 'md', className = '' }) {
  const sizes = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-20 h-20 text-2xl',
  }
  const sizeClass = sizes[size] || sizes.md

  if (!user) return (
    <div className={`${sizeClass} rounded-full bg-sib-stone flex items-center justify-center ${className}`}>
      <span className="text-sib-muted font-bold">?</span>
    </div>
  )

  // Official Sib account — show brand logo instead of initials/placeholder
  if (isOfficialAccount(user)) {
    const logoSize = LOGO_SIZES[size] || LOGO_SIZES.md
    return (
      <div className={`${sizeClass} rounded-full bg-sib-primary/10 border border-sib-primary/20 flex items-center justify-center ${className}`}>
        <img
          src={`${import.meta.env.BASE_URL}assets/sib-3.png`}
          alt="Sib"
          className={`${logoSize} object-contain`}
        />
      </div>
    )
  }

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className={`${sizeClass} rounded-full object-cover ${className}`}
      />
    )
  }

  const initials = user.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <div className={`${sizeClass} rounded-full bg-sib-primary flex items-center justify-center ${className}`}>
      <span className="text-white font-bold">{initials}</span>
    </div>
  )
}
