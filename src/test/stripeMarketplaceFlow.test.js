import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..', '..')

describe('Stripe marketplace payment flow wiring', () => {
  it('creates platform PaymentIntents for delayed seller transfers', () => {
    const createPaymentIntent = readFileSync(resolve(root, 'supabase/functions/create-payment-intent/index.ts'), 'utf8')

    expect(createPaymentIntent).toContain("payment_flow_type: 'separate_charge_then_transfer'")
    expect(createPaymentIntent).toContain('seller_payout_cents')
    expect(createPaymentIntent).toContain('platform_fee_cents')
    expect(createPaymentIntent).toContain('seller_stripe_account_id')
    expect(createPaymentIntent).toContain('transfer_group')
    expect(createPaymentIntent).not.toContain('transfer_data')
    expect(createPaymentIntent).not.toContain('application_fee_amount')
  })

  it('records payment accounting fields and releases transfer only from create-transfer', () => {
    const migration = readFileSync(resolve(root, 'supabase/migrations/20260505110000_marketplace_payment_accounting.sql'), 'utf8')
    const webhook = readFileSync(resolve(root, 'supabase/functions/stripe-webhook/index.ts'), 'utf8')
    const createTransfer = readFileSync(resolve(root, 'supabase/functions/create-transfer/index.ts'), 'utf8')

    for (const column of [
      'seller_stripe_account_id',
      'stripe_payment_intent_id',
      'stripe_checkout_session_id',
      'stripe_transfer_id',
      'seller_payout_amount',
      'platform_fee_amount',
      'delivery_fee_amount',
      'payout_status',
    ]) {
      expect(`${migration}\n${webhook}\n${createTransfer}`).toContain(column)
    }

    expect(webhook).toContain("payout_status: order.payout_status || 'held'")
    expect(createTransfer).toContain('stripe.transfers.create')
    expect(createTransfer).toContain("seller_payout_status: 'paid'")
    expect(createTransfer).toContain("payout_status: 'released'")
  })
})
