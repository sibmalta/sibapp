import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, Package, Clock, CheckCircle, AlertCircle,
  ChevronRight, ShieldCheck, Banknote, Calendar, Truck, Send,
  ChevronDown, ChevronUp, ArrowUpRight, TrendingUp,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ShipmentStatusBadge } from '../components/ShipmentTracker'

const PAYOUT_STATUS_MAP = {
  held: { label: 'Pending', desc: 'Held until buyer confirms (48h window)', color: 'bg-amber-50 text-amber-700 dark:bg-[#332d20] dark:text-amber-300', dot: 'bg-amber-400', icon: Clock },
  releasable: { label: 'Payment available', desc: 'Ready for Sib payout processing', color: 'bg-emerald-50 text-emerald-700 dark:bg-[#20322b] dark:text-emerald-300', dot: 'bg-emerald-400', icon: CheckCircle },
  available: { label: 'Available', desc: 'Ready for next payout', color: 'bg-emerald-50 text-emerald-700 dark:bg-[#20322b] dark:text-emerald-300', dot: 'bg-emerald-400', icon: CheckCircle },
  released: { label: 'Paid out', desc: 'Sent to your bank', color: 'bg-sky-50 text-sky-700 dark:bg-[#21303a] dark:text-sky-300', dot: 'bg-sky-400', icon: Banknote },
  disputed: { label: 'Issue reported', desc: 'Funds held while the issue is reviewed', color: 'bg-red-50 text-red-600 dark:bg-[#362322] dark:text-red-300', dot: 'bg-red-400', icon: AlertCircle },
  blocked_seller_setup: { label: 'Payout setup needed', desc: 'Complete payout setup to receive these funds', color: 'bg-amber-50 text-amber-800 dark:bg-[#332d20] dark:text-amber-200', dot: 'bg-amber-500', icon: AlertCircle },
  transfer_failed: { label: 'Payout needs review', desc: 'Sib will retry or review this payout', color: 'bg-red-50 text-red-600 dark:bg-[#362322] dark:text-red-300', dot: 'bg-red-400', icon: AlertCircle },
  refunded: { label: 'Refunded', desc: 'Returned to buyer', color: 'bg-red-50 text-red-500 dark:bg-[#362322] dark:text-red-300', dot: 'bg-red-400', icon: AlertCircle },
}

// Payout days: Tuesday (2) and Friday (5)
const PAYOUT_DAYS = [2, 5]
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getNextPayoutDay() {
  const now = new Date()
  const today = now.getDay()
  const currentHour = now.getHours()

  for (const day of PAYOUT_DAYS) {
    if (day === today && currentHour < 17) {
      return { dayName: DAY_NAMES[day], daysAway: 0, isToday: true }
    }
  }

  let minDays = 8
  let nextDay = PAYOUT_DAYS[0]
  for (const day of PAYOUT_DAYS) {
    let diff = day - today
    if (diff <= 0) diff += 7
    if (diff < minDays) {
      minDays = diff
      nextDay = day
    }
  }

  return { dayName: DAY_NAMES[nextDay], daysAway: minDays, isToday: false }
}

