import React from 'react'
import { Box, Info } from 'lucide-react'
import { getFulfilmentPrice } from '../lib/fulfilment'

/**
 * Fulfilment selector.
 *
 * Props:
 *  - selected: 'locker_collection' | legacy saved values
 *  - onSelect: (methodId) => void
 *  - disabled: boolean
 *  - lockerEligible: boolean
 */
export default function DeliveryMethodSelector({
  selected,
  onSelect,
  disabled = false,
  lockerEligible = false,
}) {
  const methods = [
    ...(lockerEligible ? [{
      id: 'locker_collection',
      name: 'MYConvenience drop-off',
      description: 'The seller will drop off your parcel at a MYConvenience location for courier collection.',
      price: getFulfilmentPrice('locker'),
      estimatedDays: 'same day if the seller drops off before 12pm, or next day if dropped off after 12pm',
      icon: Box,
      helpText: "You'll receive updates once the seller drops off the parcel and courier collection begins.",
    }] : []),
  ]

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-sib-text dark:text-[#f4efe7] uppercase tracking-wide mb-2">Fulfilment method</p>
      {!lockerEligible && (
        <div className="mb-2 rounded-xl border border-amber-200 dark:border-amber-400/20 bg-amber-50 dark:bg-[#26322f] px-3 py-2">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
            Only small parcels are supported right now.
          </p>
        </div>
      )}
      {methods.length === 0 && (
        <div className="mb-2 rounded-xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] bg-white dark:bg-[#202b28] px-3 py-3">
          <p className="text-xs font-medium text-sib-muted dark:text-[#aeb8b4]">
            No active delivery method is available for this item right now.
          </p>
        </div>
      )}
      <div className="space-y-2">
        {methods.map(method => {
          const isSelected = selected === method.id
          const IconComp = method.icon
          return (
            <div key={method.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(method.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-sib-primary bg-sib-primary/5 dark:bg-[#26322f]'
                    : 'border-sib-stone dark:border-[rgba(242,238,231,0.10)] bg-white dark:bg-[#202b28] hover:border-sib-muted/40 dark:hover:bg-[#26322f]'
                } ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  isSelected ? 'border-sib-primary bg-sib-primary' : 'border-sib-stone dark:border-[rgba(242,238,231,0.10)] bg-white dark:bg-[#26322f]'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <IconComp size={16} className={isSelected ? 'text-sib-primary flex-shrink-0' : 'text-sib-muted dark:text-[#aeb8b4] flex-shrink-0'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isSelected ? 'text-sib-text dark:text-[#f4efe7]' : 'text-sib-muted dark:text-[#aeb8b4]'}`}>{method.name}</p>
                  <p className="text-xs text-sib-muted dark:text-[#aeb8b4]">{method.description}</p>
                </div>
                <span className={`text-sm font-bold flex-shrink-0 ${isSelected ? 'text-sib-primary' : 'text-sib-muted dark:text-[#aeb8b4]'}`}>
                  €{method.price.toFixed(2)}
                </span>
              </button>

              {method.id === 'locker_collection' && isSelected && (
                <div className="mt-2 ml-8">
                  <div className="rounded-xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] bg-white dark:bg-[#26322f] p-3">
                    <p className="text-sm font-semibold text-sib-text dark:text-[#f4efe7]">MYConvenience drop-off</p>
                    <p className="mt-1 text-xs leading-snug text-sib-muted dark:text-[#aeb8b4]">
                      The seller will drop off your parcel at a MYConvenience location for courier collection.
                    </p>
                    <p className="mt-2 text-xs font-semibold leading-snug text-sib-text dark:text-[#f4efe7]">
                      Estimated delivery: same day if the seller drops off before 12pm, or next day if dropped off after 12pm.
                    </p>
                  </div>

                  {method.helpText && (
                    <div className="flex items-start gap-1.5 mt-2 px-0.5">
                      <Info size={11} className="text-sib-muted dark:text-[#aeb8b4] flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] leading-tight">{method.helpText}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
