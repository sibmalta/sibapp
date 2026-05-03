import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, Package, ShieldCheck, XCircle } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import { getFulfilmentMethodLabel } from '../lib/fulfilment'
import { getOrderCode, orderCodeMatches, isDropoffConfirmed } from '../lib/dropoffQr'

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
      <span className="max-w-[60%] text-right font-semibold text-sib-text dark:text-[#f4efe7]">{value || '—'}</span>
    </div>
  )
}

export default function AdminScanDropoffPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const {
    currentUser,
    orders,
    shipments,
    ordersLoading,
    shipmentsLoading,
    refreshOrders,
    refreshShipments,
    refreshLogisticsDeliverySheet,
    getUserById,
    getListingById,
    getShipmentByOrderId,
    markShipmentDroppedOff,
  } = useApp()
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState(null)

  const orderId = searchParams.get('orderId') || ''
  const code = searchParams.get('code') || ''

  useEffect(() => {
    if (!currentUser) return
    refreshOrders?.()
    refreshShipments?.()
    refreshLogisticsDeliverySheet?.()
  }, [currentUser?.id, refreshOrders, refreshShipments, refreshLogisticsDeliverySheet])

  const order = useMemo(() => {
    return orders.find(candidate => candidate?.id === orderId || getOrderCode(candidate) === code) || null
  }, [orders, orderId, code])

  const shipment = order ? getShipmentByOrderId(order.id) : null
  const listing = order ? getListingById(order.listingId) : null
  const seller = order ? getUserById(order.sellerId) : null
  const buyer = order ? getUserById(order.buyerId) : null
  const expectedCode = order ? getOrderCode(order) : ''
  const codeValid = order ? orderCodeMatches(order, code) : false
  const alreadyConfirmed = isDropoffConfirmed({ order, shipment })
  const confirmedAt = order?.dropoffConfirmedAt || shipment?.dropoffConfirmedAt || shipment?.droppedOffAt

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth', { replace: true, state: { from: `/admin/scan-dropoff?${searchParams.toString()}` } })
    }
  }, [currentUser, navigate, searchParams])

  const handleConfirm = async () => {
    if (!order || !codeValid) return
    setConfirming(true)
    try {
      const response = await markShipmentDroppedOff(order.id, {}, {
        confirmedBy: currentUser?.id,
        notes: `QR drop-off scan confirmed for ${expectedCode}`,
      })
      if (response?.error) {
        setResult({ type: 'error', message: response.error.message || 'Could not confirm parcel.' })
      } else if (response?.alreadyConfirmed) {
        setResult({ type: 'info', message: 'Parcel already confirmed.' })
      } else {
        setResult({ type: 'success', message: 'Parcel received and confirmed.' })
      }
    } finally {
      setConfirming(false)
    }
  }

  if (!currentUser) return null

  if (!currentUser.isAdmin) {
    return (
      <div className="pb-10">
        <PageHeader title="Scan drop-off" />
        <div className="mx-4 rounded-3xl border border-red-100 bg-red-50 p-5 text-red-700 dark:border-red-500/20 dark:bg-[#362322] dark:text-red-200">
          <ShieldCheck className="mb-2" size={22} />
          <p className="font-bold">Admin access required</p>
          <p className="mt-1 text-sm">Only Sib admin or authorised store staff can confirm parcel drop-offs.</p>
        </div>
      </div>
    )
  }

  if (ordersLoading || shipmentsLoading) {
    return (
      <div className="pb-10">
        <PageHeader title="Scan drop-off" />
        <div className="py-20 text-center text-sm text-sib-muted dark:text-[#aeb8b4]">Loading scan details...</div>
      </div>
    )
  }

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
              <p className="mt-1 text-sm text-sib-muted dark:text-[#aeb8b4]">Validate the seller QR and confirm physical receipt.</p>
            </div>
          </div>

          {!order ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700 dark:border-red-500/20 dark:bg-[#362322] dark:text-red-200">
              <div className="flex items-center gap-2 font-bold">
                <XCircle size={18} /> Order not found
              </div>
              <p className="mt-1 text-sm">No order matched this scan URL. Ask the seller to open the latest QR from their order detail page.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <SummaryRow label="Order code" value={expectedCode} />
              <SummaryRow label="Scanned code" value={code || 'Missing'} />
              <SummaryRow label="Item" value={listing?.title || order.listingTitle || 'Sold item'} />
              <SummaryRow label="Seller" value={seller?.username || seller?.name || order.sellerName || order.sellerId?.slice(0, 8)} />
              <SummaryRow label="Buyer" value={buyer?.username || buyer?.name || order.buyerFullName || order.buyerId?.slice(0, 8)} />
              <SummaryRow label="Fulfilment method" value={getFulfilmentMethodLabel(order.fulfilmentMethod || shipment?.fulfilmentMethod)} />
              <SummaryRow label="Current status" value={alreadyConfirmed ? 'Drop-off confirmed' : (shipment?.status || order.fulfilmentStatus || order.trackingStatus || 'Pending')} />
              <SummaryRow label="Confirmed at" value={formatDate(confirmedAt)} />

              {!shipment && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-[#332d20] dark:text-amber-200">
                  This order does not have a shipment record yet, so it cannot be confirmed from QR scan.
                </div>
              )}

              {!codeValid && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-[#362322] dark:text-red-200">
                  Wrong order code. Expected {expectedCode}, but the QR URL provided {code || 'no code'}.
                </div>
              )}

              {alreadyConfirmed && (
                <div className="rounded-2xl border border-green-100 bg-green-50 p-3 text-sm text-green-800 dark:border-green-500/20 dark:bg-[#20322b] dark:text-green-100">
                  Parcel already confirmed{confirmedAt ? ` on ${formatDate(confirmedAt)}` : ''}.
                </div>
              )}

              {result && (
                <div className={`rounded-2xl border p-3 text-sm ${
                  result.type === 'success'
                    ? 'border-green-100 bg-green-50 text-green-800 dark:border-green-500/20 dark:bg-[#20322b] dark:text-green-100'
                    : result.type === 'info'
                      ? 'border-blue-100 bg-blue-50 text-blue-800 dark:border-blue-500/20 dark:bg-[#21303a] dark:text-blue-100'
                      : 'border-red-100 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-[#362322] dark:text-red-200'
                }`}>
                  {result.message}
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirm}
                disabled={!shipment || !codeValid || alreadyConfirmed || confirming}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-sib-primary px-4 py-3 text-sm font-black text-white transition hover:bg-sib-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle size={16} />
                {confirming ? 'Confirming...' : alreadyConfirmed ? 'Parcel already confirmed' : 'Confirm parcel received'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
