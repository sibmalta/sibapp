import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { orderToRow, rowToOrder, rowToShipment, shipmentToRow } from '../lib/db/orders'
import { buildSellerDropoffClaimPatch, getPendingSellerDropoffOrders } from '../lib/sellerDropoffPrompt'

const root = resolve(__dirname, '..', '..')

describe('seller drop-off flow', () => {
  it('maps seller self-confirmation on orders as the source of truth', () => {
    const order = rowToOrder({
      id: 'order_1',
      seller_id: 'seller_1',
      buyer_id: 'buyer_1',
      listing_id: 'listing_1',
      seller_claimed_dropoff: true,
      seller_dropoff_claimed_at: '2026-05-02T11:00:00.000Z',
    })

    expect(order.sellerClaimedDropoff).toBe(true)
    expect(order.sellerDropoffClaimedAt).toBe('2026-05-02T11:00:00.000Z')
    expect(orderToRow({
      sellerClaimedDropoff: true,
      sellerDropoffClaimedAt: order.sellerDropoffClaimedAt,
    })).toMatchObject({
      seller_claimed_dropoff: true,
      seller_dropoff_claimed_at: '2026-05-02T11:00:00.000Z',
    })
  })

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
    const orderMigration = readFileSync(resolve(root, 'supabase/migrations/20260502110000_order_seller_dropoff_claim.sql'), 'utf8')

    expect(migration).toContain('seller_claimed_dropoff boolean')
    expect(migration).toContain('seller_dropoff_claimed_at timestamptz')
    expect(migration).toContain('shipments_seller_claimed_dropoff_idx')
    expect(orderMigration).toContain('alter table if exists public.orders')
    expect(orderMigration).toContain('orders_seller_claimed_dropoff_idx')
    expect(orderMigration).toContain('orders_seller_dropoff_claim_update')
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

  it('shows the seller prompt only for seller-owned paid orders pending drop-off', () => {
    const orders = [
      {
        id: 'order_seller',
        sellerId: 'seller_1',
        buyerId: 'buyer_1',
        status: 'paid',
        paymentStatus: 'paid',
        sellerClaimedDropoff: false,
      },
      {
        id: 'order_buyer',
        sellerId: 'seller_2',
        buyerId: 'seller_1',
        status: 'paid',
        paymentStatus: 'paid',
        sellerClaimedDropoff: false,
      },
    ]

    expect(getPendingSellerDropoffOrders({ orders, shipments: [], currentUserId: 'seller_1' }).map(order => order.id)).toEqual(['order_seller'])
    expect(getPendingSellerDropoffOrders({ orders, shipments: [], currentUserId: 'buyer_1' })).toEqual([])
  })

  it('hides the seller prompt after seller claim or official store drop-off', () => {
    const order = {
      id: 'order_1',
      sellerId: 'seller_1',
      buyerId: 'buyer_1',
      status: 'paid',
      paymentStatus: 'paid',
      sellerClaimedDropoff: false,
    }

    expect(getPendingSellerDropoffOrders({ orders: [order], shipments: [], currentUserId: 'seller_1' })).toHaveLength(1)
    expect(getPendingSellerDropoffOrders({
      orders: [{ ...order, sellerClaimedDropoff: true }],
      shipments: [],
      currentUserId: 'seller_1',
    })).toHaveLength(0)
    expect(getPendingSellerDropoffOrders({
      orders: [order],
      shipments: [{ orderId: 'order_1', status: 'dropped_off' }],
      currentUserId: 'seller_1',
    })).toHaveLength(0)
  })

  it('claim patch updates seller claim fields only and does not set official dropped_off', () => {
    const patch = buildSellerDropoffClaimPatch('2026-05-02T12:00:00.000Z')

    expect(patch).toEqual({
      sellerClaimedDropoff: true,
      sellerDropoffClaimedAt: '2026-05-02T12:00:00.000Z',
    })
    expect(patch.status).toBeUndefined()
    expect(patch.fulfilmentStatus).toBeUndefined()
  })
})
