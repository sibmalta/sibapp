import React, { useState } from 'react'
import { Truck, Package, AlertTriangle, ChevronDown, ChevronUp, XCircle, CheckCircle2 } from 'lucide-react'

/**
 * DeliveryGuidance - collapsible panel explaining delivery tiers and limits.
 *
 * Props
 *  - variant: 'full' (default) | 'compact'
 *      full    -> always-visible card with all sections (SellPage)
 *      compact -> expandable inline block (ListingPage)
 *  - defaultOpen: boolean (compact only, default false)
 */
export default function DeliveryGuidance({ variant = 'full', defaultOpen = false }) {
  const [open, setOpen] = useState(variant === 'full' ? true : defaultOpen)

  /* Compact trigger for ListingPage */
  if (variant === 'compact') {
    return (
      <div className="rounded-2xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] bg-white dark:bg-[#202b28] overflow-hidden mb-3 transition-colors">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3.5 py-3 text-left active:bg-sib-sand/40 dark:active:bg-[#30403c] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Truck size={15} className="text-sib-primary flex-shrink-0" />
            <span className="text-sm font-semibold text-sib-text dark:text-[#f4efe7]">Delivery information</span>
          </div>
          {open
            ? <ChevronUp size={16} className="text-sib-muted dark:text-[#aeb8b4] flex-shrink-0" />
            : <ChevronDown size={16} className="text-sib-muted dark:text-[#aeb8b4] flex-shrink-0" />}
        </button>

        {open && <GuidanceBody />}
      </div>
    )
  }

  /* Full variant for SellPage */
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/40 dark:bg-[#332d20] overflow-hidden mb-5 transition-colors">
      <div className="px-4 pt-3.5 pb-1 flex items-center gap-2">
        <Truck size={15} className="text-amber-600 flex-shrink-0" />
        <h3 className="text-sm font-bold text-sib-text dark:text-[#f4efe7]">Delivery information</h3>
      </div>
      <GuidanceBody />
    </div>
  )
}

/* Shared inner content */
function GuidanceBody() {
  return (
    <div className="px-4 pb-4 pt-2 space-y-3.5">
      {/* Standard */}
      <div className="flex gap-2.5">
        <Package size={14} className="text-sib-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-sib-text dark:text-[#f4efe7] mb-0.5">MaltaPost delivery</p>
          <ul className="text-[11px] text-sib-muted dark:text-[#aeb8b4] leading-relaxed space-y-0.5">
            <li>Delivery to buyer address: €4.50</li>
            <li>Locker collection: €3.25</li>
          </ul>
        </div>
      </div>

      {/* Bulky */}
      <div className="flex gap-2.5">
        <Truck size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-sib-text dark:text-[#f4efe7] mb-0.5">MaltaPost fulfilment</p>
          <ul className="text-[11px] text-sib-muted dark:text-[#aeb8b4] leading-relaxed space-y-0.5">
            <li>Tracked delivery handled via MaltaPost</li>
          </ul>
        </div>
      </div>

      {/* Limits */}
      <div className="flex gap-2.5">
        <AlertTriangle size={14} className="text-sib-muted dark:text-[#aeb8b4] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-sib-text dark:text-[#f4efe7] mb-0.5">Limits</p>
          <ul className="text-[11px] text-sib-muted dark:text-[#aeb8b4] leading-relaxed space-y-0.5">
            <li>Maximum approx weight: 100 kg</li>
            <li>Must fit through standard doors</li>
            <li>Must be movable without specialist equipment</li>
          </ul>
        </div>
      </div>

      {/* Not supported */}
      <div className="flex gap-2.5">
        <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-sib-text dark:text-[#f4efe7] mb-0.5">Not supported</p>
          <ul className="text-[11px] text-sib-muted dark:text-[#aeb8b4] leading-relaxed space-y-0.5">
            <li>Items requiring cranes or specialist transport</li>
            <li>Extremely large or commercial equipment</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

