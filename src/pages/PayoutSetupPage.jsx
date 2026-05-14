import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Banknote, CheckCircle, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { loadConnectAndInitialize } from '@stripe/connect-js'
import { ConnectAccountOnboarding, ConnectComponentsProvider } from '@stripe/react-connect-js'
import { useApp } from '../context/AppContext'
import { useAuth } from '../lib/auth-context'
import { createStripeConnectAccountSession, startStripeConnect } from '../lib/stripe'
import { getSellerPendingPayoutSummary } from '../lib/pendingPayouts'
import { isEmailVerified } from '../lib/emailVerification'
import EmailVerificationRequired from '../components/EmailVerificationRequired'

function formatMoney(value = 0) {
  return `€${Number(value || 0).toFixed(2)}`
}

function friendlyPayoutSetupError(raw) {
  if (!raw || typeof raw !== 'string') return 'We could not open secure setup. Please try again.'
  if (/test mode/i.test(raw) || /testmode/i.test(raw) || /stripe_account_mode_mismatch/i.test(raw)) {
    return 'This payout account was created in Stripe test mode. Please restart payout setup with a live account.'
  }
  return raw
}

function getStripePublishableKey() {
  return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
}

function getReturnUrl() {
  return `${window.location.origin}/seller/payout-settings`
}

const EMBEDDED_FALLBACK_MESSAGE = 'You can continue using Stripe\'s secure setup window.'

function getEmbeddedFailureReason(error, fallbackReason = 'account_session_creation_failed') {
  const message = error?.message || String(error || '')
  if (/incompatible|cannot create account session|not eligible|account_invalid|resource_missing/i.test(message)) {
    return 'existing_connected_account_incompatible'
  }
  return fallbackReason
}

function formatEmbeddedFailure(reason, detail) {
  const labels = {
    email_not_verified: 'Please verify your email to continue.',
    missing_publishable_key: 'Missing VITE_STRIPE_PUBLISHABLE_KEY.',
    account_session_creation_failed: 'Stripe account session creation failed.',
    account_session_missing_client_secret: 'Stripe account session returned no client secret.',
    stripe_connect_js_load_failure: 'Stripe embedded onboarding could not start.',
    embedded_component_render_error: 'Stripe embedded onboarding component failed to load.',
    existing_connected_account_incompatible: 'The existing Stripe connected account is incompatible with embedded onboarding.',
  }
  return [labels[reason] || 'Embedded onboarding failed.', detail].filter(Boolean).join(' ')
}

