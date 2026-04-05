import React, { useState } from 'react'
import { X, Tag, AlertCircle } from 'lucide-react'

export default function MakeOfferModal({ listing, onSubmit, onClose }) {
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')

  const listingPrice = listing.price
  const minOffer = Math.max(1, Math.ceil(listingPrice * 0.5))

  const handleSubmit = () => {
    const offerPrice = parseFloat(price)
    if (!price || isNaN(offerPrice) || offerPrice <= 0) {
      setError('Enter a valid price.')
      return
    }
    if (offerPrice >= listingPrice) {
      setError(`Offer must be below the listing price of €${listingPrice}.`)
      return
    }
    if (offerPrice < minOffer) {
      setError(`Minimum offer is €${minOffer} (50% of listing price).`)
      return
    }
    setError('')
    onSubmit(offerPrice)
  }

  const discount = price ? Math.round(((listingPrice - parseFloat(price)) / listingPrice) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-sib-primary" />
            <h2 className="text-lg font-bold text-sib-text">Make an Offer</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-sib-sand flex items-center justify-center hover:bg-sib-stone transition-colors">
            <X size={16} className="text-sib-muted" />
          </button>
        </div>

        {/* Item summary */}
        <div className="mx-5 flex items-center gap-3 p-3 rounded-xl bg-sib-sand">
          <img src={listing.images[0]} alt={listing.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sib-text truncate">{listing.title}</p>
            <p className="text-xs text-sib-muted">{listing.brand} · Size {listing.size}</p>
          </div>
          <p className="text-base font-bold text-sib-text flex-shrink-0">€{listingPrice}</p>
        </div>

        <div className="px-5 pt-4 pb-6 space-y-4">
          {/* Price input */}
          <div>
            <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Your offer</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sib-muted font-semibold text-lg">€</span>
              <input
                type="number"
                min={minOffer}
                max={listingPrice - 1}
                step="0.50"
                value={price}
                onChange={e => { setPrice(e.target.value); setError('') }}
                placeholder={`${minOffer} – ${listingPrice - 1}`}
                className="w-full border border-sib-stone rounded-xl pl-9 pr-4 py-3.5 text-lg font-bold text-sib-text outline-none focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20"
              />
              {price && !isNaN(parseFloat(price)) && parseFloat(price) < listingPrice && parseFloat(price) >= minOffer && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                  -{discount}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-sib-muted mt-1.5">
              Min: €{minOffer} · Max: €{listingPrice - 1}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Info */}
          <div className="px-3 py-2.5 rounded-xl bg-sib-warm text-xs text-sib-muted leading-relaxed">
            The seller can accept, counter, or decline. Offers expire after 24 hours.
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className="w-full bg-sib-primary text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-sib-primaryDark transition-colors active:scale-[0.98]"
          >
            Send Offer{price && !isNaN(parseFloat(price)) && parseFloat(price) >= minOffer ? ` — €${parseFloat(price).toFixed(2)}` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
