import React, { useEffect, useMemo } from 'react'
import { CheckCircle, MapPin, Package, QrCode } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import { buildDropoffScanUrl, getOrderCode, getQrCodeImageUrl, isDropoffConfirmed } from '../lib/dropoffQr'
import { getPendingSellerDropoffOrders } from '../lib/sellerDropoffPrompt'

function getBuyerDisplayName(order, buyer) {
  return order?.buyerFullName || order?.buyerName || buyer?.name || buyer?.username || 'Buyer'
}

function getListingTitle(order, listing) {
  return listing?.title || order?.listingTitle || order?.listing?.title || (order?.isBundle ? 'Bundle order' : 'Sold item')
}

function getDropoffLocation(order, shipment) {
  return order?.dropoffLocation || shipment?.dropoffLocation || shipment?.dropoffStoreName || order?.dropoffStoreName || ''
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

  useEffect(() => {
    if (!currentUser?.id) return
    refreshOrders?.()
    refreshShipments?.()
  }, [currentUser?.id, refreshOrders, refreshShipments])

  const dropoffOrders = useMemo(() => {
    return getPendingSellerDropoffOrders({
      orders,
      shipments,
      currentUserId: currentUser?.id,
    })
  }, [orders, shipments, currentUser?.id])

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
              <h1 className="text-base font-black text-blue-950 dark:text-blue-50">Show each QR at MYConvenience</h1>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-blue-800 dark:text-blue-100">
                Each parcel has its own QR. Staff should scan them one by one.
              </p>
            </div>
          </div>
        </div>

        {dropoffOrders.length === 0 ? (
          <div className="rounded-2xl border border-sib-stone bg-white p-6 text-center shadow-sm dark:border-[rgba(242,238,231,0.10)] dark:bg-[#26322f]">
            <Package size={28} className="mx-auto text-sib-muted dark:text-[#aeb8b4]" />
            <p className="mt-3 text-sm font-bold text-sib-text dark:text-[#f4efe7]">No parcels ready for drop-off.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dropoffOrders.map((order) => {
              const shipment = shipments.find(item => item.orderId === order.id)
              const buyer = getUserById?.(order.buyerId)
              const listing = getListingById?.(order.listingId)
              const orderCode = getOrderCode(order)
              const buyerDisplayName = getBuyerDisplayName(order, buyer)
              const itemTitle = getListingTitle(order, listing)
              const confirmed = isDropoffConfirmed({ order, shipment })
              const dropoffLocation = getDropoffLocation(order, shipment)
              const scanUrl = buildDropoffScanUrl(order, typeof window !== 'undefined' ? window.location.origin : 'https://sibmalta.com')
              const qrUrl = getQrCodeImageUrl(scanUrl, 320)

              return (
                <article
                  key={order.id}
                  className="overflow-hidden rounded-2xl border-2 border-blue-100 bg-white shadow-sm dark:border-blue-500/20 dark:bg-[#26322f]"
                  data-testid="seller-dropoff-qr-card"
                >
                  <div className="border-b border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-[#21303a]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase text-blue-700 dark:text-blue-100/80">Order code</p>
                        <p className="break-all font-mono text-2xl font-black text-blue-950 dark:text-blue-50">{orderCode}</p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${
                        confirmed
                          ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-100'
                          : 'bg-white text-blue-800 ring-1 ring-blue-100 dark:bg-[#26322f] dark:text-blue-100 dark:ring-blue-500/20'
                      }`}>
                        {confirmed ? <CheckCircle size={13} /> : <QrCode size={13} />}
                        {confirmed ? 'Confirmed' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                      <div className="flex h-72 w-72 max-w-full shrink-0 items-center justify-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-blue-100 dark:ring-blue-500/20">
                        <img src={qrUrl} alt={`Drop-off QR for order ${orderCode}`} className="h-full w-full object-contain" />
                      </div>

                      <div className="w-full min-w-0 space-y-3 text-center sm:text-left">
                        <div>
                          <p className="text-xs font-bold uppercase text-sib-muted dark:text-[#aeb8b4]">Buyer</p>
                          <p className="text-xl font-black text-sib-text dark:text-[#f4efe7]">{buyerDisplayName}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase text-sib-muted dark:text-[#aeb8b4]">Item</p>
                          <p className="text-sm font-semibold text-sib-text dark:text-[#f4efe7]">{itemTitle}</p>
                        </div>
                        <div className="rounded-2xl bg-blue-50 p-3 text-blue-900 dark:bg-[#21303a] dark:text-blue-100">
                          <p className="text-sm font-black">Write on parcel</p>
                          <p className="mt-1 text-xs font-semibold leading-relaxed">
                            Order number: <span className="font-mono text-sm font-black">{orderCode}</span>
                          </p>
                          <p className="text-xs font-semibold leading-relaxed">
                            Buyer: <span className="font-black">{buyerDisplayName}</span>
                          </p>
                        </div>
                        {dropoffLocation && (
                          <div className="flex items-start justify-center gap-2 rounded-2xl bg-sib-stone/60 p-3 text-xs font-semibold text-sib-muted dark:bg-[#202b28] dark:text-[#aeb8b4] sm:justify-start">
                            <MapPin size={14} className="mt-0.5 shrink-0" />
                            <span>{dropoffLocation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