export default function PayoutSetupPage() {
  const navigate = useNavigate()
  const { currentUser, getUserSales, refreshCurrentProfile, showToast } = useApp()
  const { session, user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [embeddedStarted, setEmbeddedStarted] = useState(false)
  const [connectInstance, setConnectInstance] = useState(null)
  const [hostedFallbackReady, setHostedFallbackReady] = useState(false)
  const [embeddedFailure, setEmbeddedFailure] = useState(null)

  const pendingSummary = useMemo(() => {
    if (!currentUser?.id || !getUserSales) return null
    return getSellerPendingPayoutSummary(getUserSales(currentUser.id), currentUser.id)
  }, [currentUser?.id, getUserSales])

  const waitingAmount = pendingSummary?.totalAmount || 0
  const emailVerified = isEmailVerified(authUser || currentUser)

  useEffect(() => {
    console.info('payout_setup_email_verified', emailVerified)
  }, [emailVerified])

  const handleContinue = async () => {
    if (!session?.access_token) {
      navigate('/auth', { state: { from: '/payout-setup' } })
      return
    }

    if (!emailVerified) {
      console.info('payout_setup_email_verified', false)
      console.warn('payout_setup_embedded_failed', { reason: 'email_not_verified' })
      return
    }

    const stripePublishableKey = getStripePublishableKey()

    if (!stripePublishableKey) {
      const failure = {
        reason: 'missing_publishable_key',
        message: 'Secure embedded setup could not load.',
        detail: 'Missing VITE_STRIPE_PUBLISHABLE_KEY.',
      }
      console.error('[payout-setup] embedded_fallback_triggered', failure)
      console.error('embedded_onboarding_render_failed', failure)
      console.error('payout_setup_embedded_failed', failure)
      setEmbeddedFailure(failure)
      setError(EMBEDDED_FALLBACK_MESSAGE)
      setHostedFallbackReady(true)
      return
    }

    setLoading(true)
    setError('')
    setEmbeddedFailure(null)
    setHostedFallbackReady(false)
    try {
      console.info('starting_stripe_onboarding')
      console.info('embedded_onboarding_render_start')
      console.info('payout_setup_embedded_start')
      const instance = loadConnectAndInitialize({
        publishableKey: stripePublishableKey,
        fetchClientSecret: async () => {
          let sessionResult
          try {
            sessionResult = await createStripeConnectAccountSession(session.access_token, 'account_onboarding')
          } catch (err) {
            const reason = getEmbeddedFailureReason(err, 'account_session_creation_failed')
            const failure = {
              reason,
              message: 'Secure embedded setup could not load.',
              detail: friendlyPayoutSetupError(err?.message),
            }
            console.error('[payout-setup] embedded_fallback_triggered', failure)
            console.error('embedded_onboarding_render_failed', failure)
            console.error('payout_setup_embedded_failed', failure)
            setEmbeddedFailure(failure)
            setError(EMBEDDED_FALLBACK_MESSAGE)
            setHostedFallbackReady(true)
            throw err
          }

          if (!sessionResult?.clientSecret) {
            const failure = {
              reason: 'account_session_missing_client_secret',
              message: 'Secure embedded setup could not load.',
              detail: 'The stripe-connect function did not return clientSecret.',
            }
            console.error('[payout-setup] embedded_fallback_triggered', {
              ...failure,
              responseKeys: sessionResult ? Object.keys(sessionResult) : [],
            })
            console.error('embedded_onboarding_render_failed', failure)
            console.error('payout_setup_embedded_failed', failure)
            setEmbeddedFailure(failure)
            setError(EMBEDDED_FALLBACK_MESSAGE)
            setHostedFallbackReady(true)
            throw new Error('No embedded setup session returned.')
          }
          return sessionResult.clientSecret
        },
        appearance: {
          overlays: 'drawer',
          variables: {
            colorPrimary: '#e8751a',
            colorText: '#1f2926',
            borderRadius: '14px',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        },
      })
      setConnectInstance(instance)
      setEmbeddedStarted(true)
      console.info('embedded_onboarding_render_success')
    } catch (err) {
      const failure = {
        reason: getEmbeddedFailureReason(err, 'stripe_connect_js_load_failure'),
        message: 'Secure embedded setup could not load.',
        detail: friendlyPayoutSetupError(err?.message),
      }
      console.error('[payout-setup] embedded_fallback_triggered', failure)
      console.error('embedded_onboarding_render_failed', failure)
      console.error('payout_setup_embedded_failed', failure)
      setEmbeddedFailure(failure)
      setError(EMBEDDED_FALLBACK_MESSAGE)
      setHostedFallbackReady(true)
      showToast?.('Could not open embedded setup. Secure Stripe setup is still available.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleHostedFallback = async () => {
    if (!session?.access_token) {
      navigate('/auth', { state: { from: '/payout-setup' } })
      return
    }

    setLoading(true)
    setError('')
    try {
      console.info('starting_stripe_onboarding')
      const result = await startStripeConnect(session.access_token, getReturnUrl())
      await refreshCurrentProfile?.()
      if (!result?.url) throw new Error('No secure setup URL returned.')
      window.location.assign(result.url)
    } catch (err) {
      console.error('[payout-setup] failed to start hosted Stripe flow:', err)
      const message = friendlyPayoutSetupError(err?.message)
      setError(message)
      showToast?.('Could not open secure setup. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleMaybeLater = () => {
    navigate(-1)
  }

  if (!currentUser) return null

  if (!emailVerified) {
    return (
      <div className="min-h-screen bg-sib-bg pb-24 text-sib-text dark:bg-[#18211f] dark:text-[#f4efe7]">
        <header className="sticky top-0 z-30 border-b border-sib-stone/60 bg-white/95 px-3 py-2.5 backdrop-blur dark:border-[rgba(242,238,231,0.10)] dark:bg-[#131918]/95">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-sib-sand text-sib-text dark:bg-[#26322f] dark:text-[#f4efe7]"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <p className="text-sm font-bold">Receive earnings</p>
          </div>
        </header>
        <EmailVerificationRequired>
          <span />
        </EmailVerificationRequired>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sib-bg pb-24 text-sib-text dark:bg-[#18211f] dark:text-[#f4efe7]">
      <header className="sticky top-0 z-30 border-b border-sib-stone/60 bg-white/95 px-3 py-2.5 backdrop-blur dark:border-[rgba(242,238,231,0.10)] dark:bg-[#131918]/95">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-sib-sand text-sib-text dark:bg-[#26322f] dark:text-[#f4efe7]"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <p className="text-sm font-bold">Receive earnings</p>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-5">
        {embeddedStarted && connectInstance ? (
          <section className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-sib-stone/70 dark:bg-[#202b28] dark:ring-[rgba(242,238,231,0.10)]">
            <div className="px-2 pb-3 pt-2">
              <h1 className="text-xl font-black tracking-tight text-sib-text dark:text-[#f4efe7]">Complete payout setup</h1>
              <p className="mt-1 text-xs leading-relaxed text-sib-muted dark:text-[#aeb8b4]">
                To withdraw your earnings, complete Stripe's secure payout setup. Stripe may open a secure window to verify your details.
              </p>
            </div>
            <div id="sib-embedded-onboarding">
              <ConnectComponentsProvider connectInstance={connectInstance}>
                <ConnectAccountOnboarding
                  onExit={async () => {
                    await refreshCurrentProfile?.()
                    navigate('/seller/payout-settings')
                  }}
                  onLoadError={({ error: loadError }) => {
                    const failure = {
                      reason: getEmbeddedFailureReason(loadError, 'embedded_component_render_error'),
                      message: 'Secure embedded setup could not load.',
                      detail: friendlyPayoutSetupError(loadError?.message),
                    }
                    console.error('[payout-setup] embedded_fallback_triggered', failure)
                    console.error('embedded_onboarding_render_failed', failure)
                    console.error('payout_setup_embedded_failed', failure)
                    setEmbeddedFailure(failure)
                    setError(EMBEDDED_FALLBACK_MESSAGE)
                    setHostedFallbackReady(true)
                  }}
                />
              </ConnectComponentsProvider>
            </div>
          </section>
        ) : (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-sib-stone/70 dark:bg-[#202b28] dark:ring-[rgba(242,238,231,0.10)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sib-primary/10 text-sib-primary">
            <Banknote size={23} />
          </div>

          {waitingAmount > 0 && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-sib-primary ring-1 ring-orange-100 dark:bg-[#26322f] dark:ring-sib-primary/20">
              <Sparkles size={13} /> You have {formatMoney(waitingAmount)} waiting 🎉
            </div>
          )}

          <h1 className="mt-4 text-2xl font-black tracking-tight text-sib-text dark:text-[#f4efe7]">
            Receive your earnings securely
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-sib-muted dark:text-[#aeb8b4]">
            Sib uses Stripe to securely send money from your sales directly to your bank account.
          </p>

          <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/70 p-4 dark:border-sib-primary/20 dark:bg-[#26322f]">
            <p className="text-sm font-black text-sib-text dark:text-[#f4efe7]">To withdraw your earnings, complete Stripe's secure payout setup.</p>
            <p className="mt-3 text-xs font-semibold text-sib-muted dark:text-[#aeb8b4]">
              This is only needed when you're ready to receive money.
            </p>
            <p className="mt-2 text-xs font-semibold text-sib-muted dark:text-[#aeb8b4]">
              Stripe may open a secure window to verify your details.
            </p>
          </div>

          <div className="mt-5 grid gap-2.5">
            {[
              'Secure payouts',
              'Verified seller payments',
              'Buyer & seller protection',
            ].map(item => (
              <div key={item} className="flex items-center gap-2.5 text-sm font-semibold text-sib-text dark:text-[#f4efe7]">
                <CheckCircle size={16} className="shrink-0 text-green-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {(error || embeddedFailure) && (
            <div role="alert" className="mt-4 rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-[#362322] dark:text-red-300">
              {embeddedFailure ? (
                <>
                  <p className="font-black">Secure embedded setup could not load.</p>
                  <p className="mt-1">{error}</p>
                  <p className="mt-1 text-[11px] opacity-80">Debug reason: {embeddedFailure.reason}</p>
                </>
              ) : (
                <p>{error}</p>
              )}
            </div>
          )}

          <div className="mt-6 grid gap-2.5">
            <button
              type="button"
              onClick={handleContinue}
              disabled={loading}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-sib-primary px-5 py-3 text-sm font-black text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              Continue securely
            </button>
            <button
              type="button"
              onClick={handleMaybeLater}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold text-sib-muted dark:text-[#aeb8b4]"
            >
              Maybe later
            </button>
          </div>
        </section>
        )}

        {embeddedStarted && embeddedFailure && (
          <div role="alert" className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-[#362322] dark:text-red-300">
            <p className="font-black">Secure embedded setup could not load.</p>
            <p className="mt-1">{error}</p>
            <p className="mt-1 text-[11px] opacity-80">Debug reason: {embeddedFailure.reason}</p>
          </div>
        )}

        {hostedFallbackReady && (
          <button
            type="button"
            onClick={handleHostedFallback}
            disabled={loading}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-sib-stone bg-white px-5 py-2.5 text-sm font-bold text-sib-text shadow-sm dark:border-[rgba(242,238,231,0.10)] dark:bg-[#202b28] dark:text-[#f4efe7]"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
            Open secure Stripe setup
          </button>
        )}

        <p className="mt-4 px-2 text-center text-[11px] leading-relaxed text-sib-muted dark:text-[#aeb8b4]">
          Stripe handles the secure bank connection. Sib never stores your banking details.
        </p>
      </main>
    </div>
  )
}
