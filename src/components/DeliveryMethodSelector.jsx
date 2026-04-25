import React, { useState, useMemo } from 'react'
import { Home, Box, ChevronDown, MapPin, Info } from 'lucide-react'
import { getActiveLockers } from '../data/deliveryConfig'
import { getFulfilmentPrice } from '../lib/fulfilment'

/**
 * MaltaPost fulfilment selector.
 *
 * Props:
 *  - selected: 'home_delivery' | 'locker_collection'
 *  - onSelect: (methodId) => void
 *  - selectedLockerId: string | null
 *  - onLockerSelect: (lockerId) => void
 *  - disabled: boolean
 */
export default function DeliveryMethodSelector({
  selected,
  onSelect,
  selectedLockerId,
  onLockerSelect,
  disabled = false,
}) {
  const lockers = getActiveLockers()
  const [lockerSearch, setLockerSearch] = useState('')
  const [lockerDropdownOpen, setLockerDropdownOpen] = useState(false)

  const filteredLockers = useMemo(() => {
    if (!lockerSearch.trim()) return lockers
    const q = lockerSearch.toLowerCase()
    return lockers.filter(l =>
      l.locationName.toLowerCase().includes(q) ||
      l.fullAddress.toLowerCase().includes(q) ||
      l.region.toLowerCase().includes(q)
    )
  }, [lockers, lockerSearch])

  const selectedLocker = useMemo(() => {
    if (!selectedLockerId) return null
    return lockers.find(l => l.id === selectedLockerId) || null
  }, [lockers, selectedLockerId])

  const methods = [
    {
      id: 'home_delivery',
      name: 'MaltaPost Delivery',
      description: 'Delivered to your address via MaltaPost',
      price: getFulfilmentPrice('delivery'),
      estimatedDays: '2-3 working days',
      icon: Home,
    },
    {
      id: 'locker_collection',
      name: 'MaltaPost Locker',
      description: 'Collect from a MaltaPost locker near you',
      price: getFulfilmentPrice('locker'),
      estimatedDays: '2-4 working days',
      icon: Box,
      helpText: 'Once your parcel arrives, MaltaPost will notify you with a collection code.',
    },
  ]

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-sib-text dark:text-[#f4efe7] uppercase tracking-wide mb-2">Fulfilment method</p>
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
                    ? 'border-sib-primary bg-sib-primary/5'
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
                  <p className="text-xs text-sib-muted dark:text-[#aeb8b4] mb-1.5">Choose a MaltaPost locker location</p>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setLockerDropdownOpen(prev => !prev)}
                      className={`w-full flex items-center justify-between gap-2 p-3 rounded-xl border text-left text-sm bg-white dark:bg-[#26322f] ${
                        selectedLocker ? 'border-sib-primary text-sib-text dark:text-[#f4efe7]' : 'border-sib-stone dark:border-[rgba(242,238,231,0.10)] text-sib-muted dark:text-[#aeb8b4]'
                      } ${disabled ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MapPin size={14} className="flex-shrink-0 text-sib-muted dark:text-[#aeb8b4]" />
                        <span className="truncate">
                          {selectedLocker ? selectedLocker.locationName : 'Select locker location...'}
                        </span>
                      </div>
                      <ChevronDown size={14} className={`flex-shrink-0 text-sib-muted dark:text-[#aeb8b4] transition-transform ${lockerDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {lockerDropdownOpen && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-[#202b28] border border-sib-stone dark:border-[rgba(242,238,231,0.10)] rounded-xl shadow-lg max-h-60 overflow-hidden">
                        <div className="p-2 border-b border-sib-stone/50 dark:border-[rgba(242,238,231,0.10)]">
                          <input
                            type="text"
                            placeholder="Search locations..."
                            value={lockerSearch}
                            onChange={e => setLockerSearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-sib-stone dark:border-[rgba(242,238,231,0.10)] rounded-lg outline-none focus:border-sib-primary text-sib-text dark:text-[#f4efe7] bg-white dark:bg-[#26322f] placeholder-sib-muted dark:placeholder:text-[#aeb8b4]"
                            autoFocus
                          />
                        </div>
                        <div className="overflow-y-auto max-h-44">
                          {filteredLockers.length === 0 && (
                            <p className="text-xs text-sib-muted dark:text-[#aeb8b4] p-3 text-center">No matching locations</p>
                          )}
                          {filteredLockers.map(locker => (
                            <button
                              key={locker.id}
                              type="button"
                              onClick={() => {
                                onLockerSelect(locker.id)
                                setLockerDropdownOpen(false)
                                setLockerSearch('')
                              }}
                              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-sib-sand dark:hover:bg-[#26322f] transition-colors border-b border-sib-stone/20 dark:border-[rgba(242,238,231,0.10)] last:border-0 ${
                                selectedLockerId === locker.id ? 'bg-sib-primary/5 font-semibold text-sib-text dark:text-[#f4efe7]' : 'text-sib-text dark:text-[#f4efe7]'
                              }`}
                            >
                              <p className="font-medium text-sm">{locker.locationName}</p>
                              <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] mt-0.5">{locker.fullAddress}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedLocker && (
                    <div className="mt-2 p-2.5 rounded-xl bg-blue-50 dark:bg-[#26322f] border border-blue-100 dark:border-[rgba(242,238,231,0.10)]">
                      <p className="text-xs font-medium text-blue-800 dark:text-[#f4efe7]">{selectedLocker.locationName}</p>
                      <p className="text-[11px] text-blue-600 dark:text-[#aeb8b4] mt-0.5">{selectedLocker.fullAddress}</p>
                    </div>
                  )}

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
