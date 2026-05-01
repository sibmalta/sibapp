import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Package, ShoppingBag, Truck } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../lib/auth-context'
import useAuthNav from '../hooks/useAuthNav'
import PageHeader from '../components/PageHeader'
import { ShipmentStatusBadge } from '../components/ShipmentTracker'
import { getFulfilmentMethodLabel } from '../lib/fulfilment'

const SELLER_FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'awaiting_confirmation', label: 'Awaiting confirmation' },
  { id: 'blocked_payouts', label: 'Blocked payouts' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

const BUYER_STATUS_STYLES = {
  paid: 'bg-yellow-50 text-yellow-700 dark:bg-[#332d20] dark:text-amber-300',
  pending: 'bg-yellow-50 text-yellow-700 dark:bg-[#332d20] dark:text-amber-300',
  awaiting_delivery: 'bg-yellow-50 text-yellow-700 dark:bg-[#332d20] dark:text-amber-300',
  shipped: 'bg-blue-50 text-blue-700 dark:bg-[#26322f] dark:text-blue-300',
  delivered: 'bg-amber-50 text-amber-700 dark:bg-[#332d20] dark:text-amber-300',
  confirmed: 'bg-green-50 text-green-700 dark:bg-[#20322b] dark:text-green-300',
  completed: 'bg-green-50 text-green-700 dark:bg-[#20322b] dark:text-green-300',
  disputed: 'bg-red-50 text-red-600 dark:bg-[#362322] dark:text-red-300',
  under_review: 'bg-purple-50 text-purple-700 dark:bg-[#26322f] dark:text-[#aeb8b4]',
  cancelled: 'bg-red-50 text-red-500 dark:bg-[#362322] dark:text-red-300',
  refunded: 'bg-red-50 text-red-500 dark:bg-[#362322] dark:text-red-300',
}

const BUYER_STATUS_LABELS = {
  paid: 'Order placed',
  pending: 'Pending',
  awaiting_delivery: 'Order placed',
  shipped: 'Shipped',
  delivered: 'Awaiting buyer confirmation',
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

function formatMoney(value, fallback = 0) {
  return Number(value ?? fallback).toFixed(2)
}

function titleCaseFulfilment(method) {
  return getFulfilmentMethodLabel(method)
    .replace('locker', 'Locker')
    .replace('delivery', 'Delivery')
}

function getSellerOrderState(order, shipment) {
  const orderStatus = order.trackingStatus || order.status
  const shipmentStatus = shipment?.status

  if (orderStatus === 'cancelled' || orderStatus === 'refunded' || shipmentStatus === 'cancelled') {
    return {
      filter: 'cancelled',
      label: orderStatus === 'refunded' ? 'Refunded' : 'Cancelled',
      style: 'bg-red-50 text-red-600 dark:bg-[#362322] dark:text-red-300',
      nextStep: 'This order was cancelled.',
    }
  }

  if (order.payoutStatus === 'blocked_seller_setup') {
    return {
      filter: 'blocked_payouts',
      label: 'Payout setup needed',
      style: 'bg-amber-50 text-amber-800 dark:bg-[#332d20] dark:text-amber-200',
      nextStep: 'Complete payout setup to receive money from this sale.',
    }
  }

  if (orderStatus === 'confirmed' || orderStatus === 'completed') {
    return {
      filter: 'completed',
      label: 'Completed',
      style: 'bg-green-50 text-green-700 dark:bg-[#20322b] dark:text-green-300',
      nextStep: 'Order completed. Payout can be processed.',
    }
  }

  if (orderStatus === 'delivered' || shipmentStatus === 'delivered') {
    return {
      filter: 'awaiting_confirmation',
      label: 'Awaiting buyer confirmation',
      style: 'bg-amber-50 text-amber-700 dark:bg-[#332d20] dark:text-amber-300',
      nextStep: 'Delivered. Waiting for buyer confirmation.',
    }
  }

  if (shipmentStatus === 'in_transit' || orderStatus === 'shipped') {
    return {
      filter: 'active',
      label: 'In transit',
      style: 'bg-blue-50 text-blue-700 dark:bg-[#26322f] dark:text-blue-300',
      nextStep: 'Order is on the way to the buyer.',
    }
  }

  if (shipmentStatus === 'dropped_off') {
    return {
      filter: 'active',
      label: 'Dropped off',
      style: 'bg-amber-50 text-amber-700 dark:bg-[#332d20] dark:text-amber-300',
      nextStep: 'Parcel is at the MYconvenience store and ready for logistics processing.',
    }
  }

  if (shipmentStatus === 'awaiting_collection') {
    return {
      filter: 'active',
      label: 'Awaiting collection',
      style: 'bg-blue-50 text-blue-700 dark:bg-[#26322f] dark:text-blue-300',
      nextStep: 'Waiting for MaltaPost collection/drop-off processing.',
    }
  }

  if (shipmentStatus === 'awaiting_shipment' || orderStatus === 'paid' || orderStatus === 'pending') {
    return {
      filter: 'active',
      label: 'New order',
      style: 'bg-yellow-50 text-yellow-700 dark:bg-[#332d20] dark:text-amber-300',
      nextStep: 'Prepare this item for MaltaPost fulfilment.',
    }
  }

  return {
    filter: 'active',
    label: 'Preparing for MaltaPost',
    style: 'bg-yellow-50 text-yellow-700 dark:bg-[#332d20] dark:text-amber-300',
    nextStep: 'Prepare this item for MaltaPost fulfilment.',
  }
}

export default function OrdersPage() {
  const {
    currentUser, getUserOrders, getUserSales, getListingById, getUserById, getShipmentByOrderId,
    refreshOrders, refreshShipments, ordersLoading, shipmentsLoading,
  } = useApp()
  const { loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const authNav = useAuthNav()
  const loadedOrdersRef = useRef(false)
  const initialTab = searchParams.get('tab') === 'selling' ? 'selling' : 'buying'
  const [tab, setTab] = useState(initialTab)
  const shipmentFilter = searchParams.get('shipment')
  const sellerFilter = tab === 'selling' ? (searchParams.get('status') || 'active') : null

  useEffect(() => {
    document.title = 'Your orders | Sib'
  }, [])

  useEffect(() => {
    const nextTab = searchParams.get('tab') === 'selling' ? 'selling' : 'buying'
    setTab(nextTab)
  }, [searchParams])

  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/auth', { replace: true, state: { from: '/orders' } })
    }
  }, [authLoading, currentUser, navigate])

  useEffect(() => {
    if (!authLoading && currentUser && !loadedOrdersRef.current) {
      loadedOrdersRef.current = true
      refreshOrders()
      refreshShipments()
    }
  }, [authLoading, currentUser?.id, refreshOrders, refreshShipments])

  if (authLoading || ordersLoading || shipmentsLoading) {
    return (
      <div>
        <PageHeader title="Orders" />
        <div className="flex items-center justify-center py-20 text-sm text-sib-muted dark:text-[#aeb8b4]">
          Loading orders...
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  const buyingOrders = getUserOrders(currentUser.id)
  const sellingOrders = getUserSales(currentUser.id)
  const blockedPayoutSales = sellingOrders.filter(order => order.payoutStatus === 'blocked_seller_setup')
  const displayed = (tab === 'buying' ? buyingOrders : sellingOrders)
    .filter(order => {
      if (!shipmentFilter) return true
      return getShipmentByOrderId(order.id)?.status === shipmentFilter
    })
    .filter(order => {
      if (tab !== 'selling') return true
      const shipment = getShipmentByOrderId(order.id)
      return getSellerOrderState(order, shipment).filter === sellerFilter
    })

  const selectTab = (nextTab) => {
    setTab(nextTab)
    const next = new URLSearchParams(searchParams)
    next.set('tab', nextTab)
    if (nextTab === 'selling') {
      if (!next.get('status')) next.set('status', 'active')
    } else {
      next.delete('shipment')
      next.delete('status')
    }
    setSearchParams(next, { replace: true })
  }

  const selectSellerFilter = (nextFilter) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', 'selling')
    next.set('status', nextFilter)
    next.delete('shipment')
    setSearchParams(next, { replace: true })
  }

  return (
    <div>
      <PageHeader title="Orders" />

      <div className="flex border-b border-sib-stone dark:border-[rgba(242,238,231,0.10)]">
        {[
          { id: 'buying', label: 'Purchases', icon: ShoppingBag },
          { id: 'selling', label: 'Sales', icon: Package },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => selectTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.id ? 'border-sib-primary text-sib-primary dark:text-[#e8751a]' : 'border-transparent text-sib-muted dark:text-[#aeb8b4]'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'selling' && (
        <div className="px-4 py-3 border-b border-sib-stone dark:border-[rgba(242,238,231,0.10)]">
          {blockedPayoutSales.length > 0 && (
            <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-500/30 dark:bg-[#332d20]">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                You have funds waiting. Complete payout setup to receive money from your sales.
              </p>
              <button
                onClick={() => navigate('/seller/payout-settings')}
                className="mt-2 rounded-full bg-sib-secondary px-4 py-2 text-xs font-bold text-white"
              >
                Set up payouts
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {SELLER_FILTERS.map(filter => (
              <button
                key={filter.id}
                onClick={() => selectSellerFilter(filter.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  sellerFilter === filter.id
                    ? 'bg-sib-primary text-white'
                    : 'bg-sib-sand dark:bg-[#26322f] text-sib-muted dark:text-[#aeb8b4] hover:bg-sib-stone/60 dark:hover:bg-[#30403c]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          </div>
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-5xl">{tab === 'buying' ? '🛍️' : '📦'}</p>
          <p className="font-semibold text-sib-text dark:text-[#f4efe7]">No {tab === 'buying' ? 'purchases' : 'sales'} yet</p>
          <p className="text-sm text-sib-muted dark:text-[#aeb8b4] text-center px-8">
            {shipmentFilter === 'awaiting_shipment'
              ? 'No sales are currently awaiting shipment.'
              : tab === 'buying' ? 'Browse and buy something you love.' : 'Seller sales will appear here after checkout.'}
          </p>
          {tab === 'buying' ? (
            <button onClick={() => navigate('/browse')} className="mt-2 bg-sib-secondary text-white px-5 py-2.5 rounded-full text-sm font-semibold">Browse</button>
          ) : (
            <button onClick={() => authNav('/sell')} className="mt-2 bg-sib-secondary text-white px-5 py-2.5 rounded-full text-sm font-semibold">List Item</button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-sib-stone dark:divide-[rgba(242,238,231,0.10)]">
          {displayed.map(order => {
            const listing = getListingById(order.listingId)
            const other = getUserById(tab === 'buying' ? order.sellerId : order.buyerId)
            const shipment = getShipmentByOrderId(order.id)
            const sellerState = getSellerOrderState(order, shipment)
            const itemTitle = listing?.title || order.listingTitle || (order.isBundle ? 'Bundle order' : 'Sold item')
            const itemImage = listing?.images?.[0] || order.listingImage
            const orderRef = order.orderRef || order.id?.slice(-8)
            const fulfilmentMethod = order.fulfilmentMethod || shipment?.fulfilmentMethod || order.deliveryMethod
            const fulfilmentFee = order.fulfilmentPrice ?? shipment?.fulfilmentPrice ?? order.deliveryFee ?? 4.50
            const buyerReference = other?.username || other?.name || order.buyerId?.slice(0, 8) || 'buyer'

            return (
              <div
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="flex gap-3 px-4 py-4 cursor-pointer sib-card active:bg-sib-warm dark:active:bg-[#30403c] transition-colors"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-sib-sand dark:bg-[#26322f]">
                  {itemImage ? (
                    <img src={itemImage} alt={itemTitle} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-semibold text-sib-muted dark:text-[#aeb8b4]">
                      Order
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-sib-text dark:text-[#f4efe7] line-clamp-1">{itemTitle}</p>
                      <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] font-mono mt-0.5">Order #{orderRef}</p>
                    </div>
                    <span className="text-sm font-bold text-sib-primary flex-shrink-0">
                      €{formatMoney(tab === 'selling' ? order.itemPrice : order.totalPrice)}
                    </span>
                  </div>

                  <p className="text-xs text-sib-muted dark:text-[#aeb8b4] mt-0.5">
                    {tab === 'buying' ? 'From' : 'Buyer'} @{buyerReference}
                  </p>

                  {tab === 'selling' && (
                    <div className="mt-2 grid gap-1.5 text-[11px]">
                      <p className="text-sib-muted dark:text-[#aeb8b4]">Order date: {formatOrderDate(order.createdAt)}</p>
                      <p className="text-sib-text dark:text-[#f4efe7] font-semibold">Sale price: €{formatMoney(order.itemPrice)}</p>
                      <p className="text-sib-text dark:text-[#f4efe7] font-semibold">Fulfilment method: {titleCaseFulfilment(fulfilmentMethod)}</p>
                      <p className="text-sib-muted dark:text-[#aeb8b4]">Fulfilment fee: €{formatMoney(fulfilmentFee)}</p>
                      <p className="text-sib-muted dark:text-[#aeb8b4] leading-snug">Seller next step: {sellerState.nextStep}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      tab === 'selling'
                        ? sellerState.style
                        : (BUYER_STATUS_STYLES[order.trackingStatus] || 'bg-gray-50 dark:bg-[#26322f] text-gray-600 dark:text-[#aeb8b4]')
                    }`}>
                      {tab === 'selling'
                        ? sellerState.label
                        : (BUYER_STATUS_LABELS[order.trackingStatus] || order.trackingStatus)}
                    </span>

                    {tab === 'selling' && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-[#26322f] dark:text-blue-300">
                        {titleCaseFulfilment(fulfilmentMethod)}
                      </span>
                    )}
                    {tab === 'selling' && order.payoutStatus === 'blocked_seller_setup' && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-[#332d20] dark:text-amber-200">
                        Payout blocked: seller setup
                      </span>
                    )}

                    {shipment && <ShipmentStatusBadge status={shipment.status} />}

                    {shipment?.trackingNumber && (
                      <span className="text-[10px] text-sib-muted dark:text-[#aeb8b4] font-mono flex items-center gap-0.5">
                        <Truck size={9} /> {shipment.trackingNumber}
                      </span>
                    )}
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
