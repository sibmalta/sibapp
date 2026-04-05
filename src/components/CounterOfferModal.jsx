import React, { useState } from 'react'
import { X, ArrowLeftRight, AlertCircle } from 'lucide-react'

export default function CounterOfferModal({ offer, listing, onSubmit, onClose }) {
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')

  const listingPrice = listing.price
  const offerPrice = offer.price

  const handleSubmit = () => {
    const counterPrice = parseFloat(price)
    if (!price || isNaN(counterPrice) || counterPrice <= 0) {
      setError('Enter a valid price.')
      return
    }
    if (counterPrice <= offerPrice) {
      setError(`Counter must be higher than the offer of €${offerPrice}.`)
      return
    }
    if (counterPrice >= listingPrice) {
      setError(`Counter must be below listing price of €${listingPrice}.`)
      return
    }
    setError('')
    onSubmit(counterPrice)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={18} className="text-sib-primary" />
            <h2 className="text-lg font-bold text-sib-text">Counter Offer</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-sib-sand flex items-center justify-center hover:bg-sib-stone transition-colors">
            <X size={16} className="text-sib-muted" />
          </button>
        </div>

        <div className="mx-5 flex items-center justify-between p-3 rounded-xl bg-sib-sand text-sm">
          <div>
            <p className="text-sib-muted text-xs">Their offer</p>
            <p className="font-bold text-sib-text">€{offerPrice}</p>
          </div>
          <div className="text-right">
            <p className="text-sib-muted text-xs">Listing price</p>
            <p className="font-bold text-sib-text">€{listingPrice}</p>
          </div>
        </div>

        <div className="px-5 pt-4 pb-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Your counter price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sib-muted font-semibold text-lg">€</span>
              <input
                type="number"
                min={offerPrice + 1}
                max={listingPrice - 1}
                step="0.50"
                value={price}
                onChange={e => { setPrice(e.target.value); setError('') }}
                placeholder={`${offerPrice + 1} – ${listingPrice - 1}`}
                className="w-full border border-sib-stone rounded-xl pl-9 pr-4 py-3.5 text-lg font-bold text-sib-text outline-none focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20"
              />
            </div>
            <p className="text-[11px] text-sib-muted mt-1.5">
              Must be between €{offerPrice + 1} and €{listingPrice - 1}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="px-3 py-2.5 rounded-xl bg-sib-warm text-xs text-sib-muted leading-relaxed">
            The buyer will be notified and can accept, decline, or let your counter expire in 24 hours.
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-sib-primary text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-sib-primaryDark transition-colors active:scale-[0.98]"
          >
            Send Counter{price && !isNaN(parseFloat(price)) ? ` — €${parseFloat(price).toFixed(2)}` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