export default function SellerDashboardPage() {
  const navigate = useNavigate()
  const {
    currentUser, orders, getUserSales, getListingById,
    getShipmentByOrderId,
  } = useApp()
  const [filter, setFilter] = useState('all')
  const [escrowOpen, setEscrowOpen] = useState(false)

  if (!currentUser) {
    navigate('/auth')
    return null
  }

  const sales = getUserSales(currentUser.id)
  const nextPayout = useMemo(() => getNextPayoutDay(), [])
  const hasStripeAccount = !!currentUser?.stripeAccountId
  const stripeReady = !!currentUser?.detailsSubmitted && !!currentUser?.chargesEnabled && !!currentUser?.payoutsEnabled
  const needsStripeVerification = hasStripeAccount && !stripeReady

  // Compute totals
  const totalEarnings = sales.reduce((sum, o) => sum + (o.sellerPayout || o.itemPrice || 0), 0)
  const heldAmount = sales
    .filter(o => o.payoutStatus === 'held' || o.payoutStatus === 'buyer_protection_hold' || o.payoutStatus === 'blocked_seller_setup')
    .reduce((sum, o) => sum + (o.sellerPayout || o.itemPrice || 0), 0)
  const blockedPayoutSales = sales.filter(o => o.payoutStatus === 'blocked_seller_setup')
  const availableAmount = sales
    .filter(o => o.payoutStatus === 'available')
    .reduce((sum, o) => sum + (o.sellerPayout || o.itemPrice || 0), 0)
  const releasedAmount = sales
    .filter(o => o.payoutStatus === 'released')
    .reduce((sum, o) => sum + (o.sellerPayout || o.itemPrice || 0), 0)

  const filteredSales = filter === 'all'
    ? sales
    : sales.filter(o => o.payoutStatus === filter)

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'held', label: 'Pending' },
    { id: 'available', label: 'Available' },
    { id: 'released', label: 'Paid' },
    { id: 'blocked_seller_setup', label: 'Blocked' },
  ]

  return (
    <div className="pb-10 bg-white dark:bg-[#18211f] min-h-screen transition-colors">
      {/* Header — clean, minimal */}
      <div className="px-4 pt-5 pb-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-sib-text dark:text-[#f4efe7] tracking-tight">Seller Dashboard</h1>
            <p className="text-xs text-sib-muted dark:text-[#aeb8b4] mt-0.5">Earnings &amp; payouts</p>
          </div>
          <button
            onClick={() => navigate('/seller/payout-settings')}
            className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all ${
              hasStripeAccount
                ? 'text-sib-muted dark:text-[#aeb8b4] bg-sib-sand dark:bg-[#26322f] border border-sib-stone dark:border-[rgba(242,238,231,0.10)] hover:border-sib-muted dark:hover:border-[rgba(242,238,231,0.18)]'
                : 'text-white bg-sib-secondary shadow-sm hover:opacity-90'
            }`}
          >
            {needsStripeVerification ? 'Continue Stripe verification' : hasStripeAccount ? 'Payout settings' : 'Set up payouts'}
          </button>
        </div>
      </div>

      {/* Primary: Balance overview — compact stat card */}
      <div className="px-4 mt-3">
        <div className="bg-sib-sand dark:bg-[#202b28] rounded-2xl p-4 border border-sib-stone/60 dark:border-[rgba(242,238,231,0.10)] transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-sib-muted dark:text-[#aeb8b4] font-semibold">Total Earnings</p>
              <p className="text-3xl font-bold text-sib-text dark:text-[#f4efe7] mt-0.5 tracking-tight">€{totalEarnings.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sib-primary/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-sib-primary" />
            </div>
          </div>

          {/* Breakdown row */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-sib-stone/60 dark:border-[rgba(242,238,231,0.10)]">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <p className="text-[10px] text-sib-muted dark:text-[#aeb8b4] font-medium uppercase tracking-wide">Available</p>
              </div>
              <p className="text-base font-bold text-sib-text dark:text-[#f4efe7]">€{availableAmount.toFixed(2)}</p>
              {availableAmount > 0 && (
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                  {nextPayout.isToday ? 'Payout today' : `Next ${nextPayout.dayName}`}
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <p className="text-[10px] text-sib-muted dark:text-[#aeb8b4] font-medium uppercase tracking-wide">Pending</p>
              </div>
              <p className="text-base font-bold text-sib-text dark:text-[#f4efe7]">€{heldAmount.toFixed(2)}</p>
              {heldAmount > 0 && (
                <p className="text-[10px] text-sib-muted dark:text-[#aeb8b4] mt-0.5">In escrow</p>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <p className="text-[10px] text-sib-muted dark:text-[#aeb8b4] font-medium uppercase tracking-wide">Paid out</p>
              </div>
              <p className="text-base font-bold text-sib-text dark:text-[#f4efe7]">€{releasedAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary: Payout setup CTA — only when not configured */}
      {blockedPayoutSales.length > 0 ? (
        <div className="px-4 mt-3">
          <button
            onClick={() => navigate('/seller/payout-settings')}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-[#332d20] transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-sib-secondary/10 flex items-center justify-center flex-shrink-0">
              <Banknote size={16} className="text-sib-secondary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                You have funds waiting. Complete payout setup to receive money from your sales.
              </p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-200/80 mt-0.5">
                {blockedPayoutSales.length} payout{blockedPayoutSales.length === 1 ? '' : 's'} waiting.
              </p>
            </div>
            <span className="rounded-full bg-sib-secondary px-3 py-1.5 text-[11px] font-bold text-white">Set up payouts</span>
          </button>
        </div>
      ) : !stripeReady && (
        <div className="px-4 mt-3">
          <button
            onClick={() => navigate('/seller/payout-settings')}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] bg-white dark:bg-[#202b28] hover:bg-sib-sand dark:hover:bg-[#26322f] transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-sib-secondary/10 flex items-center justify-center flex-shrink-0">
              <Banknote size={16} className="text-sib-secondary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-sib-text dark:text-[#f4efe7]">
                {needsStripeVerification ? 'Continue Stripe verification' : 'Set up payouts'}
              </p>
              <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] mt-0.5">
                {needsStripeVerification ? 'Finish onboarding to unlock payouts' : 'Connect your bank to receive earnings'}
              </p>
            </div>
            <ArrowUpRight size={16} className="text-sib-muted dark:text-[#aeb8b4] group-hover:text-sib-secondary transition-colors flex-shrink-0" />
          </button>
        </div>
      )}

      {/* Payout schedule — subtle inline note */}
      <div className="px-4 mt-3">
        <div className="flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl bg-sib-sand/80 dark:bg-[#26322f] border border-sib-stone/40 dark:border-[rgba(242,238,231,0.10)] transition-colors">
          <Calendar size={13} className="text-sib-primary flex-shrink-0" />
          <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] leading-relaxed">
            Payouts sent every <span className="font-semibold text-sib-text dark:text-[#f4efe7]">Tuesday</span> &amp; <span className="font-semibold text-sib-text dark:text-[#f4efe7]">Friday</span>
            {availableAmount > 0 && (
              <span className="text-sib-primary font-semibold"> · Next: {nextPayout.isToday ? 'Today' : nextPayout.dayName}</span>
            )}
          </p>
        </div>
      </div>

      {/* Tertiary: How escrow works — collapsible, lightweight */}
      <div className="px-4 mt-2.5">
        <button
          onClick={() => setEscrowOpen(!escrowOpen)}
          className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl border border-sib-stone/40 dark:border-[rgba(242,238,231,0.10)] bg-white dark:bg-[#202b28] hover:bg-sib-sand/50 dark:hover:bg-[#26322f] transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={13} className="text-sib-primary" />
            <span className="text-[11px] font-semibold text-sib-muted dark:text-[#aeb8b4]">How Sib Escrow works</span>
          </div>
          {escrowOpen
            ? <ChevronUp size={14} className="text-sib-muted dark:text-[#aeb8b4]" />
            : <ChevronDown size={14} className="text-sib-muted dark:text-[#aeb8b4]" />
          }
        </button>
        {escrowOpen && (
          <div className="px-3.5 pb-3 pt-2.5 rounded-b-xl border border-t-0 border-sib-stone/40 dark:border-[rgba(242,238,231,0.10)] bg-sib-sand/30 dark:bg-[#202b28] -mt-px transition-colors">
            <div className="space-y-2">
              {[
                { text: 'Buyer pays — money held securely', tag: 'Pending', tagColor: 'bg-amber-100 text-amber-700' },
                { text: 'You ship via Sib Tracked Delivery', tag: null },
                { text: 'Buyer confirms or 48h passes — funds unlocked', tag: 'Available', tagColor: 'bg-emerald-100 text-emerald-700' },
                { text: 'Payout on next Tuesday or Friday', tag: 'Paid', tagColor: 'bg-sky-100 text-sky-700' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="text-[10px] font-bold text-sib-primary/70 w-4 text-center flex-shrink-0">{i + 1}</span>
                  <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] leading-snug flex-1">{step.text}</p>
                  {step.tag && (
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${step.tagColor}`}>{step.tag}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-sib-stone/50 dark:bg-[rgba(242,238,231,0.10)] mx-4 mt-4 mb-3" />

      {/* Filter tabs */}
      <div className="flex gap-1.5 px-4 mb-3 overflow-x-auto">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
              filter === f.id
                ? 'bg-sib-text dark:bg-sib-primary text-white'
                : 'bg-transparent text-sib-muted dark:text-[#aeb8b4] hover:bg-sib-sand dark:hover:bg-[#26322f]'
            }`}
          >
            {f.label}
            {f.id !== 'all' && (
              <span className="ml-1 opacity-60">
                {sales.filter(o => o.payoutStatus === f.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sales list */}
      <div className="px-4 space-y-1.5">
        <p className="text-[10px] text-sib-muted dark:text-[#aeb8b4] font-medium uppercase tracking-wider mb-1">
          {filteredSales.length} sale{filteredSales.length !== 1 ? 's' : ''}
        </p>

        {filteredSales.length === 0 && (
          <div className="text-center py-14">
            <Package size={28} className="mx-auto text-sib-stone dark:text-[#aeb8b4] mb-2" />
            <p className="text-sm text-sib-muted dark:text-[#aeb8b4]">
              {filter === 'all' ? 'No sales yet. List something to get started.' : 'No orders with this status.'}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => navigate('/sell')}
                className="mt-3 bg-sib-secondary text-white px-5 py-2 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                List something
              </button>
            )}
          </div>
        )}

        {filteredSales.map(order => {
          const listing = getListingById(order.listingId)
          const ps = PAYOUT_STATUS_MAP[order.payoutStatus] || PAYOUT_STATUS_MAP.held
          const StatusIcon = ps.icon
          const shipment = getShipmentByOrderId(order.id)
          const needsShipping = shipment?.status === 'awaiting_shipment'
          return (
            <div
              key={order.id}
              className={`p-3 rounded-xl border transition-colors cursor-pointer active:bg-sib-sand/80 dark:active:bg-[#30403c] ${
                needsShipping
                  ? 'border-blue-200 dark:border-blue-500/20 bg-blue-50/20 dark:bg-[#21303a]'
                  : 'border-sib-stone/50 dark:border-[rgba(242,238,231,0.10)] bg-white dark:bg-[#202b28]'
              }`}
            >
              <div className="flex items-center gap-3" onClick={() => navigate(`/orders/${order.id}`)}>
                <img
                  src={listing?.images?.[0] || ''}
                  alt={listing?.title}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-sib-sand dark:bg-[#26322f]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-sib-text dark:text-[#f4efe7] line-clamp-1">{listing?.title || 'Item'}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${ps.color}`}>
                      <StatusIcon size={9} />
                      {ps.label}
                    </span>
                    {shipment && <ShipmentStatusBadge status={shipment.status} />}
                    {order.payoutStatus === 'available' && (
                      <span className="text-[9px] text-emerald-600 font-medium flex items-center gap-0.5">
                        <Calendar size={8} />
                        {nextPayout.isToday ? 'Today' : nextPayout.dayName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 pl-2">
                  <p className="text-sm font-bold text-sib-text dark:text-[#f4efe7]">€{(order.sellerPayout || order.itemPrice || 0).toFixed(2)}</p>
                  <p className="text-[9px] text-sib-muted dark:text-[#aeb8b4] mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
              {needsShipping && (
                <div className="mt-2">
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 mb-1.5">
                    New sale. Prepare the item and open the order for shipment steps.
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`) }}
                    className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-colors"
                  >
                    <Truck size={12} /> Prepare shipment
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
