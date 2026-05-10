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
  createStripeConnectAccountSession: vi.fn(),
  startStripeConnect: vi.fn(),
}))

vi.mock('@stripe/connect-js', () => ({
  loadConnectAndInitialize: vi.fn(() => ({ create: vi.fn(), update: vi.fn(), logout: vi.fn() })),
}))

vi.mock('@stripe/react-connect-js', () => ({
  ConnectAccountOnboarding: () => <div data-testid="embedded-onboarding" />,
  ConnectComponentsProvider: ({ children }) => <div>{children}</div>,
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
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    startStripeConnect.mockResolvedValue({ url: 'https://connect.stripe.test/onboard' })

    await startPayoutSetup({
      accessToken: 'header.payload.signature',
      returnUrl: 'https://sib.test/seller/payout-settings',
      refreshCurrentProfile,
      onRedirect,
    })

    expect(startStripeConnect).toHaveBeenCalledWith('header.payload.signature', 'https://sib.test/seller/payout-settings')
    expect(infoSpy).toHaveBeenCalledWith('starting_stripe_onboarding')
    expect(refreshCurrentProfile).toHaveBeenCalled()
    expect(onRedirect).toHaveBeenCalledWith('https://connect.stripe.test/onboard', { url: 'https://connect.stripe.test/onboard' })
    infoSpy.mockRestore()
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
    const payoutSettings = readFileSync(resolve(root, 'src/pages/PayoutSettingsPage.jsx'), 'utf8')
    const payoutSetup = readFileSync(resolve(root, 'src/pages/PayoutSetupPage.jsx'), 'utf8')
    const stripeClient = readFileSync(resolve(root, 'src/lib/stripe.js'), 'utf8')
    const appContext = readFileSync(resolve(root, 'src/context/AppContext.jsx'), 'utf8')

    expect(app).toContain('path="payout-setup"')
    expect(app).toContain('PayoutSetupPage')
    expect(dashboard).toContain("navigate('/payout-setup')")
    expect(sell).not.toContain("navigate('/payout-setup')")
    expect(widget).toContain("navigate('/payout-setup')")
    expect(payoutSettings).toContain("navigate('/payout-setup')")
    expect(payoutSettings).not.toContain('startStripeConnect')
    expect(payoutSettings).not.toContain('window.location.assign')
    expect(payoutSettings).not.toContain('window.open')
    expect(payoutSetup).toContain('loadConnectAndInitialize')
    expect(payoutSetup).toContain('ConnectAccountOnboarding')
    expect(payoutSetup).toContain('createStripeConnectAccountSession')
    expect(stripeClient).toContain("mode: 'embedded_account_session'")
    expect(dashboard).toContain("console.info('routing_to_payout_setup')")
    expect(sell).not.toContain("console.info('routing_to_payout_setup')")
    expect(widget).toContain("console.info('routing_to_payout_setup')")
    expect(payoutSettings).toContain("console.info('routing_to_payout_setup')")
    expect(sell).not.toContain('Set up payouts')
    expect(widget).not.toContain('Complete payout setup')
    expect(widget).toContain('Withdraw earnings')
    expect(widget).toContain('Connect your bank securely when you are ready to withdraw.')
    expect(appContext).toContain("const orderStatus = 'paid'")
    expect(appContext).toContain("sellerPayoutStatus: 'held'")
    expect(appContext).not.toContain("sellerPayoutStatus: 'setup_pending'")
    expect(appContext).not.toContain("type: 'seller_payout_setup_required'")
  })
})
