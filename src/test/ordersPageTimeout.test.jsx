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
})
