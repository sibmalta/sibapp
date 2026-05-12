import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import EmailVerificationRequired from '../components/EmailVerificationRequired'
import { isEmailVerified, requireVerifiedEmail, EMAIL_VERIFICATION_REQUIRED_MESSAGE } from '../lib/emailVerification'
import { useAuth } from '../lib/auth-context'

vi.mock('../lib/auth-context', () => ({
  useAuth: vi.fn(),
}))

function renderGate(authValue) {
  useAuth.mockReturnValue({
    loading: false,
    resendVerification: vi.fn(async () => ({ ok: true })),
    ...authValue,
  })

  return render(
    <MemoryRouter initialEntries={['/sell']}>
      <EmailVerificationRequired>
        <div>Verified marketplace action</div>
      </EmailVerificationRequired>
    </MemoryRouter>
  )
}

describe('email verification enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows verified users through the marketplace gate', () => {
    renderGate({ user: { id: 'user-1', email: 'seller@sib.test', email_confirmed_at: '2026-05-12T09:00:00Z' } })

    expect(screen.getByText('Verified marketplace action')).toBeInTheDocument()
  })

  it('blocks unverified users with clear resend messaging', async () => {
    const resendVerification = vi.fn(async () => ({ ok: true }))
    renderGate({ user: { id: 'user-1', email: 'seller@sib.test' }, resendVerification })

    expect(screen.getByText(EMAIL_VERIFICATION_REQUIRED_MESSAGE)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /resend verification email/i }))

    await waitFor(() => {
      expect(resendVerification).toHaveBeenCalledWith('seller@sib.test')
    })
    expect(await screen.findByText(/Verification email sent/i)).toBeInTheDocument()
  })

  it('normalizes the auth user verification states centrally', () => {
    expect(isEmailVerified({ email_confirmed_at: '2026-05-12T09:00:00Z' })).toBe(true)
    expect(isEmailVerified({ confirmed_at: '2026-05-12T09:00:00Z' })).toBe(true)
    expect(isEmailVerified({ user_metadata: { email_verified: true } })).toBe(true)
    expect(isEmailVerified({ id: 'user-1' })).toBe(false)
  })

  it('returns the same block message for direct mutation guards', () => {
    expect(requireVerifiedEmail({ id: 'user-1' })).toEqual({
      ok: false,
      error: EMAIL_VERIFICATION_REQUIRED_MESSAGE,
    })
    expect(requireVerifiedEmail({ id: 'user-1', email_confirmed_at: '2026-05-12T09:00:00Z' })).toEqual({
      ok: true,
      error: null,
    })
  })

  it('keeps expired verification link recovery visible in the auth callback', () => {
    const callback = readFileSync(resolve(process.cwd(), 'src/pages/AuthCallbackPage.jsx'), 'utf8')

    expect(callback).toContain('Verification link may have expired')
    expect(callback).toContain('request a new link')
  })

  it('protects direct Supabase marketplace writes with verified-email RLS policies', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20260512110000_enforce_email_verified_marketplace_actions.sql'),
      'utf8'
    )

    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.is_email_verified')
    expect(migration).toContain('public.can_write_marketplace()')
    expect(migration).toContain('listings_owner_insert')
    expect(migration).toContain('orders_buyer_insert')
    expect(migration).toContain('messages_sender_insert')
    expect(migration).toContain('dispute_messages_participant_insert_evidence')
    expect(migration).toContain('listing_images_owner_insert')
  })

  it('guards core marketplace routes against deep links', () => {
    const app = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8')

    expect(app).toContain('path="sell" element={verified(<SellPage />)}')
    expect(app).toContain('path="checkout/:id" element={verified(<CheckoutPage />)}')
    expect(app).toContain('path="messages" element={verified(<ChatListPage />)}')
    expect(app).toContain('path="seller" element={verified(<SellerDashboardPage />)}')
    expect(app).toContain('path="payout-setup" element={verified(')
    expect(app).toContain('path="bundle/checkout" element={verified(<BundleCheckoutPage />)}')
  })
})
