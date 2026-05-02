import React, { useState } from 'react'
import { AlertCircle, Banknote, Clock, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { startStripeConnect } from '../lib/stripe'
import { PENDING_PAYOUT_STATUSES } from '../lib/pendingPayouts'

function formatMoney(value = 0) {
  return `€${Number(value || 0).toFixed(2)}`
}

export default function PendingPayoutsWidget({ summary, className = '' }) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)

  if (!summary?.count) return null

  const handleSetupPayouts = async () => {
    if (!session?.access_token) {
      navigate('/seller/payout-settings')
      return
    }

    setLoading(true)
    try {
      const result = await startStripeConnect(session.access_token, window.location.href)
      if (result?.url) {
        window.location.assign(result.url)
        return
      }
      navigate('/seller/payout-settings')
    } catch (error) {
      console.error('[pending-payouts] failed to open payout setup:', error)
      navigate('/seller/payout-settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className={`rounded-2xl border p-4 transition-colors ${
        summary.hasBlockedSetup
          ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-[#332d20]'
          : 'border-sib-stone/70 bg-white dark:border-[rgba(242,238,231,0.10)] dark:bg-[#202b28]'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sib-secondary/10">
          {summary.hasBlockedSetup ? (
            <AlertCircle size={18} className="text-sib-secondary" />
          ) : (
            <Banknote size={18} className="text-sib-secondary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-sib-text dark:text-[#f4efe7]">
            You have {formatMoney(summary.totalAmount)} waiting.
          </p>
          <p className="mt-0.5 text-xs text-sib-muted dark:text-[#aeb8b4]">
            {summary.count} order{summary.count === 1 ? '' : 's'} pending payout.
          </p>
          {summary.hasBlockedSetup && (
            <p className="mt-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
              Complete payout setup to receive money from your sales.
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {PENDING_PAYOUT_STATUSES.map(status => {
          const row = summary.byStatus?.[status]
          if (!row?.count) return null
          return (
            <div
              key={status}
              className="flex items-center justify-between gap-3 rounded-xl border border-sib-stone/60 bg-white/70 px-3 py-2 dark:border-[rgba(242,238,231,0.10)] dark:bg-[#26322f]"
            >
              <span className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-sib-muted dark:text-[#aeb8b4]">
                <Clock size={12} className="flex-shrink-0 text-sib-primary" />
                <span className="truncate">{row.label}</span>
              </span>
              <span className="flex-shrink-0 text-xs font-bold text-sib-text dark:text-[#f4efe7]">
                {row.count}
              </span>
            </div>
          )
        })}
      </div>

      {summary.hasBlockedSetup && (
        <button
          type="button"
          onClick={handleSetupPayouts}
          disabled={loading}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-sib-secondary px-4 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          Complete payout setup
        </button>
      )}
    </section>
  )
}
