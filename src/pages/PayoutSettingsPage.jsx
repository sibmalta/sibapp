import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, ExternalLink, Loader2 } from 'lucide-react'
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
        window.open(result.url, "_blank")
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

  /* ── Derive status label ─────────────────────────────────── */
  const isActive = onboardingComplete && chargesEnabled
  const isPending = !!stripeAccountId && !isActive

  return (
    <div className="pb-10 bg-white min-h-screen">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-base font-semibold text-gray-900">Payments</h1>
      </div>

      <div className="px-4 pt-6 pb-4 space-y-6">

        {/* ── Status Section ───────────────────────────────── */}
        {checking ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Checking status…</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status indicator */}
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm font-semibold text-gray-900">
                  {isActive ? 'Payments active' : isPending ? 'Setup incomplete' : 'Not set up yet'}
                </span>
              </div>
              <p className="text-[13px] text-gray-500 ml-[18px]">
                {isActive
                  ? 'Receive payouts when you sell, and pay securely when you buy.'
                  : isPending
                    ? 'Finish setting up to start selling and buying on Sib.'
                    : 'Receive payouts when you sell, and pay securely when you buy.'}
              </p>
            </div>

            {/* ── Active state ──────────────────────────────── */}
            {isActive && (
              <>
                <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-500">Receiving payments</span>
                    <span className="text-[13px] font-medium text-green-600">Ready</span>
                  </div>
                  <div className="h-px bg-gray-50" />
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-500">Bank payouts</span>
                    <span className={`text-[13px] font-medium ${payoutsEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {payoutsEnabled ? 'Ready' : 'Pending'}
                    </span>
                  </div>
                  <div className="h-px bg-gray-50" />
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-500">Paying for items</span>
                    <span className="text-[13px] font-medium text-green-600">Ready</span>
                  </div>
                </div>

                <button
                  onClick={handleOpenDashboard}
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                >
                  {loading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <><ExternalLink size={14} /> Manage payment account</>
                  )}
                </button>
              </>
            )}

            {/* ── Pending state ─────────────────────────────── */}
            {isPending && !isActive && (
              <>
                {error && error !== '__CONFIG_MISSING__' && (
                  <p className="text-[13px] text-red-500 flex items-center gap-1.5">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    Something went wrong. Please try again.
                  </p>
                )}

                <button
                  onClick={handleStartOnboarding}
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-medium bg-gray-900 text-white active:bg-gray-800 flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                >
                  {loading ? (
                    <><Loader2 size={15} className="animate-spin" /> Redirecting…</>
                  ) : (
                    'Continue setup'
                  )}
                </button>
              </>
            )}

            {/* ── Not set up state ──────────────────────────── */}
            {!isActive && !isPending && (
              <>
                {error === '__CONFIG_MISSING__' ? (
                  <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-[13px] text-gray-500 leading-relaxed">
                      Payment setup is being configured. You'll be able to set up your account shortly.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Two-sided explanation: selling + buying */}
                    <div className="border border-gray-100 rounded-xl p-4 space-y-4">
                      <div>
                        <p className="text-[13px] font-medium text-gray-700 mb-1">When you sell</p>
                        <p className="text-[13px] text-gray-500 leading-relaxed">
                          You receive the full listing price directly to your bank account after delivery is confirmed.
                        </p>
                      </div>
                      <div className="h-px bg-gray-100" />
                      <div>
                        <p className="text-[13px] font-medium text-gray-700 mb-1">When you buy</p>
                        <p className="text-[13px] text-gray-500 leading-relaxed">
                          Pay securely by card. A small service fee is added at checkout.
                        </p>
                      </div>
                    </div>

                    <p className="text-[12px] text-gray-400 leading-relaxed">
                      Setup takes a few minutes and includes identity verification.
                    </p>

                    {error && error !== '__CONFIG_MISSING__' && (
                      <p className="text-[13px] text-red-500 flex items-center gap-1.5">
                        <AlertCircle size={13} className="flex-shrink-0" />
                        Something went wrong. Please try again.
                      </p>
                    )}

                    <button
                      onClick={handleStartOnboarding}
                      disabled={loading}
                      className="w-full py-3 rounded-xl text-sm font-medium bg-gray-900 text-white active:bg-gray-800 flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                    >
                      {loading ? (
                        <><Loader2 size={15} className="animate-spin" /> Setting up…</>
                      ) : (
                        'Set up payments'
                      )}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Security footnote */}
        <p className="text-[11px] text-gray-400 leading-relaxed pt-2">
          Payments are handled by Stripe (PCI Level 1). Sib does not store your card or banking details.
        </p>
      </div>
    </div>
  )
}
