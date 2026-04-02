import React, { useState } from 'react'
import { ChevronDown, ShieldCheck, Truck } from 'lucide-react'

/**
 * Shared fee breakdown component used in Checkout, Order Detail, and Sell pages.
 *
 * Props:
 *  - bundledFee: number (total of delivery + buyer protection)
 *  - deliveryFee: number
 *  - buyerProtectionFee: number
 *  - size: 'sm' | 'base' (text size variant — 'sm' for SellPage, 'base' for Checkout/Order)
 *  - defaultOpen: boolean (start expanded or collapsed)
 */
export default function FeeBreakdown({
  bundledFee,
  deliveryFee,
  buyerProtectionFee,
  size = 'base',
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen)

  const isSmall = size === 'sm'
  const labelClass = isSmall ? 'text-xs' : 'text-sm'
  const subClass = isSmall ? 'text-[10px]' : 'text-[11px]'
  const helperClass = isSmall ? 'text-[10px]' : 'text-[11px]'

  return (
    <div>
      {/* Primary bundled line — tappable */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full text-left group"
      >
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={isSmall ? 12 : 14} className="text-green-600 flex-shrink-0" />
            <span className={`text-green-700 font-semibold ${labelClass}`}>Buyer Protection & Delivery</span>
          </span>
          <span className="flex items-center gap-1 flex-shrink-0 ml-3">
            <span className={`text-green-700 font-semibold ${labelClass}`}>€{bundledFee.toFixed(2)}</span>
            <ChevronDown
              size={isSmall ? 12 : 14}
              className={`text-sib-muted/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </span>
        </div>
      </button>

      {/* Helper text — always visible */}
      <p className={`${helperClass} text-sib-muted leading-tight mt-1`}>
        Includes secure payment, tracked delivery, and full buyer protection
      </p>

      {/* Expandable breakdown */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          open ? 'max-h-24 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
        }`}
      >
        <div className={`pl-0.5 space-y-1 pb-0.5 ${subClass}`}>
          <div className="flex justify-between items-center text-sib-muted/70">
            <span className="flex items-center gap-1.5">
              <Truck size={isSmall ? 10 : 11} className="text-sib-muted/50 flex-shrink-0" />
              <span>Tracked delivery</span>
            </span>
            <span>€{deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sib-muted/70">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={isSmall ? 10 : 11} className="text-sib-muted/50 flex-shrink-0" />
              <span>Buyer protection</span>
            </span>
            <span>€{buyerProtectionFee.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
