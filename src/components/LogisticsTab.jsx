/**
 * LogisticsTab — Admin logistics dispatch board.
 * Renders inside AdminPage as a tab. Uses localStorage-backed useLogistics hook.
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Search, ChevronDown, ChevronUp, Truck, Package, MapPin, Phone,
  User, Calendar, Edit3, Save, X, Bell, CheckCircle, Clock,
  AlertTriangle, ArrowRight, StickyNote, Filter, Eye, Clipboard,
} from 'lucide-react'
import { useLogistics, LOGISTICS_STATUSES, LOGISTICS_FILTER_PRESETS } from '../hooks/useLogistics'

const TEST_DROPOFF_STORE = {
  id: 'my-sliema-dingli',
  name: 'MY Sliema - Dingli Street',
  address: 'Dingli Street, Sliema',
}

/* ── helpers ───────────────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return d }
}
function fmtShort(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-MT', { day: 'numeric', month: 'short' }) } catch { return d }
}

function StatusBadge({ statusId }) {
  const s = LOGISTICS_STATUSES.find(x => x.id === statusId)
  if (!s) return <span className="text-[10px] text-gray-500">{statusId}</span>
  return (
    <span className={`text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full border ${s.color}`}>
      {s.label}
    </span>
  )
}

function getDropoffState(shipment, order) {
  if (shipment?.status === 'dropped_off') {
    return {
      label: 'Confirmed dropped off at MY store',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }
  if (order?.sellerClaimedDropoff || shipment?.sellerClaimedDropoff) {
    return {
      label: 'Drop-off pending confirmation',
      className: 'border-blue-200 bg-blue-50 text-blue-700',
    }
  }
  return {
    label: 'Awaiting seller drop-off',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  }
}

function DropoffStateBadge({ shipment, order }) {
  const state = getDropoffState(shipment, order)
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${state.className}`}>
      {state.label}
    </span>
  )
}

/* ── Order detail drawer ───────────────────────────────────── */
function OrderDrawer({ order, listing, buyer, seller, shipment, logistics, onUpdate, onClose }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    pickupDay: logistics.pickupDay || '',
    deliveryDay: logistics.deliveryDay || '',
    assignedDriver: logistics.assignedDriver || '',
    logisticsStatus: logistics.logisticsStatus || 'paid',
    internalNotes: logistics.internalNotes || '',
  })

  useEffect(() => {
    setForm({
      pickupDay: logistics.pickupDay || '',
      deliveryDay: logistics.deliveryDay || '',
      assignedDriver: logistics.assignedDriver || '',
      logisticsStatus: logistics.logisticsStatus || 'paid',
      internalNotes: logistics.internalNotes || '',
    })
  }, [logistics])

  const handleSave = () => {
    onUpdate(order.id, form)
    setEditing(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-3xl">
          <div>
            <p className="text-[10px] font-mono text-gray-400">#{order.id?.slice(-8)}</p>
            <p className="text-sm font-bold text-gray-900">{listing?.title || 'Unknown item'}</p>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                <Edit3 size={14} className="text-gray-600" />
              </button>
            ) : (
              <button onClick={handleSave} className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors">
                <Save size={14} className="text-emerald-600" />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
              <X size={14} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* ── Order section ─── */}
          <Section title="Order" icon={<Package size={13} />}>
            <Row label="Order ID" value={`#${order.id?.slice(-8)}`} mono />
            <Row label="Created" value={fmtDate(order.createdAt)} />
            <Row label="Item" value={listing?.title || '—'} />
            <Row label="Price" value={`€${order.totalPrice?.toFixed(2) || '—'}`} />
            <Row label="Order Status" value={order.trackingStatus} />
            <Row label="Payout" value={order.payoutStatus || 'pending'} />
          </Section>

          {/* ── Buyer section (snapshot fields → fallback to user record) ─── */}
          <Section title="Buyer (Deliver to)" icon={<User size={13} />}>
            <Row label="Name" value={order.buyerFullName || buyer?.name || '—'} />
            <Row label="Phone" value={order.buyerPhone || buyer?.phone || '—'} />
            <Row label="Email" value={buyer?.email || '—'} />
            <Row label="Address" value={order.address || '—'} />
            {(order.buyerCity || order.buyerPostcode) && (
              <Row label="City / Postcode" value={[order.buyerCity, order.buyerPostcode].filter(Boolean).join(', ')} />
            )}
            {order.deliveryNotes && (
              <Row label="Notes" value={order.deliveryNotes} />
            )}
          </Section>

          {/* ── Seller section (snapshot fields → fallback to user record) ─── */}
          <Section title="Seller (Pickup from)" icon={<User size={13} />}>
            <Row label="Name" value={order.sellerName || seller?.name || '—'} />
            <Row label="Phone" value={order.sellerPhone || seller?.phone || '—'} />
            <Row label="Email" value={seller?.email || '—'} />
            <Row label="Address" value={order.sellerAddress || seller?.location || '—'} />
          </Section>

          {/* ── Logistics section (editable) ─── */}
          <Section title="Logistics" icon={<Truck size={13} />}>
            {editing ? (
              <div className="space-y-2.5">
                <FormField label="Logistics Status">
                  <select value={form.logisticsStatus} onChange={e => setForm(f => ({ ...f, logisticsStatus: e.target.value }))}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300">
                    {LOGISTICS_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Pickup Day">
                  <input type="date" value={form.pickupDay} onChange={e => setForm(f => ({ ...f, pickupDay: e.target.value }))}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300" />
                </FormField>
                <FormField label="Delivery Day">
                  <input type="date" value={form.deliveryDay} onChange={e => setForm(f => ({ ...f, deliveryDay: e.target.value }))}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300" />
                </FormField>
                <FormField label="Assigned Driver">
                  <input type="text" value={form.assignedDriver} onChange={e => setForm(f => ({ ...f, assignedDriver: e.target.value }))}
                    placeholder="Driver name..." className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300" />
                </FormField>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-gray-400 font-medium">Status:</span>
                  <StatusBadge statusId={logistics.logisticsStatus} />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-gray-400 font-medium">Drop-off:</span>
                  <DropoffStateBadge shipment={shipment} order={order} />
                </div>
                <Row label="Pickup Day" value={logistics.pickupDay ? fmtShort(logistics.pickupDay) : '—'} />
                <Row label="Delivery Day" value={logistics.deliveryDay ? fmtShort(logistics.deliveryDay) : '—'} />
                <Row label="Assigned Driver" value={logistics.assignedDriver || '—'} />
                <Row label="Seller claimed at" value={order?.sellerDropoffClaimedAt || shipment?.sellerDropoffClaimedAt ? fmtDate(order?.sellerDropoffClaimedAt || shipment?.sellerDropoffClaimedAt) : '-'} />
                <Row label="MY store confirmed" value={shipment?.droppedOffAt ? fmtDate(shipment.droppedOffAt) : '-'} />
              </>
            )}
          </Section>

          {/* ── Internal notes section ─── */}
          <Section title="Internal Notes" icon={<StickyNote size={13} />}>
            {editing ? (
              <textarea value={form.internalNotes} onChange={e => setForm(f => ({ ...f, internalNotes: e.target.value }))}
                rows={3} placeholder="Internal notes (not visible to users)..."
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300 resize-none" />
            ) : (
              <p className="text-xs text-gray-600 whitespace-pre-wrap">{logistics.internalNotes || 'No notes yet.'}</p>
            )}
          </Section>

          {/* ── History log ─── */}
          {logistics.history && logistics.history.length > 0 && (
            <Section title="History" icon={<Clock size={13} />}>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {[...logistics.history].reverse().map((h, i) => (
                  <div key={i} className="text-[10px] text-gray-500 flex gap-2">
                    <span className="text-gray-300 font-mono flex-shrink-0">{fmtDate(h.ts)}</span>
                    <span>
                      {Object.entries(h.changes).map(([k, v]) => (
                        <span key={k} className="block">
                          <span className="font-medium text-gray-600">{k.replace(/([A-Z])/g, ' $1').trim()}</span>:{' '}
                          <span className="text-red-400 line-through">{v.from || '—'}</span> → <span className="text-emerald-600">{v.to || '—'}</span>
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Quick status buttons */}
          {editing && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Quick Status</p>
              <div className="flex flex-wrap gap-1.5">
                {LOGISTICS_STATUSES.map(s => (
                  <button key={s.id} onClick={() => setForm(f => ({ ...f, logisticsStatus: s.id }))}
                    className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
                      form.logisticsStatus === s.id ? 'bg-blue-600 text-white border-blue-600' : `${s.color} hover:opacity-80`
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Driver View ──────────────────────────────────────────── */
function DriverView({ orders, getUserById, getListingById, logisticsData, getLogistics, updateLogistics }) {
  const driverOrders = useMemo(() => {
    return orders.filter(o => {
      const lg = getLogistics(o.id)
      return ['pickup_booked', 'collected', 'out_for_delivery'].includes(lg.logisticsStatus)
    }).sort((a, b) => {
      const la = getLogistics(a.id)
      const lb = getLogistics(b.id)
      const priority = { pickup_booked: 0, collected: 1, out_for_delivery: 2 }
      return (priority[la.logisticsStatus] ?? 9) - (priority[lb.logisticsStatus] ?? 9)
    })
  }, [orders, getLogistics, logisticsData])

  if (driverOrders.length === 0) {
    return (
      <div className="text-center py-10">
        <Truck size={28} className="mx-auto text-gray-300 mb-2" />
        <p className="text-gray-500 text-sm">No active deliveries.</p>
        <p className="text-[11px] text-gray-400 mt-1">Orders will appear here when pickup is booked.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-500 font-medium mb-1">{driverOrders.length} active stop{driverOrders.length !== 1 ? 's' : ''}</p>
      {driverOrders.map(order => {
        const lg = getLogistics(order.id)
        const listing = getListingById(order.listingId)
        const buyer = getUserById(order.buyerId)
        const seller = getUserById(order.sellerId)
        const isPickup = lg.logisticsStatus === 'pickup_booked'
        const isCollected = lg.logisticsStatus === 'collected'
        const isOFD = lg.logisticsStatus === 'out_for_delivery'
        // Prefer snapshot fields, fall back to user record
        const contactName = isPickup
          ? (order.sellerName || seller?.name || '—')
          : (order.buyerFullName || buyer?.name || '—')
        const contactPhone = isPickup
          ? (order.sellerPhone || seller?.phone || '—')
          : (order.buyerPhone || buyer?.phone || '—')
        const address = isPickup
          ? (order.sellerAddress || seller?.location || '—')
          : (order.address || '—')

        const nextStatus = isPickup ? 'collected' : isCollected ? 'out_for_delivery' : isOFD ? 'delivered' : null
        const failStatus = isPickup ? 'pickup_failed' : 'delivery_failed'
        const nextLabel = isPickup ? 'Collected' : isCollected ? 'Out for Delivery' : isOFD ? 'Delivered' : null

        return (
          <div key={order.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <StatusBadge statusId={lg.logisticsStatus} />
                  <span className="text-[10px] font-mono text-gray-400">#{order.id?.slice(-8)}</span>
                </div>
                {lg.assignedDriver && (
                  <span className="text-[10px] text-blue-600 font-medium">{lg.assignedDriver}</span>
                )}
              </div>

              <p className="text-sm font-semibold text-gray-900 mb-1">{listing?.title || 'Unknown item'}</p>

              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <User size={11} className="text-gray-400 flex-shrink-0" />
                  <span className="font-medium">{isPickup ? 'Seller' : 'Buyer'}:</span>
                  <span>{contactName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone size={11} className="text-gray-400 flex-shrink-0" />
                  <span>{contactPhone}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <MapPin size={11} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>{address}</span>
                </div>
                {lg.internalNotes && (
                  <div className="flex items-start gap-1.5 mt-1 pt-1 border-t border-gray-100">
                    <StickyNote size={11} className="text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-500 italic">{lg.internalNotes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex border-t border-gray-100">
              {nextStatus && (
                <button onClick={() => updateLogistics(order.id, { logisticsStatus: nextStatus })}
                  className="flex-1 py-2.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1 border-r border-gray-100">
                  <CheckCircle size={12} /> {nextLabel}
                </button>
              )}
              <button onClick={() => updateLogistics(order.id, { logisticsStatus: failStatus })}
                className="flex-1 py-2.5 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
                <AlertTriangle size={12} /> Failed
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Small helper components ──────────────────────────────── */
function Section({ title, icon, children }) {
  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-3 py-2.5 text-xs space-y-1">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">{label}</span>
      <span className={`text-[11px] text-gray-700 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5 block">{label}</label>
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN EXPORT — LogisticsTab
   ══════════════════════════════════════════════════════════════ */
export default function LogisticsTab({ orders, getUserById, getListingById, getShipmentByOrderId, deliverySheetRows = [], markShipmentDroppedOff, loading = false, showToast }) {
  const {
    logisticsData, logisticsNotifications, getLogistics, updateLogistics, initOrder,
    markNotifRead, clearNotifs,
  } = useLogistics()

  const [filter, setFilter] = useState('all')
  const [searchQ, setSearchQ] = useState('')
  const [drawerOrder, setDrawerOrder] = useState(null)
  const [viewMode, setViewMode] = useState('dispatch') // 'dispatch' | 'driver' | 'sheet' | 'notifications'
  const [testOrderId, setTestOrderId] = useState('')
  const [testDropOffLoading, setTestDropOffLoading] = useState(false)

  // Auto-init paid orders that don't have logistics records yet
  useEffect(() => {
    for (const o of orders) {
      if (['paid', 'shipped', 'delivered'].includes(o.trackingStatus) || o.paidAt) {
        initOrder(o.id)
      }
    }
  }, [orders, initOrder])

  // Relevant orders = paid/shipped/delivered
  const relevantOrders = useMemo(() => {
    return orders.filter(o => ['paid', 'shipped', 'delivered'].includes(o.trackingStatus) || o.paidAt)
  }, [orders])

  useEffect(() => {
    if (!testOrderId && relevantOrders.length > 0) {
      setTestOrderId(relevantOrders[0].id)
    }
  }, [relevantOrders, testOrderId])

  // Filtered + searched
  const filteredOrders = useMemo(() => {
    let result = relevantOrders

    if (filter !== 'all') {
      if (filter === 'failed') {
        result = result.filter(o => {
          const lg = getLogistics(o.id)
          return ['pickup_failed', 'delivery_failed', 'hold_dispute'].includes(lg.logisticsStatus)
        })
      } else {
        result = result.filter(o => getLogistics(o.id).logisticsStatus === filter)
      }
    }

    if (searchQ.trim()) {
      const q = searchQ.toLowerCase()
      result = result.filter(o => {
        const listing = getListingById(o.listingId)
        const buyer = getUserById(o.buyerId)
        const seller = getUserById(o.sellerId)
        const lg = getLogistics(o.id)
        return (
          o.id?.toLowerCase().includes(q) ||
          listing?.title?.toLowerCase().includes(q) ||
          buyer?.name?.toLowerCase().includes(q) ||
          seller?.name?.toLowerCase().includes(q) ||
          lg.assignedDriver?.toLowerCase().includes(q)
        )
      })
    }

    return result
  }, [relevantOrders, filter, searchQ, getLogistics, getListingById, getUserById, logisticsData])

  // Counts per status
  const statusCounts = useMemo(() => {
    const counts = { all: relevantOrders.length, failed: 0 }
    for (const o of relevantOrders) {
      const st = getLogistics(o.id).logisticsStatus
      counts[st] = (counts[st] || 0) + 1
      if (['pickup_failed', 'delivery_failed', 'hold_dispute'].includes(st)) counts.failed++
    }
    return counts
  }, [relevantOrders, getLogistics, logisticsData])

  const unreadNotifs = logisticsNotifications.filter(n => !n.read).length

  const handleUpdate = (orderId, updates) => {
    updateLogistics(orderId, updates)
    showToast?.('Logistics updated')
  }

  const handleTestDropOff = async () => {
    if (!testOrderId) return
    console.log('Dropping off order:', testOrderId)
    setTestDropOffLoading(true)
    try {
      const result = await markShipmentDroppedOff(testOrderId, TEST_DROPOFF_STORE)
      if (!result?.error) setViewMode('sheet')
    } finally {
      setTestDropOffLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-4 rounded-3xl border-2 border-amber-400 bg-amber-50 p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <p className="text-sm font-black uppercase tracking-wider text-amber-800">MVP TEST: Mark Shipment Dropped Off</p>
            <p className="mt-1 text-xs font-medium text-amber-700">
              Select a paid order and run the real MYconvenience scan flow for {TEST_DROPOFF_STORE.name}.
            </p>
            <select
              value={testOrderId}
              onChange={e => setTestOrderId(e.target.value)}
              className="mt-3 w-full rounded-2xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-amber-500"
            >
              {relevantOrders.length === 0 ? (
                <option value="">No paid orders available</option>
              ) : relevantOrders.map(order => {
                const listing = getListingById(order.listingId)
                const shipment = getShipmentByOrderId?.(order.id)
                return (
                  <option key={order.id} value={order.id}>
                    #{order.id?.slice(-8)} - {listing?.title || 'Unknown item'}{shipment ? '' : ' (no shipment yet)'}
                  </option>
                )
              })}
            </select>
          </div>
          <button
            type="button"
            onClick={handleTestDropOff}
            disabled={!testOrderId || testDropOffLoading}
            className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testDropOffLoading ? 'Marking dropped off...' : 'Mark Dropped Off (MY Sliema)'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-3 text-xs font-semibold text-gray-500">
          Loading logistics data...
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setViewMode('dispatch')}
          className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            viewMode === 'dispatch' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'
          }`}>
          <Clipboard size={11} className="inline mr-1" />Dispatch Board
        </button>
        <button onClick={() => setViewMode('driver')}
          className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            viewMode === 'driver' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'
          }`}>
          <Truck size={11} className="inline mr-1" />Driver View
        </button>
        <button onClick={() => setViewMode('notifications')}
          className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors relative ${
            viewMode === 'notifications' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'
          }`}>
          <Bell size={11} className="inline mr-1" />Alerts
          {unreadNotifs > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unreadNotifs > 9 ? '9+' : unreadNotifs}
            </span>
          )}
        </button>
        <button onClick={() => setViewMode('sheet')}
          className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            viewMode === 'sheet' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'
          }`}>
          <Clipboard size={11} className="inline mr-1" />Delivery Sheet
        </button>
      </div>

      {/* ── Notifications view ─── */}
      {viewMode === 'notifications' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-gray-500 font-medium">{logisticsNotifications.length} notification{logisticsNotifications.length !== 1 ? 's' : ''}</p>
            {logisticsNotifications.length > 0 && (
              <button onClick={clearNotifs} className="text-[10px] text-red-500 font-semibold">Clear all</button>
            )}
          </div>
          {logisticsNotifications.length === 0 ? (
            <div className="text-center py-10">
              <Bell size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">No logistics notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {logisticsNotifications.map(n => (
                <div key={n.id}
                  onClick={() => markNotifRead(n.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-colors ${
                    n.read ? 'border-gray-100 bg-white' : 'border-blue-200 bg-blue-50/50'
                  }`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <StatusBadge statusId={n.type} />
                    <span className="text-[10px] text-gray-400">{fmtDate(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-700">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Driver view ─── */}
      {viewMode === 'driver' && (
        <DriverView
          orders={relevantOrders}
          getUserById={getUserById}
          getListingById={getListingById}
          logisticsData={logisticsData}
          getLogistics={getLogistics}
          updateLogistics={handleUpdate}
        />
      )}

      {/* ── Dispatch board ─── */}
      {viewMode === 'sheet' && (
        <div>
          <p className="text-[11px] text-gray-500 font-medium mb-2">
            {deliverySheetRows.length} delivery spreadsheet row{deliverySheetRows.length !== 1 ? 's' : ''}
          </p>
          {deliverySheetRows.length === 0 ? (
            <div className="text-center py-10">
              <Clipboard size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">No store drop-offs yet.</p>
              <p className="text-[11px] text-gray-400 mt-1">Rows appear here when a MYconvenience store scans a seller drop-off code.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Order', 'Shipment', 'Seller', 'Buyer', 'Item', 'Drop-off store', 'Dropped off', 'Buyer address', 'Buyer contact', 'Status', 'Fallback', 'Notes'].map(header => (
                      <th key={header} className="px-3 py-2.5 font-semibold text-gray-500 text-[10px] uppercase tracking-wider">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deliverySheetRows.map(row => (
                    <tr key={row.shipmentId || row.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-[11px] font-mono text-gray-500">{row.orderId?.slice(-8) || '—'}</td>
                      <td className="px-3 py-2.5 text-[11px] font-mono text-gray-500">{row.shipmentId?.slice(-8) || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-700">{row.sellerName || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-700">{row.buyerName || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-900 font-medium">{row.itemTitle || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-700">
                        <p className="font-medium">{row.dropoffStoreName || '—'}</p>
                        <p className="text-[10px] text-gray-400">{row.dropoffStoreAddress || '—'}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{fmtDate(row.droppedOffAt)}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[180px] truncate">{row.buyerDeliveryAddress || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{row.buyerContact || '—'}</td>
                      <td className="px-3 py-2.5"><StatusBadge statusId={row.deliveryStatus || 'dropped_off'} /></td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{row.fallbackStoreName || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[160px] truncate">{row.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {viewMode === 'dispatch' && (
        <>
          {/* Search */}
          <div className="relative mb-3">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search orders, buyers, sellers, drivers..."
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              className="w-full pl-7 pr-3 py-2 bg-gray-100 rounded-xl text-xs border-none outline-none" />
          </div>

          {/* Filter pills */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar pb-1">
            {LOGISTICS_FILTER_PRESETS.map(fp => (
              <button key={fp.id} onClick={() => setFilter(fp.id)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize whitespace-nowrap border transition-colors flex items-center gap-1 ${
                  filter === fp.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'
                }`}>
                {fp.label}
                {statusCounts[fp.id] > 0 && (
                  <span className={`text-[9px] font-bold ${filter === fp.id ? 'text-white/70' : 'text-gray-400'}`}>
                    {statusCounts[fp.id]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-gray-500 font-medium mb-2">{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}</p>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-10">
              <Package size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">No orders match this filter.</p>
            </div>
          ) : (
            /* ── Desktop table (hidden on mobile) ─── */
            <>
              {/* Mobile cards */}
              <div className="space-y-2 lg:hidden">
                {filteredOrders.map(order => {
                  const listing = getListingById(order.listingId)
                  const buyer = getUserById(order.buyerId)
                  const seller = getUserById(order.sellerId)
                  const lg = getLogistics(order.id)
                  const shipment = getShipmentByOrderId?.(order.id)
                  return (
                    <button key={order.id} onClick={() => setDrawerOrder(order)}
                      className="w-full text-left rounded-2xl border border-gray-200 p-3 hover:border-blue-200 transition-colors bg-white active:scale-[0.99]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-gray-400">#{order.id?.slice(-8)}</span>
                        <StatusBadge statusId={lg.logisticsStatus} />
                      </div>
                      <div className="mb-1.5">
                        <DropoffStateBadge shipment={shipment} order={order} />
                      </div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{listing?.title || 'Unknown'}</p>
                      <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-500">
                        <span>{buyer?.name || '?'} → {seller?.name || '?'}</span>
                        <span>€{order.totalPrice?.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-gray-400">
                        {lg.assignedDriver && <span>🚗 {lg.assignedDriver}</span>}
                        {lg.pickupDay && <span>📦 {fmtShort(lg.pickupDay)}</span>}
                        {lg.deliveryDay && <span>🏠 {fmtShort(lg.deliveryDay)}</span>}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto rounded-2xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-3 py-2.5 font-semibold text-gray-500 text-[10px] uppercase tracking-wider">Order</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-500 text-[10px] uppercase tracking-wider">Created</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-500 text-[10px] uppercase tracking-wider">Item</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-500 text-[10px] uppercase tracking-wider">Buyer</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-500 text-[10px] uppercase tracking-wider">Seller</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-500 text-[10px] uppercase tracking-wider">Pickup</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-500 text-[10px] uppercase tracking-wider">Delivery</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-500 text-[10px] uppercase tracking-wider">Driver</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-500 text-[10px] uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-500 text-[10px] uppercase tracking-wider">Notes</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-500 text-[10px] uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map(order => {
                      const listing = getListingById(order.listingId)
                      const buyer = getUserById(order.buyerId)
                      const seller = getUserById(order.sellerId)
                      const lg = getLogistics(order.id)
                      const shipment = getShipmentByOrderId?.(order.id)
                      return (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-3 py-2.5 font-mono text-gray-400 whitespace-nowrap">#{order.id?.slice(-8)}</td>
                          <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmtShort(order.createdAt)}</td>
                          <td className="px-3 py-2.5 text-gray-800 font-medium max-w-[140px] truncate">{listing?.title || '—'}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <p className="text-gray-800">{order.buyerFullName || buyer?.name || '—'}</p>
                            <p className="text-[10px] text-gray-400">{order.buyerPhone || buyer?.phone || '—'}</p>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <p className="text-gray-800">{order.sellerName || seller?.name || '—'}</p>
                            <p className="text-[10px] text-gray-400">{order.sellerPhone || seller?.phone || '—'}</p>
                          </td>
                          <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{lg.pickupDay ? fmtShort(lg.pickupDay) : '—'}</td>
                          <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{lg.deliveryDay ? fmtShort(lg.deliveryDay) : '—'}</td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{lg.assignedDriver || '—'}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col items-start gap-1">
                              <StatusBadge statusId={lg.logisticsStatus} />
                              <DropoffStateBadge shipment={shipment} order={order} />
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-gray-400 max-w-[120px] truncate">{lg.internalNotes || '—'}</td>
                          <td className="px-3 py-2.5">
                            <button onClick={() => setDrawerOrder(order)}
                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                              <Eye size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* Drawer */}
      {drawerOrder && (
        <OrderDrawer
          order={drawerOrder}
          listing={getListingById(drawerOrder.listingId)}
          buyer={getUserById(drawerOrder.buyerId)}
          seller={getUserById(drawerOrder.sellerId)}
          shipment={getShipmentByOrderId?.(drawerOrder.id)}
          logistics={getLogistics(drawerOrder.id)}
          onUpdate={handleUpdate}
          onClose={() => setDrawerOrder(null)}
        />
      )}
    </div>
  )
}
