import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { rowToShipment, shipmentToRow } from '../lib/db/orders'

const root = resolve(__dirname, '..', '..')

describe('seller drop-off flow', () => {
  it('maps seller self-confirmation separately from official dropped_off status', () => {
    const shipment = rowToShipment({
      id: 'ship_1',
      order_id: 'order_1',
      status: 'awaiting_shipment',
      seller_claimed_dropoff: true,
      seller_dropoff_claimed_at: '2026-05-02T10:00:00.000Z',
    })

    expect(shipment.status).toBe('awaiting_shipment')
    expect(shipment.sellerClaimedDropoff).toBe(true)
    expect(shipment.sellerDropoffClaimedAt).toBe('2026-05-02T10:00:00.000Z')
    expect(shipmentToRow({
      sellerClaimedDropoff: true,
      sellerDropoffClaimedAt: shipment.sellerDropoffClaimedAt,
    })).toMatchObject({
      seller_claimed_dropoff: true,
      seller_dropoff_claimed_at: '2026-05-02T10:00:00.000Z',
    })
  })

  it('adds shipment columns for seller claimed drop-off', () => {
    const migration = readFileSync(resolve(root, 'supabase/migrations/20260502103000_seller_dropoff_claim.sql'), 'utf8')

    expect(migration).toContain('seller_claimed_dropoff boolean')
    expect(migration).toContain('seller_dropoff_claimed_at timestamptz')
    expect(migration).toContain('shipments_seller_claimed_dropoff_idx')
  })

  it('supports drop-off instruction and 24h reminder emails with dedupe keys', () => {
    const sendEmail = readFileSync(resolve(root, 'supabase/functions/send-email/index.ts'), 'utf8')
    const appContext = readFileSync(resolve(root, 'src/context/AppContext.jsx'), 'utf8')
    const buyerProtection = readFileSync(resolve(root, 'supabase/functions/buyer-protection/index.ts'), 'utf8')
    const stripeWebhook = readFileSync(resolve(root, 'supabase/functions/stripe-webhook/index.ts'), 'utf8')

    expect(sendEmail).toContain("| 'sale_dropoff_instructions'")
    expect(sendEmail).toContain("| 'dropoff_reminder_24h'")
    expect(sendEmail).toContain("subject: 'You sold an item on Sib'")
    expect(sendEmail).toContain("subject: 'Reminder: drop off your Sib parcel'")
    expect(appContext).toContain('sale_dropoff_instructions:${orderId}:${sellerId}')
    expect(appContext).toContain('dropoff_reminder_24h:${orderId}:${sellerId}')
    expect(buyerProtection).toContain('dropoff_reminder_24h')
    expect(stripeWebhook).toContain('sendSaleDropoffInstructions')
  })
})
