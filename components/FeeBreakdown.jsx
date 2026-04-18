import React from 'react'
import { ShieldCheck, Truck } from 'lucide-react'

/**
 * Shared fee breakdown component — shows Sib Buyer Protection fee and optional delivery fee.
 *
 * Props:
 *  - buyerProtectionFee: number (€0.75 + 5% of listing price)
 *  - deliveryFee: number (optional — when set, shows the delivery line with actual amount)
 *  - size: 'sm' | 'base' (text size variant — 'sm' for SellPage, 'base' for Checkout/Order)
 *  - showDeliveryHint: boolean (show helper text about delivery at checkout — hidden if deliveryFee is set)
 *  - bundledFee: number (legacy — used as fallback if buyerProtectionFee is missing)
 */
export default function FeeBreakdown({
  buyerProtectionFee,
  deliveryFee,
  size = 'base',
  showDeliveryHint = false,
  // Legacy props — accepted for backward compat
  bundledFee,
  defaultOpen: _do,
}) {
  const isSmall = size === 'sm'
  const labelClass = isSmall ? 'text-xs' : 'text-sm'
  const helperClass = isSmall ? 'text-[10px]' : 'text-[11px]'

  const fee = buyerProtectionFee ?? bundledFee ?? 0

  return (
    <div className="space-y-2">
      {/* Buyer protection line */}
      <div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={isSmall ? 12 : 14} className="text-green-600 flex-shrink-0" />
            <span className={`text-green-700 font-semibold ${labelClass}`}>Sib Buyer Protection</span>
          </span>
          <span className={`text-green-700 font-semibold ${labelClass} flex-shrink-0 ml-3`}>
            €{fee.toFixed(2)}
          </span>
        </div>
        <p className={`${helperClass} text-sib-muted leading-tight mt-0.5 pl-[22px]`}>
          €0.75 + 5% of listing price
        </p>
      </div>

      {/* Delivery fee line — shown when deliveryFee is provided */}
      {typeof deliveryFee === 'number' && deliveryFee > 0 && (
        <div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <Truck size={isSmall ? 12 : 14} className="text-blue-600 flex-shrink-0" />
              <span className={`text-blue-700 font-semibold ${labelClass}`}>Tracked Delivery</span>
            </span>
            <span className={`text-blue-700 font-semibold ${labelClass} flex-shrink-0 ml-3`}>
              €{deliveryFee.toFixed(2)}
            </span>
          </div>
          <p className={`${helperClass} text-sib-muted leading-tight mt-0.5 pl-[22px]`}>
            Paid by the buyer
          </p>
        </div>
      )}

      {/* Delivery hint for sell page / pre-checkout — only if no deliveryFee shown */}
      {showDeliveryHint && (typeof deliveryFee !== 'number') && (
        <p className={`${helperClass} text-sib-muted/70 leading-tight mt-1.5 pl-[22px] italic`}>
          Delivery fee is selected by the buyer at checkout.
        </p>
      )}
    </div>
  )
}
