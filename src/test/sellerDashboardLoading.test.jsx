import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import SellerDashboardPage from '../pages/SellerDashboardPage'

let mockApp

vi.mock('../context/AppContext', () => ({
  useApp: () => mockApp,
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

function renderDashboard(overrides = {}) {
  mockApp = {
    currentUser: { id: 'seller-1', username: 'maya' },
    orders: [],
    getUserSales: vi.fn(() => []),
    getListingById: vi.fn(),
    getShipmentByOrderId: vi.fn(),
    ...overrides,
  }

  return render(
    <MemoryRouter>
      <SellerDashboardPage />
    </MemoryRouter>,
  )
}

describe('SellerDashboardPage loading resilience', () => {
  it('renders without crashing when sales are empty', () => {
    renderDashboard()

    expect(screen.getByText('Seller Dashboard')).toBeInTheDocument()
    expect(screen.getByText('No sales yet. List something to get started.')).toBeInTheDocument()
  })

  it('renders available earnings without reading values before initialization', () => {
    renderDashboard({
      getUserSales: vi.fn(() => [{
        id: 'order-1',
        sellerId: 'seller-1',
        listingId: 'listing-1',
        listingTitle: 'Dress',
        sellerPayout: 22,
        itemPrice: 25,
        payoutStatus: 'available',
        createdAt: '2026-05-01T10:00:00Z',
      }]),
      getListingById: vi.fn(() => ({ id: 'listing-1', title: 'Dress', images: [] })),
      getShipmentByOrderId: vi.fn(() => null),
    })

    expect(screen.getAllByText('€22.00').length).toBeGreaterThan(0)
    expect(screen.getByText('Withdraw earnings')).toBeInTheDocument()
  })
})
