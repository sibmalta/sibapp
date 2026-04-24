import React, { useState } from 'react'
import { X, ArrowLeftRight, AlertCircle } from 'lucide-react'

export default function CounterOfferModal({ offer, listing, onSubmit, onClose }) {
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')

  const listingPrice = listing.price
  const offerPrice = offer.price

  const handleSubmit = () => {
    const counterPrice = parseFloat(price)
    if (!price || Number.isNaN(counterPrice) || counterPrice <= 0) {
      setError('Enter a valid price.')
      return
    }
    if (counterPrice <= offerPrice) {
      setError(`Counter must be higher than the offer of EUR ${offerPrice}.`)
      return
    }
    if (counterPrice >= listingPrice) {
      setError(`Counter must be below listing price of EUR ${listingPrice}.`)
      return
    }
    setError('')
    onSubmit(counterPrice)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white dark:bg-[#202b28] rounded-t-3xl sm:rounded-2xl shadow-xl border border-transparent dark:border-[rgba(242,238,231,0.10)] transition-colors">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={18} className="text-sib-primary" />
            <h2 className="text-lg font-bold text-sib-text dark:text-[#f4efe7]">Counter Offer</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-sib-sand dark:bg-[#26322f] flex items-center justify-center hover:bg-sib-stone dark:hover:bg-[#30403c] transition-colors">
            <X size={16} className="text-sib-muted dark:text-[#aeb8b4]" />
          </button>
        </div>

        <div className="mx-5 flex items-center justify-between p-3 rounded-xl bg-sib-sand dark:bg-[#26322f] text-sm transition-colors">
          <div>
            <p className="text-sib-muted dark:text-[#aeb8b4] text-xs">Their offer</p>
            <p className="font-bold text-sib-text dark:text-[#f4efe7]">EUR {offerPrice}</p>
          </div>
          <div className="text-right">
            <p className="text-sib-muted dark:text-[#aeb8b4] text-xs">Listing price</p>
            <p className="font-bold text-sib-text dark:text-[#f4efe7]">EUR {listingPrice}</p>
          </div>
        </div>

        <div className="px-5 pt-4 pb-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-sib-text dark:text-[#f4efe7] uppercase tracking-wide mb-1.5 block">Your counter price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sib-muted dark:text-[#aeb8b4] font-semibold text-lg">EUR</span>
              <input
                type="number"
                min={offerPrice + 1}
                max={listingPrice - 1}
                step="0.50"
                value={price}
                onChange={e => { setPrice(e.target.value); setError('') }}
                placeholder={`${offerPrice + 1} - ${listingPrice - 1}`}
                className="w-full border border-sib-stone dark:border-[rgba(242,238,231,0.10)] bg-white dark:bg-[#26322f] rounded-xl pl-14 pr-4 py-3.5 text-lg font-bold text-sib-text dark:text-[#f4efe7] outline-none focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 transition-colors"
              />
            </div>
            <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] mt-1.5">
              Must be between EUR {offerPrice + 1} and EUR {listingPrice - 1}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="px-3 py-2.5 rounded-xl bg-sib-warm dark:bg-[#26322f] text-xs text-sib-muted dark:text-[#aeb8b4] leading-relaxed transition-colors">
            The buyer will be notified and can accept, decline, or let your counter expire in 24 hours.
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-sib-primary text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-sib-primaryDark transition-colors active:scale-[0.98]"
          >
            Send Counter{price && !Number.isNaN(parseFloat(price)) ? ` - EUR ${parseFloat(price).toFixed(2)}` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
