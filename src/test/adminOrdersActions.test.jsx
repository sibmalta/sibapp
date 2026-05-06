import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminPage from '../pages/AdminPage'

let mockApp

vi.mock('../context/AppContext', () => ({
  useApp: () => mockApp,
}))

function makeOrder(overrides = {}) {
  return {
    id: '11111111-2222-3333-4444-555555555555',
    orderRef: 'SIB-MOHK0P3K',
    listingId: 'listing-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    trackingStatus: 'paid',
    paymentStatus: 'paid',
    payoutStatus: 'held',
    totalPrice: 18.9,
    createdAt: '2026-05-01T10:00:00.000Z',
    ...overrides,
  }
}

function makeDispute(overrides = {}) {
  return {
    id: 'dispute-1',
    orderId: '11111111-2222-3333-4444-555555555555',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    listingId: 'listing-1',
    status: 'open',
    reason: 'Admin review',
    details: 'Buyer reported an issue',
    createdAt: '2026-05-02T10:00:00.000Z',
    ...overrides,
  }
}

function renderPage(order = makeOrder(), appOverrides = {}) {
  mockApp = {
    currentUser: { id: 'admin-1', isAdmin: true },
    users: [
      { id: 'buyer-1', name: 'Maya Buyer', username: 'maya' },
      { id: 'seller-1', name: 'Leo Seller', username: 'leo' },
    ],
    listings: [{ id: 'listing-1', title: 'Blue jacket', price: 13 }],
    orders: [order],
    ordersLoading: false,
    shipmentsLoading: false,
    logisticsDeliverySheetLoading: false,
    conversations: [],
    disputes: [],
    disputesLoading: false,
    logisticsDeliverySheet: [],
    updateOrderStatus: vi.fn().mockResolvedValue({ ok: true }),
    refundOrder: vi.fn().mockResolvedValue({ ok: true }),
    holdPayout: vi.fn().mockResolvedValue({ ok: true }),
    releasePayout: vi.fn().mockResolvedValue({ ok: true }),
    cancelOrder: vi.fn().mockResolvedValue({ ok: true }),
    suspendUser: vi.fn(),
    banUser: vi.fn(),
    restoreUser: vi.fn(),
    resolveDispute: vi.fn().mockResolvedValue({ ok: true }),
    addDisputeMessage: vi.fn(),
    showToast: vi.fn(),
    getUserById: vi.fn(id => mockApp.users.find(user => user.id === id)),
    getListingById: vi.fn(id => mockApp.listings.find(listing => listing.id === id)),
    getUserListings: vi.fn(() => []),
    getUserOrders: vi.fn(() => []),
    getUserSales: vi.fn(() => []),
    getUserConversations: vi.fn(() => []),
    refreshOrders: vi.fn(),
    refreshDisputes: vi.fn(),
    refreshShipments: vi.fn(),
    refreshLogisticsDeliverySheet: vi.fn(),
    deleteListing: vi.fn(),
    flagListing: vi.fn(),
    hideListing: vi.fn(),
    updateStyleTags: vi.fn(),
    adminOpenDispute: vi.fn().mockResolvedValue({
      id: 'dispute-1',
      orderId: order.id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      status: 'open',
    }),
    DISPUTE_REASONS: [],
    updateSellerBadges: vi.fn(),
    getShipmentByOrderId: vi.fn(() => null),
    adminCreateShipmentShortcut: vi.fn().mockResolvedValue({ ok: true }),
    ...appOverrides,
  }

  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  )
}

function expandOrder() {
  fireEvent.click(screen.getByText('Blue jacket'))
}

function openDisputeDetail() {
  fireEvent.click(screen.getByRole('button', { name: /Disputes/i }))
  fireEvent.click(screen.getByText('Admin review'))
}

