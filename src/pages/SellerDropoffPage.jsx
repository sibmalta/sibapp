import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle, MapPin, Package, QrCode, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import { buildDropoffScanUrl, getOrderCode, getQrCodeImageUrl, isDropoffConfirmed } from '../lib/dropoffQr'
import { getConfirmedSellerDropoffOrders, getPendingSellerDropoffOrders } from '../lib/sellerDropoffPrompt'
import { getParcelLabelDetails } from '../lib/parcelLabel'

function getBuyerDisplayName(order, buyer) {
  return order?.buyerFullName || order?.buyerName || buyer?.name || buyer?.username || 'Buyer'
}

function getListingTitle(order, listing) {
  return listing?.title || order?.listingTitle || order?.listing?.title || (order?.isBundle ? 'Bundle order' : 'Sold item')
}

function getDropoffLocation(order, shipment) {
  return order?.dropoffLocation || shipment?.dropoffLocation || shipment?.dropoffStoreName || order?.dropoffStoreName || ''
}

function getConfirmedTime(order, shipment) {
  return order?.dropoffConfirmedAt || shipment?.dropoffConfirmedAt || shipment?.droppedOffAt || ''
}

function formatConfirmedTime(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString('en-MT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return value
  }
}

export default function SellerDropoffPage() {
  const {
    currentUser,
    orders,
    shipments,
    getUserById,
    getListingById,
    refreshOrders,
    refreshShipments,
  } = useApp()
  const [activeTab, setActiveTab] = useState('pending')
  const [activeQrOrderId, setActiveQrOrderId] = useState(null)

  useEffect(() => {
    if (!currentUser?.id) return
    refreshOrders?.()
    refreshShipments?.()
  }, [currentUser?.id, refreshOrders, refreshShipments])

  const pendingOrders = useMemo(() => {
    return getPendingSellerDropoffOrders({
      orders,
      shipments,
      currentUserId: currentUser?.id,
    })
  }, [orders, shipments, currentUser?.id])

  const confirmedOrders = useMemo(() => {
    return getConfirmedSellerDropoffOrders({
      orders,
      shipments,
      currentUserId: currentUser?.id,
    })
  }, [orders, shipments, currentUser?.id])

  const activeQrOrder = pendingOrders.find(order => order.id === activeQrOrderId)

  useEffect(() => {
    if (!activeQrOrderId) return
    if (!activeQrOrder) setActiveQrOrderId(null)
  }, [activeQrOrderId, activeQrOrder])

  const buildParcel = (order) => {
    const shipment = shipments.find(item => item.orderId === order.id)
    const buyer = getUserById?.(order.buyerId)
    const listing = getListingById?.(order.listingId)
    return {
      order,
      shipment,
      buyerDisplayName: getBuyerDisplayName(order, buyer),
      itemTitle: getListingTitle(order, listing),
      orderCode: getOrderCode(order),
      labelDetails: getParcelLabelDetails(order, buyer, getOrderCode(order)),
      confirmed: isDropoffConfirmed({ order, shipment }),
      confirmedTime: getConfirmedTime(order, shipment),
      dropoffLocation: getDropoffLocation(order, shipment),
    }
  }

  const activeParcel = activeQrOrder ? buildParcel(activeQrOrder) : null

  return (
    <div className="min-h-screen bg-sib-bg pb-10 text-sib-text dark:bg-[#1f2926] dark:text-[#f4efe7]">
      <PageHeader title="Drop-off QRs" />

      <main className="px-4 py-5">
        <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-[#21303a]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <QrCode size={19} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black text-blue-950 dark:text-blue-50">Drop off your parcel at MYConvenience.</h1>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-blue-800 dark:text-blue-100">
                Your parcel will be confirmed once the store scans your QR code.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-sib-stone/70 p-1 dark:bg-[#202b28]" role="tablist" aria-label="Drop-off status">
          {[
            { id: 'pending', label: 'Pending', count: pendingOrders.length },
            { id: 'confirmed', label: 'Confirmed', count: confirmedOrders.length },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-3 py-2 text-sm font-black transition ${
                activeTab === tab.id
                  ? 'bg-white text-sib-text shadow-sm dark:bg-[#26322f] dark:text-[#f4efe7]'
                  : 'text-sib-muted dark:text-[#aeb8b4]'
              }`}
            >
              {tab.label} <span className="font-mono text-xs opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>

        {activeTab === 'pending' ? (
          pendingOrders.length === 0 ? (
            <EmptyState message="No parcels waiting for drop-off." />
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order) => {
                const parcel = buildParcel(order)
                return (
                  <ParcelCard
                    key={order.id}
                    parcel={parcel}
                    status="pending"
                    actionLabel="Show QR"
                    onAction={() => setActiveQrOrderId(order.id)}
                  />
                )
              })}
            </div>
          )
        ) : confirmedOrders.length === 0 ? (
          <EmptyState message="No confirmed drop-offs yet." />
        ) : (
          <div className="space-y-3">
            {confirmedOrders.map((order) => {
              const parcel = buildParcel(order)
              return <ParcelCard key={order.id} parcel={parcel} status="confirmed" />
            })}
          </div>
        )}
      </main>

      {activeParcel && (
        <QrModal parcel={activeParcel} onClose={() => setActiveQrOrderId(null)} />
      )}
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-sib-stone bg-white p-6 text-center shadow-sm dark:border-[rgba(242,238,231,0.10)] dark:bg-[#26322f]">
      <Package size={28} className="mx-auto text-sib-muted dark:text-[#aeb8b4]" />
      <p className="mt-3 text-sm font-bold text-sib-text dark:text-[#f4efe7]">{message}</p>
    </div>
  )
}

function ParcelCard({ parcel, status, actionLabel, onAction }) {
  const confirmed = status === 'confirmed'
  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm ${
        confirmed
          ? 'border-green-100 bg-green-50/80 dark:border-green-500/20 dark:bg-[#20322b]'
          : 'border-sib-stone bg-white dark:border-[rgba(242,238,231,0.10)] dark:bg-[#26322f]'
      }`}
      data-testid={confirmed ? 'confirmed-dropoff-card' : 'pending-dropoff-card'}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase text-sib-muted dark:text-[#aeb8b4]">Order code</p>
          <p className="break-all font-mono text-xl font-black text-sib-text dark:text-[#f4efe7]">{parcel.orderCode}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${
          confirmed
            ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-100'
            : 'bg-blue-50 text-blue-800 ring-1 ring-blue-100 dark:bg-[#21303a] dark:text-blue-100 dark:ring-blue-500/20'
        }`}>
          {confirmed ? <CheckCircle size={13} /> : <QrCode size={13} />}
          {confirmed ? 'Confirmed' : 'Pending'}
        </span>
      </div>

      <div className="mt-3 grid gap-1 text-sm">
        <p className="font-black text-sib-text dark:text-[#f4efe7]">{parcel.buyerDisplayName}</p>
        <p className="font-semibold text-sib-muted dark:text-[#aeb8b4]">{parcel.itemTitle}</p>
      </div>

      {confirmed && (
        <div className="mt-3 space-y-1 text-xs font-semibold text-green-800 dark:text-green-100">
          {parcel.confirmedTime && <p>Confirmed {formatConfirmedTime(parcel.confirmedTime)}</p>}
          {parcel.dropoffLocation && (
            <p className="flex items-start gap-1.5">
              <MapPin size={13} className="mt-0.5 shrink-0" />
              <span>{parcel.dropoffLocation}</span>
            </p>
          )}
        </div>
      )}

      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sib-primary px-4 py-3 text-sm font-black text-white transition hover:bg-sib-primary/90"
        >
          <QrCode size={16} /> {actionLabel}
        </button>
      )}
    </article>
  )
}

function QrModal({ parcel, onClose }) {
  const scanUrl = buildDropoffScanUrl(parcel.order, typeof window !== 'undefined' ? window.location.origin : 'https://sibmalta.com')
  const qrUrl = getQrCodeImageUrl(scanUrl, 340)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-3 py-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-[#26322f]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-sib-stone bg-white px-4 py-3 dark:border-[rgba(242,238,231,0.10)] dark:bg-[#26322f]">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase text-sib-muted dark:text-[#aeb8b4]">Show QR</p>
            <p className="break-all font-mono text-lg font-black text-sib-text dark:text-[#f4efe7]">{parcel.orderCode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sib-stone text-sib-text dark:bg-[#202b28] dark:text-[#f4efe7]"
            aria-label="Close QR"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <div className="mx-auto flex h-80 w-80 max-w-full items-center justify-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-blue-100">
            <img src={qrUrl} alt={`Drop-off QR for order ${parcel.orderCode}`} className="h-full w-full object-contain" />
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border-2 border-red-200 bg-white text-sib-text shadow-sm dark:border-red-500/30 dark:bg-[#202b28] dark:text-[#f4efe7]">
            <div className="flex items-start gap-2 bg-[#fff1f1] px-4 py-3 text-red-700 dark:bg-red-500/10 dark:text-red-200">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <p className="text-xs font-black leading-snug">Required for delivery — parcels without this may be delayed</p>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-black uppercase text-red-700 dark:bg-red-500/15 dark:text-red-200">Required</span>
                <p className="text-base font-black">REQUIRED: Write on parcel</p>
              </div>
              <div className="mt-4 divide-y divide-sib-stone/80 rounded-xl border border-sib-stone bg-white dark:divide-[rgba(242,238,231,0.10)] dark:border-[rgba(242,238,231,0.10)] dark:bg-[#26322f]">
                <div className="px-3 py-3">
                  <p className="text-[11px] font-black uppercase text-red-700 dark:text-red-200">ORDER ID</p>
                  <p className="mt-1 break-all font-mono text-2xl font-black leading-tight text-sib-text dark:text-[#f4efe7]">{parcel.labelDetails.orderId}</p>
                </div>
                <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:divide-x sm:divide-sib-stone/80 dark:sm:divide-[rgba(242,238,231,0.10)]">
                  <div className="px-3 py-3">
                    <p className="text-[11px] font-black uppercase text-red-700 dark:text-red-200">SURNAME</p>
                    <p className="mt-0.5 text-xl font-black leading-snug text-sib-text dark:text-[#f4efe7]">{parcel.labelDetails.surname}</p>
                  </div>
                  <div className="border-t border-sib-stone/80 px-3 py-3 dark:border-[rgba(242,238,231,0.10)] sm:border-t-0">
                    <p className="text-[11px] font-black uppercase text-red-700 dark:text-red-200">LOCALITY</p>
                    <p className="mt-0.5 text-xl font-black leading-snug text-sib-text dark:text-[#f4efe7]">{parcel.labelDetails.locality}</p>
                  </div>
                </div>
                <div className="px-3 py-3">
                  <p className="text-[11px] font-bold uppercase text-sib-muted dark:text-[#aeb8b4]">Item</p>
                  <p className="mt-0.5 text-xs font-semibold leading-relaxed text-sib-muted dark:text-[#aeb8b4]">{parcel.itemTitle}</p>
                </div>
              </div>
              <p className="mt-4 text-xs font-bold leading-relaxed text-sib-text dark:text-[#f4efe7]">
                Write these clearly on the outside of the parcel before handing it to MYConvenience.
              </p>
              <p className="mt-2 text-xs font-black leading-relaxed text-red-700 dark:text-red-200">
                Parcels without these details may be delayed or returned.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
