import React from 'react'
import { ShieldCheck } from 'lucide-react'

export default function TrustedSellerBadge({ user, className = '' }) {
  if (!user?.isTrustedSeller) return null

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-[rgba(242,238,231,0.10)] dark:bg-[#26322f] dark:text-[#e8751a] ${className}`}
      title="Trusted Seller"
    >
      <ShieldCheck size={12} />
      Trusted Seller
    </span>
  )
}
