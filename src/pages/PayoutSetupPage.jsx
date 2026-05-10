import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Banknote, CheckCircle, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../lib/auth-context'
import { startStripeConnect } from '../lib/stripe'
import { getSellerPendingPayoutSummary } from '../lib/pendingPayouts'

function formatMoney(value = 0) {
  return `€${Number(value || 0).toFixed(2)}`
}

function getReturnUrl() {
  return `${window.location.origin}/seller/payout-settings`
}

export async function startPayoutSetup({ accessToken, returnUrl, refreshCurrentProfile, onRedirect }) {
  const result = await startStripeConnect(accessToken, returnUrl)
  await refreshCurrentProfile?.()
  if (!result?.url) throw new Error('No secure setup URL returned.')
  onRedirect(result.url, result)
  return result
}

export default function PayoutSetupPage() {
  const navigate = useNavigate()
  const { currentUser, getUserSales, refreshCurrentProfile, showToast } = useApp()
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pendingSummary = useMemo(() => {
    if (!currentUser?.id || !getUserSales) return null
    return getSellerPendingPayoutSummary(getUserSales(currentUser.id), currentUser.id)
  }, [currentUser?.id, getUserSales])

  const waitingAmount = pendingSummary?.totalAmount || 0

  const handleContinue = async () => {
    if (!session?.access_token) {
      navigate('/auth', { state: { from: '/payout-setup' } })
      return
    }

    setLoading(true)
    setError('')
    try {
      await startPayoutSetup({
        accessToken: session.access_token,
        returnUrl: getReturnUrl(),
        refreshCurrentProfile,
        onRedirect: (url) => window.location.assign(url),
      })
    } catch (err) {
      console.error('[payout-setup] failed to start Stripe flow:', err)
      const message = err?.message || 'We could not open secure setup. Please try again.'
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
            <p className="text-sm font-black text-sib-text dark:text-[#f4efe7]">Most Sib sellers should choose:</p>
            <p className="mt-2 text-sm font-semibold text-sib-text dark:text-[#f4efe7]">• Individual / Sole proprietor</p>
            <p className="mt-3 text-xs font-semibold text-sib-muted dark:text-[#aeb8b4]">
              Setup usually takes around 2 minutes.
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

          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-[#362322] dark:text-red-300">
              {error}
            </p>
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

        <p className="mt-4 px-2 text-center text-[11px] leading-relaxed text-sib-muted dark:text-[#aeb8b4]">
          Stripe handles the secure bank connection. Sib never stores your banking details.
        </p>
      </main>
    </div>
  )
}
