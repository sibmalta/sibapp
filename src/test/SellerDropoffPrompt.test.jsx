import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SellerDropoffPrompt from '../components/SellerDropoffPrompt'

let mockApp

vi.mock('../context/AppContext', () => ({
  useApp: () => mockApp,
}))

function makeOrder(id, overrides = {}) {
  return {
    id,
    orderRef: `SIB-${id}`,
    sellerId: 'seller-1',
    buyerId: 'buyer-1',
    listingId: 'listing-1',
    paymentStatus: 'paid',
    trackingStatus: 'awaiting_delivery',
    dropoffScanToken: `token-${id}`,
    ...overrides,
  }
}

function LocationDisplay() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname}</p>
}

function renderPrompt(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/"
          element={(
            <>
              <SellerDropoffPrompt />
              <LocationDisplay />
            </>
          )}
        />
        <Route path="/dropoff" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  )
}

function clickRemindLaterTextButton() {
  const buttons = screen.getAllByRole('button', { name: 'Remind me later' })
  fireEvent.click(buttons[buttons.length - 1])
}

describe('SellerDropoffPrompt', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-13T10:00:00.000Z'))
    localStorage.clear()
    mockApp = {
      currentUser: { id: 'seller-1' },
      orders: [makeOrder('1001')],
      shipments: [],
      refreshOrders: vi.fn(),
      refreshShipments: vi.fn(),
      showToast: vi.fn(),
    }
  })

  afterEach(() => {
    localStorage.clear()
    vi.useRealTimers()
  })

  it('clicking Remind me later hides the banner immediately', () => {
    renderPrompt()

    expect(screen.getByText(/You sold an item/)).toBeInTheDocument()

    clickRemindLaterTextButton()

    expect(screen.queryByText(/You sold an item/)).not.toBeInTheDocument()
    expect(mockApp.showToast).toHaveBeenCalledWith("We'll remind you later.")
  })

  it('keeps an individual order hidden after rerender within the snooze window', () => {
    const firstRender = renderPrompt()

    clickRemindLaterTextButton()
    firstRender.unmount()
    renderPrompt()

    expect(screen.queryByText(/You sold an item/)).not.toBeInTheDocument()
  })

  it('snoozes multiple pending drop-off orders as one grouped prompt', () => {
    mockApp.orders = [makeOrder('1001'), makeOrder('1002')]

    const firstRender = renderPrompt()
    clickRemindLaterTextButton()
    firstRender.unmount()
    renderPrompt()

    expect(screen.queryByText(/You sold an item/)).not.toBeInTheDocument()
    expect(mockApp.orders.every(order => order.paymentStatus === 'paid')).toBe(true)
    expect(mockApp.orders.every(order => !order.dropoffConfirmedAt)).toBe(true)
  })

  it('View drop-off QRs still navigates to the dedicated QR page', () => {
    renderPrompt()

    fireEvent.click(screen.getByRole('button', { name: /View drop-off QRs/i }))

    expect(screen.getByTestId('location')).toHaveTextContent('/dropoff')
  })
})
