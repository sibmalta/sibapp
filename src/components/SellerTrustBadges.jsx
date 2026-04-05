import React, { useMemo } from 'react'
import { BadgeCheck, Zap, Star, ShieldCheck, Clock } from 'lucide-react'

/**
 * Compute and display trust badges for a seller based on real data.
 *
 * Badges:
 *  - Verified Seller:  1+ completed sales
 *  - Fast Shipper:     avg ship time ≤ 48h (needs 2+ shipped orders)
 *  - Top Rated:        rating ≥ 4.5 with 3+ reviews
 *  - Trusted Seller:   10+ completed sales
 *
 * Also shows "Member since <year>"
 */
export default function SellerTrustBadges({ seller, sellerOrders = [], shipments = [] }) {
  const badges = useMemo(() => {
    if (!seller) return []
    const result = []
    const completedSales = seller.sales || 0

    // 1. Verified Seller (1+ sales)
    if (completedSales >= 1) {
      result.push({
        id: 'verified',
        label: 'Verified Seller',
        icon: BadgeCheck,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
      })
    }

    // 2. Top Rated (≥ 4.5 with 3+ reviews)
    if ((seller.rating || 0) >= 4.5 && (seller.reviewCount || 0) >= 3) {
      result.push({
        id: 'top-rated',
        label: 'Top Rated',
        icon: Star,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
      })
    }

    // 3. Fast Shipper — compute from shipment data
    const shippedOrders = sellerOrders
      .map(o => {
        const s = shipments.find(sh => sh.orderId === o.id || sh.orderId === o.orderId)
        if (!s || !s.shippedAt || !o.createdAt) return null
        const diffMs = new Date(s.shippedAt) - new Date(o.createdAt)
        return diffMs
      })
      .filter(Boolean)

    if (shippedOrders.length >= 2) {
      const avgMs = shippedOrders.reduce((a, b) => a + b, 0) / shippedOrders.length
      const avgHours = avgMs / (1000 * 60 * 60)
      if (avgHours <= 48) {
        result.push({
          id: 'fast-shipper',
          label: 'Fast Shipper',
          icon: Zap,
          color: 'text-green-600',
          bg: 'bg-green-50',
        })
      }
    }

    // 4. Trusted Seller (10+ sales)
    if (completedSales >= 10) {
      result.push({
        id: 'trusted',
        label: 'Trusted Seller',
        icon: ShieldCheck,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
      })
    }

    return result
  }, [seller, sellerOrders, shipments])

  // Member-since year
  const memberSince = seller?.joinedDate
    ? new Date(seller.joinedDate).getFullYear()
    : null

  if (badges.length === 0 && !memberSince) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1">
      {badges.map(b => {
        const Icon = b.icon
        return (
          <span
            key={b.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${b.color} ${b.bg}`}
          >
            <Icon size={12} />
            {b.label}
          </span>
        )
      })}
      {memberSince && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-sib-muted bg-sib-sand">
          <Clock size={11} />
          Member since {memberSince}
        </span>
      )}
    </div>
  )
}
