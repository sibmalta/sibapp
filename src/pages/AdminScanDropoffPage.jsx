import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, Loader2, Package, ShieldCheck, XCircle } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { confirmPublicDropoffScan, getPublicDropoffScan, getPublicDropoffScanState } from '../lib/publicDropoffScan'

function formatDate(value) {
  if (!value) return 'Not confirmed yet'
  return new Date(value).toLocaleString('en-MT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-sib-sand px-3 py-2.5 text-sm dark:bg-[#26322f]">
      <span className="text-sib-muted dark:text-[#aeb8b4]">{label}</span>
      <span className="max-w-[60%] text-right font-semibold text-sib-text dark:text-[#f4efe7]">{value || '-'}</span>
    </div>
  )
}

function StatusNotice({ scanState, result }) {
  const message = result?.message || scanState?.message
  if (!message) return null

  const success = result?.type === 'success' || scanState?.confirmed
  const invalid = result?.type === 'error' || scanState?.invalid
  const classes = success
    ? 'border-green-100 bg-green-50 text-green-800 dark:border-green-500/20 dark:bg-[#20322b] dark:text-green-100'
    : invalid
      ? 'border-red-100 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-[#362322] dark:text-red-200'
      : 'border-blue-100 bg-blue-50 text-blue-800 dark:border-blue-500/20 dark:bg-[#21303a] dark:text-blue-100'

  return (
    <div className={`rounded-2xl border p-3 text-sm ${classes}`}>
      {message}
    </div>
  )
}

export default function AdminScanDropoffPage() {
  const [searchParams] = useSearchParams()
  const [scan, setScan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState(null)

  const scanPayload = useMemo(() => ({
    orderId: searchParams.get('orderId') || '',
    token: searchParams.get('token') || '',
    code: searchParams.get('code') || '',
  }), [searchParams])

  useEffect(() => {
    let cancelled = false

    async function loadScan() {
      setLoading(true)
      setResult(null)
      const { data, error } = await getPublicDropoffScan(scanPayload)
      if (cancelled) return

      if (error) {
        setScan({
          ok: false,
          valid: false,
          canConfirm: false,
          message: error.message || 'Could not load this scan.',
        })
      } else {
        setScan(data)
      }
      setLoading(false)
    }

    loadScan()
    return () => {
      cancelled = true
    }
  }, [scanPayload])

  const handleConfirm = async () => {
    if (!getPublicDropoffScanState(scan).canConfirm || confirming) return
    setConfirming(true)
    setResult(null)
    try {
      const { data, error } = await confirmPublicDropoffScan(scanPayload)
      if (error) {
        setResult({ type: 'error', message: error.message || 'Could not confirm parcel.' })
        return
      }

      setScan(data)
      const nextState = getPublicDropoffScanState(data)
      setResult({
        type: data?.confirmedNow ? 'success' : 'info',
        message: data?.confirmedNow ? 'Parcel confirmed.' : nextState.message,
      })
    } finally {
      setConfirming(false)
    }
  }

  const scanState = getPublicDropoffScanState(scan)
  const canConfirm = Boolean(scanState.canConfirm)
  const confirmed = Boolean(scanState.confirmed)

  return (
    <div className="pb-10">
      <PageHeader title="Scan drop-off" />

      <div className="px-4 py-5">
        <div className="rounded-3xl border border-sib-stone bg-white p-5 shadow-sm dark:border-[rgba(242,238,231,0.10)] dark:bg-[#202b28]">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-sib-primary text-white">
              <Package size={21} />
            </div>
            <div>
              <p className="text-lg font-black text-sib-text dark:text-[#f4efe7]">MYConvenience parcel scan</p>
              <p className="mt-1 text-sm text-sib-muted dark:text-[#aeb8b4]">Confirm the parcel only after receiving it from the seller.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-sib-muted dark:text-[#aeb8b4]">
              <Loader2 size={16} className="animate-spin" />
              Loading scan details...
            </div>
          ) : scanState.invalid ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700 dark:border-red-500/20 dark:bg-[#362322] dark:text-red-200">
              <div className="flex items-center gap-2 font-bold">
                <XCircle size={18} /> Invalid or expired QR code
              </div>
              <p className="mt-1 text-sm">{scanState.message}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <SummaryRow label="Order code" value={scan?.orderCode} />
              <SummaryRow label="Parcel" value={scan?.itemTitle || 'Seller parcel'} />
              <SummaryRow label="Status" value={scanState.statusLabel} />
              <SummaryRow label="Confirmed at" value={formatDate(scan?.confirmedAt)} />
              {scanState.deliveryTimingLabel && (
                <SummaryRow label="Delivery timing" value={scanState.deliveryTimingLabel} />
              )}

              <StatusNotice scanState={scanState} result={result} />

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-[#21303a] dark:text-blue-100">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={16} className="mt-0.5 flex-shrink-0" />
                  <p>Use this page only to confirm that the seller handed over this parcel.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canConfirm || confirming}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-sib-primary px-4 py-3 text-sm font-black text-white transition hover:bg-sib-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {confirming ? 'Confirming...' : confirmed ? 'Parcel already confirmed' : 'Confirm parcel received'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
