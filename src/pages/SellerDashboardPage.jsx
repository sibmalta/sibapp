import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, Package, Clock, CheckCircle, AlertCircle,
  ChevronRight, ShieldCheck, Banknote, Calendar, Truck, Send,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ShipmentStatusBadge } from '../components/ShipmentTracker'

const PAYOUT_STATUS_MAP = {
  held: { label: 'Pending', desc: 'Waiting for delivery confirmation', color: 'bg-yellow-50 text-yellow-700', icon: Clock },
  available: { label: 'Available', desc: 'Ready for next payout', color: 'bg-green-50 text-green-700', icon: CheckCircle },
  released: { label: 'Paid out', desc: 'Sent to your bank', color: 'bg-blue-50 text-blue-700', icon: Banknote },
  refunded: { label: 'Refunded', desc: 'Returned to buyer', color: 'bg-red-50 text-red-500', icon: AlertCircle },
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
    currentUser, orders, getUserSales, getListingById, getPayoutProfile,
    getShipmentByOrderId,
  } = useApp()
  const [filter, setFilter] = useState('all')

  if (!currentUser) {
    navigate('/auth')
    return null
  }

  const sales = getUserSales(currentUser.id)
  const payoutProfile = getPayoutProfile(currentUser.id)
  const nextPayout = useMemo(() => getNextPayoutDay(), [])

  // Compute totals
  const totalEarnings = sales.reduce((sum, o) => sum + (o.sellerPayout || o.itemPrice || 0), 0)
  const heldAmount = sales
    .filter(o => o.payoutStatus === 'held')
    .reduce((sum, o) => sum + (o.sellerPayout || o.itemPrice || 0), 0)
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
  ]

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="px-4 py-4 bg-gradient-to-br from-sib-primary to-sib-primaryDark">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-white" />
            <h1 className="text-white font-bold text-lg">Seller Dashboard</h1>
          </div>
          <button
            onClick={() => navigate('/seller/payout-settings')}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
              payoutProfile
                ? 'text-white/80 bg-white/15'
                : 'text-sib-primaryDark bg-white shadow-sm'
            }`}
          >
            {payoutProfile ? 'Manage payouts' : 'Set up payouts'}
          </button>
        </div>

        {/* Balance cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-3">
            <p className="text-[11px] text-white/70 mb-0.5">Total Earnings</p>
            <p className="text-xl font-bold text-white">€{totalEarnings.toFixed(2)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-3 relative">
            <p className="text-[11px] text-white/70 mb-0.5">Available</p>
            <p className="text-xl font-bold text-green-300">€{availableAmount.toFixed(2)}</p>
            {availableAmount > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <Calendar size={9} className="text-green-300/80" />
                <p className="text-[10px] text-green-300/80 font-medium">
                  Next payout: {nextPayout.isToday ? 'Today' : nextPayout.dayName}
                </p>
              </div>
            )}
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-3">
            <p className="text-[11px] text-white/70 mb-0.5">Pending</p>
            <p className="text-lg font-bold text-yellow-300">€{heldAmount.toFixed(2)}</p>
            {heldAmount > 0 && (
              <p className="text-[10px] text-yellow-300/70 mt-0.5">Awaiting delivery</p>
            )}
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-3">
            <p className="text-[11px] text-white/70 mb-0.5">Paid Out</p>
            <p className="text-lg font-bold text-white/80">€{releasedAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Payout schedule banner */}
      <div className="mx-4 mt-3 p-3 rounded-2xl bg-sib-sand border border-sib-stone flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-sib-primary/10 flex items-center justify-center flex-shrink-0">
          <Calendar size={15} className="text-sib-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-sib-text">Payouts are sent twice weekly</p>
          <p className="text-[11px] text-sib-muted mt-0.5">
            Every <span className="font-semibold text-sib-text">Tuesday</span> and <span className="font-semibold text-sib-text">Friday</span>
            {availableAmount > 0 && (
              <span> · Next: <span className="text-sib-primary font-semibold">{nextPayout.isToday ? 'Today' : nextPayout.dayName}</span></span>
            )}
          </p>
        </div>
      </div>

      {/* Payout profile banner */}
      {!payoutProfile && (
        <div
          onClick={() => navigate('/seller/payout-settings')}
          className="mx-4 mt-2.5 p-3 rounded-2xl bg-yellow-50 border border-yellow-200 flex items-center gap-3 cursor-pointer"
        >
          <AlertCircle size={18} className="text-yellow-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-800">Set up your payout method</p>
            <p className="text-xs text-yellow-700 mt-0.5">Add your bank details so you can receive money when orders are delivered.</p>
          </div>
          <ChevronRight size={16} className="text-yellow-600 flex-shrink-0" />
        </div>
      )}

      {/* How escrow works */}
      <div className="mx-4 mt-2.5 p-3 rounded-2xl bg-sib-primary/5 border border-sib-primary/10">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={14} className="text-sib-primary" />
          <p className="text-xs font-bold text-sib-text">How Sib Escrow Works</p>
        </div>
        <div className="space-y-1.5">
          {[
            { text: 'Buyer pays — your money is held securely', badge: 'Pending' },
            { text: 'You ship the item via Sib Tracked Delivery', badge: null },
            { text: 'Buyer confirms or 48h window passes — funds unlocked', badge: 'Available' },
            { text: 'Payout sent on next Tuesday or Friday', badge: 'Paid out' },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] font-bold text-sib-primary bg-sib-primary/10 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs text-sib-muted leading-snug">{step.text}</p>
                {step.badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-px rounded-full ${
                    step.badge === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                    step.badge === 'Available' ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{step.badge}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 mt-4 mb-3 overflow-x-auto">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === f.id
                ? 'bg-sib-primary text-white'
                : 'bg-sib-sand text-sib-muted border border-sib-stone'
            }`}
          >
            {f.label}
            {f.id !== 'all' && (
              <span className="ml-1 opacity-70">
                ({sales.filter(o => o.payoutStatus === f.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sales list */}
      <div className="px-4 space-y-2">
        <p className="text-xs text-sib-muted font-medium">
          {filteredSales.length} sale{filteredSales.length !== 1 ? 's' : ''}
        </p>

        {filteredSales.length === 0 && (
          <div className="text-center py-12">
            <Package size={32} className="mx-auto text-sib-stone mb-2" />
            <p className="text-sm text-sib-muted">
              {filter === 'all' ? 'No sales yet. List something to get started.' : 'No orders with this status.'}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => navigate('/sell')}
                className="mt-3 bg-sib-secondary text-white px-5 py-2.5 rounded-full text-sm font-semibold"
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
              className={`p-3 rounded-2xl border ${needsShipping ? 'border-blue-200 bg-blue-50/30' : 'border-sib-stone'} cursor-pointer active:bg-sib-sand transition-colors`}
            >
              <div className="flex items-center gap-3" onClick={() => navigate(`/orders/${order.id}`)}>
                <img
                  src={listing?.images?.[0] || ''}
                  alt={listing?.title}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-sib-stone"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sib-text line-clamp-1">{listing?.title || 'Item'}</p>
                  <p className="text-xs text-sib-muted mt-0.5">
                    {order.orderRef || `#${order.id?.slice(-8)}`} · {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${ps.color}`}>
                      <StatusIcon size={10} />
                      {ps.label}
                    </span>
                    {shipment && <ShipmentStatusBadge status={shipment.status} />}
                    {order.payoutStatus === 'available' && (
                      <span className="text-[9px] text-green-600 font-medium flex items-center gap-0.5">
                        <Calendar size={8} />
                        {nextPayout.isToday ? 'Today' : nextPayout.dayName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-sib-primary">€{(order.sellerPayout || order.itemPrice || 0).toFixed(2)}</p>
                  <p className="text-[10px] text-sib-muted">your payout</p>
                </div>
              </div>
              {needsShipping && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`) }}
                  className="mt-2 w-full py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Truck size={12} /> Ship now
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
