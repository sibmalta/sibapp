import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OrdersPage from '../pages/OrdersPage'

let mockApp

vi.mock('../context/AppContext', () => ({
  useApp: () => mockApp,
}))

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ loading: false }),
}))

vi.mock('../hooks/useAuthNav', () => ({
  default: () => vi.fn(),
}))

vi.mock('../components/PageHeader', () => ({
  default: ({ title }) => <h1>{title}</h1>,
}))

vi.mock('../components/ShipmentTracker', () => ({
  ShipmentStatusBadge: () => null,
}))

vi.mock('../components/PendingPayoutsWidget', () => ({
  default: () => null,
}))

vi.mock('../components/SellerDropoffPrompt', () => ({
  default: () => null,
}))

function renderOrdersPage(appOverrides = {}, initialEntries = ['/orders']) {
  mockApp = {
    currentUser: { id: 'user-1', username: 'maya' },
    getUserOrders: vi.fn(() => []),
    getUserSales: vi.fn(() => []),
    getListingById: vi.fn(),
    getUserById: vi.fn(),
    getShipmentByOrderId: vi.fn(),
    refreshOrders: vi.fn(),
    refreshShipments: vi.fn(),
    ordersLoading: true,
    shipmentsLoading: false,
    ordersDbError: null,
    ordersDbAvailable: true,
    profilesLoading: false,
    ...appOverrides,
  }

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/dropoff" element={<div>Drop-off QR route</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('OrdersPage timeout fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('cannot remain on Loading orders after the hard timeout', async () => {
    renderOrdersPage()

    expect(screen.getByText('Loading orders...')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(8000)
    })

    expect(screen.queryByText('Loading orders...')).not.toBeInTheDocument()
    expect(screen.getByText('We couldn’t load your orders. Try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('retry triggers order and shipment refresh again', async () => {
    renderOrdersPage()

    await act(async () => {
      vi.advanceTimersByTime(8000)
    })

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    expect(mockApp.refreshOrders).toHaveBeenCalledTimes(2)
    expect(mockApp.refreshShipments).toHaveBeenCalledTimes(2)
  })

  it('redirects legacy sellerDropoff=pending links away from the generic orders loader', () => {
    renderOrdersPage({}, ['/orders?sellerDropoff=pending'])

    expect(screen.getByText('Drop-off QR route')).toBeInTheDocument()
    expect(screen.queryByText('Loading orders...')).not.toBeInTheDocument()
    expect(screen.queryByText('We couldn’t load your drop-off orders. Try again.')).not.toBeInTheDocument()
  })
  it('renders orders while optional shipment enrichment is still loading', () => {
    renderOrdersPage({
      ordersLoading: false,
      shipmentsLoading: true,
      getUserOrders: vi.fn(() => [{
        id: 'order-1',
        buyerId: 'user-1',
        sellerId: 'seller-1',
        listingId: 'listing-1',
        listingTitle: 'Blue jacket',
        totalPrice: 24,
        trackingStatus: 'paid',
        createdAt: '2026-05-01T10:00:00Z',
      }]),
      getListingById: vi.fn(() => ({ id: 'listing-1', title: 'Blue jacket', images: [] })),
      getUserById: vi.fn(() => ({ id: 'seller-1', username: 'seller' })),
      getShipmentByOrderId: vi.fn(() => null),
    })

    expect(screen.queryByText('Loading orders...')).not.toBeInTheDocument()
    expect(screen.getByText('Blue jacket')).toBeInTheDocument()
  })

  it('does not block the orders route on profile enrichment', async () => {
    renderOrdersPage({
      ordersLoading: false,
      profilesLoading: true,
    })

    expect(screen.queryByText('Loading orders...')).not.toBeInTheDocument()
    expect(screen.getByText('No purchases yet')).toBeInTheDocument()
  })

  it('surfaces RLS denied order errors instead of staying on the spinner', () => {
    renderOrdersPage({
      ordersLoading: false,
      ordersDbError: 'permission denied for table orders',
    })

    expect(screen.queryByText('Loading orders...')).not.toBeInTheDocument()
    expect(screen.getByText('permission denied for table orders')).toBeInTheDocument()
  })

  it('notification shipment deep-links do not wait for optional shipment loading', () => {
    renderOrdersPage({
      ordersLoading: false,
      shipmentsLoading: true,
      getUserSales: vi.fn(() => [{
        id: 'order-2',
        buyerId: 'buyer-1',
        sellerId: 'user-1',
        listingId: 'listing-2',
        listingTitle: 'Green shoes',
        itemPrice: 18,
        fulfilmentMethod: 'delivery',
        trackingStatus: 'paid',
        createdAt: '2026-05-01T10:00:00Z',
      }]),
      getListingById: vi.fn(() => ({ id: 'listing-2', title: 'Green shoes', images: [] })),
      getUserById: vi.fn(() => ({ id: 'buyer-1', username: 'buyer' })),
      getShipmentByOrderId: vi.fn(() => ({ orderId: 'order-2', status: 'awaiting_shipment', fulfilmentMethod: 'delivery' })),
    }, ['/orders?tab=selling&shipment=awaiting_shipment'])

    expect(screen.queryByText('Loading orders...')).not.toBeInTheDocument()
    expect(screen.getByText('Green shoes')).toBeInTheDocument()
  })
})
