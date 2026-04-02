import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Truck, Lock, AlertCircle, Package } from 'lucide-react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useApp } from '../context/AppContext'
import { useAuth } from '../lib/auth-context'
import { getStripe, createPaymentIntent } from '../lib/stripe'
import PageHeader from '../components/PageHeader'

function BundleStripeForm({ fees, onSuccess, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setErrorMsg('')
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + '/orders' },
      redirect: 'if_required',
    })
    if (error) {
      setErrorMsg(error.message || 'Payment failed.')
      setLoading(false)
      onError(error.message)
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setLoading(false)
      onSuccess(paymentIntent.id)
    } else {
      setLoading(false)
      setErrorMsg('Payment was not completed.')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4"><PaymentElement options={{ layout: 'tabs' }} /></div>
      {errorMsg && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 mb-4">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{errorMsg}</p>
        </div>
      )}
      <button type="submit" disabled={!stripe || loading}
        className="w-full bg-sib-secondary text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-70 flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm">
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Processing payment...
          </span>
        ) : (
          <><Lock size={14} /> Pay €{fees.total.toFixed(2)}</>
        )}
      </button>
      <div className="flex items-center justify-center gap-1.5 mt-3.5">
        <Lock size={11} className="text-sib-muted" />
        <p className="text-[11px] text-sib-muted">Secure payments powered by Stripe</p>
      </div>
    </form>
  )
}

