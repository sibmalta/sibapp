import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..', '..')

function read(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('Stripe Connect seller account setup', () => {
  it('creates new Sib seller connected accounts as individuals in Malta with transfer-only capability', () => {
    const stripeConnect = read('supabase/functions/stripe-connect/index.ts')

    expect(stripeConnect).toContain('stripe.accounts.create({')
    expect(stripeConnect).toContain("country: 'MT'")
    expect(stripeConnect).toContain("business_type: 'individual'")
    expect(stripeConnect).toContain('transfers: { requested: true }')
    expect(stripeConnect).not.toContain('card_payments: { requested: true }')
    expect(stripeConnect).toContain("type: 'express'")
  })

  it('reuses existing connected accounts and logs their business type', () => {
    const stripeConnect = read('supabase/functions/stripe-connect/index.ts')

    expect(stripeConnect).toContain('let accountId = profile?.stripe_account_id || null')
    expect(stripeConnect).toContain('syncStripeAccountStatus(supabase, stripe, userId, accountId)')
    expect(stripeConnect).toContain('[stripe-connect] Reusing connected account')
    expect(stripeConnect).toContain('businessType: account.business_type || null')
    expect(stripeConnect).toContain('capabilities: account.capabilities || {}')
    expect(stripeConnect).toContain('requirementsCurrentlyDue: account.requirements?.currently_due || []')
  })

  it('creates embedded account sessions against the existing connected account', () => {
    const stripeConnect = read('supabase/functions/stripe-connect/index.ts')

    expect(stripeConnect).toContain("mode === 'embedded_account_session'")
    expect(stripeConnect).toContain('accountSessions.create')
    expect(stripeConnect).toContain('account: accountId')
    expect(stripeConnect).toContain('account_onboarding')
    expect(stripeConnect).toContain('external_account_collection')
  })

  it('keeps legacy account creation fallbacks individual-only too', () => {
    const createAccountLink = read('supabase/functions/create-account-link/index.ts')
    const createConnectedAccount = read('supabase/functions/create-connected-account/index.ts')

    for (const source of [createAccountLink, createConnectedAccount]) {
      expect(source).toContain("country: 'MT'")
      expect(source).toContain("business_type: 'individual'")
      expect(source).toContain('transfers: { requested: true }')
      expect(source).not.toContain('card_payments: { requested: true }')
      expect(source).toContain('businessType: account.business_type || null')
      expect(source).toContain('requirementsCurrentlyDue: account.requirements?.currently_due || []')
    }
  })

  it('keeps checkout on platform PaymentIntents and seller payouts on later transfers', () => {
    const createPaymentIntent = read('supabase/functions/create-payment-intent/index.ts')
    const createTransfer = read('supabase/functions/create-transfer/index.ts')

    expect(createPaymentIntent).toContain("payment_flow_type: 'separate_charge_then_transfer'")
    expect(createPaymentIntent).toContain('paymentIntents.create')
    expect(createPaymentIntent).toContain('seller_stripe_account_id')
    expect(createPaymentIntent).not.toContain('transfer_data')
    expect(createPaymentIntent).not.toContain('application_fee_amount')
    expect(createTransfer).toContain('stripe.transfers.create')
    expect(createTransfer).toContain('destination: sellerProfile.stripe_account_id')
  })

  it('does not create business-style Stripe accounts from frontend entry points', () => {
    const stripeClient = read('src/lib/stripe.js')
    const payoutSetup = read('src/pages/PayoutSetupPage.jsx')

    expect(stripeClient).not.toContain('accounts.create')
    expect(payoutSetup).not.toContain('accounts.create')
    expect(payoutSetup).not.toContain('business_type')
    expect(payoutSetup).not.toContain('Individual / Sole proprietor')
    expect(payoutSetup).toContain("To withdraw your earnings, complete Stripe's secure payout setup.")
  })
})
