import React from 'react'
import { BadgeCheck } from 'lucide-react'
import { isOfficialAccount } from '../utils/officialAccount'

/**
 * Renders a "Sib Team" badge + verified tick next to the username
 * for official accounts. Returns null for regular users.
 *
 * size: 'sm' | 'md' (default 'sm')
 */
export default function OfficialBadge({ user, size = 'sm' }) {
  if (!isOfficialAccount(user)) return null

  const isSmall = size === 'sm'

  return (
    <span className="inline-flex items-center gap-1 flex-shrink-0">
      <BadgeCheck
        size={isSmall ? 13 : 15}
        className="text-sib-primary"
        fill="currentColor"
        strokeWidth={0}
      />
      <span
        className={`${
          isSmall ? 'text-[10px] px-1.5 py-[1px]' : 'text-[11px] px-2 py-0.5'
        } font-bold uppercase tracking-wider rounded-full bg-sib-primary/10 text-sib-primary leading-tight`}
      >
        Sib Team
      </span>
    </span>
  )
}
