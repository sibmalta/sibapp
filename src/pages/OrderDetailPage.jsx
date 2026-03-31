import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle, Clock, Truck, Package, MapPin, ShieldCheck,
  AlertTriangle, Timer, ThumbsUp, MessageCircle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import UserAvatar from '../components/UserAvatar'
import FeeBreakdown from '../components/FeeBreakdown'
import PageHeader from '../components/PageHeader'

const STEPS = [
  { key: 'paid', label: 'Order placed', icon: Clock },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
]

function stepIndex(status) {
  if (status === 'paid' || status === 'pending') return 0
  if (status === 'shipped') return 1
  if (status === 'delivered') return 2
  if (status === 'confirmed' || status === 'completed') return 3
  if (status === 'disputed') return 2
  return 0
}

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
  } = useApp()

  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [countdown, setCountdown] = useState(null)

  const order = orders.find(o => o.id === id)

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

  const sIdx = stepIndex(order.trackingStatus)
  const isDelivered = order.trackingStatus === 'delivered'
  const isConfirmed = order.trackingStatus === 'confirmed' || order.trackingStatus === 'completed'
  const isDisputed = order.trackingStatus === 'disputed'

  const handleConfirm = () => {
    confirmDelivery(order.id)
    showToast('Order confirmed. Seller will be paid.')
  }

  const handleDispute = () => {
    if (!disputeReason.trim()) {
      showToast('Please describe the issue.', 'error')
      return
    }
    openDispute(order.id, disputeReason.trim())
    setDisputeOpen(false)
    setDisputeReason('')
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
                Your item has been delivered. Please confirm everything is OK.
              </p>

              {/* Trust message */}
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-green-50 border border-green-100 mb-3">
                <ShieldCheck size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-green-700 leading-relaxed">
                  Your payment is protected until you confirm your order
                </p>
              </div>

              {/* Countdown */}
              {countdown !== null && countdown > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-100 mb-4">
                  <Timer size={14} className="text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-amber-700 font-medium">You have 48 hours to report an issue</p>
                    <p className="text-sm font-bold text-amber-800 font-mono mt-0.5">
                      Auto-confirm in {formatCountdown(countdown)}
                    </p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <button
                onClick={handleConfirm}
                className="w-full py-3.5 rounded-2xl bg-sib-primary text-white font-bold text-sm flex items-center justify-center gap-2 active:opacity-90 mb-2"
              >
                <ThumbsUp size={16} /> Confirm item received
              </button>
              <button
                onClick={() => setDisputeOpen(true)}
                className="w-full py-3 rounded-2xl border border-red-200 text-red-600 font-semibold text-sm flex items-center justify-center gap-2 active:bg-red-50"
              >
                <AlertTriangle size={14} /> Report an issue
              </button>
            </div>
          </div>
        )}

        {/* ── Dispute form modal ── */}
        {disputeOpen && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-600" />
              <h3 className="text-sm font-bold text-red-800">Report an issue</h3>
            </div>
            <p className="text-xs text-red-600 mb-3">Describe what went wrong. We will review your case and get back to you.</p>
            <textarea
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              placeholder="e.g. Item not as described, wrong item received, damaged..."
              rows={3}
              className="w-full p-3 rounded-xl border border-red-200 text-sm text-sib-text placeholder:text-sib-muted/50 focus:outline-none focus:border-red-400 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setDisputeOpen(false); setDisputeReason('') }}
                className="flex-1 py-2.5 rounded-xl border border-sib-stone text-sib-text text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDispute}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold"
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
              The buyer has 48 hours to confirm the item or report an issue. If no action is taken, the order will be auto-confirmed and your payout released.
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

        {/* Tracking steps */}
        <div>
          <p className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-4">Tracking</p>
          <div className="flex items-center gap-0">
            {STEPS.map((step, i) => {
              const done = i <= sIdx
              const active = i === sIdx
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${done ? 'bg-sib-primary' : 'bg-sib-stone'}`}>
                      <step.icon size={16} className={done ? 'text-white' : 'text-sib-muted'} />
                    </div>
                    <p className={`text-[10px] font-medium mt-1.5 text-center max-w-[60px] ${active ? 'text-sib-primary' : done ? 'text-sib-text' : 'text-sib-muted'}`}>{step.label}</p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-5 rounded-full ${i < sIdx ? 'bg-sib-primary' : 'bg-sib-stone'}`} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

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
              {order.deliveryMethod === 'pickup' ? <MapPin size={14} className="text-sib-muted" /> : <Package size={14} className="text-sib-muted" />}
            </div>
            <div>
              <p className="text-xs text-sib-muted">{order.deliveryMethod === 'pickup' ? 'Self-collection' : 'Sib Tracked Delivery'}</p>
              <p className="text-sm font-medium text-sib-text">{order.address}</p>
            </div>
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="p-4 rounded-2xl bg-sib-warm">
          <p className="text-sm font-bold text-sib-text mb-3">Payment</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-sib-muted">
              <span>Item</span><span>€{order.itemPrice?.toFixed(2)}</span>
            </div>
            <FeeBreakdown
              bundledFee={order.bundledFee ?? (order.platformFee + order.deliveryFee)}
              deliveryFee={5.00}
              buyerProtectionFee={(order.bundledFee ?? (order.platformFee + order.deliveryFee)) - 5.00}
            />
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
