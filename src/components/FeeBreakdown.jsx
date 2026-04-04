import React from 'react'
import { ShieldCheck } from 'lucide-react'

/**
 * Shared fee breakdown component — shows Sib Buyer Protection fee only.
 * Delivery is handled separately at checkout.
 *
 * Props:
 *  - buyerProtectionFee: number (€0.75 + 5% of listing price)
 *  - size: 'sm' | 'base' (text size variant — 'sm' for SellPage, 'base' for Checkout/Order)
 *  - showDeliveryHint: boolean (show helper text about delivery at checkout)
 *  - bundledFee: number (legacy — used as fallback if buyerProtectionFee is missing)
 */
export default function FeeBreakdown({
  buyerProtectionFee,
  size = 'base',
  showDeliveryHint = false,
  // Legacy props — accepted for backward compat
  bundledFee,
  deliveryFee: _df,
  defaultOpen: _do,
}) {
  const isSmall = size === 'sm'
  const labelClass = isSmall ? 'text-xs' : 'text-sm'
  const helperClass = isSmall ? 'text-[10px]' : 'text-[11px]'

  const fee = buyerProtectionFee ?? bundledFee ?? 0

  return (
    <div>
      {/* Buyer protection line */}
      <div className="flex justify-between items-center">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={isSmall ? 12 : 14} className="text-green-600 flex-shrink-0" />
          <span className={`text-green-700 font-semibold ${labelClass}`}>Sib Buyer Protection</span>
        </span>
        <span className={`text-green-700 font-semibold ${labelClass} flex-shrink-0 ml-3`}>
          €{fee.toFixed(2)}
        </span>
      </div>

      {/* Formula hint */}
      <p className={`${helperClass} text-sib-muted leading-tight mt-0.5 pl-[22px]`}>
        €0.75 + 5% of listing price
      </p>

      {/* Delivery hint for sell page / pre-checkout */}
      {showDeliveryHint && (
        <p className={`${helperClass} text-sib-muted/70 leading-tight mt-1.5 pl-[22px] italic`}>
          Delivery fee is selected by the buyer at checkout.
        </p>
      )}
    </div>
  )
}
