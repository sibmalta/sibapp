import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SellerDropoffPage from '../pages/SellerDropoffPage'

let mockApp

vi.mock('../context/AppContext', () => ({
  useApp: () => mockApp,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <SellerDropoffPage />
    </MemoryRouter>,
  )
}

describe('SellerDropoffPage', () => {
  beforeEach(() => {
    mockApp = {
      currentUser: { id: 'seller_1' },
      orders: [],
      shipments: [],
      getUserById: vi.fn(id => ({ id, name: id === 'buyer_1' ? 'Maya Buyer' : 'Leo Buyer' })),
      getListingById: vi.fn(id => ({ id, title: id === 'listing_1' ? 'Blue jacket' : 'Small lamp' })),
      refreshOrders: vi.fn(),
      refreshShipments: vi.fn(),
    }
  })

  it('renders one large QR card per eligible seller order', () => {
    mockApp.orders = [
      {
        id: 'order_1',
        orderRef: 'SIB-1001',
        sellerId: 'seller_1',
        buyerId: 'buyer_1',
        listingId: 'listing_1',
        paymentStatus: 'paid',
        trackingStatus: 'awaiting_delivery',
        dropoffScanToken: 'token-order-1',
      },
      {
        id: 'order_2',
        orderRef: 'SIB-1002',
        sellerId: 'seller_1',
        buyerId: 'buyer_2',
        listingId: 'listing_2',
        paymentStatus: 'paid',
        trackingStatus: 'awaiting_delivery',
        dropoffScanToken: 'token-order-2',
      },
    ]

    renderPage()

    expect(screen.getAllByTestId('seller-dropoff-qr-card')).toHaveLength(2)
    expect(screen.getAllByText('SIB-1001').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SIB-1002').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Maya Buyer').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Leo Buyer').length).toBeGreaterThan(0)
    expect(screen.getAllByAltText(/Drop-off QR for order/)).toHaveLength(2)
    expect(screen.getAllByText('Pending')).toHaveLength(2)
  })

  it('hides confirmed orders from the pending drop-off list', () => {
    mockApp.orders = [
      {
        id: 'order_pending',
        orderRef: 'SIB-PENDING',
        sellerId: 'seller_1',
        buyerId: 'buyer_1',
        listingId: 'listing_1',
        paymentStatus: 'paid',
        trackingStatus: 'awaiting_delivery',
        dropoffScanToken: 'token-pending',
      },
      {
        id: 'order_confirmed',
        orderRef: 'SIB-CONFIRMED',
        sellerId: 'seller_1',
        buyerId: 'buyer_2',
        listingId: 'listing_2',
        paymentStatus: 'paid',
        trackingStatus: 'awaiting_delivery',
        dropoffScanToken: 'token-confirmed',
        dropoffConfirmedAt: '2026-05-05T10:30:00.000Z',
      },
    ]

    renderPage()

    expect(screen.getAllByTestId('seller-dropoff-qr-card')).toHaveLength(1)
    expect(screen.getAllByText('SIB-PENDING').length).toBeGreaterThan(0)
    expect(screen.queryByText('SIB-CONFIRMED')).not.toBeInTheDocument()
  })

  it('shows only eligible seller-owned paid orders', () => {
    mockApp.orders = [
      {
        id: 'seller_paid',
        orderRef: 'SIB-PAID',
        sellerId: 'seller_1',
        buyerId: 'buyer_1',
        listingId: 'listing_1',
        paymentStatus: 'paid',
        trackingStatus: 'awaiting_delivery',
        dropoffScanToken: 'token-paid',
      },
      {
        id: 'seller_unpaid',
        orderRef: 'SIB-UNPAID',
        sellerId: 'seller_1',
        buyerId: 'buyer_2',
        listingId: 'listing_2',
        paymentStatus: 'pending',
        trackingStatus: 'pending',
        dropoffScanToken: 'token-unpaid',
      },
      {
        id: 'other_seller',
        orderRef: 'SIB-OTHER',
        sellerId: 'seller_2',
        buyerId: 'buyer_1',
        listingId: 'listing_1',
        paymentStatus: 'paid',
        trackingStatus: 'awaiting_delivery',
        dropoffScanToken: 'token-other',
      },
    ]

    renderPage()

    expect(screen.getAllByTestId('seller-dropoff-qr-card')).toHaveLength(1)
    expect(screen.getAllByText('SIB-PAID').length).toBeGreaterThan(0)
    expect(screen.queryByText('SIB-UNPAID')).not.toBeInTheDocument()
    expect(screen.queryByText('SIB-OTHER')).not.toBeInTheDocument()
  })

  it('shows the empty state when there are no pending drop-offs', () => {
    renderPage()

    expect(screen.getByText('No parcels ready for drop-off.')).toBeInTheDocument()
  })
})
