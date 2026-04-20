import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Truck, Lock, AlertCircle, CreditCard, RefreshCw, BookmarkCheck, Bookmark } from 'lucide-react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useApp } from '../context/AppContext'
import { useAuth } from '../lib/auth-context'
import { getStripe, createPaymentIntent, isStripeConfigured } from '../lib/stripe'
import FeeBreakdown from '../components/FeeBreakdown'
import PageHeader from '../components/PageHeader'
import DeliveryMethodSelector from '../components/DeliveryMethodSelector'
import { getLockerById } from '../data/deliveryConfig'
import { getDeliveryFee, getDefaultDeliverySize, TIER_MAP } from '../lib/deliveryPricing'
import useSavedAddress from '../hooks/useSavedAddress'
import { trackReferralConversion } from '../lib/referral'

/* ── Friendly error mapping ──────────────────────────────── */
const TECHNICAL_PATTERNS = [
  /failed to fetch/i,
  /network\s*(request\s*)?error/i,
  /networkerror/i,
  /load failed/i,
  /ERR_/i,
  /CORS/i,
  /timeout/i,
  /abort/i,
  /edge function/i,
  /undefined/i,
  /null/i,
  /unexpected token/i,
  /JSON/i,
  /500|502|503|504/,
]

function friendlyPaymentError(raw) {
  if (!raw || typeof raw !== 'string') return null
  const isTechnical = TECHNICAL_PATTERNS.some(p => p.test(raw))
  if (isTechnical) {
    return "We couldn't process your payment right now. Please check your connection and try again."
  }
  // Stripe-specific user-facing errors are already friendly (e.g. "Your card was declined.")
  // but strip any that leaked internal detail
  if (/card/i.test(raw) || /declined/i.test(raw) || /expired/i.test(raw) || /insufficient/i.test(raw) || /authentication/i.test(raw)) {
    return raw // keep Stripe's card-related messages as-is
  }
  // Generic Stripe errors
  if (/payment.*intent/i.test(raw) || /setup.*intent/i.test(raw)) {
    return 'Something went wrong while setting up your payment. Please try again.'
  }
  return raw
}

function isConfigurationError(raw) {
  if (!raw || typeof raw !== 'string') return false
  return /not configured/i.test(raw) || /add it in/i.test(raw) || /STRIPE_SECRET_KEY/i.test(raw)
}

function friendlyIntentError(raw) {
  if (!raw || typeof raw !== 'string') return null
  if (isConfigurationError(raw)) {
    return '__CONFIG_MISSING__'
  }
  if (/invalid client secret/i.test(raw)) {
    return 'The payment service returned an invalid payment secret. Please refresh and try again. If this keeps happening, the latest checkout or Supabase function changes may not be deployed yet.'
  }
  const isTechnical = TECHNICAL_PATTERNS.some(p => p.test(raw))
  if (isTechnical) {
    return "We couldn't load payment options right now. Please try again in a moment."
  }
  return raw
}

function isValidClientSecret(value) {
  return typeof value === 'string' && /^pi_[^_]+_secret_.+/.test(value)
}

/* ── Stripe checkout form ────────────────────────────────── */
function StripeCheckoutForm({ fees, onSuccess, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [elementReady, setElementReady] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setErrorMsg('')
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.origin + '/orders' },
        redirect: 'if_required',
      })
      if (error) {
        const msg = friendlyPaymentError(error.message) || 'Payment failed. Please try again.'
        setErrorMsg(msg)
        setLoading(false)
        onError(msg)
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setLoading(false)
        onSuccess(paymentIntent.id)
      } else {
        setLoading(false)
        setErrorMsg('Payment was not completed. Please try again.')
      }
    } catch (err) {
      const msg = friendlyPaymentError(err?.message) || "We couldn't process your payment right now. Please check your connection and try again."
      setErrorMsg(msg)
      setLoading(false)
      onError(msg)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Loading shimmer while Stripe Elements loads */}
      {!elementReady && (
        <div className="mb-4 space-y-3 animate-pulse">
          <div className="h-12 bg-sib-sand rounded-xl" />
          <div className="h-12 bg-sib-sand rounded-xl" />
          <div className="flex gap-3">
            <div className="h-12 bg-sib-sand rounded-xl flex-1" />
            <div className="h-12 bg-sib-sand rounded-xl w-24" />
          </div>
        </div>
      )}
      <div className={`mb-4 ${!elementReady ? 'h-0 overflow-hidden' : ''}`}>
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: { applePay: 'auto', googlePay: 'auto' },
            paymentMethodOrder: ['apple_pay', 'google_pay', 'card'],
          }}
          onReady={() => setElementReady(true)}
        />
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 mb-4">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{errorMsg}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elementReady || loading}
        className="w-full bg-sib-secondary text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-70 flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
      >
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

