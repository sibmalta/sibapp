import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
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

  useEffect(() => {
    if (!currentUser) navigate('/auth')
  }, [currentUser, navigate])

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
      showToast('Failed to open payout account', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser) return null

  const isActive = detailsSubmitted && chargesEnabled && payoutsEnabled
  const setupButtonDisabled = loading || error === '__CONFIG_MISSING__' || !session?.access_token

  return (
    <div className="pb-10 bg-white dark:bg-[#18211f] min-h-screen transition-colors">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-[rgba(242,238,231,0.10)]">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-50 dark:bg-[#26322f] flex items-center justify-center transition-colors">
          <ArrowLeft size={18} className="text-gray-600 dark:text-[#aeb8b4]" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 dark:text-[#f4efe7]">Payments</h1>
      </div>

      <div className="px-4 pt-6 pb-4 space-y-6">
        {checking ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-gray-400 dark:text-[#aeb8b4]" />
            <span className="ml-2 text-sm text-gray-400 dark:text-[#aeb8b4]">Checking status...</span>
          </div>
        ) : isActive ? (
          <div className="rounded-2xl border border-green-100 dark:border-green-500/20 bg-green-50 dark:bg-[#20322b] p-5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <p className="text-base font-semibold text-green-800 dark:text-green-300">
                You’re ready to receive payouts
              </p>
            </div>

            <button
              onClick={handleOpenDashboard}
              disabled={loading}
              className="mt-4 w-full py-3 rounded-xl text-sm font-medium border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300 bg-white dark:bg-[#26322f] hover:bg-green-50 dark:hover:bg-[#30403c] active:bg-green-100 flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : 'Manage payout account'}
            </button>
          </div>
        ) : (
            <div className="rounded-2xl border border-gray-100 dark:border-[rgba(242,238,231,0.10)] bg-white dark:bg-[#202b28] p-5 space-y-4 transition-colors">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-[#f4efe7]">Get paid for your sales</h2>
              <p className="text-[13px] text-gray-500 dark:text-[#aeb8b4] leading-relaxed mt-1">
                Complete a quick verification so we can send your payouts.
              </p>
            </div>

            {error === '__CONFIG_MISSING__' ? (
              <p className="text-[13px] text-gray-500 dark:text-[#aeb8b4] leading-relaxed">
                Payment setup is being configured. You&apos;ll be able to continue verification shortly.
              </p>
            ) : error ? (
              <p className="text-[13px] text-red-500 flex items-center gap-1.5">
                <AlertCircle size={13} className="flex-shrink-0" />
                Something went wrong. Please try again.
              </p>
            ) : null}

            <button
              onClick={handleStartOnboarding}
              disabled={setupButtonDisabled}
              className="w-full py-3 rounded-xl text-sm font-medium bg-gray-900 text-white active:bg-gray-800 flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Redirecting...</>
              ) : (
                'Continue verification'
              )}
            </button>
          </div>
        )}

        <p className="text-[11px] text-gray-400 dark:text-[#aeb8b4] leading-relaxed pt-2">
          Payments are handled by Stripe. Sib does not store your card or banking details.
        </p>
      </div>
    </div>
  )
}
