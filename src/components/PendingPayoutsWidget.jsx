import React from 'react'
import { AlertCircle, Banknote, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PENDING_PAYOUT_STATUSES } from '../lib/pendingPayouts'

function formatMoney(value = 0) {
  return `€${Number(value || 0).toFixed(2)}`
}

export default function PendingPayoutsWidget({ summary, className = '' }) {
  const navigate = useNavigate()

  if (!summary?.count) return null

  const handleConnectBank = () => {
    console.info('routing_to_payout_setup')
    navigate('/payout-setup')
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
              Connect your bank account to receive money from your sales.
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
          onClick={handleConnectBank}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-sib-secondary px-4 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          Connect bank account
        </button>
      )}
    </section>
  )
}
