import React from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PayoutSetupPage, { startPayoutSetup } from '../pages/PayoutSetupPage'
import { startStripeConnect } from '../lib/stripe'

let mockApp
const mockNavigate = vi.fn()
const root = resolve(__dirname, '..', '..')

vi.mock('../context/AppContext', () => ({
  useApp: () => mockApp,
}))

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { access_token: 'header.payload.signature' } }),
}))

vi.mock('../lib/stripe', () => ({
  startStripeConnect: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderPage(overrides = {}) {
  mockApp = {
    currentUser: { id: 'seller-1' },
    getUserSales: vi.fn(() => []),
    refreshCurrentProfile: vi.fn(),
    showToast: vi.fn(),
    ...overrides,
  }

  return render(
    <MemoryRouter initialEntries={['/payout-setup']}>
      <PayoutSetupPage />
    </MemoryRouter>,
  )
}

describe('PayoutSetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Sib-owned payout setup intro route content', () => {
    renderPage()

    expect(screen.getByText('Receive your earnings securely')).toBeInTheDocument()
    expect(screen.getByText('Sib uses Stripe to securely send money from your sales directly to your bank account.')).toBeInTheDocument()
    expect(screen.getByText(/Individual \/ Sole proprietor/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue securely/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Maybe later/i })).toBeInTheDocument()
  })

  it('shows waiting earnings when pending balance exists', () => {
    renderPage({
      getUserSales: vi.fn(() => [{
        id: 'order-1',
        sellerId: 'seller-1',
        payoutStatus: 'blocked_seller_setup',
        sellerPayout: 18.5,
      }]),
    })

    expect(screen.getByText(/You have €18.50 waiting/)).toBeInTheDocument()
  })

  it('continues into the existing Stripe flow', async () => {
    const onRedirect = vi.fn()
    const refreshCurrentProfile = vi.fn()
    startStripeConnect.mockResolvedValue({ url: 'https://connect.stripe.test/onboard' })

    await startPayoutSetup({
      accessToken: 'header.payload.signature',
      returnUrl: 'https://sib.test/seller/payout-settings',
      refreshCurrentProfile,
      onRedirect,
    })

    expect(startStripeConnect).toHaveBeenCalledWith('header.payload.signature', 'https://sib.test/seller/payout-settings')
    expect(refreshCurrentProfile).toHaveBeenCalled()
    expect(onRedirect).toHaveBeenCalledWith('https://connect.stripe.test/onboard', { url: 'https://connect.stripe.test/onboard' })
  })

  it('maybe later returns to the previous page', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Maybe later/i }))

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('wires payout prompts through the intro page before Stripe', () => {
    const app = readFileSync(resolve(root, 'src/App.jsx'), 'utf8')
    const dashboard = readFileSync(resolve(root, 'src/pages/SellerDashboardPage.jsx'), 'utf8')
    const sell = readFileSync(resolve(root, 'src/pages/SellPage.jsx'), 'utf8')
    const widget = readFileSync(resolve(root, 'src/components/PendingPayoutsWidget.jsx'), 'utf8')

    expect(app).toContain('path="payout-setup"')
    expect(app).toContain('PayoutSetupPage')
    expect(dashboard).toContain("navigate('/payout-setup')")
    expect(sell).toContain("navigate('/payout-setup')")
    expect(widget).toContain("navigate('/payout-setup')")
    expect(sell).not.toContain('Set up payouts')
    expect(widget).not.toContain('Complete payout setup')
  })
})
