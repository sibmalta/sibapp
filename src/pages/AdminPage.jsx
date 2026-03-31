import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Users, ShoppingBag, AlertTriangle,
  CheckCircle, Truck, Ban, UserCheck,
  Eye, Lock, Unlock, RefreshCw, ChevronDown, ChevronUp, XCircle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import UserAvatar from '../components/UserAvatar'

const TABS = [
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
]

const STATUS_COLORS = {
  pending: 'bg-yellow-50 text-yellow-700',
  shipped: 'bg-blue-50 text-blue-700',
  delivered: 'bg-green-50 text-green-700',
  refunded: 'bg-red-50 text-red-500',
  held: 'bg-orange-50 text-orange-700',
  released: 'bg-green-50 text-green-700',
  open: 'bg-yellow-50 text-yellow-700',
  resolved: 'bg-green-50 text-green-700',
  active: 'bg-green-50 text-green-700',
  sold: 'bg-gray-100 text-gray-500',
  deleted: 'bg-red-50 text-red-400',
}

function Badge({ label, status }) {
  return (
    <span className={`text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-500'}`}>
      {label || status}
    </span>
  )
}

export default function AdminPage() {
  const {
    currentUser, users, orders, disputes,
    updateOrderStatus, refundOrder,
    suspendUser, banUser, restoreUser,
    resolveDispute, showToast, getUserById, getListingById,
  } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('orders')
  const [expandedDispute, setExpandedDispute] = useState(null)

  if (!currentUser?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 px-6 text-center">
        <ShieldCheck size={40} className="text-sib-stone" />
        <p className="font-semibold text-sib-text">Admin access only</p>
        <p className="text-sm text-sib-muted">Log in as an admin to access this panel.</p>
        <button onClick={() => navigate('/')} className="text-sib-primary text-sm font-medium mt-2">Go home</button>
      </div>
    )
  }

  const pendingOrders = orders.filter(o => o.trackingStatus === 'pending')
  const openDisputes = (disputes || []).filter(d => d.status === 'open')

  return (
    <div className="pb-10">
      <div className="px-4 py-3 bg-sib-primary flex items-center gap-2">
        <ShieldCheck size={16} className="text-white" />
        <span className="text-white text-sm font-bold">Admin</span>
        <span className="ml-auto text-white/70 text-xs">{orders.length} orders · {openDisputes.length} open disputes</span>
      </div>

      <div className="flex border-b border-sib-stone">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              tab === t.id ? 'border-sib-primary text-sib-primary' : 'border-transparent text-sib-muted'
            }`}
          >
            <t.icon size={13} />
            {t.label}
            {t.id === 'disputes' && openDisputes.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{openDisputes.length}</span>
            )}
            {t.id === 'orders' && pendingOrders.length > 0 && (
              <span className="ml-1 bg-yellow-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{pendingOrders.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">

        {tab === 'orders' && (
          <div className="space-y-2">
            <p className="text-xs text-sib-muted font-medium mb-3">{orders.length} total · {pendingOrders.length} pending shipment</p>
            {orders.length === 0 && <p className="text-center py-10 text-sib-muted text-sm">No orders yet.</p>}
            {orders.map(order => {
              const listing = getListingById(order.listingId)
              const buyer = getUserById(order.buyerId)
              const seller = getUserById(order.sellerId)
              return (
                <div key={order.id} className="p-3 rounded-2xl border border-sib-stone">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-semibold text-sib-muted">#{order.id?.slice(-8)}</p>
                    <Badge status={order.trackingStatus} />
                  </div>
                  <p className="text-sm font-medium text-sib-text line-clamp-1 mb-1">{listing?.title || 'Unknown item'}</p>
                  <p className="text-xs text-sib-muted mb-2">Buyer: {buyer?.name} · Seller: {seller?.name} · €{order.totalPrice?.toFixed(2)}</p>
                  {order.address && <p className="text-xs text-sib-muted mb-2 flex items-center gap-1"><Truck size={11} /> {order.address}</p>}
                  <div className="flex gap-2">
                    {order.trackingStatus === 'pending' && (
                      <button onClick={() => { updateOrderStatus(order.id, 'shipped'); showToast('Marked as shipped.') }}
                        className="flex-1 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1">
                        <Truck size={11} /> Mark Shipped
                      </button>
                    )}
                    {order.trackingStatus === 'shipped' && (
                      <button onClick={() => { updateOrderStatus(order.id, 'delivered'); showToast('Marked as delivered.') }}
                        className="flex-1 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1">
                        <CheckCircle size={11} /> Mark Delivered
                      </button>
                    )}
                    {order.trackingStatus !== 'refunded' && order.trackingStatus !== 'delivered' && (
                      <button onClick={() => { refundOrder(order.id); showToast('Refund issued to buyer.') }}
                        className="flex-1 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-xl flex items-center justify-center gap-1">
                        <RefreshCw size={11} /> Refund
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-2">
            <p className="text-xs text-sib-muted font-medium mb-3">{users.length} registered users</p>
            {users.map(u => (
              <div key={u.id} className="p-3 rounded-2xl border border-sib-stone">
                <div className="flex items-center gap-3">
                  <UserAvatar user={u} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-sib-text">{u.name}</p>
                      {u.isAdmin && <ShieldCheck size={12} className="text-sib-primary" />}
                      {u.suspended && <span className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">Suspended</span>}
                      {u.banned && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">Banned</span>}
                    </div>
                    <p className="text-xs text-sib-muted">@{u.username}</p>
                    <p className="text-[10px] text-sib-muted/70 mt-0.5">📧 {u.email}{u.phone ? ` · 📱 ${u.phone}` : ''}</p>
                  </div>
                  <button onClick={() => navigate(`/profile/${u.username}`)} className="w-8 h-8 bg-sib-sand rounded-xl flex items-center justify-center flex-shrink-0">
                    <Eye size={13} className="text-sib-muted" />
                  </button>
                </div>
                {!u.isAdmin && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-sib-stone">
                    {!u.suspended && !u.banned && (
                      <button onClick={() => { suspendUser(u.id); showToast(`${u.name} suspended.`) }}
                        className="flex-1 py-1.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1">
                        <Lock size={11} /> Suspend
                      </button>
                    )}
                    {!u.banned && (
                      <button onClick={() => { banUser(u.id); showToast(`${u.name} banned.`) }}
                        className="flex-1 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-xl flex items-center justify-center gap-1">
                        <Ban size={11} /> Ban
                      </button>
                    )}
                    {(u.suspended || u.banned) && (
                      <button onClick={() => { restoreUser(u.id); showToast(`${u.name} restored.`) }}
                        className="flex-1 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1">
                        <UserCheck size={11} /> Restore
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}


        {tab === 'disputes' && (
          <div className="space-y-2">
            <p className="text-xs text-sib-muted font-medium mb-3">
              {(disputes || []).length} dispute{(disputes || []).length !== 1 ? 's' : ''} · {openDisputes.length} open
            </p>
            {(disputes || []).length === 0 && <p className="text-center py-10 text-sib-muted text-sm">No disputes yet.</p>}
            {(disputes || []).map(d => {
              const buyer = getUserById(d.buyerId)
              const seller = getUserById(d.sellerId)
              const order = orders.find(o => o.id === d.orderId)
              const listing = order ? getListingById(order.listingId) : null
              const isExpanded = expandedDispute === d.id
              const typeLabels = { not_as_described: 'Not as described', not_received: 'Item not received', delivery_issue: 'Delivery issue' }
              return (
                <div key={d.id} className={`rounded-2xl border ${d.status === 'open' ? 'border-orange-200' : 'border-sib-stone'}`}>
                  <button onClick={() => setExpandedDispute(isExpanded ? null : d.id)} className="w-full flex items-center gap-3 p-3 text-left">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${d.status === 'open' ? 'bg-orange-500' : 'bg-green-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-sib-text truncate">{typeLabels[d.type] || d.type}</p>
                      <p className="text-xs text-sib-muted">{buyer?.name} vs {seller?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge status={d.status} />
                      {isExpanded ? <ChevronUp size={14} className="text-sib-muted" /> : <ChevronDown size={14} className="text-sib-muted" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-sib-stone pt-2 space-y-3">
                      {listing && <p className="text-xs text-sib-muted">Item: <span className="text-sib-text font-medium">{listing.title}</span> · €{order?.totalPrice?.toFixed(2)}</p>}
                      <div className="p-2.5 rounded-xl bg-sib-sand text-xs text-sib-text leading-snug">{d.description}</div>
                      {d.status === 'resolved' && d.resolution && (
                        <div className="p-2 rounded-xl bg-green-50 text-xs text-green-700 font-medium flex items-center gap-1.5">
                          <CheckCircle size={12} />
                          {d.resolution === 'refunded' ? 'Buyer refunded' : d.resolution === 'seller_payout' ? 'Payout released to seller' : `Dismissed`}
                        </div>
                      )}
                      {d.status === 'open' && (
                        <div className="flex gap-2">
                          <button onClick={() => { resolveDispute(d.id, 'refunded'); showToast('Buyer refunded.') }}
                            className="flex-1 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1">
                            <RefreshCw size={11} /> Refund Buyer
                          </button>
                          <button onClick={() => { resolveDispute(d.id, 'seller_payout'); showToast('Payout released to seller.') }}
                            className="flex-1 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1">
                            <Unlock size={11} /> Pay Seller
                          </button>
                          <button onClick={() => { resolveDispute(d.id, 'dismissed'); showToast('Dispute dismissed.') }}
                            className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <XCircle size={13} className="text-red-500" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'delivery' && (
          <div className="space-y-2">
            <div className="p-3 rounded-2xl bg-sib-primary/5 border border-sib-primary/20 mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Truck size={14} className="text-sib-primary" />
                <p className="text-sm font-bold text-sib-text">Sib Delivery Policy</p>
              </div>
              <p className="text-xs text-sib-muted leading-relaxed">All orders ship exclusively via Sib Tracked Delivery (MaltaPost / courier). Self-collection and cash deals are not permitted on this platform.</p>
            </div>
            <p className="text-xs text-sib-muted font-medium mb-2">Active deliveries</p>
            {orders.filter(o => o.trackingStatus !== 'delivered' && o.trackingStatus !== 'refunded').map(order => {
              const listing = getListingById(order.listingId)
              const buyer = getUserById(order.buyerId)
              return (
                <div key={order.id} className="p-3 rounded-2xl border border-sib-stone">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-sib-muted">#{order.id}</p>
                    <Badge status={order.trackingStatus} />
                  </div>
                  <p className="text-sm font-medium text-sib-text line-clamp-1 mb-0.5">{listing?.title}</p>
                  <p className="text-xs text-sib-muted mb-2">{buyer?.name} · {order.address}</p>
                  <div className="flex gap-2">
                    {order.trackingStatus === 'pending' && (
                      <button onClick={() => { updateOrderStatus(order.id, 'shipped'); showToast('Marked as shipped.') }}
                        className="flex-1 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1">
                        <Truck size={11} /> Mark Shipped
                      </button>
                    )}
                    {order.trackingStatus === 'shipped' && (
                      <button onClick={() => { updateOrderStatus(order.id, 'delivered'); showToast('Marked as delivered.') }}
                        className="flex-1 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1">
                        <CheckCircle size={11} /> Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-sib-muted font-medium mt-4 mb-2">Completed</p>
            {orders.filter(o => o.trackingStatus === 'delivered').map(order => {
              const listing = getListingById(order.listingId)
              const buyer = getUserById(order.buyerId)
              return (
                <div key={order.id} className="p-3 rounded-2xl border border-sib-stone opacity-70">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-sib-muted">#{order.id}</p>
                    <Badge status="delivered" />
                  </div>
                  <p className="text-sm font-medium text-sib-text line-clamp-1">{listing?.title}</p>
                  <p className="text-xs text-sib-muted">{buyer?.name} · {order.address}</p>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
