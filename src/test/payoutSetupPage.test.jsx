import React from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PayoutSetupPage from '../pages/PayoutSetupPage'
import { createStripeConnectAccountSession, startStripeConnect } from '../lib/stripe'
import { loadConnectAndInitialize } from '@stripe/connect-js'

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
  ConnectAccountOnboarding: ({ onLoadError }) => (
    <div data-testid="embedded-onboarding">
      <button type="button" onClick={() => onLoadError?.({ error: new Error('Embedded component failed') })}>
        Trigger embedded error
      </button>
    </div>
  ),
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
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_sib')
    loadConnectAndInitialize.mockImplementation(() => ({ create: vi.fn(), update: vi.fn(), logout: vi.fn() }))
  })

  it('renders the Sib-owned payout setup intro route content', () => {
    renderPage()

    expect(screen.getByText('Receive your earnings securely')).toBeInTheDocument()
    expect(screen.getByText('Sib uses Stripe to securely send money from your sales directly to your bank account.')).toBeInTheDocument()
    expect(screen.getByText("To withdraw your earnings, complete Stripe's secure payout setup.")).toBeInTheDocument()
    expect(screen.getByText("This is only needed when you're ready to receive money.")).toBeInTheDocument()
    expect(screen.getByText('Stripe may open a secure window to verify your details.')).toBeInTheDocument()
    expect(screen.queryByText(/Individual \/ Sole proprietor/)).not.toBeInTheDocument()
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

  it('maybe later returns to the previous page', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Maybe later/i }))

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('starts embedded onboarding inside Sib when Stripe Connect initializes', async () => {
    createStripeConnectAccountSession.mockResolvedValue({ clientSecret: 'acct_sess_secret_123' })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const originalHref = window.location.href
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Continue securely/i }))

    expect(await screen.findByTestId('embedded-onboarding')).toBeInTheDocument()
    expect(document.getElementById('sib-embedded-onboarding')).toContainElement(screen.getByTestId('embedded-onboarding'))
    expect(loadConnectAndInitialize).toHaveBeenCalledWith(expect.objectContaining({
      publishableKey: 'pk_test_sib',
      fetchClientSecret: expect.any(Function),
    }))
    const fetchClientSecret = loadConnectAndInitialize.mock.calls[0][0].fetchClientSecret
    await expect(fetchClientSecret()).resolves.toBe('acct_sess_secret_123')
    expect(createStripeConnectAccountSession).toHaveBeenCalledWith('header.payload.signature', 'account_onboarding')
    expect(screen.queryByRole('button', { name: /Open secure Stripe setup/i })).not.toBeInTheDocument()
    expect(openSpy).not.toHaveBeenCalled()
    expect(window.location.href).toBe(originalHref)
    expect(window.location.href).not.toContain('connect.stripe.com')
    openSpy.mockRestore()
  })

  it('labels missing embedded account session client secrets clearly', async () => {
    createStripeConnectAccountSession.mockResolvedValue({})
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Continue securely/i }))
    await screen.findByTestId('embedded-onboarding')

    const fetchClientSecret = loadConnectAndInitialize.mock.calls[0][0].fetchClientSecret
    await expect(fetchClientSecret()).rejects.toThrow('No embedded setup session returned.')

    expect(await screen.findByText(/Debug reason: account_session_missing_client_secret/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Open secure Stripe setup/i })).toBeInTheDocument()
  })

  it('shows embedded failure state without automatically opening hosted Stripe', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const originalHref = window.location.href
    loadConnectAndInitialize.mockImplementation(() => {
      throw new Error('connect-js failed')
    })
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Continue securely/i }))

    expect(await screen.findByText('Secure embedded setup could not load.')).toBeInTheDocument()
    expect(screen.getByText(/Debug reason: stripe_connect_js_load_failure/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Open secure Stripe setup/i })).toBeInTheDocument()
    expect(openSpy).not.toHaveBeenCalled()
    expect(startStripeConnect).not.toHaveBeenCalled()
    expect(window.location.href).toBe(originalHref)
    expect(window.location.href).not.toContain('connect.stripe.com')
    openSpy.mockRestore()
  })

  it('opens hosted Stripe only after the user clicks the fallback button', async () => {
    loadConnectAndInitialize.mockImplementation(() => {
      throw new Error('connect-js failed')
    })
    startStripeConnect.mockResolvedValue({})
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Continue securely/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Open secure Stripe setup/i }))

    expect(startStripeConnect).toHaveBeenCalledWith('header.payload.signature', expect.stringContaining('/seller/payout-settings'))
  })

  it('labels missing embedded configuration clearly', async () => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', '')
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Continue securely/i }))

    expect(await screen.findByText('Secure embedded setup could not load.')).toBeInTheDocument()
    expect(screen.getByText(/Debug reason: missing_publishable_key/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Open secure Stripe setup/i })).toBeInTheDocument()
    expect(loadConnectAndInitialize).not.toHaveBeenCalled()
  })

  it('labels embedded component render errors clearly', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Continue securely/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Trigger embedded error/i }))

    expect(await screen.findByText(/Debug reason: embedded_component_render_error/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Open secure Stripe setup/i })).not.toBeInTheDocument()
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
    expect(payoutSetup).toContain('ConnectComponentsProvider')
    expect(payoutSetup).toContain('createStripeConnectAccountSession')
    expect(payoutSetup).toContain('id="sib-embedded-onboarding"')
    expect(payoutSetup).toContain('embedded_onboarding_render_start')
    expect(payoutSetup).toContain('embedded_onboarding_render_success')
    expect(payoutSetup).toContain('embedded_onboarding_render_failed')
    expect(payoutSetup).toContain('window.location.assign')
    expect(payoutSetup).not.toContain('window.open')
    expect(payoutSetup).toContain('startStripeConnect')
    expect(payoutSetup).not.toContain('connect.stripe.com')
    expect(payoutSetup).toContain('Open secure Stripe setup')
    expect(payoutSetup).toContain("To withdraw your earnings, complete Stripe's secure payout setup.")
    expect(payoutSetup).toContain("This is only needed when you're ready to receive money.")
    expect(payoutSetup).toContain('Stripe may open a secure window to verify your details.')
    expect(payoutSetup).toContain('Secure embedded setup could not load.')
    expect(payoutSetup).toContain('missing_publishable_key')
    expect(payoutSetup).toContain('account_session_creation_failed')
    expect(payoutSetup).toContain('account_session_missing_client_secret')
    expect(payoutSetup).toContain('stripe_connect_js_load_failure')
    expect(payoutSetup).toContain('embedded_component_render_error')
    expect(payoutSetup).toContain('existing_connected_account_incompatible')
    expect(payoutSetup).not.toContain('Individual / Sole proprietor')
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