describe('Admin Orders financial action guardrails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens a confirmation modal before refunding', () => {
    renderPage()
    expandOrder()

    fireEvent.click(screen.getByRole('button', { name: /Refund Buyer/i }))

    const dialog = screen.getByRole('dialog', { name: /Confirm buyer refund/i })
    expect(mockApp.refundOrder).not.toHaveBeenCalled()
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('This will initiate a real refund. This action cannot be undone.')).toBeInTheDocument()
    expect(within(dialog).getByText('SIB-MOHK0P3K')).toBeInTheDocument()
    expect(within(dialog).getByText('Maya Buyer')).toBeInTheDocument()
    expect(within(dialog).getByText('Leo Seller')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Confirm refund/i })).toBeEnabled()
  })

  it('cancelling the refund modal does not refund', () => {
    renderPage()
    expandOrder()

    fireEvent.click(screen.getByRole('button', { name: /Refund Buyer/i }))
    fireEvent.click(within(screen.getByRole('dialog', { name: /Confirm buyer refund/i })).getByRole('button', { name: /^Cancel$/i }))

    expect(mockApp.refundOrder).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: /Confirm buyer refund/i })).not.toBeInTheDocument()
  })

  it('confirming the refund calls the refund handler', async () => {
    renderPage()
    expandOrder()

    fireEvent.click(screen.getByRole('button', { name: /Refund Buyer/i }))
    fireEvent.click(screen.getByRole('button', { name: /Confirm refund/i }))

    await waitFor(() => {
      expect(mockApp.refundOrder).toHaveBeenCalledWith('11111111-2222-3333-4444-555555555555')
    })
    expect(mockApp.showToast).toHaveBeenCalledWith('€18.90 refunded to buyer (confirmed)')
  })

  it('requires typed confirmation for refunds over 20 euros', async () => {
    renderPage(makeOrder({ totalPrice: 24.5 }))
    expandOrder()

    fireEvent.click(screen.getByRole('button', { name: /Refund Buyer/i }))

    const confirm = screen.getByRole('button', { name: /Confirm refund/i })
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/Type REFUND to continue/i), { target: { value: 'refund' } })
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/Type REFUND to continue/i), { target: { value: 'REFUND' } })
    expect(confirm).toBeEnabled()
  })

  it('does not show a refund action for already-refunded orders', () => {
    renderPage(makeOrder({ paymentStatus: 'refunded', refundedAt: '2026-05-03T12:00:00.000Z' }))
    expandOrder()

    expect(screen.queryByRole('button', { name: /Refund Buyer/i })).not.toBeInTheDocument()
    expect(screen.getByText('Already refunded')).toBeInTheDocument()
    expect(screen.getAllByText('Refunded').length).toBeGreaterThan(0)
  })

  it('shows an error toast and leaves refund retry available when refund fails', async () => {
    renderPage()
    mockApp.refundOrder.mockResolvedValue({ ok: false, error: 'Stripe rejected refund' })
    expandOrder()

    fireEvent.click(screen.getByRole('button', { name: /Refund Buyer/i }))
    fireEvent.click(screen.getByRole('button', { name: /Confirm refund/i }))

    await waitFor(() => {
      expect(mockApp.showToast).toHaveBeenCalledWith('Refund failed: Stripe rejected refund', 'error')
    })
    expect(screen.getByRole('button', { name: /Refund Buyer/i })).toBeInTheDocument()
  })

  it('opens disputes with the UUID order id while displaying the public order code', async () => {
    renderPage()
    expandOrder()

    fireEvent.click(screen.getByRole('button', { name: /Open Dispute/i }))

    const dialog = screen.getByRole('dialog', { name: /Open dispute/i })
    expect(within(dialog).getByText('SIB-MOHK0P3K')).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: /Confirm dispute/i }))

    await waitFor(() => {
      expect(mockApp.adminOpenDispute).toHaveBeenCalledWith(
        '11111111-2222-3333-4444-555555555555',
        'Admin-initiated review',
      )
    })
    expect(mockApp.adminOpenDispute).not.toHaveBeenCalledWith('SIB-MOHK0P3K', expect.anything())
    expect(mockApp.showToast).toHaveBeenCalledWith('Dispute opened')
  })

  it('does not show dispute success when the insert fails', async () => {
    renderPage()
    mockApp.adminOpenDispute.mockResolvedValue({ ok: false, error: 'invalid input syntax for type uuid' })
    expandOrder()

    fireEvent.click(screen.getByRole('button', { name: /Open Dispute/i }))
    fireEvent.click(within(screen.getByRole('dialog', { name: /Open dispute/i })).getByRole('button', { name: /Confirm dispute/i }))

    await waitFor(() => {
      expect(mockApp.showToast).toHaveBeenCalledWith('Admin action failed: invalid input syntax for type uuid', 'error')
    })
    expect(mockApp.showToast).not.toHaveBeenCalledWith('Dispute opened')
  })

  it('opens the related chat from a dispute', () => {
    const dispute = makeDispute()
    renderPage(makeOrder(), {
      disputes: [dispute],
      conversations: [{
        id: 'conversation-1',
        listingId: 'listing-1',
        participants: ['buyer-1', 'seller-1'],
        messages: [{ id: 'message-1', senderId: 'buyer-1', text: 'Please review these photos', timestamp: '2026-05-02T11:00:00.000Z' }],
      }],
    })

    openDisputeDetail()
    expect(screen.getByText(/Use chat to request evidence/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /View chat/i }))

    expect(screen.getByText('Please review these photos')).toBeInTheDocument()
  })

  it('refund dispute resolution closes only after refund succeeds', async () => {
    const dispute = makeDispute()
    renderPage(makeOrder(), { disputes: [dispute] })
    openDisputeDetail()

    fireEvent.click(screen.getByRole('button', { name: /Refund Buyer/i }))
    fireEvent.click(screen.getByRole('button', { name: /Confirm refund/i }))

    await waitFor(() => {
      expect(mockApp.refundOrder).toHaveBeenCalledWith('11111111-2222-3333-4444-555555555555')
      expect(mockApp.resolveDispute).toHaveBeenCalledWith('dispute-1', 'refunded')
    })
    expect(mockApp.showToast).toHaveBeenCalledWith('Dispute resolved - buyer refunded')
  })

  it('refund dispute failure does not close the dispute or show success', async () => {
    const dispute = makeDispute()
    renderPage(makeOrder(), { disputes: [dispute] })
    mockApp.refundOrder.mockResolvedValue({ ok: false, error: 'Stripe refund failed' })
    openDisputeDetail()

    fireEvent.click(screen.getByRole('button', { name: /Refund Buyer/i }))
    fireEvent.click(screen.getByRole('button', { name: /Confirm refund/i }))

    await waitFor(() => {
      expect(mockApp.showToast).toHaveBeenCalledWith('Refund failed: Stripe refund failed', 'error')
    })
    expect(mockApp.resolveDispute).not.toHaveBeenCalled()
    expect(mockApp.showToast).not.toHaveBeenCalledWith('Dispute resolved - buyer refunded')
  })

  it('release dispute resolution closes only after payout release succeeds', async () => {
    const dispute = makeDispute()
    renderPage(makeOrder(), { disputes: [dispute] })
    openDisputeDetail()

    fireEvent.click(screen.getByRole('button', { name: /Release Funds to Seller/i }))
    fireEvent.click(screen.getByRole('button', { name: /Confirm release/i }))

    await waitFor(() => {
      expect(mockApp.releasePayout).toHaveBeenCalledWith('11111111-2222-3333-4444-555555555555')
      expect(mockApp.resolveDispute).toHaveBeenCalledWith('dispute-1', 'seller_payout')
    })
    expect(mockApp.showToast).toHaveBeenCalledWith('Dispute resolved - seller paid')
  })

  it('release dispute failure does not close the dispute or show success', async () => {
    const dispute = makeDispute()
    renderPage(makeOrder(), { disputes: [dispute] })
    mockApp.releasePayout.mockResolvedValue({ ok: false, error: 'Transfer failed' })
    openDisputeDetail()

    fireEvent.click(screen.getByRole('button', { name: /Release Funds to Seller/i }))
    fireEvent.click(screen.getByRole('button', { name: /Confirm release/i }))

    await waitFor(() => {
      expect(mockApp.showToast).toHaveBeenCalledWith('Admin action failed: Transfer failed', 'error')
    })
    expect(mockApp.resolveDispute).not.toHaveBeenCalled()
    expect(mockApp.showToast).not.toHaveBeenCalledWith('Dispute resolved - seller paid')
  })
})
