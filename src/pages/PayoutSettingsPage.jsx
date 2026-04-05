import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Banknote, CheckCircle, AlertCircle, ExternalLink, Loader2, CreditCard } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../lib/auth-context'
import { startStripeConnect } from '../lib/stripe'

/* ── Friendly error mapping for payout flows ─────────────── */
function friendlyPayoutError(raw) {
  if (!raw || typeof raw !== 'string') return null
  if (/not configured/i.test(raw) || /add it in/i.test(raw) || /STRIPE_SECRET_KEY/i.test(raw)) {
    return '__CONFIG_MISSING__'
  }
  if (/failed to fetch/i.test(raw) || /network/i.test(raw) || /timeout/i.test(raw) || /500|502|503|504/.test(raw) || /edge function/i.test(raw)) {
    return "We couldn't connect to our payment provider right now. Please try again in a moment."
  }
  return raw
}

export default function PayoutSettingsPage() {
  const navigate = useNavigate()
  const { currentUser, showToast } = useApp()
  const { session } = useAuth()

  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [stripeAccountId, setStripeAccountId] = useState(null)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [chargesEnabled, setChargesEnabled] = useState(false)
  const [payoutsEnabled, setPayoutsEnabled] = useState(false)
  const [error, setError] = useState('')

  if (!currentUser) { navigate('/auth'); return null }

  // On mount, just finish checking — we don't hit the Edge Function until user clicks
  useEffect(() => {
    setChecking(false)
  }, [session?.access_token])

  const handleStartOnboarding = async () => {
    setLoading(true)
    setError('')
    try {
      const returnUrl = window.location.href
      const result = await startStripeConnect(session.access_token, returnUrl)

      if (!result.url) {
        throw new Error('No onboarding URL returned from Stripe Connect.')
      }

      if (result.accountId) {
        setStripeAccountId(result.accountId)
      }

      if (result.alreadyOnboarded) {
        setOnboardingComplete(true)
        setChargesEnabled(result.chargesEnabled || false)
        setPayoutsEnabled(result.payoutsEnabled || false)
        // Open Stripe dashboard in new tab
        window.open(result.url, '_blank')
      } else {
        // Redirect to Stripe onboarding
        window.location.href = result.url
      }
    } catch (err) {
      console.error('Stripe Connect onboarding error:', err)
      const friendly = friendlyPayoutError(err.message)
      if (friendly === '__CONFIG_MISSING__') {
        setError('__CONFIG_MISSING__')
      } else {
        setError(friendly || 'Failed to start onboarding. Please try again.')
        showToast(friendly || 'Failed to start Stripe onboarding', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDashboard = async () => {
    setLoading(true)
    try {
      const result = await startStripeConnect(session.access_token, window.location.href)
      if (result.url) {
        window.open(result.url, '_blank')
      } else {
        throw new Error('No dashboard URL returned.')
      }
    } catch (err) {
      console.error('Failed to open Stripe dashboard:', err)
      showToast('Failed to open Stripe dashboard', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-10">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-sib-stone">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-sib-sand flex items-center justify-center">
          <ArrowLeft size={18} className="text-sib-text" />
        </button>
        <h1 className="text-base font-bold text-sib-text">Payout Settings</h1>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Info */}
        <div className="p-3 rounded-2xl bg-sib-primary/5 border border-sib-primary/10 flex items-start gap-2.5">
          <Banknote size={16} className="text-sib-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-sib-muted leading-relaxed">
            Sib uses Stripe Connect to securely handle payouts. You receive the full listing price directly to your bank account. Sib charges buyers a separate service fee. Payouts are sent automatically after delivery is confirmed.
          </p>
        </div>

        {checking ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-sib-primary" />
            <span className="ml-2 text-sm text-sib-muted">Checking payout status...</span>
          </div>
        ) : onboardingComplete && chargesEnabled ? (
          <>
            {/* Fully onboarded */}
            <div className="p-4 rounded-2xl bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-green-600" />
                <p className="text-sm font-semibold text-green-800">Stripe account active</p>
              </div>
              <div className="space-y-1 text-sm text-green-700">
                <p>Your Stripe Connect account is fully set up and ready to receive payouts.</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${chargesEnabled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {chargesEnabled ? '✓ Charges enabled' : '⏳ Charges pending'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${payoutsEnabled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {payoutsEnabled ? '✓ Payouts enabled' : '⏳ Payouts pending'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleOpenDashboard}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl text-sm font-bold bg-sib-primary text-white active:bg-sib-primaryDark flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <><ExternalLink size={14} /> Open Stripe Dashboard</>
              )}
            </button>
          </>
        ) : stripeAccountId ? (
          <>
            {/* Account created but onboarding incomplete */}
            <div className="p-4 rounded-2xl bg-yellow-50 border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-yellow-600" />
                <p className="text-sm font-semibold text-yellow-800">Onboarding incomplete</p>
              </div>
              <p className="text-sm text-yellow-700">
                Your Stripe account has been created but setup is not complete. Finish onboarding to start receiving payouts.
              </p>
            </div>

            <button
              onClick={handleStartOnboarding}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl text-sm font-bold bg-sib-primary text-white active:bg-sib-primaryDark flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Redirecting to Stripe...</>
              ) : (
                <><ExternalLink size={14} /> Complete Stripe Onboarding</>
              )}
            </button>
          </>
        ) : (
          <>
            {/* No account yet */}
            {error === '__CONFIG_MISSING__' ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-2.5">
                  <CreditCard size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900">Payout setup coming soon</p>
                    <p className="text-[13px] text-amber-800 mt-0.5 leading-snug">
                      Seller payouts are being configured for this marketplace. You'll be able to set up your Stripe account once this is ready. Check back shortly.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-2xl bg-sib-sand">
                  <p className="text-sm font-semibold text-sib-text mb-2">Set up payouts with Stripe</p>
                  <p className="text-xs text-sib-muted leading-relaxed">
                    To receive payments from your sales on Sib, you need to set up a Stripe Express account. This process takes a few minutes and requires basic identity verification.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-sib-muted">
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500" /> No monthly fees</li>
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500" /> Direct bank deposits</li>
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500" /> Malta-based seller support</li>
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500" /> Secure identity verification</li>
                  </ul>
                </div>

                {error && error !== '__CONFIG_MISSING__' && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleStartOnboarding}
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold bg-sib-primary text-white active:bg-sib-primaryDark flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Setting up account...</>
                  ) : (
                    <><ExternalLink size={14} /> Set Up Stripe Payouts</>
                  )}
                </button>
              </>
            )}
          </>
        )}

        {/* Security note */}
        <div className="flex items-start gap-2 p-3 rounded-2xl bg-sib-sand">
          <AlertCircle size={14} className="text-sib-muted flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-sib-muted leading-relaxed">
            Your payout information is managed securely by Stripe. Sib never stores your banking details directly. Stripe is PCI Level 1 certified — the highest level of security in the payments industry.
          </p>
        </div>
      </div>
    </div>
  )
}
