import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrderDetailPage from '../pages/OrderDetailPage'
import { findExistingOrderConversation } from '../hooks/useConversations'

let mockApp

vi.mock('../context/AppContext', () => ({
  useApp: () => mockApp,
}))

function makeOrder(overrides = {}) {
  return {
    id: 'order-1',
    orderRef: 'SIB-ORDER1',
    listingId: 'listing-1',
    listingTitle: 'Blue dress',
    listingImage: '',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    status: 'paid',
    trackingStatus: 'paid',
    itemPrice: 13,
    totalPrice: 18.9,
    platformFee: 1.4,
    deliveryFee: 3.5,
    ...overrides,
  }
}

function renderOrderDetail({ currentUserId = 'buyer-1', openResult, appOverrides = {} } = {}) {
  const order = makeOrder()
  const users = [
    { id: 'buyer-1', name: 'Maya Buyer', username: 'maya' },
    { id: 'seller-1', name: 'Leo Seller', username: 'leo' },
  ]
  const listing = { id: 'listing-1', title: 'Blue dress', images: [] }
  mockApp = {
    orders: [order],
    disputes: [],
    disputeMessages: [],
    currentUser: users.find(user => user.id === currentUserId),
    ordersLoading: false,
    shipmentsLoading: false,
    PROTECTION_WINDOW_MS: 48 * 60 * 60 * 1000,
    DISPUTE_REASONS: [],
    getListingById: vi.fn(() => listing),
    getUserById: vi.fn(id => users.find(user => user.id === id)),
    getShipmentByOrderId: vi.fn(() => null),
    confirmDelivery: vi.fn(),
    openDispute: vi.fn(),
    showToast: vi.fn(),
    refreshOrders: vi.fn(),
    refreshShipments: vi.fn(),
    refreshDisputeMessages: vi.fn(),
    addDisputeMessage: vi.fn(),
    getOrCreateOrderConversationForUsers: vi.fn().mockResolvedValue(openResult || {
      conversation: { id: 'conversation-1' },
      error: null,
      created: false,
    }),
    ...appOverrides,
  }

  return render(
    <MemoryRouter initialEntries={['/orders/order-1']}>
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/messages/:id" element={<div>chat route opened</div>} />
        <Route path="/messages" element={<div>generic messages route</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('OrderDetailPage order messaging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens the direct seller conversation for a buyer order', async () => {
    renderOrderDetail({ currentUserId: 'buyer-1' })

    fireEvent.click(screen.getByRole('button', { name: /message seller/i }))

    await screen.findByText('chat route opened')
    expect(mockApp.getOrCreateOrderConversationForUsers).toHaveBeenCalledWith(expect.objectContaining({
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      listingId: 'listing-1',
      orderId: 'order-1',
      orderCode: 'SIB-ORDER1',
      itemTitle: 'Blue dress',
    }))
    expect(screen.queryByText('generic messages route')).not.toBeInTheDocument()
  })

  it('shows a loading state while opening an order chat', async () => {
    let resolveOpen
    const pendingOpen = new Promise(resolve => {
      resolveOpen = resolve
    })
    renderOrderDetail({
      appOverrides: {
        getOrCreateOrderConversationForUsers: vi.fn(() => pendingOpen),
      },
    })

    fireEvent.click(screen.getByRole('button', { name: /message seller/i }))

    expect(await screen.findByRole('button', { name: /opening chat/i })).toBeDisabled()
    resolveOpen({ conversation: { id: 'conversation-1' }, error: null, created: true })
    await screen.findByText('chat route opened')
  })

  it('opens the direct buyer conversation for a seller order', async () => {
    renderOrderDetail({ currentUserId: 'seller-1' })

    fireEvent.click(screen.getByRole('button', { name: /message buyer/i }))

    await screen.findByText('chat route opened')
    expect(mockApp.getOrCreateOrderConversationForUsers).toHaveBeenCalledWith(expect.objectContaining({
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      orderId: 'order-1',
    }))
  })

  it('shows an error and does not fall back to generic messages when chat creation fails', async () => {
    renderOrderDetail({
      openResult: { conversation: null, error: { message: 'Conversation write failed' }, created: false },
    })

    fireEvent.click(screen.getByRole('button', { name: /message seller/i }))

    await waitFor(() => {
      expect(mockApp.showToast).toHaveBeenCalledWith('Conversation write failed', 'error')
    })
    expect(screen.queryByText('generic messages route')).not.toBeInTheDocument()
  })
})

describe('findExistingOrderConversation', () => {
  it('reuses an existing order conversation by order id', () => {
    const existing = { id: 'conversation-1', participants: ['buyer-1', 'seller-1'], listingId: 'old-listing', metadata: { orderId: 'order-1' } }

    expect(findExistingOrderConversation([existing], {
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      listingId: 'listing-1',
      orderId: 'order-1',
    })).toBe(existing)
  })

  it('reuses a listing conversation to avoid duplicate buyer seller threads', () => {
    const existing = { id: 'conversation-1', participants: ['buyer-1', 'seller-1'], listingId: 'listing-1', metadata: {} }

    expect(findExistingOrderConversation([existing], {
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      listingId: 'listing-1',
      orderId: 'order-2',
    })).toBe(existing)
  })
})