export default function BundleCheckoutPage() {
  const navigate = useNavigate()
  const { currentUser, bundle, getListingById, getUserById, calculateBundleFees, placeBundleOrder, showToast } = useApp()
  const { session } = useAuth()

  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')
  const [errors, setErrors] = useState({})
  const [clientSecret, setClientSecret] = useState(null)
  const [addressConfirmed, setAddressConfirmed] = useState(false)
  const [creatingIntent, setCreatingIntent] = useState(false)
  const [intentError, setIntentError] = useState('')

  if (!currentUser) { navigate('/auth'); return null }
  if (!bundle || bundle.items.length === 0) { navigate('/bundle'); return null }

  const seller = getUserById(bundle.sellerId)
  const items = bundle.items.map(id => getListingById(id)).filter(Boolean)
  const subtotal = items.reduce((sum, l) => sum + l.price, 0)
  const fees = calculateBundleFees(subtotal)
  const amountCents = Math.round(fees.total * 100)

  const clearErr = (field) => setErrors(prev => ({ ...prev, [field]: null }))
  const validateAddress = () => {
    const e = {}
    if (!address.trim()) e.address = 'Enter your street address'
    if (!city.trim()) e.city = 'Enter your city or town'
    if (!postcode.trim()) e.postcode = 'Enter your postcode'
    return e
  }
  const fullAddress = () => `${address}, ${city} ${postcode}`.trim()

  const handleConfirmAddress = async () => {
    const addrErrors = validateAddress()
    setErrors(addrErrors)
    if (Object.keys(addrErrors).length > 0) return
    setCreatingIntent(true)
    setIntentError('')
    try {
      const result = await createPaymentIntent(amountCents, {
        sellerId: bundle.sellerId,
        metadata: { bundle: 'true', item_count: String(items.length) },
      }, session?.access_token)
      setClientSecret(result.clientSecret)
      setAddressConfirmed(true)
    } catch (err) {
      setIntentError(err.message || 'Failed to initialize payment.')
    } finally {
      setCreatingIntent(false)
    }
  }

  const handlePaymentSuccess = async (stripePaymentIntentId) => {
    const order = await placeBundleOrder(fullAddress())
    if (order) {
      try {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${session?.access_token}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ stripe_payment_intent_id: stripePaymentIntentId, payment_status: 'paid' }),
        })
      } catch (err) {
        console.error('Failed to save payment intent ID:', err)
      }
      showToast('Payment successful! Your bundle order has been placed.')
      navigate(`/orders/${order.id}`)
    }
  }

  const handlePaymentError = (msg) => { showToast(msg || 'Payment failed', 'error') }

  const stripeAppearance = {
    theme: 'stripe',
    variables: { colorPrimary: '#D2691E', borderRadius: '12px', fontFamily: 'system-ui, -apple-system, sans-serif' },
  }

  return (
    <div>
      <PageHeader title="Bundle Checkout" />
      <div className="px-4 py-5 pb-10 lg:max-w-5xl lg:mx-auto lg:px-8 lg:py-8">
        <div className="lg:flex lg:gap-10">
          <div className="lg:flex-1">
            {/* Items */}
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

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-green-50 border border-green-100 mb-4">
              <Truck size={16} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">1 delivery fee for {items.length} items</p>
                <p className="text-xs text-green-700">Save by bundling from the same seller</p>
              </div>
            </div>

            <div className="mb-5">
              <p className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-2">Delivery</p>
              <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-sib-primary bg-sib-primary/5">
                <div className="w-5 h-5 rounded-full border-2 border-sib-primary bg-sib-primary flex-shrink-0 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white" /></div>
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
                <input value={address} onChange={e => { setAddress(e.target.value); clearErr('address'); setAddressConfirmed(false) }} placeholder="Street address" disabled={addressConfirmed}
                  className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.address ? 'border-red-400' : 'border-sib-stone'} focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 disabled:bg-sib-sand disabled:opacity-70`} />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input value={city} onChange={e => { setCity(e.target.value); clearErr('city'); setAddressConfirmed(false) }} placeholder="City / Town" disabled={addressConfirmed}
                    className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.city ? 'border-red-400' : 'border-sib-stone'} focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 disabled:bg-sib-sand disabled:opacity-70`} />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                </div>
                <div className="w-28">
                  <input value={postcode} onChange={e => { setPostcode(e.target.value.toUpperCase()); clearErr('postcode'); setAddressConfirmed(false) }} placeholder="Postcode" maxLength={8} disabled={addressConfirmed}
                    className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.postcode ? 'border-red-400' : 'border-sib-stone'} focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 disabled:bg-sib-sand disabled:opacity-70`} />
                  {errors.postcode && <p className="text-red-500 text-xs mt-1">{errors.postcode}</p>}
                </div>
              </div>
              {addressConfirmed && (
                <button onClick={() => { setAddressConfirmed(false); setClientSecret(null) }} className="text-xs text-sib-primary font-semibold underline underline-offset-2">Change address</button>
              )}
            </div>

            {/* Mobile summary */}
            <div className="p-4 rounded-2xl bg-sib-warm mb-5 lg:hidden">
              <p className="text-sm font-bold text-sib-text mb-3">Order Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-sib-muted"><span>{items.length} items</span><span>€{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sib-muted"><span className="flex items-center gap-1.5"><Truck size={11} className="text-sib-muted/50" /> Delivery (1x)</span><span>€{fees.deliveryFee.toFixed(2)}</span></div>
                <div className="flex justify-between text-sib-muted"><span className="flex items-center gap-1.5"><ShieldCheck size={11} className="text-green-600" /> Buyer protection</span><span>€{fees.buyerProtectionFee.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-sib-text pt-2 border-t border-sib-stone"><span>Total</span><span className="text-sib-primary text-lg">€{fees.total.toFixed(2)}</span></div>
              </div>
            </div>

            {/* Payment */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-3">Payment</p>

              {intentError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 mb-4">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{intentError}</p>
                </div>
              )}

              {!addressConfirmed && !clientSecret && (
                <button onClick={handleConfirmAddress} disabled={creatingIntent}
                  className="w-full bg-sib-secondary text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-70 flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm">
                  {creatingIntent ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Preparing payment...
                    </span>
                  ) : (
                    <><Lock size={14} /> Continue to payment — €{fees.total.toFixed(2)}</>
                  )}
                </button>
              )}

              {clientSecret && (
                <Elements stripe={getStripe()} options={{ clientSecret, appearance: stripeAppearance }}>
                  <BundleStripeForm fees={fees} onSuccess={handlePaymentSuccess} onError={handlePaymentError} />
                </Elements>
              )}
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
                      <div className="flex-1 min-w-0"><p className="text-xs font-medium text-sib-text truncate">{listing.title}</p></div>
                      <span className="text-xs font-bold text-sib-primary">€{listing.price}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-sib-muted"><span>{items.length} items</span><span>€{subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sib-muted"><span>Delivery (1x)</span><span>€{fees.deliveryFee.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sib-muted"><span>Buyer protection</span><span>€{fees.buyerProtectionFee.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-sib-text pt-3 border-t border-sib-stone mt-2"><span>Total</span><span className="text-sib-primary text-xl">€{fees.total.toFixed(2)}</span></div>
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
