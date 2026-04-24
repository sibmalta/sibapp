import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Package, Trash2, Tag, Truck, ShieldCheck, ArrowLeft, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import PageHeader from '../components/PageHeader'

export default function BundlePage() {
  const navigate = useNavigate()
  const {
    currentUser, bundle, getListingById, getUserById,
    removeFromBundle, clearBundle, calculateBundleFees, showToast,
  } = useApp()
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [offerPrice, setOfferPrice] = useState('')
  const [offerError, setOfferError] = useState('')

  if (!currentUser) { navigate('/auth'); return null }
  if (!bundle || bundle.items.length === 0) {
    return (
      <div>
        <PageHeader title="Bundle" />
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-sib-sand flex items-center justify-center mb-4">
            <Package size={28} className="text-sib-muted" />
          </div>
          <p className="text-sm font-semibold text-sib-text mb-1">Your bundle is empty</p>
          <p className="text-xs text-sib-muted max-w-[260px] mb-5">
            Add items from the same seller to create a bundle and save on delivery.
          </p>
          <button
            onClick={() => navigate('/browse')}
            className="px-6 py-2.5 bg-sib-secondary text-white text-sm font-semibold rounded-xl hover:bg-sib-secondary/90 transition-colors"
          >
            Browse items
          </button>
        </div>
      </div>
    )
  }

  const seller = getUserById(bundle.sellerId)
  const items = bundle.items.map(id => getListingById(id)).filter(Boolean)
  const subtotal = items.reduce((sum, l) => sum + l.price, 0)
  const fees = calculateBundleFees(subtotal)

  const handleRemove = (listingId) => {
    removeFromBundle(listingId)
    showToast('Item removed from bundle.')
  }

  const handleClear = () => {
    if (!window.confirm('Remove all items from your bundle?')) return
    clearBundle()
    showToast('Bundle cleared.')
  }

  const handleCheckout = () => {
    navigate('/bundle/checkout')
  }

  const { createBundleOffer } = useApp()

  const handleSubmitOffer = () => {
    const price = parseFloat(offerPrice)
    if (!offerPrice || isNaN(price) || price <= 0) {
      setOfferError('Enter a valid price.')
      return
    }
    const minOffer = Math.max(1, Math.ceil(subtotal * 0.4))
    if (price < minOffer) {
      setOfferError(`Minimum bundle offer is €${minOffer}.`)
      return
    }
    if (price >= subtotal) {
      setOfferError(`Offer must be below the total of €${subtotal.toFixed(2)}.`)
      return
    }
    const result = createBundleOffer(price)
    if (result.error) {
      setOfferError(result.error)
    } else {
      showToast('Bundle offer sent!')
      setShowOfferModal(false)
      setOfferPrice('')
      setOfferError('')
    }
  }

  const discount = offerPrice && !isNaN(parseFloat(offerPrice)) ? Math.round(((subtotal - parseFloat(offerPrice)) / subtotal) * 100) : 0

  return (
    <div>
      <PageHeader title="Bundle" />
      <div className="px-4 py-5 pb-10 lg:max-w-3xl lg:mx-auto lg:px-8 lg:py-8">
        {/* Seller info */}
        <div
          onClick={() => navigate(`/profile/${seller?.username}`)}
          className="flex items-center gap-3 p-3 rounded-2xl bg-sib-sand mb-4 cursor-pointer hover:bg-sib-stone/40 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-sib-primary/10 flex items-center justify-center flex-shrink-0">
            <Package size={18} className="text-sib-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-sib-text">Bundle from @{seller?.username}</p>
            <p className="text-xs text-sib-muted">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleClear() }}
            className="text-xs text-red-500 font-semibold hover:text-red-700 transition-colors px-2 py-1"
          >
            Clear all
          </button>
        </div>

        {/* Delivery savings banner */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-green-50 border border-green-100 mb-4">
          <Truck size={16} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Save on delivery by bundling</p>
            <p className="text-xs text-green-700">1 delivery fee for {items.length} items</p>
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-2 mb-5">
          {items.map(listing => (
            <div key={listing.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#202b28] border border-sib-stone/40 dark:border-[rgba(242,238,231,0.10)] transition-colors">
              <img
                src={listing.images[0]}
                alt={listing.title}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0 cursor-pointer"
                onClick={() => navigate(`/listing/${listing.id}`)}
              />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/listing/${listing.id}`)}>
                <p className="text-sm font-semibold text-sib-text line-clamp-1">{listing.title}</p>
                <p className="text-xs text-sib-muted mt-0.5">{listing.brand} · Size {listing.size}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-base font-bold text-sib-primary">€{listing.price}</span>
                <button
                  onClick={() => handleRemove(listing.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} className="text-sib-muted hover:text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="p-4 rounded-2xl bg-sib-warm border border-sib-stone/40 mb-5">
          <p className="text-sm font-bold text-sib-text mb-3">Bundle Summary</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-sib-muted">
              <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sib-muted">
              <span className="flex items-center gap-1.5">
                <Truck size={12} className="text-sib-muted/60" />
                Tracked delivery (1x)
              </span>
              <span>€{fees.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sib-muted">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-green-600" />
                Buyer protection
              </span>
              <span>€{fees.buyerProtectionFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-sib-text pt-2 border-t border-sib-stone">
              <span>Total</span>
              <span className="text-sib-primary text-lg">€{fees.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            onClick={handleCheckout}
            className="w-full bg-sib-secondary text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-sib-secondary/90 transition-colors active:scale-[0.98]"
          >
            Checkout Bundle — €{fees.total.toFixed(2)}
          </button>
          <button
            onClick={() => setShowOfferModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-sib-primary/30 text-sib-primary font-semibold text-sm hover:bg-sib-primary/5 transition-colors"
          >
            <Tag size={15} /> Make Offer on Bundle
          </button>
        </div>

        {/* Browse more from seller */}
        <button
          onClick={() => navigate(`/profile/${seller?.username}`)}
          className="w-full mt-3 text-center text-xs text-sib-primary font-semibold py-2"
        >
          Browse more from @{seller?.username}
        </button>
      </div>

      {/* Bundle Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowOfferModal(false)} />
          <div className="relative w-full sm:max-w-md bg-white dark:bg-[#202b28] rounded-t-3xl sm:rounded-2xl shadow-xl dark:border dark:border-[rgba(242,238,231,0.10)] animate-slide-up transition-colors">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-sib-primary" />
                <h2 className="text-lg font-bold text-sib-text">Bundle Offer</h2>
              </div>
              <button onClick={() => setShowOfferModal(false)} className="w-8 h-8 rounded-full bg-sib-sand dark:bg-[#26322f] flex items-center justify-center hover:bg-sib-stone dark:hover:bg-[#30403c] transition-colors">
                <X size={16} className="text-sib-muted" />
              </button>
            </div>

            <div className="mx-5 p-3 rounded-xl bg-sib-sand">
              <div className="flex items-center justify-between text-sm">
                <span className="text-sib-muted">{items.length} items from @{seller?.username}</span>
                <span className="font-bold text-sib-text">€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                {items.slice(0, 4).map(l => (
                  <img key={l.id} src={l.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ))}
                {items.length > 4 && (
                  <div className="w-10 h-10 rounded-lg bg-sib-stone flex items-center justify-center flex-shrink-0 text-xs font-bold text-sib-muted">
                    +{items.length - 4}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 pt-4 pb-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Your bundle offer</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sib-muted font-semibold text-lg">€</span>
                  <input
                    type="number"
                    step="0.50"
                    value={offerPrice}
                    onChange={e => { setOfferPrice(e.target.value); setOfferError('') }}
                    placeholder={`e.g. ${Math.round(subtotal * 0.7)}`}
                    className="w-full border border-sib-stone dark:border-[rgba(242,238,231,0.10)] rounded-xl pl-9 pr-4 py-3.5 text-lg font-bold text-sib-text dark:text-[#f4efe7] bg-white dark:bg-[#26322f] outline-none focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20"
                  />
                  {offerPrice && !isNaN(parseFloat(offerPrice)) && parseFloat(offerPrice) < subtotal && discount > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                      -{discount}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-sib-muted mt-1.5">
                  Original total: €{subtotal.toFixed(2)} for {items.length} items
                </p>
              </div>

              {offerError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm">
                  <span>{offerError}</span>
                </div>
              )}

              <div className="px-3 py-2.5 rounded-xl bg-sib-warm text-xs text-sib-muted leading-relaxed">
                The seller will receive one notification for the entire bundle. They can accept, counter, or decline. Expires in 24 hours.
              </div>

              <button
                onClick={handleSubmitOffer}
                className="w-full bg-sib-primary text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-sib-primaryDark transition-colors active:scale-[0.98]"
              >
                Send Bundle Offer{offerPrice && !isNaN(parseFloat(offerPrice)) ? ` — €${parseFloat(offerPrice).toFixed(2)}` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
