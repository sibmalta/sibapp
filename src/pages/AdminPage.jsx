import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Shield, Users, ShoppingBag, AlertTriangle, MessageSquare, Package,
  CheckCircle, Truck, Ban, UserCheck, Eye, Lock, Unlock, RefreshCw,
  ChevronDown, ChevronUp, XCircle, Search, DollarSign, Clock,
  Flag, Trash2, EyeOff, Send, AlertOctagon, Mail, Plus, X, Tags,
  Clipboard,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import UserAvatar from '../components/UserAvatar'
import { sendModerationNoticeEmail } from '../lib/email'
import { supabase } from '../lib/supabase'
import { STYLE_RULES, classifyListing, getStyleLabel } from '../lib/styleClassifier'
import { SELLER_BADGE_DEFS } from '../components/SellerTrustBadges'
import LogisticsTab from '../components/LogisticsTab'

const TABS = [
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'logistics', label: 'Logistics', icon: Clipboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
  { id: 'chats', label: 'Chats', icon: MessageSquare },
  { id: 'listings', label: 'Listings', icon: Package },
  { id: 'emails', label: 'Emails', icon: Mail },
]

const ORDER_STATUSES = ['all', 'pending', 'shipped', 'delivered', 'under_review', 'held', 'refunded', 'cancelled']

const STATUS_COLORS = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  shipped: 'bg-blue-50 text-blue-700 border-blue-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  refunded: 'bg-red-50 text-red-500 border-red-200',
  held: 'bg-orange-50 text-orange-700 border-orange-200',
  released: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  under_review: 'bg-purple-50 text-purple-700 border-purple-200',
  open: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  resolved: 'bg-green-50 text-green-700 border-green-200',
  active: 'bg-green-50 text-green-700 border-green-200',
  sold: 'bg-gray-100 text-gray-500 border-gray-200',
  deleted: 'bg-red-50 text-red-400 border-red-200',
  hidden: 'bg-gray-100 text-gray-500 border-gray-200',
  flagged: 'bg-orange-50 text-orange-600 border-orange-200',
}

