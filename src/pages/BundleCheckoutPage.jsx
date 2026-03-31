import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Truck, Lock, CreditCard, Package } from 'lucide-react'
import { useApp } from '../context/AppContext'
import PageHeader from '../components/PageHeader'

export default function BundleCheckoutPage() {
  const navigate = useNavigate()
  const {
    currentUser, bundle, getListingById, getUserById,
    calculateBundleFees, placeBundleOrder, showToast,
  } = useApp()

  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [payMethod, setPayMethod] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  if (!currentUser) { navigate('/auth'); return null }
  if (!bundle || bundle.items.length === 0) { navigate('/bundle'); return null }

  const seller = getUserById(bundle.sellerId)
  const items = bundle.items.map(id => getListingById(id)).filter(Boolean)
  const subtotal = items.reduce((sum, l) => sum + l.price, 0)
  const fees = calculateBundleFees(subtotal)

  const clearErr = (field) => setErrors(prev => ({ ...prev, [field]: null }))

  const validateAddress = () => {
    const e = {}
    if (!address.trim()) e.address = 'Enter your street address'
    if (!city.trim()) e.city = 'Enter your city or town'
    if (!postcode.trim()) e.postcode = 'Enter your postcode'
    return e
  }

  const validateCard = () => {
    const e = {}
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) e.cardNumber = 'Enter a valid card number'
    if (!cardName.trim()) e.cardName = 'Required'
    if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry)) e.expiry = 'MM/YY'
    if (!cvc || cvc.length < 3) e.cvc = 'Required'
    return e
  }

  const fullAddress = () => `${address}, ${city} ${postcode}`.trim()

  const handleApplePay = async () => {
    setPayMethod('apple')
    const addrErrors = validateAddress()
    setErrors(addrErrors)
    if (Object.keys(addrErrors).length > 0) return

    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    const order = placeBundleOrder(fullAddress())
    setLoading(false)
    if (order) {
      showToast('Bundle order placed! Your items are on their way.')
      navigate(`/orders/${order.id}`)
    }
  }

  const handleCardPay = async () => {
    setPayMethod('card')
    const allErrors = { ...validateAddress(), ...validateCard() }
    setErrors(allErrors)
    if (Object.keys(allErrors).length > 0) return

    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    const order = placeBundleOrder(fullAddress())
    setLoading(false)
    if (order) {
      showToast('Bundle order placed! Your items are on their way.')
      navigate(`/orders/${order.id}`)
    }
  }

  const formatCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  const cardTouched = cardNumber || cardName || expiry || cvc

  return (
    <div>
      <PageHeader title="Bundle Checkout" />
      <div className="px-4 py-5 pb-10 lg:max-w-5xl lg:mx-auto lg:px-8 lg:py-8">
        <div className="lg:flex lg:gap-10">
          <div className="lg:flex-1">
            {/* Items summary */}
            <div className="p-3 rounded-2xl bg-sib-sand mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Package size={16} className="text-sib-primary" />
                <p className="text-sm font-semibold text-sib-text">{items.length}-item bundle from @{seller?.username}</p>
              </div>
              <div className="space-y-2">
                {items.map(listing => (
                  <div key={listing.id} className="flex items-center gap-3">
                    <img src={listing.images[0]} alt={listing.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sib-text truncate">{listing.title}</p>
                      <p className="text-xs text-sib-muted">{listing.brand} · Size {listing.size}</p>
                    </div>
                    <span className="text-sm font-bold text-sib-primary flex-shrink-0">€{listing.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery savings */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-green-50 border border-green-100 mb-4">
              <Truck size={16} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">1 delivery fee for {items.length} items</p>
                <p className="text-xs text-green-700">Save by bundling from the same seller</p>
              </div>
            </div>

            {/* Delivery selection */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-2">Delivery</p>
              <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-sib-primary bg-sib-primary/5">
                <div className="w-5 h-5 rounded-full border-2 border-sib-primary bg-sib-primary flex-shrink-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <Truck size={16} className="text-sib-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-sib-text">Sib Tracked Delivery</p>
                  <p className="text-xs text-sib-muted">Estimated 2–3 working days</p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="mb-5 space-y-3">
              <p className="text-xs font-semibold text-sib-text uppercase tracking-wide">Delivery Address</p>
              <div>
                <input
                  value={address}
                  onChange={e => { setAddress(e.target.value); clearErr('address') }}
                  placeholder="Street address"
                  className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.address ? 'border-red-400' : 'border-sib-stone'} focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20`}
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    value={city}
                    onChange={e => { setCity(e.target.value); clearErr('city') }}
                    placeholder="City / Town"
                    className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.city ? 'border-red-400' : 'border-sib-stone'} focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20`}
                  />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                </div>
                <div className="w-28">
                  <input
                    value={postcode}
                    onChange={e => { setPostcode(e.target.value.toUpperCase()); clearErr('postcode') }}
                    placeholder="Postcode"
                    maxLength={8}
                    className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.postcode ? 'border-red-400' : 'border-sib-stone'} focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20`}
                  />
                  {errors.postcode && <p className="text-red-500 text-xs mt-1">{errors.postcode}</p>}
                </div>
              </div>
            </div>

            {/* Mobile order summary */}
            <div className="p-4 rounded-2xl bg-sib-warm mb-5 lg:hidden">
              <p className="text-sm font-bold text-sib-text mb-3">Order Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-sib-muted">
                  <span>{items.length} items</span><span>€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sib-muted">
                  <span className="flex items-center gap-1.5">
                    <Truck size={11} className="text-sib-muted/50" /> Delivery (1x)
                  </span>
                  <span>€{fees.deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sib-muted">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={11} className="text-green-600" /> Buyer protection
                  </span>
                  <span>€{fees.buyerProtectionFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sib-text pt-2 border-t border-sib-stone">
                  <span>Total</span>
                  <span className="text-sib-primary text-lg">€{fees.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-3">Payment</p>
              <button
                onClick={handleApplePay}
                disabled={loading}
                className="w-full bg-black text-white font-semibold py-4 rounded-2xl text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 shadow-sm"
              >
                {loading && payMethod === 'apple' ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Processing...
                  </span>
                ) : (
                  <>
                    <svg width="16" height="20" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.94 11.588c-.024-2.548 2.078-3.77 2.172-3.832-1.182-1.728-3.022-1.964-3.676-1.992-1.566-.158-3.054.92-3.85.92-.794 0-2.022-.898-3.322-.874-1.71.026-3.286.994-4.166 2.524-1.776 3.084-.454 7.652 1.278 10.154.846 1.224 1.856 2.6 3.18 2.55 1.276-.05 1.758-.826 3.302-.826 1.544 0 1.978.826 3.33.8 1.372-.024 2.242-1.248 3.082-2.476.972-1.42 1.372-2.794 1.396-2.866-.03-.014-2.678-1.028-2.706-4.082zM12.4 3.912c.702-.852 1.176-2.034 1.048-3.212-1.014.042-2.242.676-2.968 1.528-.652.754-1.222 1.958-1.07 3.114 1.132.088 2.286-.574 2.99-1.43z" fill="white"/>
                    </svg>
                    Pay
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-sib-stone" />
                <span className="text-xs text-sib-muted font-medium">or pay with card</span>
                <div className="flex-1 h-px bg-sib-stone" />
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <input
                    value={cardNumber}
                    onChange={e => { setCardNumber(formatCard(e.target.value)); clearErr('cardNumber'); if (!payMethod || payMethod !== 'card') setPayMethod('card') }}
                    placeholder="Card number"
                    maxLength={19}
                    inputMode="numeric"
                    className={`w-full border rounded-xl pl-4 pr-12 py-3 text-sm outline-none text-sib-text placeholder-sib-muted font-mono ${errors.cardNumber ? 'border-red-400' : 'border-sib-stone'} focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CreditCard size={16} className="text-sib-stone" />
                  </div>
                  {errors.cardNumber && <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>}
                </div>
                <div>
                  <input
                    value={cardName}
                    onChange={e => { setCardName(e.target.value); clearErr('cardName') }}
                    placeholder="Name on card"
                    className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.cardName ? 'border-red-400' : 'border-sib-stone'} focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20`}
                  />
                  {errors.cardName && <p className="text-red-500 text-xs mt-1">{errors.cardName}</p>}
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      value={expiry}
                      onChange={e => {
                        let v = e.target.value.replace(/\D/g, '').slice(0, 4)
                        if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2)
                        setExpiry(v)
                        clearErr('expiry')
                      }}
                      placeholder="MM/YY"
                      maxLength={5}
                      inputMode="numeric"
                      className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.expiry ? 'border-red-400' : 'border-sib-stone'} focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20`}
                    />
                    {errors.expiry && <p className="text-red-500 text-xs mt-1">{errors.expiry}</p>}
                  </div>
                  <div className="w-24">
                    <input
                      value={cvc}
                      onChange={e => { setCvc(e.target.value.replace(/\D/g, '').slice(0, 3)); clearErr('cvc') }}
                      placeholder="CVC"
                      maxLength={3}
                      inputMode="numeric"
                      className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.cvc ? 'border-red-400' : 'border-sib-stone'} focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20`}
                    />
                    {errors.cvc && <p className="text-red-500 text-xs mt-1">{errors.cvc}</p>}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 mt-3.5">
                <Lock size={11} className="text-sib-muted" />
                <p className="text-[11px] text-sib-muted">Secure payments powered by Stripe</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-green-50 mb-3">
              <ShieldCheck size={18} className="text-green-600 flex-shrink-0" />
              <p className="text-xs text-green-800 font-semibold">You are fully protected when paying through Sib</p>
            </div>

            <p className="text-[11px] text-sib-muted text-center mb-5 leading-relaxed">
              By continuing, you agree to Sib's{' '}
              <Link to="/terms" className="text-sib-primary font-semibold underline underline-offset-2">Terms & Conditions</Link>
              {' '}&{' '}
              <Link to="/buyer-protection" className="text-sib-primary font-semibold underline underline-offset-2">Buyer Protection Policy</Link>
            </p>

            {cardTouched && (
              <button
                onClick={handleCardPay}
                disabled={loading}
                className="w-full bg-sib-secondary text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-70 flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
              >
                {loading && payMethod === 'card' ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Processing...
                  </span>
                ) : (
                  <>
                    <Lock size={14} />
                    Pay €{fees.total.toFixed(2)}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Desktop sidebar */}
          <aside className="hidden lg:block lg:w-80 lg:flex-shrink-0">
            <div className="sticky top-24">
              <div className="p-5 rounded-2xl bg-sib-warm border border-sib-stone">
                <p className="text-sm font-bold text-sib-text mb-4">Bundle Summary</p>
                <div className="space-y-2 mb-4">
                  {items.map(listing => (
                    <div key={listing.id} className="flex items-center gap-2">
                      <img src={listing.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-sib-text truncate">{listing.title}</p>
                      </div>
                      <span className="text-xs font-bold text-sib-primary">€{listing.price}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-sib-muted">
                    <span>{items.length} items</span><span>€{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sib-muted">
                    <span>Delivery (1x)</span><span>€{fees.deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sib-muted">
                    <span>Buyer protection</span><span>€{fees.buyerProtectionFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sib-text pt-3 border-t border-sib-stone mt-2">
                    <span>Total</span>
                    <span className="text-sib-primary text-xl">€{fees.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-green-50 mt-3">
                <ShieldCheck size={16} className="text-green-600 flex-shrink-0" />
                <p className="text-xs text-green-800 font-semibold">Buyer protection included</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