export default function CheckoutPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getListingById, getUserById, calculateFees, placeOrder, showToast, currentUser } = useApp()
  const { session } = useAuth()

  const listing = getListingById(id)
  const [deliveryMethodId, setDeliveryMethodId] = useState('home_delivery')
  const [selectedLockerId, setSelectedLockerId] = useState(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [errors, setErrors] = useState({})
  const [clientSecret, setClientSecret] = useState(null)
  const [addressConfirmed, setAddressConfirmed] = useState(false)
  const [creatingIntent, setCreatingIntent] = useState(false)
  const [intentError, setIntentError] = useState('')
  const [saveAddressChecked, setSaveAddressChecked] = useState(false)
  const [addressPrefilled, setAddressPrefilled] = useState(false)

  const { savedAddress, hasSavedAddress, saveAddress: persistAddress } = useSavedAddress(currentUser?.id)

  // Prefill from saved address when it loads
  useEffect(() => {
    if (savedAddress && !addressPrefilled && !address && !city && !postcode) {
      setFullName(savedAddress.fullName || '')
      setPhone(savedAddress.phone || '')
      setAddress(savedAddress.address || '')
      setCity(savedAddress.city || '')
      setPostcode(savedAddress.postcode || '')
      setDeliveryNotes(savedAddress.notes || '')
      if (savedAddress.deliveryMethod) setDeliveryMethodId(savedAddress.deliveryMethod)
      setAddressPrefilled(true)
      setSaveAddressChecked(true)
    }
  }, [savedAddress, addressPrefilled, address, city, postcode])

  if (!listing) return <div className="text-center py-20 text-sib-muted">Listing not found.</div>
  if (!currentUser) { navigate('/auth'); return null }

  const seller = getUserById(listing.sellerId)

  // ── Delivery size is the single source of truth ──────────
  const rawDeliverySize = listing.deliverySize || getDefaultDeliverySize(listing.category, listing.subcategory)
  // Legacy support: map old 'large' to 'bulky'
  const deliverySize = rawDeliverySize === 'large' ? 'bulky' : rawDeliverySize
  const isBulkyItem = deliverySize === 'bulky'
  const isHeavyItem = deliverySize === 'heavy'
  const isLargeItem = isBulkyItem // backward compat alias
  const tier = TIER_MAP[deliverySize] || TIER_MAP['medium']

  // For bulky items: fixed price, no method choice. For others: price depends on method.
  const lockerPrice = deliverySize === 'small'
    ? Math.max(tier.price - 0.50, 1.99)
    : Math.max(tier.price - 1.00, 2.99)
  const deliveryFee = isBulkyItem || isHeavyItem
    ? tier.price
    : (deliveryMethodId === 'locker_collection' ? lockerPrice : tier.price)

  const fees = calculateFees(listing.price, deliveryFee)
  const amountCents = Math.round(fees.total * 100)
  const isLocker = !isLargeItem && deliveryMethodId === 'locker_collection'
  const selectedLocker = isLocker && selectedLockerId ? getLockerById(selectedLockerId) : null

  const clearErr = (field) => setErrors(prev => ({ ...prev, [field]: null }))

  const handleDeliveryChange = (methodId) => {
    setDeliveryMethodId(methodId)
    setAddressConfirmed(false)
    setClientSecret(null)
    setSelectedLockerId(null)
  }

  const handleLockerSelect = (lockerId) => {
    setSelectedLockerId(lockerId)
    setAddressConfirmed(false)
    setClientSecret(null)
  }

  const validateDelivery = () => {
    const e = {}
    if (isLocker) {
      if (!selectedLockerId) e.locker = 'Please select a locker location'
    } else {
      if (!address.trim()) e.address = 'Enter your street address'
      if (!city.trim()) e.city = 'Enter your city or town'
      if (!postcode.trim()) e.postcode = 'Enter your postcode'
    }
    return e
  }

  const getFullAddress = () => {
    if (isLocker && selectedLocker) return selectedLocker.fullAddress
    return `${address}, ${city} ${postcode}`.trim()
  }

  const handleConfirmAddress = async () => {
    const addrErrors = validateDelivery()
    setErrors(addrErrors)
    if (Object.keys(addrErrors).length > 0) return
    if (!session?.access_token) {
      setIntentError('Please log in again before continuing to payment.')
      return
    }
    setCreatingIntent(true)
    setIntentError('')

    // Save address for next time if checkbox is checked
    if (saveAddressChecked && !isLocker) {
      persistAddress({ fullName, phone, address, city, postcode, notes: deliveryNotes, deliveryMethod: deliveryMethodId })
    }

    try {
      const result = await createPaymentIntent(amountCents, {
        sellerId: listing.sellerId,
        metadata: { listing_id: listing.id, listing_title: listing.title },
      }, session.access_token)
      const nextClientSecret = result?.clientSecret || result?.client_secret || null
      if (!isValidClientSecret(nextClientSecret)) {
        console.error('[CheckoutPage] Missing or malformed Stripe client secret', {
          clientSecret: nextClientSecret,
          paymentIntentId: result?.paymentIntentId || result?.payment_intent_id || null,
        })
        throw new Error('Payment service returned an invalid client secret.')
      }
      setClientSecret(nextClientSecret)
      setAddressConfirmed(true)
    } catch (err) {
      setIntentError(friendlyIntentError(err.message) || "We couldn't load payment options right now. Please try again in a moment.")
    } finally {
      setCreatingIntent(false)
    }
  }

  const handlePaymentSuccess = async (stripePaymentIntentId) => {
    const deliveryInfo = {
      type: deliveryMethodId,
      fee: deliveryFee,
      lockerName: selectedLocker?.locationName || null,
      lockerAddress: selectedLocker?.fullAddress || null,
    }
    const deliverySnapshot = {
      buyerFullName: fullName,
      buyerPhone: phone,
      buyerCity: city,
      buyerPostcode: postcode,
      deliveryNotes,
    }
    const order = await placeOrder(id, deliveryMethodId, getFullAddress(), undefined, deliveryInfo, deliverySnapshot)
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
        console.error('Failed to save payment intent ID to order:', err)
      }
      // Track referral conversion (fire-and-forget)
      try {
        const SUPABASE_URL2 = import.meta.env.VITE_SUPABASE_URL
        const SUPABASE_ANON_KEY2 = import.meta.env.VITE_SUPABASE_ANON_KEY
        if (SUPABASE_URL2 && SUPABASE_ANON_KEY2) {
          const { createClient } = await import('@supabase/supabase-js')
          const sbTemp = createClient(SUPABASE_URL2, SUPABASE_ANON_KEY2)
          trackReferralConversion(sbTemp, { orderId: order.id })
        }
      } catch { /* silent */ }
      showToast('Payment successful! Your order has been placed.')
      navigate(`/orders/${order.id}`)
    }
  }

  const handlePaymentError = (msg) => {
    const friendly = friendlyPaymentError(msg) || 'Payment could not be completed. Please try again.'
    showToast(friendly, 'error')
  }

  const stripeAppearance = {
    theme: 'stripe',
    variables: { colorPrimary: '#D2691E', borderRadius: '12px', fontFamily: 'system-ui, -apple-system, sans-serif' },
  }

  const deliveryLabel = isBulkyItem
    ? 'Sib Driver Delivery'
    : isLocker
      ? `Locker: ${selectedLocker?.locationName || '—'}`
      : 'Home Delivery'
  const estimatedDays = isBulkyItem ? 'Arranged with Sib drivers' : isHeavyItem ? '3–5 working days' : isLocker ? '2–4 working days' : '2–3 working days'

  return (
    <div>
      <PageHeader title="Checkout" />
      <div className="px-4 py-5 pb-10 lg:max-w-5xl lg:mx-auto lg:px-8 lg:py-8">
      <div className="lg:flex lg:gap-10">
      <div className="lg:flex-1">

      {/* Item summary */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-sib-sand mb-5">
        <img src={listing.images[0]} alt={listing.title} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-sib-text line-clamp-2">{listing.title}</p>
          <p className="text-xs text-sib-muted mt-0.5">From @{seller?.username}</p>
        </div>
        <p className="text-base font-bold text-sib-primary flex-shrink-0">€{listing.price}</p>
      </div>

      {/* Delivery method selector */}
      <DeliveryMethodSelector
        deliverySize={deliverySize}
        selected={deliveryMethodId}
        onSelect={handleDeliveryChange}
        selectedLockerId={selectedLockerId}
        onLockerSelect={handleLockerSelect}
        disabled={addressConfirmed}
      />
      {errors.locker && <p className="text-red-500 text-xs -mt-3 mb-3 ml-1">{errors.locker}</p>}

      <div className="flex items-center gap-2 mb-5 px-1">
        <ShieldCheck size={12} className="text-green-600 flex-shrink-0" />
        <p className="text-[11px] text-green-700 font-medium">{isBulkyItem ? 'Delivered by Sib drivers. Tracked and secure.' : isHeavyItem ? 'Heavy parcel via courier. Tracked and secure.' : 'Delivered via MaltaPost. Tracked and secure.'}</p>
      </div>

      {/* Delivery Address — only for home delivery */}
      {!isLocker && (
        <div className="mb-5 space-y-3">
          <p className="text-xs font-semibold text-sib-text uppercase tracking-wide">Delivery Address</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <input value={fullName} onChange={e => { setFullName(e.target.value); setAddressConfirmed(false); setClientSecret(null) }} placeholder="Full name" disabled={addressConfirmed}
                className="w-full border border-sib-stone rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 disabled:bg-sib-sand disabled:opacity-70" />
            </div>
            <div className="flex-1">
              <input type="tel" inputMode="tel" value={phone} onChange={e => { setPhone(e.target.value); setAddressConfirmed(false); setClientSecret(null) }} placeholder="Phone number" disabled={addressConfirmed}
                className="w-full border border-sib-stone rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 disabled:bg-sib-sand disabled:opacity-70" />
            </div>
          </div>
          <div>
            <input value={address} onChange={e => { setAddress(e.target.value); clearErr('address'); setAddressConfirmed(false); setClientSecret(null) }} placeholder="Street address" disabled={addressConfirmed}
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.address ? 'border-red-400' : 'border-sib-stone'} focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 disabled:bg-sib-sand disabled:opacity-70`} />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <input value={city} onChange={e => { setCity(e.target.value); clearErr('city'); setAddressConfirmed(false); setClientSecret(null) }} placeholder="City / Town" disabled={addressConfirmed}
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.city ? 'border-red-400' : 'border-sib-stone'} focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 disabled:bg-sib-sand disabled:opacity-70`} />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
            </div>
            <div className="w-28">
              <input value={postcode} onChange={e => { setPostcode(e.target.value.toUpperCase()); clearErr('postcode'); setAddressConfirmed(false); setClientSecret(null) }} placeholder="Postcode" maxLength={8} disabled={addressConfirmed}
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.postcode ? 'border-red-400' : 'border-sib-stone'} focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 disabled:bg-sib-sand disabled:opacity-70`} />
              {errors.postcode && <p className="text-red-500 text-xs mt-1">{errors.postcode}</p>}
            </div>
          </div>
          <input value={deliveryNotes} onChange={e => { setDeliveryNotes(e.target.value); setAddressConfirmed(false); setClientSecret(null) }} placeholder="Delivery notes (optional)" disabled={addressConfirmed}
            className="w-full border border-sib-stone rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 disabled:bg-sib-sand disabled:opacity-70" />
          {/* Save address checkbox */}
          {!addressConfirmed && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={saveAddressChecked}
                onChange={e => setSaveAddressChecked(e.target.checked)}
                className="sr-only peer"
              />
              <span className="w-5 h-5 rounded-md border-2 border-sib-stone flex items-center justify-center transition-colors peer-checked:bg-sib-primary peer-checked:border-sib-primary group-hover:border-sib-primary/60">
                {saveAddressChecked && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </span>
              <span className="text-[13px] text-sib-text">Save this address for next time</span>
            </label>
          )}
        </div>
      )}

      {addressConfirmed && (
        <button onClick={() => { setAddressConfirmed(false); setClientSecret(null) }} className="text-xs text-sib-primary font-semibold underline underline-offset-2 mb-4 block">
          Change delivery details
        </button>
      )}

      {/* Order summary — mobile */}
      <div className="p-4 rounded-2xl bg-sib-warm mb-5 lg:hidden">
        <p className="text-sm font-bold text-sib-text mb-3">Order Summary</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-sib-muted"><span>Item price</span><span>€{listing.price.toFixed(2)}</span></div>
          <FeeBreakdown buyerProtectionFee={fees.buyerProtectionFee} />
          <div className="flex justify-between text-sib-muted text-sm">
            <span className="flex items-center gap-1.5"><Truck size={12} className="text-sib-muted/60" />{deliveryLabel}</span>
            <span>€{fees.deliveryFee.toFixed(2)}</span>
          </div>
          <div className="text-xs text-sib-muted mt-0.5 pl-[22px]">est. {estimatedDays}</div>
          <div className="flex justify-between font-bold text-sib-text pt-2 border-t border-sib-stone"><span>Total</span><span className="text-sib-primary text-lg">€{fees.total.toFixed(2)}</span></div>
        </div>
      </div>

      {/* Payment Section */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-3">Payment</p>

        {/* State D — Stripe keys not configured (app-owner setup issue) */}
        {!isStripeConfigured() && !intentError && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 mb-4">
            <div className="flex items-start gap-2.5">
              <CreditCard size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">Payment setup in progress</p>
                <p className="text-[13px] text-amber-800 mt-0.5 leading-snug">
                  Online payments are being set up for this marketplace. Please check back shortly, or contact the seller to arrange payment directly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* State C-config — backend Stripe key not configured */}
        {intentError === '__CONFIG_MISSING__' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 mb-4">
            <div className="flex items-start gap-2.5">
              <CreditCard size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">Payment setup in progress</p>
                <p className="text-[13px] text-amber-800 mt-0.5 leading-snug">
                  Online payments are being set up for this marketplace. Please check back shortly, or contact the seller to arrange payment directly.
                </p>
              </div>
            </div>
            <button
              onClick={() => { setIntentError(''); handleConfirmAddress() }}
              disabled={creatingIntent}
              className="mt-3 w-full flex items-center justify-center gap-2 text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl py-2.5 transition-colors disabled:opacity-60"
            >
              <RefreshCw size={14} className={creatingIntent ? 'animate-spin' : ''} />
              {creatingIntent ? 'Checking...' : 'Check again'}
            </button>
          </div>
        )}

        {/* State C-error — genuine backend / network failure with retry */}
        {intentError && intentError !== '__CONFIG_MISSING__' && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-100 mb-4">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">Payment unavailable</p>
                <p className="text-[13px] text-red-700 mt-0.5 leading-snug">{intentError}</p>
              </div>
            </div>
            <button
              onClick={() => { setIntentError(''); handleConfirmAddress() }}
              disabled={creatingIntent}
              className="mt-3 w-full flex items-center justify-center gap-2 text-sm font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl py-2.5 transition-colors disabled:opacity-60"
            >
              <RefreshCw size={14} className={creatingIntent ? 'animate-spin' : ''} />
              {creatingIntent ? 'Retrying...' : 'Try again'}
            </button>
          </div>
        )}

        {/* State A — delivery not yet confirmed, guide buyer toward payment */}
        {isStripeConfigured() && !addressConfirmed && !clientSecret && !intentError && (
          <div>
            {/* Guidance card */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-sib-sand/60 border border-sib-stone/40 mb-4">
              <CreditCard size={18} className="text-sib-primary flex-shrink-0" />
              <p className="text-[13px] text-sib-text leading-snug">
                Confirm your delivery details above, then choose how to pay — card, Apple Pay, or Google Pay.
              </p>
            </div>

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
          </div>
        )}

        {/* State B — Stripe Elements loaded, buyer can pay */}
        {clientSecret && (
          <Elements stripe={getStripe()} options={{ clientSecret, appearance: stripeAppearance }}>
            <StripeCheckoutForm fees={fees} onSuccess={handlePaymentSuccess} onError={handlePaymentError} />
          </Elements>
        )}
      </div>

      {/* Trust — buyer protection messaging */}
      <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-green-50 mb-3">
        <ShieldCheck size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-green-800 font-semibold">Buyer Protection included</p>
          <p className="text-[11px] text-green-700 leading-snug mt-0.5">Your payment is held securely until delivery is confirmed. After delivery, you have 48 hours to report an issue. If no issue is reported, the seller is paid automatically.</p>
        </div>
      </div>

      <p className="text-[11px] text-sib-muted text-center mb-5 leading-relaxed">
        By continuing, you agree to Sib's{' '}
        <Link to="/terms" className="text-sib-primary font-semibold underline underline-offset-2">Terms & Conditions</Link>,{' '}
        <Link to="/buyer-protection" className="text-sib-primary font-semibold underline underline-offset-2">Buyer Protection Policy</Link>,{' '}
        <Link to="/delivery-policy" className="text-sib-primary font-semibold underline underline-offset-2">Delivery Policy</Link>
        {' '}&{' '}
        <Link to="/disputes-refunds" className="text-sib-primary font-semibold underline underline-offset-2">Disputes & Refunds Policy</Link>
      </p>

      </div>{/* end left column */}

      {/* Right column — desktop order summary (sticky) */}
      <aside className="hidden lg:block lg:w-80 lg:flex-shrink-0">
        <div className="sticky top-24">
          <div className="p-5 rounded-2xl bg-sib-warm border border-sib-stone">
            <p className="text-sm font-bold text-sib-text mb-4">Order Summary</p>
            <div className="flex items-center gap-3 mb-4">
              <img src={listing.images[0]} alt={listing.title} className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sib-text line-clamp-2">{listing.title}</p>
                <p className="text-xs text-sib-muted mt-0.5">{listing.brand} · Size {listing.size}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-sib-muted"><span>Item price</span><span>€{listing.price.toFixed(2)}</span></div>
              <FeeBreakdown buyerProtectionFee={fees.buyerProtectionFee} />
              <div className="flex justify-between text-sib-muted text-sm">
                <span className="flex items-center gap-1.5"><Truck size={12} className="text-sib-muted/60" />{deliveryLabel}</span>
                <span>€{fees.deliveryFee.toFixed(2)}</span>
              </div>
              <div className="text-xs text-sib-muted mt-0.5 pl-[22px]">est. {estimatedDays}</div>
              <div className="flex justify-between font-bold text-sib-text pt-3 border-t border-sib-stone mt-2"><span>Total</span><span className="text-sib-primary text-xl">€{fees.total.toFixed(2)}</span></div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-green-50 mt-3">
            <ShieldCheck size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-green-800 font-semibold">Buyer Protection included</p>
              <p className="text-[10px] text-green-700 leading-snug mt-0.5">Payment held until confirmed. 48h to report issues after delivery.</p>
            </div>
          </div>
        </div>
      </aside>
      </div>{/* end lg:flex */}
      </div>
    </div>
  )
}
