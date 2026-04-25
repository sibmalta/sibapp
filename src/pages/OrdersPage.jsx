import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Package, ShoppingBag, Truck } from 'lucide-react'
import { useApp } from '../context/AppContext'
import useAuthNav from '../hooks/useAuthNav'
import PageHeader from '../components/PageHeader'
import { ShipmentStatusBadge } from '../components/ShipmentTracker'
import { getFulfilmentMethodLabel, getFulfilmentMethodShortLabel } from '../lib/fulfilment'

const STATUS_STYLES = {
  paid: 'bg-yellow-50 text-yellow-700',
  pending: 'bg-yellow-50 text-yellow-700',
  shipped: 'bg-blue-50 text-blue-700',
  delivered: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-green-50 text-green-700',
  completed: 'bg-green-50 text-green-700',
  disputed: 'bg-red-50 text-red-600',
  under_review: 'bg-purple-50 text-purple-700',
  cancelled: 'bg-red-50 text-red-500',
  refunded: 'bg-red-50 text-red-500',
}

const STATUS_LABELS = {
  paid: 'Order placed',
  pending: 'Pending',
  shipped: 'Shipped',
  delivered: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  completed: 'Completed',
  disputed: 'Issue reported',
  under_review: 'Under review',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

function formatOrderDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function OrdersPage() {
  const { currentUser, getUserOrders, getUserSales, getListingById, getUserById, getShipmentByOrderId } = useApp()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const authNav = useAuthNav()
  const initialTab = searchParams.get('tab') === 'selling' ? 'selling' : 'buying'
  const [tab, setTab] = useState(initialTab)
  const shipmentFilter = searchParams.get('shipment')

  useEffect(() => {
    document.title = 'Your orders | Sib'
  }, [])

  useEffect(() => {
    const nextTab = searchParams.get('tab') === 'selling' ? 'selling' : 'buying'
    setTab(nextTab)
  }, [searchParams])

  if (!currentUser) {
    navigate('/auth')
    return null
  }

  const buyingOrders = getUserOrders(currentUser.id)
  const sellingOrders = getUserSales(currentUser.id)
  const displayed = (tab === 'buying' ? buyingOrders : sellingOrders)
    .filter(order => {
      if (!shipmentFilter) return true
      return getShipmentByOrderId(order.id)?.status === shipmentFilter
    })

  const selectTab = (nextTab) => {
    setTab(nextTab)
    const next = new URLSearchParams(searchParams)
    next.set('tab', nextTab)
    if (nextTab !== 'selling') next.delete('shipment')
    setSearchParams(next, { replace: true })
  }

  return (
    <div>
      <PageHeader title="Orders" />
      {/* Tabs */}
      <div className="flex border-b border-sib-stone">
        {[
          { id: 'buying', label: 'Purchases', icon: ShoppingBag },
          { id: 'selling', label: 'Sales', icon: Package },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => selectTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.id ? 'border-sib-primary text-sib-primary' : 'border-transparent text-sib-muted'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-5xl">{tab === 'buying' ? '🛍️' : '📦'}</p>
          <p className="font-semibold text-sib-text">No {tab === 'buying' ? 'purchases' : 'sales'} yet</p>
          <p className="text-sm text-sib-muted text-center px-8">
            {shipmentFilter === 'awaiting_shipment'
              ? 'No sales are currently awaiting shipment.'
              : tab === 'buying' ? 'Browse and buy something you love.' : 'List your first item to start selling.'}
          </p>
          {tab === 'buying' ? (
            <button onClick={() => navigate('/browse')} className="mt-2 bg-sib-secondary text-white px-5 py-2.5 rounded-full text-sm font-semibold">Browse</button>
          ) : (
            <button onClick={() => authNav('/sell')} className="mt-2 bg-sib-secondary text-white px-5 py-2.5 rounded-full text-sm font-semibold">List Item</button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-sib-stone">
          {displayed.map(order => {
            const listing = getListingById(order.listingId)
            const other = getUserById(tab === 'buying' ? order.sellerId : order.buyerId)
            const shipment = getShipmentByOrderId(order.id)
            return (
              <div
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="flex gap-3 px-4 py-4 cursor-pointer active:bg-sib-warm"
              >
                <img
                  src={listing?.images[0]}
                  alt={listing?.title}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-sib-sand"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sib-text line-clamp-1">{listing?.title}</p>
                  <p className="text-xs text-sib-muted mt-0.5">
                    {tab === 'buying' ? 'From' : 'To'} @{other?.username}
                  </p>
                  {tab === 'selling' && (
                    <div className="mt-2 space-y-0.5">
                      <p className="text-[11px] text-sib-muted">Buyer reference: @{other?.username || order.buyerId?.slice(0, 8)}</p>
                      <p className="text-[11px] text-sib-muted">Order date: {formatOrderDate(order.createdAt)}</p>
                      <p className="text-[11px] font-semibold text-sib-text">
                        Fulfilment method: {getFulfilmentMethodShortLabel(order.fulfilmentMethod || order.deliveryMethod)}
                      </p>
                      <p className="text-[11px] text-sib-muted">
                        Fulfilment price: €{(order.fulfilmentPrice ?? order.deliveryFee ?? 4.50).toFixed(2)}
                      </p>
                      <p className="text-[11px] text-sib-muted">
                        Seller next step: Prepare this order for MaltaPost fulfilment
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[order.trackingStatus] || 'bg-gray-50 text-gray-600'}`}>
                      {STATUS_LABELS[order.trackingStatus] || order.trackingStatus}
                    </span>
                    {tab === 'selling' && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {getFulfilmentMethodLabel(order.fulfilmentMethod || order.deliveryMethod)}
                      </span>
                    )}
                    {shipment && <ShipmentStatusBadge status={shipment.status} />}
                    {shipment?.trackingNumber && (
                      <span className="text-[10px] text-sib-muted font-mono flex items-center gap-0.5">
                        <Truck size={9} /> {shipment.trackingNumber}
                      </span>
                    )}
                    <span className="ml-auto text-sm font-bold text-sib-primary">€{order.totalPrice}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
