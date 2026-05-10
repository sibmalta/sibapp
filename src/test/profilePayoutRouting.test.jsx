import React from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from '../pages/ProfilePage'
import { PayoutErrorBoundary } from '../components/AppErrorBoundary'

let mockApp
const mockNavigate = vi.fn()
const root = resolve(__dirname, '..', '..')

vi.mock('../context/AppContext', () => ({
  useApp: () => mockApp,
}))

vi.mock('../hooks/useAuthNav', () => ({
  default: () => vi.fn(),
}))

vi.mock('../components/ListingCard', () => ({
  default: ({ listing }) => <div data-testid="listing-card">{listing.title}</div>,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
  }
})

function renderOwnProfile() {
  mockApp = {
    currentUser: {
      id: 'seller-1',
      username: 'joel',
      joinedAt: '2025-01-01T00:00:00.000Z',
    },
    getUserByUsername: vi.fn(),
    getUserListings: vi.fn(() => []),
    getUserSales: vi.fn(() => []),
    likedListings: [],
    getListingById: vi.fn(),
  }

  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <ProfilePage />
    </MemoryRouter>,
  )
}

describe('Profile payout routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes the profile wallet icon to the Sib payout setup page', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    renderOwnProfile()

    fireEvent.click(screen.getByLabelText('Withdraw earnings'))

    expect(mockNavigate).toHaveBeenCalledWith('/payout-setup')
    expect(infoSpy).toHaveBeenCalledWith('routing_to_payout_setup')
    infoSpy.mockRestore()
  })

  it('does not start Stripe directly from Profile', () => {
    const profileSource = readFileSync(resolve(root, 'src/pages/ProfilePage.jsx'), 'utf8')

    expect(profileSource).toContain("navigate('/payout-setup')")
    expect(profileSource).not.toContain('startStripeConnect')
    expect(profileSource).not.toContain('createStripeAccountLink')
    expect(profileSource).not.toContain('onboarding_url')
    expect(profileSource).not.toContain('account_link')
    expect(profileSource).not.toContain("navigate('/seller/payout-settings')")
    expect(profileSource).not.toContain("navigate('/settings/payments')")
    expect(profileSource).not.toContain("navigate('/payouts')")
    expect(profileSource).not.toContain('window.location')
  })

  it('shows a friendly payout fallback if the payout route crashes', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const BrokenPayoutPage = () => {
      throw new Error('Stripe component failed')
    }

    render(
      <PayoutErrorBoundary>
        <BrokenPayoutPage />
      </PayoutErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText("We couldn't load payout setup.")).toBeInTheDocument()
    expect(screen.getByText(/Your earnings are still safe/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to profile/i })).toHaveAttribute('href', '/profile')

    errorSpy.mockRestore()
  })
})
