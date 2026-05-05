import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  CheckCircle, Clock, Truck, Package, ShieldCheck,
  AlertTriangle, Timer, ThumbsUp, MessageCircle, ExternalLink, QrCode,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import UserAvatar from '../components/UserAvatar'
import FeeBreakdown from '../components/FeeBreakdown'
import PageHeader from '../components/PageHeader'
import ShipmentTracker, { ShipByDeadline } from '../components/ShipmentTracker'
import { getTrackingUrl, estimateDeliveryDate } from '../lib/maltapost'
import { getDropoffPendingConfirmationCopy, getOrderFulfilmentMethodLabel, getOrderFulfilmentProviderLabel } from '../lib/fulfilment'
import { buildDropoffScanUrl, getOrderCode, getQrCodeImageUrl, isDropoffConfirmed } from '../lib/dropoffQr'
import { isOrderPaidForDropoff, shouldShowSellerDropoffQr } from '../lib/sellerDropoffPrompt'

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function normalizeOrderIdentifier(value) {
  return String(value || '').trim().toLowerCase()
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    orders, getListingById, getUserById, currentUser,
    confirmDelivery, openDispute, showToast, PROTECTION_WINDOW_MS,
    getShipmentByOrderId, DISPUTE_REASONS,
    refreshOrders, refreshShipments, ordersLoading, shipmentsLoading,
  } = useApp()

  const BUYER_REASONS = ['not_received', 'not_as_described', 'wrong_item', 'damaged']

  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeType, setDisputeType] = useState('')
  const [countdown, setCountdown] = useState(null)
  const loadedOrderRef = useRef(false)

  const routeOrderIdentifier = normalizeOrderIdentifier(id)

  useEffect(() => {
    if (loadedOrderRef.current) return
    loadedOrderRef.current = true
    refreshOrders()
    refreshShipments()
  }, [refreshOrders, refreshShipments])

  const order = orders.find((candidate) => (
    routeOrderIdentifier &&
    [
      candidate.id,
      candidate.orderRef,
      candidate.order_ref,
    ].some((value) => normalizeOrderIdentifier(value) === routeOrderIdentifier)
  ))
  const shipment = order ? getShipmentByOrderId(order.id) : null
  const showSellerDropoffQr = shouldShowSellerDropoffQr({ order, shipment, currentUserId: currentUser?.id })

  // Countdown timer for 48h protection window
  useEffect(() => {
    if (!order?.deliveredAt || order.trackingStatus !== 'delivered') {
      setCountdown(null)
      return
    }
    const calc = () => {
      const deadline = order.buyerConfirmationDeadline
        ? new Date(order.buyerConfirmationDeadline).getTime()
        : new Date(order.deliveredAt).getTime() + PROTECTION_WINDOW_MS
      return Math.max(0, deadline - Date.now())
    }
    setCountdown(calc())
    const interval = setInterval(() => {
      const remaining = calc()
      setCountdown(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [order?.deliveredAt, order?.buyerConfirmationDeadline, order?.trackingStatus, PROTECTION_WINDOW_MS])

  useEffect(() => {
    if (location.hash !== '#dropoff-qr' || !showSellerDropoffQr) return
    requestAnimationFrame(() => {
      document.getElementById('dropoff-qr')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [location.hash, showSellerDropoffQr])

  if (!order && (ordersLoading || shipmentsLoading)) {
    return (
      <div className="text-center py-20 text-sib-muted dark:text-[#aeb8b4]">
        Loading order...
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-20 text-sib-muted dark:text-[#aeb8b4]">
        {id ? `We couldn't find an order for reference ${id}.` : 'Order not found.'}
      </div>
    )
  }

  const listing = getListingById(order.listingId)
  const seller = getUserById(order.sellerId)
  const buyer = getUserById(order.buyerId)
  const isBuyer = currentUser?.id === order.buyerId
  const isSeller = currentUser?.id === order.sellerId
  const other = isBuyer ? seller : buyer

  const isPaid = isOrderPaidForDropoff(order)
  const isDelivered = order.trackingStatus === 'delivered'
  const isConfirmed = order.trackingStatus === 'confirmed' || order.trackingStatus === 'completed' || order.status === 'completed'
  const isDisputed = order.trackingStatus === 'disputed' || order.trackingStatus === 'under_review'
  const dropoffConfirmed = isDropoffConfirmed({ order, shipment })
  const fulfilmentMethod = order?.fulfilmentMethod || shipment?.fulfilmentMethod || order?.deliveryMethod || ''
  const fulfilmentProviderLabel = getOrderFulfilmentProviderLabel(order, shipment)
  const fulfilmentMethodLabel = getOrderFulfilmentMethodLabel(order, shipment)
  const pendingDropoffConfirmationCopy = getDropoffPendingConfirmationCopy({ order, shipment, fulfilmentMethod })
  const fulfilmentStatusLabel = (order.fulfilmentStatus || shipment?.fulfilmentStatus || shipment?.status || order.trackingStatus || order.status || 'pending').replace(/_/g, ' ')
  const fulfilmentPrice = order.fulfilmentPrice ?? shipment?.fulfilmentPrice ?? order.deliveryFee ?? 3.00
  const orderCode = getOrderCode(order)
  const buyerDisplayName = order.buyerFullName || buyer?.name || buyer?.username || 'Buyer'
  const dropoffScanUrl = buildDropoffScanUrl(order, typeof window !== 'undefined' ? window.location.origin : 'https://sibmalta.com')
  const dropoffQrUrl = getQrCodeImageUrl(dropoffScanUrl)

  const trackingUrl = shipment?.trackingNumber ? getTrackingUrl(shipment.trackingNumber) : null
  const estDelivery = shipment?.shippedAt ? estimateDeliveryDate(shipment.shippedAt) : null

  const handleConfirm = async () => {
    const ok = await confirmDelivery(order.id)
    if (ok) showToast('Order confirmed - seller payment is now available.')
  }

  const handleDispute = () => {
    if (!disputeType) {
      showToast('Please select a reason.', 'error')
      return
    }
    openDispute(order.id, disputeReason.trim(), { type: disputeType, source: 'buyer' })
    setDisputeOpen(false)
    setDisputeReason('')
    setDisputeType('')
    showToast('Issue reported. We will review your case.')
  }

  return (
    <div className="pb-10">
      <PageHeader title="Order Details" />

      <div className="px-4 py-5 space-y-5">
        {/* Item summary */}
        <div className="flex items-center gap-3 p-4 rounded-2xl sib-elevated border transition-colors">
          <img src={listing?.images?.[0] || order.listingImage || ''} alt={listing?.title || order.listingTitle || 'Order item'} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-sib-stone" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sib-text dark:text-[#f4efe7] line-clamp-2">{listing?.title || order.listingTitle || 'Sold item'}</p>
            <p className="text-xs text-sib-muted dark:text-[#aeb8b4] mt-0.5">{order.orderRef ? `Order #${order.orderRef}` : `Order #${order.id?.slice(-8)}`}</p>
            <p className="text-base font-bold text-sib-primary mt-1">€{order.totalPrice?.toFixed(2)}</p>
          </div>
        </div>

        {/* Buyer paid state */}
        {isBuyer && isPaid && !isDelivered && !isConfirmed && !isDisputed && (
          <div className="p-4 rounded-2xl bg-green-50 dark:bg-[#26322f] border border-green-200 dark:border-[rgba(242,238,231,0.10)] transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={18} className="text-green-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-green-800 dark:text-green-300">Payment received</h2>
                <p className="text-xs text-green-700 dark:text-[#aeb8b4] leading-relaxed mt-1">
                  Your payment has been captured and is held securely until delivery is confirmed.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="rounded-xl bg-white/70 dark:bg-[#26322f]/80 border border-green-100 dark:border-green-500/20 px-2 py-2 transition-colors">
                <CheckCircle size={13} className="text-green-600 mb-1" />
                <p className="text-[11px] font-semibold text-green-800 dark:text-green-300 leading-tight">Payment received</p>
              </div>
              <div className="rounded-xl bg-white/70 dark:bg-[#26322f]/80 border border-green-100 dark:border-green-500/20 px-2 py-2 transition-colors">
                <Package size={13} className="text-green-600 mb-1" />
                <p className="text-[11px] font-semibold text-green-800 dark:text-green-300 leading-tight">Seller preparing</p>
              </div>
              <div className="rounded-xl bg-white/70 dark:bg-[#26322f]/80 border border-green-100 dark:border-green-500/20 px-2 py-2 transition-colors">
                <Truck size={13} className="text-green-600 mb-1" />
                <p className="text-[11px] font-semibold text-green-800 dark:text-green-300 leading-tight">Updates next</p>
              </div>
            </div>
          </div>
        )}

        {isBuyer && dropoffConfirmed && !isDelivered && !isConfirmed && !isDisputed && (
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-[#21303a] border border-blue-100 dark:border-blue-500/20 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Package size={18} className="text-blue-600 dark:text-blue-300" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-blue-800 dark:text-blue-100">Seller drop-off confirmed</h2>
                <p className="text-xs text-blue-700 dark:text-blue-100/80 leading-relaxed mt-1">
                  The seller has dropped off your item. Your order is being prepared for delivery.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Buyer confirmation card (only for buyer, only when delivered) ── */}
        {isBuyer && isDelivered && (
          <div className="rounded-2xl border-2 border-sib-primary/30 bg-sib-primary/5 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={18} className="text-sib-primary" />
              <h2 className="text-sm font-bold text-sib-text dark:text-[#f4efe7]">Confirm your order</h2>
              </div>
              <p className="text-xs text-sib-muted dark:text-[#aeb8b4] leading-relaxed mb-3">
                Your item has been delivered. Please check everything is as described before confirming.
              </p>

              {/* Trust message */}
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-green-50 dark:bg-[#26322f] border border-green-100 dark:border-[rgba(242,238,231,0.10)] mb-3">
                <ShieldCheck size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-green-700 dark:text-[#aeb8b4] leading-relaxed">
                  Your payment is held securely. Confirming will release payment to the seller immediately.
                </p>
              </div>

              {/* Countdown */}
              {countdown !== null && countdown > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-[#26322f] border border-amber-100 dark:border-[rgba(242,238,231,0.10)] mb-4">
                  <Timer size={14} className="text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">Protection window active</p>
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200 font-mono mt-0.5">
                      Auto-confirm in {formatCountdown(countdown)}
                    </p>
                  </div>
                </div>
              )}

              {/* Primary CTA — Confirm delivery */}
              <button
                onClick={handleConfirm}
                className="w-full py-3.5 rounded-2xl bg-sib-primary text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-sm mb-2"
              >
                <ThumbsUp size={16} /> Everything is OK
              </button>

              {/* Secondary CTA — Report issue */}
              <button
                onClick={() => setDisputeOpen(true)}
                className="w-full py-3 rounded-2xl border border-red-200 text-red-600 font-semibold text-sm flex items-center justify-center gap-2 active:bg-red-50"
              >
                <AlertTriangle size={14} /> I have an issue
              </button>

              {/* Helper text */}
              <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] text-center mt-3 leading-snug">
                Confirm early to release payment instantly, or report an issue within 48 hours.
              </p>
            </div>
          </div>
        )}

        {/* ── Dispute form ── */}
        {disputeOpen && (
          <div className="rounded-2xl border border-red-200 dark:border-[rgba(242,238,231,0.10)] bg-red-50 dark:bg-[#26322f] p-4 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-600" />
              <h3 className="text-sm font-bold text-red-800">Report an issue</h3>
            </div>
            <p className="text-xs text-red-600 mb-3">Select what went wrong. We will review your case and get back to you.</p>

            <div className="space-y-2 mb-3">
              {BUYER_REASONS.map(key => (
                <button
                  key={key}
                  onClick={() => setDisputeType(key)}
                  className={`w-full text-left p-3 rounded-xl border text-sm transition-colors ${
                    disputeType === key
                      ? 'border-red-400 bg-red-100 text-red-800 font-semibold'
                      : 'border-red-200 dark:border-red-500/20 bg-white dark:bg-[#26322f] text-sib-text dark:text-[#f4efe7] hover:border-red-300 dark:hover:border-red-500/40'
                  }`}
                >
                  {DISPUTE_REASONS?.[key] || key}
                </button>
              ))}
            </div>

            <textarea
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              placeholder="Additional details (optional)..."
              rows={2}
              className="w-full p-3 rounded-xl border border-red-200 dark:border-red-500/20 bg-white dark:bg-[#26322f] text-sm text-sib-text dark:text-[#f4efe7] placeholder:text-sib-muted/50 dark:placeholder:text-[#aeb8b4] focus:outline-none focus:border-red-400 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setDisputeOpen(false); setDisputeReason(''); setDisputeType('') }}
                className="flex-1 py-2.5 rounded-xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] text-sib-text dark:text-[#f4efe7] text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDispute}
                disabled={!disputeType}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-40"
              >
                Submit report
              </button>
            </div>
          </div>
        )}

        {/* ── Seller waiting state ── */}
        {isSeller && isDelivered && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-[#26322f] border border-amber-200 dark:border-[rgba(242,238,231,0.10)] transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-amber-600" />
              <h2 className="text-sm font-bold text-amber-800">Payment pending buyer confirmation</h2>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed mb-2">
              The buyer has 48 hours after delivery to confirm or report an issue. If no action is taken, the order is auto-completed and your payment becomes available.
            </p>
            {countdown !== null && countdown > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <Timer size={12} className="text-amber-600" />
                <p className="text-xs font-bold text-amber-800 font-mono">
                  Auto-confirm in {formatCountdown(countdown)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Confirmed state ── */}
        {isConfirmed && (
          <div className="p-4 rounded-2xl bg-green-50 dark:bg-[#26322f] border border-green-200 dark:border-[rgba(242,238,231,0.10)] transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-green-600" />
              <h2 className="text-sm font-bold text-green-800">
                {order.autoConfirmed ? 'Auto-confirmed' : 'Confirmed'}
                {isSeller ? ' — payout processing' : ''}
              </h2>
            </div>
            <p className="text-xs text-green-700 leading-relaxed">
              {isBuyer
                ? 'Thank you for confirming. The seller payout is now available.'
                : `Delivery confirmed${order.autoConfirmed ? ' (48h window expired)' : ' by buyer'}. Payment available.`
              }
            </p>
          </div>
        )}

        {/* ── Disputed state ── */}
        {isDisputed && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-[#26322f] border border-red-200 dark:border-[rgba(242,238,231,0.10)] transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className="text-red-600" />
              <h2 className="text-sm font-bold text-red-800">Issue reported</h2>
            </div>
            <p className="text-xs text-red-700 leading-relaxed">
              {isBuyer
                ? 'We are reviewing your report. Your payment is protected.'
                : 'The buyer has reported an issue. Your payout is on hold until this is resolved.'
              }
            </p>
          </div>
        )}

        {/* ── Seller drop-off QR ── */}
        {showSellerDropoffQr && (
          <div id="dropoff-qr" className="scroll-mt-24 rounded-2xl border-2 border-blue-200 dark:border-[rgba(242,238,231,0.10)] bg-blue-50 dark:bg-[#26322f] overflow-hidden transition-colors">
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <QrCode size={18} className="text-blue-600" />
                <h2 className="text-base font-black text-blue-900 dark:text-blue-100">Drop-off QR</h2>
              </div>
              <p className="mb-4 text-sm font-semibold text-blue-800 dark:text-blue-100">
                Drop off your parcel at MYConvenience.
              </p>
              <p className="mb-4 text-sm font-semibold text-blue-800 dark:text-blue-100">
                Show this QR code at MYConvenience.
              </p>
              <div className="mb-3 grid gap-2 text-xs font-semibold text-blue-800 dark:text-blue-100 sm:grid-cols-2">
                <p className="rounded-xl bg-white/70 px-3 py-2 dark:bg-[#26322f]/80">Drop off before 12:00pm for same-day delivery.</p>
                <p className="rounded-xl bg-white/70 px-3 py-2 dark:bg-[#26322f]/80">Drop-offs after 12:00pm are delivered the next working day.</p>
              </div>
              <p className="mb-3 text-xs font-semibold text-blue-800 dark:text-blue-100">
                Write the order number and buyer name clearly on the outside of the parcel.
              </p>
              <div className="mb-3 rounded-2xl border border-blue-100 bg-white/85 p-4 dark:border-blue-500/20 dark:bg-[#202b28]">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-64 w-64 max-w-full shrink-0 items-center justify-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-blue-100 dark:ring-blue-500/20">
                    <img src={dropoffQrUrl} alt={`Drop-off QR for order ${orderCode}`} className="h-full w-full object-contain" />
                  </div>
                  <div className="w-full min-w-0 flex-1 text-center sm:text-left">
                    <div className="rounded-2xl bg-blue-100 px-4 py-3 dark:bg-blue-500/20">
                      <p className="text-sm font-black text-blue-950 dark:text-blue-50">
                        Write on parcel
                      </p>
                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="text-[11px] font-bold uppercase text-blue-700 dark:text-blue-100/80">Order number</p>
                          <p className="mt-0.5 break-all font-mono text-2xl font-black text-blue-950 dark:text-blue-50 sm:text-3xl">{orderCode}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase text-blue-700 dark:text-blue-100/80">Buyer</p>
                          <p className="mt-0.5 text-xl font-black text-blue-950 dark:text-blue-50">{buyerDisplayName}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs font-semibold leading-relaxed text-blue-800 dark:text-blue-100">
                        Write both clearly on the outside of the package before handing it to MYConvenience.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {!dropoffConfirmed && (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-white/70 p-2.5 transition-colors dark:border-blue-500/20 dark:bg-[#26322f]/80">
                  <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-blue-600" />
                  <p className="text-[11px] leading-relaxed text-blue-700 dark:text-[#aeb8b4]">
                    Drop off your parcel at MYConvenience. Your parcel will be confirmed once the store scans your QR code.
                  </p>
                </div>
              )}
              {shipment?.shipByDeadline && (
                <div className="mb-3">
                  <ShipByDeadline deadline={shipment.shipByDeadline} />
                </div>
              )}
              {dropoffConfirmed ? (
                <div className="mb-3 rounded-2xl border border-green-100 bg-green-50/80 p-3 text-green-800 dark:border-green-500/20 dark:bg-[#20322b] dark:text-green-100">
                  <p className="text-xs font-bold">Parcel confirmed.</p>
                  <div className="mt-1.5 space-y-1 text-xs leading-snug">
                    <p>We&apos;ll handle delivery from here.</p>
                    {(order.dropoffConfirmedAt || shipment?.dropoffConfirmedAt || shipment?.droppedOffAt) && (
                      <p className="text-[11px] opacity-80">
                        Confirmed {new Date(order.dropoffConfirmedAt || shipment?.dropoffConfirmedAt || shipment?.droppedOffAt).toLocaleString('en-MT')}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ── Shipment Tracker ── */}
        {shipment && (
          <div>
            <p className="text-xs font-semibold text-sib-text dark:text-[#f4efe7] uppercase tracking-wide mb-4">Fulfilment</p>
            <ShipmentTracker shipment={shipment} />
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] text-sib-primary text-sm font-semibold"
              >
                <ExternalLink size={14} /> Track delivery
              </a>
            )}
            {estDelivery && shipment.status !== 'delivered' && shipment.status !== 'failed_delivery' && shipment.status !== 'returned' && (
              <p className="text-xs text-sib-muted dark:text-[#aeb8b4] mt-2 text-center">
                Estimated delivery: {estDelivery.toLocaleDateString('en-MT', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>
        )}

        {/* Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-2xl sib-elevated border cursor-pointer transition-colors" onClick={() => navigate(`/profile/${other?.username}`)}>
            <UserAvatar user={other} size="sm" />
            <div>
              <p className="text-xs text-sib-muted dark:text-[#aeb8b4]">{isBuyer ? 'Seller' : 'Buyer'}</p>
              <p className="text-sm font-semibold text-sib-text dark:text-[#f4efe7]">@{other?.username}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl sib-elevated border transition-colors">
            <div className="w-8 h-8 rounded-full bg-sib-stone dark:bg-[#30403c] flex items-center justify-center flex-shrink-0">
              <Truck size={14} className="text-sib-muted dark:text-[#aeb8b4]" />
            </div>
            <div className="space-y-1">
              <div>
                <p className="text-xs text-sib-muted dark:text-[#aeb8b4]">Fulfilment provider</p>
                <p className="text-sm font-medium text-sib-text dark:text-[#f4efe7]">
                  {fulfilmentProviderLabel}
                </p>
              </div>
              <div>
                <p className="text-xs text-sib-muted dark:text-[#aeb8b4]">Fulfilment method</p>
                <p className="text-sm font-medium text-sib-text dark:text-[#f4efe7]">
                  {fulfilmentMethodLabel}
                </p>
              </div>
              <div>
                <p className="text-xs text-sib-muted dark:text-[#aeb8b4]">Fulfilment price</p>
                <p className="text-sm font-medium text-sib-text dark:text-[#f4efe7]">
                  €{fulfilmentPrice.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-sib-muted dark:text-[#aeb8b4]">Current fulfilment status</p>
                <p className="text-sm font-medium text-sib-text dark:text-[#f4efe7] capitalize">
                  {fulfilmentStatusLabel}
                </p>
              </div>
              {!showSellerDropoffQr && (
                <p className="text-xs text-sib-muted dark:text-[#aeb8b4] leading-relaxed">
                  Seller next step: {pendingDropoffConfirmationCopy}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="p-4 rounded-2xl sib-elevated border transition-colors">
          <p className="text-sm font-bold text-sib-text dark:text-[#f4efe7] mb-3">Payment</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-sib-muted dark:text-[#aeb8b4]">
              <span>Item</span><span>€{order.itemPrice?.toFixed(2)}</span>
            </div>
            <FeeBreakdown
              buyerProtectionFee={(order.bundledFee ?? (order.platformFee + fulfilmentPrice)) - fulfilmentPrice}
            />
            <div className="flex justify-between text-sib-muted dark:text-[#aeb8b4]">
              <span>Fulfilment</span><span>€{fulfilmentPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-sib-text dark:text-[#f4efe7] pt-2 border-t border-sib-stone dark:border-[rgba(242,238,231,0.10)]">
              <span>Total paid</span><span className="text-sib-primary">€{order.totalPrice?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {isBuyer && other && (
            <button
              onClick={() => navigate(`/messages`)}
              className="w-full border border-sib-stone dark:border-[rgba(242,238,231,0.10)] text-sib-text dark:text-[#f4efe7] font-semibold py-3 rounded-2xl text-sm flex items-center justify-center gap-2"
            >
              <MessageCircle size={15} /> Message seller
            </button>
          )}
          <button
            onClick={() => navigate(`/listing/${listing?.id}`)}
            className="w-full border border-sib-stone dark:border-[rgba(242,238,231,0.10)] text-sib-text dark:text-[#f4efe7] font-semibold py-3 rounded-2xl text-sm"
          >
            View Listing
          </button>
        </div>
      </div>
    </div>
  )
}