function Badge({ label, status }) {
  return (
    <span className={`text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full border ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
      {label || status}
    </span>
  )
}

function formatDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return d }
}

const FLAG_PATTERNS = [
  { regex: /\b\d{4}\s?\d{4}\b/g, label: 'Phone number' },
  { regex: /whatsapp/i, label: 'WhatsApp' },
  { regex: /telegram/i, label: 'Telegram' },
  { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label: 'Email' },
  { regex: /\bmeet\b/i, label: '"meet"' },
  { regex: /\bcash\b/i, label: '"cash"' },
  { regex: /\boutside\s*(the\s*)?app\b/i, label: '"outside app"' },
  { regex: /\bavoid\s*(the\s*)?fee\b/i, label: '"avoid fee"' },
  { regex: /\bin\s*person\b/i, label: '"in person"' },
  { regex: /\b(address|where exactly|exact location|send location|share location|street address|house number|postcode|post code|collect from you)\b/i, label: 'Address/location' },
  { regex: /\b(bank transfer|bank details|iban|revolut|paypal|pay direct|pay outside)\b/i, label: 'Off-platform payment' },
  { regex: /instagram/i, label: 'Instagram' },
]

function detectFlags(text) {
  const flags = []
  for (const p of FLAG_PATTERNS) {
    if (p.regex.test(text)) flags.push(p.label)
    p.regex.lastIndex = 0
  }
  return flags
}

export default function AdminPage() {
  const {
    currentUser, users, listings, orders, conversations, disputes,
    updateOrderStatus, refundOrder, holdPayout, releasePayout, cancelOrder,
    suspendUser, banUser, restoreUser,
    resolveDispute, addDisputeMessage, showToast,
    getUserById, getListingById, getUserListings, getUserOrders, getUserSales,
    getUserConversations,
    deleteListing, flagListing, hideListing, updateStyleTags,
    adminOpenDispute, DISPUTE_REASONS,
    updateSellerBadges,
  } = useApp()
  const navigate = useNavigate()

  const [tab, setTab] = useState('orders')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [expandedDispute, setExpandedDispute] = useState(null)
  const [expandedUser, setExpandedUser] = useState(null)
  const [expandedChat, setExpandedChat] = useState(null)
  const [orderFilter, setOrderFilter] = useState('all')
  const [chatFilter, setChatFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [disputeMsg, setDisputeMsg] = useState('')
  const [userActivityTab, setUserActivityTab] = useState({})

  // ── Email logs from DB ────────────────────────────────────────
  const [emailLogs, setEmailLogs] = useState([])
  const [emailLogsLoading, setEmailLogsLoading] = useState(false)
  const [emailFilter, setEmailFilter] = useState('all')
  const [emailSearch, setEmailSearch] = useState('')

  const fetchEmailLogs = useCallback(async () => {
    setEmailLogsLoading(true)
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      setEmailLogs(data || [])
    } catch (err) {
      console.error('[AdminPage] Failed to fetch email logs:', err)
      // Fallback: try localStorage logs
      try {
        const raw = localStorage.getItem('sib_emailLogs')
        if (raw) setEmailLogs(JSON.parse(raw))
      } catch {}
    } finally {
      setEmailLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'emails') fetchEmailLogs()
  }, [tab, fetchEmailLogs])

  if (!currentUser?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 px-6 text-center">
        <ShieldCheck size={40} className="text-sib-secondary" />
        <p className="font-semibold text-sib-text">Admin access only</p>
        <p className="text-sm text-sib-muted">Log in as an admin to access this panel.</p>
        <button onClick={() => navigate('/')} className="text-sib-primary text-sm font-medium mt-2">Go home</button>
      </div>
    )
  }

  const pendingOrders = orders.filter(o => o.trackingStatus === 'pending')
  const openDisputes = (disputes || []).filter(d => d.status === 'open')

  const filteredOrders = useMemo(() => {
    let result = orders
    if (orderFilter !== 'all') result = result.filter(o => o.trackingStatus === orderFilter || o.payoutStatus === orderFilter)
    if (searchQuery.trim() && tab === 'orders') {
      const q = searchQuery.toLowerCase()
      result = result.filter(o => {
        const listing = getListingById(o.listingId)
        const buyer = getUserById(o.buyerId)
        const seller = getUserById(o.sellerId)
        return (
          o.id?.toLowerCase().includes(q) ||
          listing?.title?.toLowerCase().includes(q) ||
          buyer?.name?.toLowerCase().includes(q) ||
          seller?.name?.toLowerCase().includes(q)
        )
      })
    }
    return result
  }, [orders, orderFilter, searchQuery, tab])

  const analyzedChats = useMemo(() => {
    return (conversations || []).map(c => {
      const flaggedMessages = (c.messages || []).filter(m => m.flagged || detectFlags(m.text || '').length > 0)
      return { ...c, flaggedCount: flaggedMessages.length, hasFlagged: flaggedMessages.length > 0 }
    }).sort((a, b) => b.flaggedCount - a.flaggedCount)
  }, [conversations])

  const filteredChats = chatFilter === 'flagged' ? analyzedChats.filter(c => c.hasFlagged) : analyzedChats

  const filteredListings = useMemo(() => {
    if (!searchQuery.trim() || tab !== 'listings') return listings
    const q = searchQuery.toLowerCase()
    return listings.filter(l => {
      const owner = getUserById(l.userId || l.sellerId)
      const tags = Array.isArray(l.tags) ? l.tags.join(' ').toLowerCase() : ''
      const styleTags = Array.isArray(l.styleTags) ? l.styleTags.join(' ').toLowerCase() : ''
      const manualStyleTags = Array.isArray(l.manualStyleTags) ? l.manualStyleTags.join(' ').toLowerCase() : ''
      const collectionTags = Array.isArray(l.collectionTags) ? l.collectionTags.join(' ').toLowerCase() : ''
      return (
        l.title?.toLowerCase().includes(q) ||
        l.id?.toLowerCase().includes(q) ||
        l.brand?.toLowerCase().includes(q) ||
        l.category?.toLowerCase().includes(q) ||
        owner?.name?.toLowerCase().includes(q) ||
        owner?.username?.toLowerCase().includes(q) ||
        tags.includes(q) ||
        styleTags.includes(q) ||
        manualStyleTags.includes(q) ||
        collectionTags.includes(q)
      )
    })
  }, [listings, searchQuery, tab])

  function getUserFlags(userId) {
    const flags = []
    const userDisputes = (disputes || []).filter(d => d.buyerId === userId || d.sellerId === userId)
    if (userDisputes.length > 0) flags.push({ label: `${userDisputes.length} dispute${userDisputes.length > 1 ? 's' : ''}`, color: 'text-orange-600 bg-orange-50' })
    const userConvos = (conversations || []).filter(c => c.participants.includes(userId))
    let suspiciousCount = 0
    userConvos.forEach(c => {
      (c.messages || []).forEach(m => {
        if (m.senderId === userId && (m.flagged || detectFlags(m.text || '').length > 0)) suspiciousCount++
      })
    })
    if (suspiciousCount > 0) flags.push({ label: `${suspiciousCount} flagged msg${suspiciousCount > 1 ? 's' : ''}`, color: 'text-red-600 bg-red-50' })
    return flags
  }

  return (
    <div className="pb-20">
      <div className="px-4 py-3 bg-sib-primary flex items-center gap-2">
        <ShieldCheck size={16} className="text-white" />
        <span className="text-white text-sm font-bold">Admin Control Panel</span>
        <span className="ml-auto text-white/70 text-xs">{orders.length} orders · {openDisputes.length} disputes</span>
      </div>

      <div className="flex border-b border-sib-ash overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearchQuery('') }}
            className={`flex-shrink-0 px-3 py-2.5 text-[11px] font-semibold border-b-2 transition-colors flex items-center gap-1 ${
              tab === t.id ? 'border-sib-primary text-sib-primary' : 'border-transparent text-sib-muted'
            }`}
          >
            <t.icon size={12} />
            {t.label}
            {t.id === 'disputes' && openDisputes.length > 0 && (
              <span className="ml-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">{openDisputes.length}</span>
            )}
            {t.id === 'chats' && analyzedChats.filter(c => c.hasFlagged).length > 0 && (
              <span className="ml-0.5 bg-orange-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">{analyzedChats.filter(c => c.hasFlagged).length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-3">

        {/* ══════════ ORDERS TAB ══════════ */}
        {tab === 'orders' && (
          <div>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sib-muted" />
                <input type="text" placeholder="Search orders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-sib-sand rounded-xl text-xs border-none outline-none" />
              </div>
            </div>
            <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar pb-1">
              {ORDER_STATUSES.map(s => (
                <button key={s} onClick={() => setOrderFilter(s)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize whitespace-nowrap border transition-colors ${
                    orderFilter === s ? 'bg-sib-primary text-white border-sib-primary' : 'bg-white text-sib-muted border-sib-ash'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-sib-muted font-medium mb-2">{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}</p>

            {filteredOrders.length === 0 && (
              <div className="text-center py-10">
                <ShoppingBag size={28} className="mx-auto text-sib-ash mb-2" />
                <p className="text-sib-muted text-sm">No orders match this filter.</p>
              </div>
            )}

            <div className="space-y-2">
              {filteredOrders.map(order => {
                const listing = getListingById(order.listingId)
                const buyer = getUserById(order.buyerId)
                const seller = getUserById(order.sellerId)
                const isExpanded = expandedOrder === order.id
                return (
                  <div key={order.id} className={`rounded-2xl border ${isExpanded ? 'border-sib-primary/30 shadow-sm' : 'border-sib-ash'}`}>
                    <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)} className="w-full p-3 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-mono text-sib-muted">#{order.id?.slice(-8)}</p>
                        <div className="flex gap-1">
                          <Badge status={order.trackingStatus} />
                          {order.payoutStatus === 'held' && <Badge label="Funds held" status="held" />}
                          {order.payoutStatus === 'released' && <Badge label="Released" status="released" />}
                          {order.overdueFlag && <Badge label="Overdue" status="flagged" />}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-sib-text line-clamp-1">{listing?.title || 'Unknown item'}</p>
                      <p className="text-xs text-sib-muted mt-0.5">{buyer?.name || '?'} → {seller?.name || '?'} · €{order.totalPrice?.toFixed(2)}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[10px] text-sib-muted">{formatDate(order.createdAt)}</p>
                        {isExpanded ? <ChevronUp size={13} className="text-sib-muted" /> : <ChevronDown size={13} className="text-sib-muted" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-sib-ash pt-2.5 space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-sib-sand rounded-xl">
                            <p className="text-[10px] text-sib-muted font-medium mb-0.5">Buyer</p>
                            <p className="font-semibold text-sib-text">{buyer?.name || '—'}</p>
                            <p className="text-[10px] text-sib-muted">@{buyer?.username}</p>
                          </div>
                          <div className="p-2 bg-sib-sand rounded-xl">
                            <p className="text-[10px] text-sib-muted font-medium mb-0.5">Seller</p>
                            <p className="font-semibold text-sib-text">{seller?.name || '—'}</p>
                            <p className="text-[10px] text-sib-muted">@{seller?.username}</p>
                          </div>
                          <div className="p-2 bg-sib-sand rounded-xl">
                            <p className="text-[10px] text-sib-muted font-medium mb-0.5">Item</p>
                            <p className="font-semibold text-sib-text line-clamp-1">{listing?.title || '—'}</p>
                            <p className="text-[10px] text-sib-muted">€{listing?.price?.toFixed(2)}</p>
                          </div>
                          <div className="p-2 bg-sib-sand rounded-xl">
                            <p className="text-[10px] text-sib-muted font-medium mb-0.5">Total paid</p>
                            <p className="font-semibold text-sib-text">€{order.totalPrice?.toFixed(2)}</p>
                            <p className="text-[10px] text-sib-muted">Payout: {order.payoutStatus || 'pending'}</p>
                            <p className="text-[10px] text-sib-muted">Payment flow: {order.paymentFlowType || 'legacy / unknown'}</p>
                          </div>
                        </div>

                        <div className="p-2 bg-sib-sand rounded-xl text-[10px] text-sib-muted space-y-0.5">
                          <p><Clock size={9} className="inline mr-1" />Created: {formatDate(order.createdAt)}</p>
                          {order.paidAt && <p><DollarSign size={9} className="inline mr-1" />Paid: {formatDate(order.paidAt)}</p>}
                          {order.shippedAt && <p><Truck size={9} className="inline mr-1" />Shipped: {formatDate(order.shippedAt)}</p>}
                          {order.deliveredAt && <p><CheckCircle size={9} className="inline mr-1" />Delivered: {formatDate(order.deliveredAt)}</p>}
                          {order.payoutReleasedAt && <p><Unlock size={9} className="inline mr-1" />Payout released: {formatDate(order.payoutReleasedAt)}</p>}
                          {order.address && <p><Truck size={9} className="inline mr-1" />Address: {order.address}</p>}
                        </div>

                        {/* ── Delivery snapshot ─── */}
                        {(order.buyerFullName || order.sellerName) && (
                          <div className="grid grid-cols-2 gap-2">
                            {order.buyerFullName && (
                              <div className="p-2 bg-blue-50 rounded-xl">
                                <p className="text-[10px] text-blue-600 font-semibold mb-0.5">Deliver to</p>
                                <p className="text-[11px] font-medium text-sib-text">{order.buyerFullName}</p>
                                {order.buyerPhone && <p className="text-[10px] text-sib-muted">{order.buyerPhone}</p>}
                                {(order.buyerCity || order.buyerPostcode) && (
                                  <p className="text-[10px] text-sib-muted">{[order.buyerCity, order.buyerPostcode].filter(Boolean).join(', ')}</p>
                                )}
                                {order.deliveryNotes && <p className="text-[10px] text-sib-muted italic mt-0.5">"{order.deliveryNotes}"</p>}
                              </div>
                            )}
                            {order.sellerName && (
                              <div className="p-2 bg-amber-50 rounded-xl">
                                <p className="text-[10px] text-amber-600 font-semibold mb-0.5">Pickup from</p>
                                <p className="text-[11px] font-medium text-sib-text">{order.sellerName}</p>
                                {order.sellerPhone && <p className="text-[10px] text-sib-muted">{order.sellerPhone}</p>}
                                {order.sellerAddress && <p className="text-[10px] text-sib-muted">{order.sellerAddress}</p>}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold text-sib-muted uppercase tracking-wider">Admin Actions</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {order.trackingStatus === 'pending' && (
                              <button onClick={() => { updateOrderStatus(order.id, 'shipped'); showToast('Marked as shipped') }}
                                className="py-2 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-blue-100 active:scale-95 transition-transform">
                                <Truck size={12} /> Mark Shipped
                              </button>
                            )}
                            {(order.trackingStatus === 'shipped' || order.trackingStatus === 'pending') && (
                              <button onClick={() => { updateOrderStatus(order.id, 'delivered'); showToast('Marked as delivered') }}
                                className="py-2 bg-green-50 text-green-700 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-green-100 active:scale-95 transition-transform">
                                <CheckCircle size={12} /> Mark Delivered
                              </button>
                            )}
                            {order.payoutStatus !== 'held' && order.trackingStatus !== 'refunded' && order.trackingStatus !== 'cancelled' && (
                              <button onClick={() => { holdPayout(order.id); showToast('Funds frozen') }}
                                className="py-2 bg-orange-50 text-orange-700 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-orange-100 active:scale-95 transition-transform">
                                <Lock size={12} /> Freeze Funds
                              </button>
                            )}
                            {order.payoutStatus !== 'released' && order.trackingStatus !== 'refunded' && order.trackingStatus !== 'cancelled' && (
                              <button onClick={() => { releasePayout(order.id); showToast('Funds released to seller') }}
                                className="py-2 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-emerald-100 active:scale-95 transition-transform">
                                <Unlock size={12} /> Release Funds
                              </button>
                            )}
                            {order.trackingStatus !== 'refunded' && order.trackingStatus !== 'cancelled' && (
                              <button onClick={() => { refundOrder(order.id); showToast('Buyer refunded') }}
                                className="py-2 bg-red-50 text-red-600 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-red-100 active:scale-95 transition-transform">
                                <RefreshCw size={12} /> Refund Buyer
                              </button>
                            )}
                            {order.trackingStatus !== 'cancelled' && order.trackingStatus !== 'refunded' && (
                              <button onClick={() => { cancelOrder(order.id); showToast('Order cancelled') }}
                                className="py-2 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-gray-200 active:scale-95 transition-transform">
                                <XCircle size={12} /> Cancel Order
                              </button>
                            )}
                            {order.trackingStatus !== 'under_review' && order.trackingStatus !== 'refunded' && order.trackingStatus !== 'cancelled' && !(disputes || []).some(d => d.orderId === order.id && d.status === 'open') && (
                              <button onClick={() => { adminOpenDispute(order.id, 'Admin-initiated review'); showToast('Dispute opened') }}
                                className="py-2 bg-purple-50 text-purple-700 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-purple-100 active:scale-95 transition-transform">
                                <AlertTriangle size={12} /> Open Dispute
                              </button>
                            )}
                          </div>
                          <div className="mt-2">
                            <p className="text-[10px] text-sib-muted mb-1">Override status:</p>
                            <div className="flex gap-1 flex-wrap">
                              {['pending', 'shipped', 'delivered', 'refunded', 'cancelled'].map(s => (
                                <button key={s} onClick={() => { updateOrderStatus(order.id, s); showToast(`Status → ${s}`) }}
                                  className={`text-[9px] font-semibold px-2 py-1 rounded-full capitalize border transition-colors ${
                                    order.trackingStatus === s ? 'bg-sib-primary text-white border-sib-primary' : 'bg-white text-sib-muted border-sib-ash hover:border-sib-primary hover:text-sib-primary'
                                  }`}>
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════ LOGISTICS TAB ══════════ */}
        {tab === 'logistics' && (
          <LogisticsTab
            orders={orders}
            getUserById={getUserById}
            getListingById={getListingById}
            showToast={showToast}
          />
        )}

        {/* ══════════ USERS TAB ══════════ */}
        {tab === 'users' && (
          <div>
            <div className="relative mb-3">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sib-muted" />
              <input type="text" placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-sib-sand rounded-xl text-xs border-none outline-none" />
            </div>
            <p className="text-[11px] text-sib-muted font-medium mb-2">{users.length} users</p>

            <div className="space-y-2">
              {users
                .filter(u => !searchQuery.trim() || u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(u => {
                const isExpanded = expandedUser === u.id
                const flags = getUserFlags(u.id)
                const actTab = userActivityTab[u.id] || 'listings'
                return (
                  <div key={u.id} className={`rounded-2xl border ${isExpanded ? 'border-sib-primary/30 shadow-sm' : 'border-sib-ash'}`}>
                    <button onClick={() => setExpandedUser(isExpanded ? null : u.id)} className="w-full p-3 text-left">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={u} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold text-sib-text">{u.name}</p>
                            {u.isAdmin && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-600">
                                <Shield size={9} className="text-white" />
                                <span className="text-[8px] font-bold text-white">Admin</span>
                              </span>
                            )}
                            {u.suspended && <Badge label="Suspended" status="held" />}
                            {u.banned && <Badge label="Banned" status="refunded" />}
                          </div>
                          <p className="text-xs text-sib-muted">@{u.username}</p>
                          {flags.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {flags.map((f, i) => (
                                <span key={i} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${f.color}`}>
                                  <AlertTriangle size={8} className="inline mr-0.5" />{f.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp size={13} className="text-sib-muted" /> : <ChevronDown size={13} className="text-sib-muted" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-sib-ash pt-2.5 space-y-2.5">
                        <div className="text-[11px] text-sib-muted space-y-0.5">
                          <p>📧 {u.email || '—'}</p>
                          {u.phone && <p>📱 {u.phone}</p>}
                          <p>📍 {u.location || 'Malta'}</p>
                          <p>🕐 Joined: {formatDate(u.createdAt || u.joinedAt)}</p>
                        </div>

                        {!u.isAdmin && (
                          <div className="flex gap-1.5">
                            {!u.banned ? (
                              <button onClick={() => { banUser(u.id); if (u.email) sendModerationNoticeEmail(u.email, u.name, 'ban', 'Policy violation', 'Your account has been banned.'); showToast(`${u.name} banned`) }}
                                className="flex-1 py-2 bg-red-50 text-red-600 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-red-100 active:scale-95">
                                <Ban size={11} /> Ban
                              </button>
                            ) : (
                              <button onClick={() => { restoreUser(u.id); if (u.email) sendModerationNoticeEmail(u.email, u.name, 'unban', 'Review complete', 'Your account has been restored.'); showToast(`${u.name} unbanned`) }}
                                className="flex-1 py-2 bg-green-50 text-green-700 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-green-100 active:scale-95">
                                <UserCheck size={11} /> Unban
                              </button>
                            )}
                            {!u.suspended && !u.banned && (
                              <button onClick={() => { suspendUser(u.id); if (u.email) sendModerationNoticeEmail(u.email, u.name, 'suspend', 'Under review', 'Your account has been temporarily suspended.'); showToast(`${u.name} suspended`) }}
                                className="flex-1 py-2 bg-orange-50 text-orange-700 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-orange-100 active:scale-95">
                                <Lock size={11} /> Suspend
                              </button>
                            )}
                            {u.suspended && !u.banned && (
                              <button onClick={() => { restoreUser(u.id); if (u.email) sendModerationNoticeEmail(u.email, u.name, 'restore', 'Review complete', 'Your account has been restored.'); showToast(`${u.name} restored`) }}
                                className="flex-1 py-2 bg-green-50 text-green-700 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-green-100 active:scale-95">
                                <UserCheck size={11} /> Restore
                              </button>
                            )}
                            <button onClick={() => navigate(`/profile/${u.username}`)}
                              className="w-10 h-10 bg-sib-sand rounded-xl flex items-center justify-center flex-shrink-0 border border-sib-ash">
                              <Eye size={13} className="text-sib-muted" />
                            </button>
                          </div>
                        )}

                        {/* ── Seller Badges ── */}
                        {!u.isAdmin && (() => {
                          const currentBadges = Array.isArray(u.sellerBadges) ? u.sellerBadges : []
                          const assignedDefs = SELLER_BADGE_DEFS.filter(b => currentBadges.includes(b.id))
                          const availableDefs = SELLER_BADGE_DEFS.filter(b => !currentBadges.includes(b.id))
                          return (
                            <div className="pt-1">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Tags size={10} className="text-sib-muted" />
                                <p className="text-[10px] font-semibold text-sib-muted uppercase tracking-wider">Seller Badges</p>
                              </div>
                              {assignedDefs.length > 0 && (
                                <div className="flex gap-1 flex-wrap mb-1.5">
                                  {assignedDefs.map(b => {
                                    const Icon = b.icon
                                    return (
                                      <span key={b.id} className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${b.color} ${b.bg}`}>
                                        <Icon size={10} />
                                        {b.label}
                                        <button
                                          onClick={() => {
                                            const next = currentBadges.filter(id => id !== b.id)
                                            updateSellerBadges(u.id, next)
                                            showToast(`Removed "${b.label}"`)
                                          }}
                                          className="ml-0.5 hover:text-red-500 transition-colors"
                                        >
                                          <X size={9} />
                                        </button>
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                              {assignedDefs.length === 0 && (
                                <p className="text-[10px] text-sib-muted mb-1.5">No badges assigned</p>
                              )}
                              {availableDefs.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {availableDefs.map(b => {
                                    const Icon = b.icon
                                    return (
                                      <button
                                        key={b.id}
                                        onClick={() => {
                                          const next = [...currentBadges, b.id]
                                          updateSellerBadges(u.id, next)
                                          showToast(`Assigned "${b.label}"`)
                                        }}
                                        className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gray-50 text-sib-muted border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                      >
                                        <Plus size={8} />
                                        <Icon size={9} />
                                        {b.label}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })()}

                        <div>
                          <div className="flex gap-1 mb-2">
                            {['listings', 'orders', 'messages'].map(t => (
                              <button key={t} onClick={() => setUserActivityTab(prev => ({ ...prev, [u.id]: t }))}
                                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize border ${
                                  actTab === t ? 'bg-sib-primary text-white border-sib-primary' : 'bg-white text-sib-muted border-sib-ash'
                                }`}>
                                {t}
                              </button>
                            ))}
                          </div>

                          {actTab === 'listings' && (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {getUserListings(u.id).length === 0 && <p className="text-[11px] text-sib-muted py-2">No listings</p>}
                              {getUserListings(u.id).slice(0, 10).map(l => (
                                <div key={l.id} className="flex items-center gap-2 p-1.5 bg-sib-sand rounded-lg">
                                  {l.images?.[0] && <img src={l.images[0]} className="w-8 h-8 rounded-lg object-cover" alt="" />}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-medium text-sib-text truncate">{l.title}</p>
                                    <p className="text-[9px] text-sib-muted">€{l.price} · {l.status || 'active'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {actTab === 'orders' && (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {[...getUserOrders(u.id), ...getUserSales(u.id)].length === 0 && <p className="text-[11px] text-sib-muted py-2">No orders</p>}
                              {[...getUserOrders(u.id).map(o => ({ ...o, _role: 'buyer' })), ...getUserSales(u.id).map(o => ({ ...o, _role: 'seller' }))]
                                .slice(0, 10).map((o, idx) => {
                                const l = getListingById(o.listingId)
                                return (
                                  <div key={`${o.id}-${o._role}-${idx}`} className="flex items-center justify-between p-1.5 bg-sib-sand rounded-lg">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[11px] font-medium text-sib-text truncate">{l?.title || 'Unknown'}</p>
                                      <p className="text-[9px] text-sib-muted">€{o.totalPrice?.toFixed(2)} · {o._role}</p>
                                    </div>
                                    <Badge status={o.trackingStatus} />
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {actTab === 'messages' && (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {getUserConversations(u.id).length === 0 && <p className="text-[11px] text-sib-muted py-2">No messages</p>}
                              {getUserConversations(u.id).slice(0, 10).map(c => {
                                const other = c.participants.find(p => p !== u.id)
                                const otherUser = getUserById(other)
                                const lastMsg = c.messages?.[c.messages.length - 1]
                                const hasFlagged = (c.messages || []).some(m => m.flagged || detectFlags(m.text || '').length > 0)
                                return (
                                  <div key={c.id} className={`p-1.5 rounded-lg ${hasFlagged ? 'bg-red-50 border border-red-100' : 'bg-sib-sand'}`}>
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-[11px] font-medium text-sib-text">{otherUser?.name || 'Unknown'}</p>
                                      {hasFlagged && <AlertOctagon size={10} className="text-red-500" />}
                                    </div>
                                    {lastMsg && <p className="text-[10px] text-sib-muted truncate">{lastMsg.text}</p>}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════ DISPUTES TAB ══════════ */}
        {tab === 'disputes' && (
          <div>
            <p className="text-[11px] text-sib-muted font-medium mb-2">
              {(disputes || []).length} dispute{(disputes || []).length !== 1 ? 's' : ''} · {openDisputes.length} open
            </p>

            {(disputes || []).length === 0 && (
              <div className="text-center py-10">
                <AlertTriangle size={28} className="mx-auto text-sib-ash mb-2" />
                <p className="text-sib-muted text-sm">No disputes.</p>
              </div>
            )}

            <div className="space-y-2">
              {(disputes || []).map(d => {
                const buyer = getUserById(d.buyerId)
                const seller = getUserById(d.sellerId)
                const order = orders.find(o => o.id === d.orderId)
                const listing = order ? getListingById(order.listingId) : null
                const isExpanded = expandedDispute === d.id
                const typeLabels = DISPUTE_REASONS || { not_as_described: 'Not as described', not_received: 'Item not received', delivery_issue: 'Delivery issue', wrong_item: 'Wrong item received', damaged: 'Item damaged', admin_review: 'Admin review' }
                const relatedConvo = (conversations || []).find(c =>
                  c.participants.includes(d.buyerId) && c.participants.includes(d.sellerId)
                )
                return (
                  <div key={d.id} className={`rounded-2xl border ${d.status === 'open' ? 'border-orange-200 bg-orange-50/30' : 'border-sib-ash'}`}>
                    <button onClick={() => setExpandedDispute(isExpanded ? null : d.id)} className="w-full flex items-center gap-3 p-3 text-left">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${d.status === 'open' ? 'bg-orange-500 animate-pulse' : 'bg-green-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-sib-text">{typeLabels[d.type] || d.type}</p>
                        <p className="text-xs text-sib-muted">{buyer?.name} vs {seller?.name}</p>
                        <p className="text-[10px] text-sib-muted mt-0.5">{formatDate(d.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge status={d.status} />
                        {isExpanded ? <ChevronUp size={14} className="text-sib-muted" /> : <ChevronDown size={14} className="text-sib-muted" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-sib-ash pt-2.5 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-white rounded-xl border border-sib-ash">
                            <p className="text-[10px] text-sib-muted">Order</p>
                            <p className="text-xs font-semibold text-sib-text">#{order?.id?.slice(-8) || '—'}</p>
                            <p className="text-[10px] text-sib-muted">{listing?.title || '—'} · €{order?.totalPrice?.toFixed(2)}</p>
                          </div>
                          <div className="p-2 bg-white rounded-xl border border-sib-ash">
                            <p className="text-[10px] text-sib-muted">Payout</p>
                            <p className="text-xs font-semibold text-sib-text capitalize">{order?.payoutStatus || 'pending'}</p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-sib-ash">
                          <p className="text-[10px] font-semibold text-sib-muted mb-1">Reason</p>
                          <p className="text-xs text-sib-text leading-snug">{d.description}</p>
                        </div>

                        {relatedConvo && (
                          <div>
                            <p className="text-[10px] font-semibold text-sib-muted mb-1">Related conversation</p>
                            <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-white rounded-xl border border-sib-ash">
                              {(relatedConvo.messages || []).slice(-10).map(m => {
                                const sender = getUserById(m.senderId)
                                const msgFlags = detectFlags(m.text || '')
                                return (
                                  <div key={m.id} className={`p-1.5 rounded-lg text-[11px] ${m.flagged || msgFlags.length > 0 ? 'bg-red-50 border border-red-100' : 'bg-sib-sand'}`}>
                                    <span className="font-semibold text-sib-text">{sender?.name || '?'}: </span>
                                    <span className="text-sib-muted">{m.text}</span>
                                    {msgFlags.length > 0 && (
                                      <span className="ml-1 text-[9px] text-red-500 font-semibold">[{msgFlags.join(', ')}]</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {d.adminMessages && d.adminMessages.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-sib-muted mb-1">Admin notes</p>
                            <div className="space-y-1">
                              {d.adminMessages.map((am, i) => (
                                <div key={i} className="p-1.5 bg-indigo-50 rounded-lg border border-indigo-100 text-[11px] text-indigo-700">
                                  <span className="font-semibold">Admin:</span> {am.text} <span className="text-[9px] text-indigo-400 ml-1">{formatDate(am.createdAt)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {d.status === 'resolved' && d.resolution && (
                          <div className="p-2 rounded-xl bg-green-50 border border-green-100 text-xs text-green-700 font-medium flex items-center gap-1.5">
                            <CheckCircle size={12} />
                            {d.resolution === 'refunded' ? 'Buyer refunded' : d.resolution === 'seller_payout' ? 'Payout released to seller' : 'Dismissed'}
                          </div>
                        )}

                        {d.status === 'open' && (
                          <div className="space-y-2">
                            <div className="flex gap-1.5">
                              <input type="text" placeholder="Send message to parties..."
                                value={disputeMsg} onChange={e => setDisputeMsg(e.target.value)}
                                className="flex-1 px-3 py-2 bg-white border border-sib-ash rounded-xl text-xs outline-none focus:border-sib-primary" />
                              <button onClick={() => {
                                if (!disputeMsg.trim()) return
                                addDisputeMessage(d.id, disputeMsg.trim())
                                showToast('Message sent')
                                setDisputeMsg('')
                              }} className="w-10 h-10 bg-sib-primary rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95">
                                <Send size={13} className="text-white" />
                              </button>
                            </div>
                            <button onClick={() => {
                              addDisputeMessage(d.id, 'Please provide photo/screenshot evidence to support your claim.')
                              showToast('Evidence request sent')
                            }} className="w-full py-2 bg-purple-50 text-purple-700 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-purple-100 active:scale-95">
                              <Mail size={11} /> Request Evidence
                            </button>

                            {order && order.payoutStatus !== 'held' && (
                              <button onClick={() => { holdPayout(order.id); showToast('Funds frozen for dispute') }}
                                className="w-full py-2 bg-orange-50 text-orange-700 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-orange-100 active:scale-95">
                                <Lock size={11} /> Freeze Funds
                              </button>
                            )}

                            <div className="flex gap-1.5">
                              <button onClick={() => { resolveDispute(d.id, 'refunded'); showToast('Dispute resolved — buyer refunded') }}
                                className="flex-1 py-2 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-blue-100 active:scale-95">
                                <RefreshCw size={11} /> Refund Buyer
                              </button>
                              <button onClick={() => { resolveDispute(d.id, 'seller_payout'); showToast('Dispute resolved — seller paid') }}
                                className="flex-1 py-2 bg-green-50 text-green-700 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-green-100 active:scale-95">
                                <Unlock size={11} /> Pay Seller
                              </button>
                              <button onClick={() => { resolveDispute(d.id, 'dismissed'); showToast('Dispute dismissed') }}
                                className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-100 active:scale-95">
                                <XCircle size={13} className="text-red-500" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════ CHATS TAB ══════════ */}
        {tab === 'chats' && (
          <div>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setChatFilter('all')}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border ${chatFilter === 'all' ? 'bg-sib-primary text-white border-sib-primary' : 'bg-white text-sib-muted border-sib-ash'}`}>
                All ({analyzedChats.length})
              </button>
              <button onClick={() => setChatFilter('flagged')}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1 ${chatFilter === 'flagged' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-500 border-red-200'}`}>
                <AlertOctagon size={11} /> Flagged ({analyzedChats.filter(c => c.hasFlagged).length})
              </button>
            </div>

            <p className="text-[11px] text-sib-muted font-medium mb-2">
              {filteredChats.length} conversation{filteredChats.length !== 1 ? 's' : ''}
              {chatFilter === 'flagged' && ' with suspicious content'}
            </p>

            {filteredChats.length === 0 && (
              <div className="text-center py-10">
                <MessageSquare size={28} className="mx-auto text-sib-ash mb-2" />
                <p className="text-sib-muted text-sm">{chatFilter === 'flagged' ? 'No flagged conversations.' : 'No conversations yet.'}</p>
              </div>
            )}

            <div className="space-y-2">
              {filteredChats.map(c => {
                const p1 = getUserById(c.participants[0])
                const p2 = getUserById(c.participants[1])
                const listing = c.listingId ? getListingById(c.listingId) : null
                const isExpanded = expandedChat === c.id
                return (
                  <div key={c.id} className={`rounded-2xl border ${c.hasFlagged ? 'border-red-200 bg-red-50/30' : 'border-sib-ash'}`}>
                    <button onClick={() => setExpandedChat(isExpanded ? null : c.id)} className="w-full p-3 text-left">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2 flex-shrink-0">
                          <UserAvatar user={p1} size="xs" />
                          <UserAvatar user={p2} size="xs" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-sib-text">{p1?.name || '?'} ↔ {p2?.name || '?'}</p>
                          <p className="text-[10px] text-sib-muted">{listing?.title || 'Direct message'} · {c.messages?.length || 0} msgs</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {c.hasFlagged && (
                            <span className="text-[9px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <AlertOctagon size={9} /> {c.flaggedCount}
                            </span>
                          )}
                          {isExpanded ? <ChevronUp size={13} className="text-sib-muted" /> : <ChevronDown size={13} className="text-sib-muted" />}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-sib-ash pt-2 max-h-72 overflow-y-auto">
                        {(c.messages || []).map(m => {
                          const sender = getUserById(m.senderId)
                          const msgFlags = detectFlags(m.text || '')
                          const isFlagged = m.flagged || msgFlags.length > 0
                          return (
                            <div key={m.id} className={`p-2 rounded-xl mb-1 ${isFlagged ? 'bg-red-50 border border-red-200' : 'bg-sib-sand'}`}>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[11px] font-semibold text-sib-text">{sender?.name || '?'}</span>
                                <span className="text-[9px] text-sib-muted">{formatDate(m.timestamp)}</span>
                                {isFlagged && <AlertOctagon size={10} className="text-red-500 ml-auto" />}
                              </div>
                              <p className="text-xs text-sib-text leading-snug">{m.text}</p>
                              {msgFlags.length > 0 && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {msgFlags.map((f, i) => (
                                    <span key={i} className="text-[8px] font-bold text-red-600 bg-red-100 px-1 py-0.5 rounded">{f}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════ LISTINGS TAB ══════════ */}
        {tab === 'listings' && (
          <div>
            <div className="relative mb-3">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sib-muted" />
              <input type="text" placeholder="Search listings, brands, users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-sib-sand rounded-xl text-xs border-none outline-none" />
            </div>
            <p className="text-[11px] text-sib-muted font-medium mb-2">{filteredListings.length} listings</p>

            {filteredListings.length === 0 && (
              <div className="text-center py-10">
                <Package size={28} className="mx-auto text-sib-ash mb-2" />
                <p className="text-sib-muted text-sm">No listings found.</p>
              </div>
            )}

            <div className="space-y-2">
              {filteredListings.map(l => {
                const owner = getUserById(l.userId || l.sellerId)
                const currentTags = l.manualStyleTags?.length ? l.manualStyleTags : (l.styleTags?.length ? l.styleTags : classifyListing(l))
                const isManual = Array.isArray(l.manualStyleTags) && l.manualStyleTags.length > 0
                return (
                  <div key={l.id} className="p-3 rounded-2xl border border-sib-ash">
                    <div className="flex items-center gap-3">
                      {l.images?.[0] && <img src={l.images[0]} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" alt="" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-sib-text line-clamp-1">{l.title}</p>
                        <p className="text-xs text-sib-muted">€{l.price?.toFixed(2)} · {owner?.name || '?'} {owner?.username ? <span className="text-sib-muted/70">@{owner.username}</span> : ''}</p>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          <Badge status={l.status || 'active'} />
                          {l.brand && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-sib-sand text-sib-muted border border-sib-ash">{l.brand}</span>}
                          {l.flagged && <Badge label="Flagged" status="flagged" />}
                          {l.hidden && <Badge label="Hidden" status="hidden" />}
                        </div>
                      </div>
                    </div>

                    {/* ── Style Tags display + edit ── */}
                    <div className="mt-2 pt-2 border-t border-sib-ash">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Tags size={10} className="text-sib-muted" />
                        <p className="text-[10px] font-semibold text-sib-muted uppercase tracking-wider">
                          Style Tags {isManual && <span className="text-indigo-500 normal-case">(manual override)</span>}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-wrap mb-1.5">
                        {currentTags.map(tag => {
                          const rule = STYLE_RULES.find(r => r.id === tag)
                          return (
                            <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {rule?.emoji || ''} {getStyleLabel(tag)}
                              <button
                                onClick={() => {
                                  const newTags = currentTags.filter(t => t !== tag)
                                  const manual = newTags.length > 0 ? newTags : undefined
                                  updateStyleTags(l.id, manual || classifyListing(l), manual)
                                  showToast(`Removed "${getStyleLabel(tag)}" tag`)
                                }}
                                className="ml-0.5 hover:text-red-500 transition-colors"
                              >
                                <X size={9} />
                              </button>
                            </span>
                          )
                        })}
                      </div>
                      {/* Add tag buttons — show styles not currently assigned */}
                      {(() => {
                        const available = STYLE_RULES.filter(r => !currentTags.includes(r.id))
                        if (available.length === 0) return null
                        return (
                          <div className="flex gap-1 flex-wrap">
                            {available.map(rule => (
                              <button
                                key={rule.id}
                                onClick={() => {
                                  const newTags = [...currentTags, rule.id]
                                  updateStyleTags(l.id, newTags, newTags)
                                  showToast(`Added "${rule.label}" tag`)
                                }}
                                className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gray-50 text-sib-muted border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              >
                                <Plus size={8} /> {rule.emoji} {rule.label}
                              </button>
                            ))}
                          </div>
                        )
                      })()}
                      {/* Re-classify button (reset manual override) */}
                      {isManual && (
                        <button
                          onClick={() => {
                            const autoTags = classifyListing(l)
                            updateStyleTags(l.id, autoTags, null)
                            showToast('Reset to auto-classification')
                          }}
                          className="mt-1.5 text-[10px] font-medium text-sib-primary flex items-center gap-0.5 hover:underline"
                        >
                          <RefreshCw size={9} /> Reset to auto-classify
                        </button>
                      )}
                    </div>

                    <div className="flex gap-1.5 mt-2 pt-2 border-t border-sib-ash">
                      {!l.flagged ? (
                        <button onClick={() => { flagListing(l.id); showToast('Listing flagged') }}
                          className="flex-1 py-1.5 bg-orange-50 text-orange-600 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-orange-100 active:scale-95">
                          <Flag size={11} /> Flag
                        </button>
                      ) : (
                        <button onClick={() => { flagListing(l.id); showToast('Flag removed') }}
                          className="flex-1 py-1.5 bg-green-50 text-green-600 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-green-100 active:scale-95">
                          <CheckCircle size={11} /> Unflag
                        </button>
                      )}
                      {!l.hidden ? (
                        <button onClick={() => { hideListing(l.id); showToast('Listing hidden') }}
                          className="flex-1 py-1.5 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-gray-200 active:scale-95">
                          <EyeOff size={11} /> Hide
                        </button>
                      ) : (
                        <button onClick={() => { hideListing(l.id); showToast('Listing visible') }}
                          className="flex-1 py-1.5 bg-blue-50 text-blue-600 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 border border-blue-100 active:scale-95">
                          <Eye size={11} /> Show
                        </button>
                      )}
                      <button onClick={() => { if (window.confirm('Permanently delete this listing?')) { deleteListing(l.id); showToast('Listing deleted') } }}
                        className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-100 active:scale-95">
                        <Trash2 size={12} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════ EMAILS TAB ══════════ */}
        {tab === 'emails' && (
          <div>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sib-muted" />
                <input type="text" placeholder="Search emails..." value={emailSearch} onChange={e => setEmailSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-sib-sand rounded-xl text-xs border-none outline-none" />
              </div>
              <button onClick={fetchEmailLogs}
                className="px-3 py-2 bg-sib-sand rounded-xl text-xs font-semibold text-sib-muted border border-sib-ash flex items-center gap-1 active:scale-95">
                <RefreshCw size={11} className={emailLogsLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar pb-1">
              {['all', 'success', 'failed'].map(s => (
                <button key={s} onClick={() => setEmailFilter(s)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize whitespace-nowrap border transition-colors ${
                    emailFilter === s ? 'bg-sib-primary text-white border-sib-primary' : 'bg-white text-sib-muted border-sib-ash'
                  }`}>
                  {s}
                </button>
              ))}
            </div>

            {(() => {
              let filtered = emailLogs
              if (emailFilter !== 'all') {
                filtered = filtered.filter(e => emailFilter === 'success'
                  ? (e.status === 'success' || e.status === 'sent')
                  : e.status === emailFilter)
              }
              if (emailSearch.trim()) {
                const q = emailSearch.toLowerCase()
                filtered = filtered.filter(e =>
                  e.recipient?.toLowerCase().includes(q) ||
                  e.email_type?.toLowerCase().includes(q) ||
                  e.subject?.toLowerCase().includes(q) ||
                  e.resend_id?.toLowerCase().includes(q)
                )
              }
              const successCount = emailLogs.filter(e => e.status === 'success' || e.status === 'sent').length
              const failedCount = emailLogs.filter(e => e.status === 'failed').length

              return (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-[11px] text-sib-muted font-medium">{filtered.length} email{filtered.length !== 1 ? 's' : ''}</p>
                    <div className="flex gap-2 text-[10px]">
                      <span className="text-green-600 font-semibold">{successCount} success</span>
                      <span className="text-red-500 font-semibold">{failedCount} failed</span>
                    </div>
                  </div>

                  {emailLogsLoading && filtered.length === 0 && (
                    <div className="text-center py-10">
                      <RefreshCw size={20} className="mx-auto text-sib-ash mb-2 animate-spin" />
                      <p className="text-sib-muted text-sm">Loading email logs...</p>
                    </div>
                  )}

                  {!emailLogsLoading && filtered.length === 0 && (
                    <div className="text-center py-10">
                      <Mail size={28} className="mx-auto text-sib-ash mb-2" />
                      <p className="text-sib-muted text-sm">No email logs found.</p>
                      <p className="text-[11px] text-sib-muted mt-1">Emails will appear here once sent via the Edge Function.</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {filtered.map((log, idx) => {
                      const isSent = log.status === 'success' || log.status === 'sent'
                      const typeLabel = (log.email_type || '').replace(/_/g, ' ')
                      return (
                        <div key={log.id || idx} className={`p-3 rounded-2xl border ${isSent ? 'border-sib-ash' : 'border-red-200 bg-red-50/30'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full border ${
                              isSent ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-500 border-red-200'
                            }`}>
                              {log.status}
                            </span>
                            <span className="text-[10px] text-sib-muted">{formatDate(log.created_at)}</span>
                          </div>
                          <p className="text-xs font-semibold text-sib-text capitalize">{typeLabel}</p>
                          <p className="text-[11px] text-sib-muted mt-0.5">To: {log.recipient}</p>
                          {log.subject && <p className="text-[11px] text-sib-muted mt-0.5 line-clamp-1">Subject: {log.subject}</p>}
                          {log.resend_id && <p className="text-[10px] text-sib-muted/60 font-mono mt-0.5">Resend ID: {log.resend_id}</p>}
                          {log.error_message && (
                            <div className="mt-1.5 p-2 bg-red-50 rounded-lg border border-red-100">
                              <p className="text-[10px] text-red-600 font-medium">Error:</p>
                              <p className="text-[10px] text-red-500 break-all">{log.error_message.slice(0, 300)}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            })()}
          </div>
        )}

      </div>
    </div>
  )
}
