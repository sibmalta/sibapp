import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle, Clock, Truck, Package, ShieldCheck,
  AlertTriangle, Timer, ThumbsUp, MessageCircle, ExternalLink, Send,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import UserAvatar from '../components/UserAvatar'
import FeeBreakdown from '../components/FeeBreakdown'
import PageHeader from '../components/PageHeader'
import ShipmentTracker, { ShipByDeadline } from '../components/ShipmentTracker'
import { getTrackingUrl, estimateDeliveryDate } from '../lib/maltapost'
import { getDeliveryMethod } from '../data/deliveryConfig'

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    orders, getListingById, getUserById, currentUser,
    confirmDelivery, openDispute, showToast, PROTECTION_WINDOW_MS,
    getShipmentByOrderId, markShipmentShipped, DISPUTE_REASONS,
  } = useApp()

  const BUYER_REASONS = ['not_received', 'not_as_described', 'wrong_item', 'damaged']

  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeType, setDisputeType] = useState('')
  const [countdown, setCountdown] = useState(null)
  const [showShipForm, setShowShipForm] = useState(false)
  const [trackingInput, setTrackingInput] = useState('')
  const [shipLoading, setShipLoading] = useState(false)

  const order = orders.find(o => o.id === id)
  const shipment = order ? getShipmentByOrderId(order.id) : null

  // Countdown timer for 48h protection window
  useEffect(() => {
    if (!order?.deliveredAt || order.trackingStatus !== 'delivered') {
      setCountdown(null)
      return
    }
    const calc = () => {
      const deadline = new Date(order.deliveredAt).getTime() + PROTECTION_WINDOW_MS
      return Math.max(0, deadline - Date.now())
    }
    setCountdown(calc())
    const interval = setInterval(() => {
      const remaining = calc()
      setCountdown(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [order?.deliveredAt, order?.trackingStatus, PROTECTION_WINDOW_MS])

  if (!order) return <div className="text-center py-20 text-sib-muted">Order not found.</div>

  const listing = getListingById(order.listingId)
  const seller = getUserById(order.sellerId)
  const buyer = getUserById(order.buyerId)
  const isBuyer = currentUser?.id === order.buyerId
  const isSeller = currentUser?.id === order.sellerId
  const other = isBuyer ? seller : buyer

  const isPaid = order.trackingStatus === 'paid' || order.trackingStatus === 'pending'
  const isDelivered = order.trackingStatus === 'delivered'
  const isConfirmed = order.trackingStatus === 'confirmed' || order.trackingStatus === 'completed'
  const isDisputed = order.trackingStatus === 'disputed' || order.trackingStatus === 'under_review'

  const trackingUrl = shipment?.trackingNumber ? getTrackingUrl(shipment.trackingNumber) : null
  const estDelivery = shipment?.shippedAt ? estimateDeliveryDate(shipment.shippedAt) : null

  const handleShip = async () => {
    if (!trackingInput.trim()) {
      showToast('Please enter a tracking number.', 'error')
      return
    }
    setShipLoading(true)
    try {
      markShipmentShipped(order.id, trackingInput.trim())
      showToast('Marked as shipped. Buyer will be notified.')
      setShowShipForm(false)
      setTrackingInput('')
    } catch (err) {
      showToast('Failed to mark as shipped.', 'error')
    }
    setShipLoading(false)
  }

  const handleConfirm = () => {
    confirmDelivery(order.id)
    showToast('Order confirmed — payment released to seller.')
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
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-sib-sand">
          <img src={listing?.images?.[0]} alt={listing?.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-sib-stone" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sib-text line-clamp-2">{listing?.title}</p>
            <p className="text-xs text-sib-muted mt-0.5">{order.orderRef || `#${order.id?.slice(-8)}`}</p>
            <p className="text-base font-bold text-sib-primary mt-1">€{order.totalPrice?.toFixed(2)}</p>
          </div>
        </div>

        {/* ── Buyer confirmation card (only for buyer, only when delivered) ── */}
        {isBuyer && isDelivered && (
          <div className="rounded-2xl border-2 border-sib-primary/30 bg-sib-primary/5 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={18} className="text-sib-primary" />
                <h2 className="text-sm font-bold text-sib-text">Confirm your order</h2>
              </div>
              <p className="text-xs text-sib-muted leading-relaxed mb-3">
                Your item has been delivered. Please check everything is as described before confirming.
              </p>

              {/* Trust message */}
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-green-50 border border-green-100 mb-3">
                <ShieldCheck size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-green-700 leading-relaxed">
                  Your payment is held securely. Confirming will release payment to the seller immediately.
                </p>
              </div>

              {/* Countdown */}
              {countdown !== null && countdown > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-100 mb-4">
                  <Timer size={14} className="text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-amber-700 font-medium">Protection window active</p>
                    <p className="text-sm font-bold text-amber-800 font-mono mt-0.5">
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
                <ThumbsUp size={16} /> Confirm item received
              </button>

              {/* Secondary CTA — Report issue */}
              <button
                onClick={() => setDisputeOpen(true)}
                className="w-full py-3 rounded-2xl border border-red-200 text-red-600 font-semibold text-sm flex items-center justify-center gap-2 active:bg-red-50"
              >
                <AlertTriangle size={14} /> Report an issue
              </button>

              {/* Helper text */}
              <p className="text-[11px] text-sib-muted text-center mt-3 leading-snug">
                Confirm early to release payment instantly, or report an issue within 48 hours.
              </p>
            </div>
          </div>
        )}

        {/* ── Dispute form ── */}
        {disputeOpen && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
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
                      : 'border-red-200 bg-white text-sib-text hover:border-red-300'
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
              className="w-full p-3 rounded-xl border border-red-200 text-sm text-sib-text placeholder:text-sib-muted/50 focus:outline-none focus:border-red-400 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setDisputeOpen(false); setDisputeReason(''); setDisputeType('') }}
                className="flex-1 py-2.5 rounded-xl border border-sib-stone text-sib-text text-sm font-semibold"
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
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-amber-600" />
              <h2 className="text-sm font-bold text-amber-800">Waiting for buyer confirmation (48h)</h2>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed mb-2">
              The buyer has 48 hours after delivery to confirm or report an issue. If no action is taken, the order is auto-confirmed and your payout is released to your bank on the next payout day (Tuesday or Friday).
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
          <div className="p-4 rounded-2xl bg-green-50 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-green-600" />
              <h2 className="text-sm font-bold text-green-800">
                {order.autoConfirmed ? 'Auto-confirmed' : 'Confirmed'}
                {isSeller ? ' — payout processing' : ''}
              </h2>
            </div>
            <p className="text-xs text-green-700 leading-relaxed">
              {isBuyer
                ? 'Thank you for confirming. The seller will receive their payment.'
                : `Delivery confirmed${order.autoConfirmed ? ' (48h window expired)' : ' by buyer'}. Your payout is available and will be sent on the next payout day.`
              }
            </p>
          </div>
        )}

        {/* ── Disputed state ── */}
        {isDisputed && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
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

        {/* ── Seller ship action (awaiting shipment) ── */}
        {isSeller && isPaid && shipment?.status === 'awaiting_shipment' && (
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Truck size={18} className="text-blue-600" />
                <h2 className="text-sm font-bold text-blue-800">Ship this item</h2>
              </div>
              <p className="text-xs text-blue-700 leading-relaxed mb-3">
                Pack the item and ship via MaltaPost. Enter the tracking number below once shipped.
              </p>
              {shipment.shipByDeadline && (
                <div className="mb-3">
                  <ShipByDeadline deadline={shipment.shipByDeadline} />
                </div>
              )}
              {!showShipForm ? (
                <button
                  onClick={() => setShowShipForm(true)}
                  className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:opacity-90"
                >
                  <Send size={15} /> Enter tracking number
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={e => setTrackingInput(e.target.value)}
                    placeholder="e.g. RR123456789MT"
                    className="w-full p-3 rounded-xl border border-blue-200 text-sm text-sib-text placeholder:text-sib-muted/50 focus:outline-none focus:border-blue-400 font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowShipForm(false); setTrackingInput('') }}
                      className="flex-1 py-2.5 rounded-xl border border-sib-stone text-sib-text text-sm font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleShip}
                      disabled={shipLoading}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50"
                    >
                      {shipLoading ? 'Processing...' : 'Confirm ready for collection'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Shipment Tracker ── */}
        {shipment && (
          <div>
            <p className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-4">Shipment Tracking</p>
            <ShipmentTracker shipment={shipment} />
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-sib-stone text-sib-primary text-sm font-semibold"
              >
                <ExternalLink size={14} /> Track on MaltaPost
              </a>
            )}
            {estDelivery && shipment.status !== 'delivered' && shipment.status !== 'failed_delivery' && shipment.status !== 'returned' && (
              <p className="text-xs text-sib-muted mt-2 text-center">
                Estimated delivery: {estDelivery.toLocaleDateString('en-MT', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>
        )}

        {/* Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-sib-sand cursor-pointer" onClick={() => navigate(`/profile/${other?.username}`)}>
            <UserAvatar user={other} size="sm" />
            <div>
              <p className="text-xs text-sib-muted">{isBuyer ? 'Seller' : 'Buyer'}</p>
              <p className="text-sm font-semibold text-sib-text">@{other?.username}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-sib-sand">
            <div className="w-8 h-8 rounded-full bg-sib-stone flex items-center justify-center flex-shrink-0">
              <Truck size={14} className="text-sib-muted" />
            </div>
            <div>
              <p className="text-xs text-sib-muted">
                {order.deliveryMethod === 'locker_collection' ? 'Locker Collection' : order.deliveryMethod === 'home_delivery' ? 'Home Delivery' : (getDeliveryMethod(order.deliveryMethod)?.name || 'Delivery')}
              </p>
              {order.deliveryMethod === 'locker_collection' && order.lockerLocationName ? (
                <>
                  <p className="text-sm font-medium text-sib-text">{order.lockerLocationName}</p>
                  {order.lockerAddress && <p className="text-xs text-sib-muted mt-0.5">{order.lockerAddress}</p>}
                </>
              ) : (
                <p className="text-sm font-medium text-sib-text">{order.address}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Delivery Details (snapshot) ────────────────────── */}
        {(order.buyerFullName || order.sellerName) && (
          <div className="p-4 rounded-2xl bg-white border border-sib-ash space-y-4">
            <p className="text-xs font-semibold text-sib-text uppercase tracking-wide">Delivery Details</p>

            {/* Buyer snapshot */}
            {order.buyerFullName && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-sib-muted uppercase tracking-wider">Deliver to</p>
                <div className="text-xs text-sib-text space-y-0.5">
                  <p className="font-medium">{order.buyerFullName}</p>
                  {order.buyerPhone && <p className="text-sib-muted">{order.buyerPhone}</p>}
                  {order.address && <p>{order.address}</p>}
                  {(order.buyerCity || order.buyerPostcode) && (
                    <p>{[order.buyerCity, order.buyerPostcode].filter(Boolean).join(', ')}</p>
                  )}
                  {order.deliveryNotes && (
                    <p className="text-sib-muted italic mt-1">Notes: {order.deliveryNotes}</p>
                  )}
                </div>
              </div>
            )}

            {/* Divider */}
            {order.buyerFullName && order.sellerName && <div className="border-t border-sib-ash" />}

            {/* Seller snapshot */}
            {order.sellerName && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-sib-muted uppercase tracking-wider">Pickup from</p>
                <div className="text-xs text-sib-text space-y-0.5">
                  <p className="font-medium">{order.sellerName}</p>
                  {order.sellerPhone && <p className="text-sib-muted">{order.sellerPhone}</p>}
                  {order.sellerAddress && <p>{order.sellerAddress}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cost breakdown */}
        <div className="p-4 rounded-2xl bg-sib-warm">
          <p className="text-sm font-bold text-sib-text mb-3">Payment</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-sib-muted">
              <span>Item</span><span>€{order.itemPrice?.toFixed(2)}</span>
            </div>
            <FeeBreakdown
              buyerProtectionFee={(order.bundledFee ?? (order.platformFee + order.deliveryFee)) - (order.deliveryFee ?? 4.50)}
            />
            <div className="flex justify-between text-sib-muted">
              <span>Delivery</span><span>€{(order.deliveryFee ?? 4.50).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-sib-text pt-2 border-t border-sib-stone">
              <span>Total paid</span><span className="text-sib-primary">€{order.totalPrice?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {isBuyer && other && (
            <button
              onClick={() => navigate(`/messages`)}
              className="w-full border border-sib-stone text-sib-text font-semibold py-3 rounded-2xl text-sm flex items-center justify-center gap-2"
            >
              <MessageCircle size={15} /> Message seller
            </button>
          )}
          <button
            onClick={() => navigate(`/listing/${listing?.id}`)}
            className="w-full border border-sib-stone text-sib-text font-semibold py-3 rounded-2xl text-sm"
          >
            View Listing
          </button>
        </div>
      </div>
    </div>
  )
}
