import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, ExternalLink, Loader2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../lib/auth-context'
import { getStripeConnectStatus, startStripeConnect } from '../lib/stripe'

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
  const { currentUser, showToast, refreshCurrentProfile } = useApp()
  const { session } = useAuth()

  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [stripeAccountId, setStripeAccountId] = useState(currentUser?.stripeAccountId || null)
  const [detailsSubmitted, setDetailsSubmitted] = useState(!!currentUser?.detailsSubmitted)
  const [chargesEnabled, setChargesEnabled] = useState(!!currentUser?.chargesEnabled)
  const [payoutsEnabled, setPayoutsEnabled] = useState(!!currentUser?.payoutsEnabled)
  const [error, setError] = useState('')

  if (!currentUser) {
    navigate('/auth')
    return null
  }

  useEffect(() => {
    setStripeAccountId(currentUser?.stripeAccountId || null)
    setDetailsSubmitted(!!currentUser?.detailsSubmitted)
    setChargesEnabled(!!currentUser?.chargesEnabled)
    setPayoutsEnabled(!!currentUser?.payoutsEnabled)
  }, [
    currentUser?.stripeAccountId,
    currentUser?.detailsSubmitted,
    currentUser?.chargesEnabled,
    currentUser?.payoutsEnabled,
  ])

  useEffect(() => {
    let cancelled = false

    async function loadStatus() {
      if (!session?.access_token) {
        setChecking(false)
        return
      }

      try {
        const result = await getStripeConnectStatus(session.access_token)
        if (cancelled) return
        setStripeAccountId(result.accountId || null)
        setDetailsSubmitted(!!result.detailsSubmitted)
        setChargesEnabled(!!result.chargesEnabled)
        setPayoutsEnabled(!!result.payoutsEnabled)
        await refreshCurrentProfile?.()
      } catch (err) {
        if (!cancelled) {
          console.warn('Failed to load Stripe status:', err)
        }
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    loadStatus()
    return () => { cancelled = true }
  }, [session?.access_token, refreshCurrentProfile])

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

      setDetailsSubmitted(!!result.detailsSubmitted)
      setChargesEnabled(!!result.chargesEnabled)
      setPayoutsEnabled(!!result.payoutsEnabled)
      await refreshCurrentProfile?.()

      if (result.alreadyOnboarded) {
        window.open(result.url, '_blank')
      } else {
        window.location.assign(result.url)
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

  const isActive = detailsSubmitted && chargesEnabled && payoutsEnabled
  const isPending = !!stripeAccountId && !isActive

  return (
    <div className="pb-10 bg-white min-h-screen">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-base font-semibold text-gray-900">Payments</h1>
      </div>

      <div className="px-4 pt-6 pb-4 space-y-6">
        {checking ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Checking status…</span>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm font-semibold text-gray-900">
                  {isActive ? 'Payouts active' : isPending ? 'Stripe verification incomplete' : 'Not set up yet'}
                </span>
              </div>
              <p className="text-[13px] text-gray-500 ml-[18px]">
                {isActive
                  ? 'Your Stripe payout account is ready to receive earnings.'
                  : isPending
                    ? 'Complete Stripe-hosted verification so Sib can send your payouts.'
                    : 'Set up Stripe payouts so Sib can send your earnings to your bank account.'}
              </p>
            </div>

            {isActive && (
              <>
                <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-500">Identity verification</span>
                    <span className="text-[13px] font-medium text-green-600">Ready</span>
                  </div>
                  <div className="h-px bg-gray-50" />
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-500">Receiving payments</span>
                    <span className="text-[13px] font-medium text-green-600">Ready</span>
                  </div>
                  <div className="h-px bg-gray-50" />
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-500">Bank payouts</span>
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
                    <><ExternalLink size={14} /> Manage Stripe account</>
                  )}
                </button>
              </>
            )}

            {isPending && !isActive && (
              <>
                <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-500">Connected account</span>
                    <span className="text-[13px] font-medium text-green-600">Created</span>
                  </div>
                  <div className="h-px bg-gray-50" />
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-500">Details submitted</span>
                    <span className={`text-[13px] font-medium ${detailsSubmitted ? 'text-green-600' : 'text-gray-400'}`}>
                      {detailsSubmitted ? 'Ready' : 'Pending'}
                    </span>
                  </div>
                  <div className="h-px bg-gray-50" />
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-500">Charges enabled</span>
                    <span className={`text-[13px] font-medium ${chargesEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {chargesEnabled ? 'Ready' : 'Pending'}
                    </span>
                  </div>
                  <div className="h-px bg-gray-50" />
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-500">Payouts enabled</span>
                    <span className={`text-[13px] font-medium ${payoutsEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {payoutsEnabled ? 'Ready' : 'Pending'}
                    </span>
                  </div>
                </div>

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
                    'Continue Stripe verification'
                  )}
                </button>
              </>
            )}

            {!isActive && !isPending && (
              <>
                {error === '__CONFIG_MISSING__' ? (
                  <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-[13px] text-gray-500 leading-relaxed">
                      Payment setup is being configured. You&apos;ll be able to set up your account shortly.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="border border-gray-100 rounded-xl p-4 space-y-4">
                      <div>
                        <p className="text-[13px] font-medium text-gray-700 mb-1">Stripe-hosted onboarding</p>
                        <p className="text-[13px] text-gray-500 leading-relaxed">
                          Stripe collects your identity verification and payout details directly.
                        </p>
                      </div>
                      <div className="h-px bg-gray-100" />
                      <div>
                        <p className="text-[13px] font-medium text-gray-700 mb-1">Payouts when you sell</p>
                        <p className="text-[13px] text-gray-500 leading-relaxed">
                          Once your Stripe account is ready, Sib can send your earnings to your bank account.
                        </p>
                      </div>
                    </div>

                    <p className="text-[12px] text-gray-400 leading-relaxed">
                      Setup takes a few minutes and includes identity verification handled by Stripe.
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
                        'Set up payouts'
                      )}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <p className="text-[11px] text-gray-400 leading-relaxed pt-2">
          Payments are handled by Stripe. Sib does not store your card or banking details.
        </p>
      </div>
    </div>
  )
}
