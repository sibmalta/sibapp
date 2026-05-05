import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
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

  it('renders multiple pending parcels as compact cards', () => {
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
        buyerCity: 'Sliema',
        paymentStatus: 'paid',
        trackingStatus: 'awaiting_delivery',
        dropoffScanToken: 'token-order-2',
      },
    ]

    renderPage()

    const cards = screen.getAllByTestId('pending-dropoff-card')
    expect(cards).toHaveLength(2)
    expect(screen.getAllByText('SIB-1001').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SIB-1002').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Maya Buyer').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Leo Buyer').length).toBeGreaterThan(0)
    expect(screen.queryByAltText(/Drop-off QR for order/)).not.toBeInTheDocument()
    expect(cards.every(card => within(card).getByText('Pending'))).toBe(true)
    expect(screen.getAllByRole('button', { name: /Show QR/ })).toHaveLength(2)
  })

  it('clicking Show QR reveals the QR for that parcel only', () => {
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
        buyerCity: 'Sliema',
        paymentStatus: 'paid',
        trackingStatus: 'awaiting_delivery',
        dropoffScanToken: 'token-order-2',
      },
    ]

    renderPage()

    fireEvent.click(screen.getAllByRole('button', { name: /Show QR/ })[1])

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByAltText('Drop-off QR for order SIB-1002')).toBeInTheDocument()
    expect(screen.queryByAltText('Drop-off QR for order SIB-1001')).not.toBeInTheDocument()
    expect(screen.getByText('Write on parcel')).toBeInTheDocument()
    expect(screen.getByText('Required for delivery sorting')).toBeInTheDocument()
    expect(screen.getByText('ORDER ID')).toBeInTheDocument()
    expect(screen.getByText('SURNAME')).toBeInTheDocument()
    expect(screen.getByText('LOCALITY')).toBeInTheDocument()
    expect(screen.getByText('Sliema')).toBeInTheDocument()
    expect(screen.getByText('Write these clearly on the outside of the parcel before handing it to MYConvenience.')).toBeInTheDocument()
    expect(screen.queryByText('Buyer name')).not.toBeInTheDocument()
  })

  it('shows confirmed parcels only in the Confirmed tab', () => {
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

    expect(screen.getAllByTestId('pending-dropoff-card')).toHaveLength(1)
    expect(screen.getAllByText('SIB-PENDING').length).toBeGreaterThan(0)
    expect(screen.queryByText('SIB-CONFIRMED')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Confirmed/ }))

    expect(screen.getByTestId('confirmed-dropoff-card')).toBeInTheDocument()
    expect(screen.getAllByText('SIB-CONFIRMED').length).toBeGreaterThan(0)
    expect(screen.queryByText('SIB-PENDING')).not.toBeInTheDocument()
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

    expect(screen.getAllByTestId('pending-dropoff-card')).toHaveLength(1)
    expect(screen.getAllByText('SIB-PAID').length).toBeGreaterThan(0)
    expect(screen.queryByText('SIB-UNPAID')).not.toBeInTheDocument()
    expect(screen.queryByText('SIB-OTHER')).not.toBeInTheDocument()
  })

  it('shows tab-specific empty states', () => {
    renderPage()

    expect(screen.getByText('No parcels waiting for drop-off.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Confirmed/ }))
    expect(screen.getByText('No confirmed drop-offs yet.')).toBeInTheDocument()
  })
})
