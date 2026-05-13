import React from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SellerDropoffPage from '../pages/SellerDropoffPage'

let mockApp
const root = resolve(__dirname, '..', '..')

vi.mock('../context/AppContext', () => ({
  useApp: () => mockApp,
}))

function renderPage(initialEntries = ['/dropoff']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
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

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByAltText('Drop-off QR for order SIB-1002')).toBeInTheDocument()
    expect(screen.queryByAltText('Drop-off QR for order SIB-1001')).not.toBeInTheDocument()
    expect(within(dialog).getByText('Write on parcel')).toBeInTheDocument()
    expect(within(dialog).getByText('Write these details clearly on the outside of the parcel before drop-off.')).toBeInTheDocument()
    expect(within(dialog).getByText('Parcels without these details may be delayed or returned.')).toBeInTheDocument()
    expect(within(dialog).getByText('Order ID')).toBeInTheDocument()
    expect(within(dialog).getByText('Buyer surname')).toBeInTheDocument()
    expect(within(dialog).getByText('Buyer locality')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Sliema').length).toBeGreaterThan(0)
    expect(within(dialog).getByText('SIB-TST1234')).toBeInTheDocument()
    expect(within(dialog).getByText('Joe Bloggs')).toBeInTheDocument()
    expect(within(dialog).queryByText('Item')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Small lamp')).not.toBeInTheDocument()
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

  it('renders pending parcels from the dedicated grouped notification route', () => {
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
    ]

    renderPage(['/dropoff?status=pending'])

    expect(screen.getByRole('tab', { name: /Pending/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('pending-dropoff-card')).toBeInTheDocument()
    expect(screen.getAllByText('SIB-1001').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Show QR/ })).toBeInTheDocument()
  })

  it('keeps mobile drop-off cards compact without removing required fields', () => {
    const source = readFileSync(resolve(root, 'src/pages/SellerDropoffPage.jsx'), 'utf8')

    expect(source).toContain('<PageHeader title="Drop-off QRs" compact />')
    expect(source).toContain('pb-28')
    expect(source).toContain('space-y-2 pb-2 sm:space-y-3')
    expect(source).toContain('rounded-xl border p-3 shadow-sm sm:rounded-2xl sm:p-4')
    expect(source).toContain('text-base font-black leading-tight')
    expect(source).toContain('min-h-11')
    expect(source).toContain('Show QR')
    expect(source).toContain('Order code')
    expect(source).toContain('Buyer locality')
  })
})
