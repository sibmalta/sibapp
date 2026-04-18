import React, { useState, useMemo } from 'react'
import { Home, Box, ChevronDown, MapPin, Info, Truck, AlertTriangle } from 'lucide-react'
import { getActiveLockers } from '../data/deliveryConfig'
import { TIER_MAP, BULKY_DELIVERY_NOTES } from '../lib/deliveryPricing'

/**
 * Delivery method selector driven by the listing's delivery_size tier.
 *
 * Props:
 *  - deliverySize: 'small' | 'medium' | 'heavy' | 'bulky'  (from listing.deliverySize)
 *  - selected: 'home_delivery' | 'locker_collection'
 *  - onSelect: (methodId) => void
 *  - selectedLockerId: string | null
 *  - onLockerSelect: (lockerId) => void
 *  - disabled: boolean
 */
export default function DeliveryMethodSelector({
  deliverySize = 'medium',
  selected,
  onSelect,
  selectedLockerId,
  onLockerSelect,
  disabled = false,
}) {
  // Legacy support: map old 'large' to 'bulky'
  const normalizedSize = deliverySize === 'large' ? 'bulky' : deliverySize
  const tier = TIER_MAP[normalizedSize] || TIER_MAP['medium']
  const isBulky = normalizedSize === 'bulky'
  const isHeavy = normalizedSize === 'heavy'
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

  /* ── Bulky items: single fixed delivery, no options ───────── */
  if (isBulky) {
    return (
      <div className="mb-5">
        <p className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-2">Delivery</p>
        <div className="p-4 rounded-2xl border-2 border-sib-primary bg-sib-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sib-primary/10 flex items-center justify-center flex-shrink-0">
              <Truck size={18} className="text-sib-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sib-text">Sib Driver Delivery</p>
              <p className="text-xs text-sib-muted mt-0.5">Bulky item — 2-person delivery by Sib drivers</p>
            </div>
            <span className="text-sm font-bold text-sib-primary flex-shrink-0">{tier.priceLabel}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-sib-stone/50">
            <div className="flex items-start gap-1.5 mb-1.5">
              <AlertTriangle size={12} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-amber-800">Important notes</p>
            </div>
            <ul className="space-y-0.5 ml-[18px]">
              {BULKY_DELIVERY_NOTES.map((note, i) => (
                <li key={i} className="text-[11px] text-amber-700 flex items-start gap-1.5">
                  <span className="mt-0.5">•</span><span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  /* ── Small / Medium / Heavy items: home delivery + optional locker ── */
  // Heavy items can only use home delivery (too large for lockers)
  const lockerAvailable = !isHeavy
  const lockerPrice = normalizedSize === 'small'
    ? Math.max(tier.price - 0.50, 1.99)
    : Math.max(tier.price - 1.00, 2.99)

  const methods = [
    {
      id: 'home_delivery',
      name: 'Home Delivery',
      description: isHeavy ? 'Heavy parcel delivered to your address via MaltaPost' : 'Delivered to your address via MaltaPost',
      price: tier.price,
      estimatedDays: isHeavy ? '3–5 working days' : '2–3 working days',
      icon: Home,
    },
    ...(lockerAvailable ? [{
      id: 'locker_collection',
      name: 'Locker Collection',
      description: 'Collect from a MaltaPost locker near you',
      price: lockerPrice,
      estimatedDays: '2–4 working days',
      icon: Box,
      helpText: 'Once your parcel arrives, MaltaPost will notify you with a collection code.',
    }] : []),
  ]

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-2">Delivery method</p>
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
                    : 'border-sib-stone bg-white hover:border-sib-muted/40'
                } ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  isSelected ? 'border-sib-primary bg-sib-primary' : 'border-sib-stone bg-white'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <IconComp size={16} className={isSelected ? 'text-sib-primary flex-shrink-0' : 'text-sib-muted flex-shrink-0'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isSelected ? 'text-sib-text' : 'text-sib-muted'}`}>{method.name}</p>
                  <p className="text-xs text-sib-muted">{method.description}</p>
                </div>
                <span className={`text-sm font-bold flex-shrink-0 ${isSelected ? 'text-sib-primary' : 'text-sib-muted'}`}>
                  €{method.price.toFixed(2)}
                </span>
              </button>

              {/* Locker picker — appears when locker_collection selected */}
              {method.id === 'locker_collection' && isSelected && (
                <div className="mt-2 ml-8">
                  <p className="text-xs text-sib-muted mb-1.5">Choose a MaltaPost locker location</p>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setLockerDropdownOpen(prev => !prev)}
                      className={`w-full flex items-center justify-between gap-2 p-3 rounded-xl border text-left text-sm ${
                        selectedLocker ? 'border-sib-primary text-sib-text' : 'border-sib-stone text-sib-muted'
                      } ${disabled ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MapPin size={14} className="flex-shrink-0 text-sib-muted" />
                        <span className="truncate">
                          {selectedLocker ? selectedLocker.locationName : 'Select locker location...'}
                        </span>
                      </div>
                      <ChevronDown size={14} className={`flex-shrink-0 text-sib-muted transition-transform ${lockerDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {lockerDropdownOpen && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-sib-stone rounded-xl shadow-lg max-h-60 overflow-hidden">
                        <div className="p-2 border-b border-sib-stone/50">
                          <input
                            type="text"
                            placeholder="Search locations..."
                            value={lockerSearch}
                            onChange={e => setLockerSearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-sib-stone rounded-lg outline-none focus:border-sib-primary text-sib-text placeholder-sib-muted"
                            autoFocus
                          />
                        </div>
                        <div className="overflow-y-auto max-h-44">
                          {filteredLockers.length === 0 && (
                            <p className="text-xs text-sib-muted p-3 text-center">No matching locations</p>
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
                              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-sib-sand transition-colors border-b border-sib-stone/20 last:border-0 ${
                                selectedLockerId === locker.id ? 'bg-sib-primary/5 font-semibold text-sib-text' : 'text-sib-text'
                              }`}
                            >
                              <p className="font-medium text-sm">{locker.locationName}</p>
                              <p className="text-[11px] text-sib-muted mt-0.5">{locker.fullAddress}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedLocker && (
                    <div className="mt-2 p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                      <p className="text-xs font-medium text-blue-800">{selectedLocker.locationName}</p>
                      <p className="text-[11px] text-blue-600 mt-0.5">{selectedLocker.fullAddress}</p>
                    </div>
                  )}

                  {method.helpText && (
                    <div className="flex items-start gap-1.5 mt-2 px-0.5">
                      <Info size={11} className="text-sib-muted flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-sib-muted leading-tight">{method.helpText}</p>
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
