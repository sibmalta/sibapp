import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, Loader2, Package, ShieldCheck, XCircle } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {
  confirmPublicDropoffScan,
  getPublicDropoffScan,
  getPublicDropoffScanState,
  identifyPublicDropoffStoreByPin,
} from '../lib/publicDropoffScan'

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
    <div className="flex flex-col gap-1 rounded-2xl bg-sib-sand px-3 py-2.5 text-sm dark:bg-[#26322f] sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-sib-muted dark:text-[#aeb8b4]">{label}</span>
      <span className="break-words font-semibold text-sib-text dark:text-[#f4efe7] sm:max-w-[65%] sm:text-right">{value || '-'}</span>
    </div>
  )
}

function StatusNotice({ scanState, result }) {
  if (scanState?.confirmed) return null

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
  const [storePin, setStorePin] = useState('')
  const [verifiedStore, setVerifiedStore] = useState(null)
  const [verifyingPin, setVerifyingPin] = useState(false)
  const [pinError, setPinError] = useState('')
  const wrongPinMessage = 'Invalid store PIN. Please check the PIN and try again.'
  const verifyIssueMessage = 'We could not verify the store right now. Please try again.'

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
      const scanResult = await getPublicDropoffScan(scanPayload)
      if (cancelled) return

      if (scanResult.error) {
        setScan({
          ok: false,
          valid: false,
          canConfirm: false,
          message: scanResult.error.message || 'Could not load this scan.',
        })
      } else {
        setScan(scanResult.data)
      }
      setLoading(false)
    }

    loadScan()
    return () => {
      cancelled = true
    }
  }, [scanPayload])

  const handleVerifyPin = async () => {
    if (!storePin.trim() || verifyingPin || getPublicDropoffScanState(scan).confirmed) return
    setVerifyingPin(true)
    setPinError('')
    setVerifiedStore(null)
    try {
      const { data, error } = await identifyPublicDropoffStoreByPin({ storePin })
      if (error?.message === 'Invalid store PIN') {
        setPinError(wrongPinMessage)
        return
      }
      if (error) {
        setPinError(verifyIssueMessage)
        return
      }
      if (!data) {
        setPinError(wrongPinMessage)
        return
      }
      setVerifiedStore(data)
    } catch {
      setPinError(verifyIssueMessage)
    } finally {
      setVerifyingPin(false)
    }
  }

  const handleConfirm = async () => {
    if (!getPublicDropoffScanState(scan).canConfirm || confirming || !verifiedStore || !storePin.trim()) return
    setConfirming(true)
    setResult(null)
    try {
      const { data, error } = await confirmPublicDropoffScan({
        ...scanPayload,
        storePin,
      })
      if (error) {
        const message = error.message === 'Invalid store PIN' ? 'Invalid store PIN' : (error.message || 'Could not confirm parcel.')
        setPinError(message)
        setResult({ type: 'error', message })
        return
      }

      const confirmedScan = {
        ...data,
        confirmed: true,
        confirmedNow: data?.confirmedNow ?? true,
        storeId: data?.storeId || verifiedStore.id,
        storeName: data?.storeName || verifiedStore.name,
        dropoffStoreName: data?.dropoffStoreName || verifiedStore.name,
      }
      setScan(confirmedScan)
      const nextState = getPublicDropoffScanState(confirmedScan)
      setResult({
        type: data?.confirmedNow ? 'success' : 'info',
        message: data?.confirmedNow ? 'Parcel confirmed.' : nextState.message,
      })
    } finally {
      setConfirming(false)
    }
  }

  const scanState = getPublicDropoffScanState(scan)
  const canConfirm = Boolean(scanState.canConfirm && verifiedStore && storePin.trim())
  const confirmed = Boolean(scanState.confirmed)
  const storeName = scanState.storeName || scan?.storeName || scan?.dropoffStoreName || scan?.dropoffLocationName || scan?.dropoffLocation || ''
  const storeAddress = scanState.storeAddress || scan?.storeAddress || scan?.dropoffStoreAddress || ''
  const storeLocality = scanState.storeLocality || scan?.storeLocality || scan?.dropoffStoreLocality || ''
  const pageTitle = confirmed
    ? (scan?.confirmedNow ? 'Parcel confirmed' : 'Parcel already confirmed')
    : 'MYConvenience parcel scan'

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
              <p className="text-lg font-black text-sib-text dark:text-[#f4efe7]">{pageTitle}</p>
              <p className="mt-1 text-sm text-sib-muted dark:text-[#aeb8b4]">
                {confirmed
                  ? storeName
                    ? `This parcel has been received at ${storeName}.`
                    : 'This parcel has been received.'
                  : 'Confirm the parcel only after receiving it from the seller.'}
              </p>
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
              {confirmed && (
                <SummaryRow label="Confirmed at" value={formatDate(scanState.confirmedAt || scan?.confirmedAt)} />
              )}
              {confirmed && (
                <SummaryRow label="Store" value={storeName || 'Not provided'} />
              )}
              {confirmed && storeAddress && (
                <SummaryRow label="Store address" value={storeAddress} />
              )}
              {confirmed && storeLocality && (
                <SummaryRow label="Store locality" value={storeLocality} />
              )}
              {scanState.deliveryTimingLabel && (
                <SummaryRow label="Delivery timing" value={scanState.deliveryTimingLabel} />
              )}

              <StatusNotice scanState={scanState} result={result} />

              {!confirmed && (
                <div className="space-y-2 rounded-2xl border border-sib-stone bg-sib-sand p-3 dark:border-[rgba(242,238,231,0.10)] dark:bg-[#26322f]">
                  <label htmlFor="dropoff-store-pin" className="text-xs font-black uppercase tracking-wide text-sib-text dark:text-[#f4efe7]">
                    MYConvenience store PIN
                  </label>
                  <input
                    id="dropoff-store-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={storePin}
                    onChange={event => {
                      setStorePin(event.target.value)
                      setVerifiedStore(null)
                      setPinError("")
                    }}
                    onBlur={handleVerifyPin}
                    placeholder="Enter store PIN"
                    className="w-full rounded-xl border border-sib-stone bg-white px-3 py-2.5 text-sm font-semibold text-sib-text outline-none focus:border-sib-primary dark:border-[rgba(242,238,231,0.10)] dark:bg-[#202b28] dark:text-[#f4efe7]"
                  />
                  <p className="text-xs font-semibold text-sib-muted dark:text-[#aeb8b4]">Ask store staff to enter their store PIN.</p>
                  <button
                    type="button"
                    onClick={handleVerifyPin}
                    disabled={!storePin.trim() || verifyingPin}
                    className="w-full rounded-xl border border-sib-primary/20 bg-white px-3 py-2 text-xs font-black text-sib-primary transition disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#202b28]"
                  >
                    {verifyingPin ? 'Checking PIN...' : 'Verify store PIN'}
                  </button>
                  {pinError && (
                    <p className="text-xs font-semibold text-red-600 dark:text-red-300">{pinError}</p>
                  )}
                  {verifiedStore && (
                    <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-800 dark:border-green-500/20 dark:bg-[#20322b] dark:text-green-100">
                      <p className="font-black">{verifiedStore.name}</p>
                      <p className="mt-0.5 text-xs font-semibold">{verifiedStore.address}</p>
                      <p className="mt-0.5 text-xs font-semibold">{verifiedStore.locality}</p>
                    </div>
                  )}
                </div>
              )}

              {!confirmed && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-[#21303a] dark:text-blue-100">
                  <div className="flex items-start gap-2">
                    <ShieldCheck size={16} className="mt-0.5 flex-shrink-0" />
                    <p>Use this page only to confirm that the seller handed over this parcel.</p>
                  </div>
                </div>
              )}

              {!confirmed && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!canConfirm || confirming}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-sib-primary px-4 py-3 text-sm font-black text-white transition hover:bg-sib-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {confirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  {confirming ? 'Confirming...' : 'Confirm parcel received'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
