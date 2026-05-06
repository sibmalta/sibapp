import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildDeliverySheetRow, DELIVERY_SHEET_FIELDS } from '../lib/logisticsDeliverySheet'

const root = resolve(__dirname, '../..')

describe('logistics delivery sheet', () => {
  it('builds the MVP spreadsheet row from order, shipment, and user snapshots', () => {
    const row = buildDeliverySheetRow({
      order: {
        id: 'order-1',
        sellerName: 'Seller Snapshot',
        buyerFullName: 'Buyer Snapshot',
        listingTitle: 'Vintage Jacket',
        buyerPhone: '+35699999999',
        address: {
          line1: '1 Main Street',
          city: 'Sliema',
          postcode: 'SLM 1000',
          country: 'Malta',
        },
      },
      shipment: {
        id: 'shipment-1',
        status: 'dropped_off',
        dropoffStoreId: 'myc-msida',
        dropoffStoreName: 'MYconvenience Msida',
        dropoffStoreAddress: 'Triq ix-Xatt, Msida',
        dropoffStoreLocality: 'Msida',
        pickupZone: 'Central',
        droppedOffAt: new Date(2026, 4, 5, 11, 30).toISOString(),
        fallbackStoreName: 'MYconvenience Gzira',
      },
      buyer: { email: 'buyer@example.com' },
      seller: { name: 'Seller Profile' },
    })

    expect(Object.keys(row)).toEqual(DELIVERY_SHEET_FIELDS)
    expect(row).toMatchObject({
      order_id: 'order-1',
      shipment_id: 'shipment-1',
      seller_name: 'Seller Snapshot',
      buyer_name: 'Buyer Snapshot',
      buyer_surname: 'Snapshot',
      buyer_locality: 'Sliema',
      item_title: 'Vintage Jacket',
      dropoff_store_id: 'myc-msida',
      dropoff_location_name: 'MYconvenience Msida',
      dropoff_store_name: 'MYconvenience Msida',
      dropoff_store_address: 'Triq ix-Xatt, Msida',
      dropoff_store_locality: 'Msida',
      pickup_zone: 'Central',
      dropped_off_at: new Date(2026, 4, 5, 11, 30).toISOString(),
      buyer_delivery_address: '1 Main Street, Sliema, SLM 1000, Malta',
      buyer_contact: '+35699999999 / buyer@example.com',
      delivery_timing: 'same_day',
      delivery_status: 'dropped_off',
      fallback_store_name: 'MYconvenience Gzira',
      notes: 'Delivery timing: Same-day',
    })
  })

  it('marks scans after 12:00pm as next-day delivery', () => {
    const row = buildDeliverySheetRow({
      order: { id: 'order-2', buyerFullName: 'Buyer Snapshot' },
      shipment: {
        id: 'shipment-2',
        status: 'dropped_off',
        droppedOffAt: new Date(2026, 4, 5, 12, 1).toISOString(),
      },
    })

    expect(row.delivery_timing).toBe('next_day')
  })

  it('starts paid orders in awaiting pickup for Admin Logistics', () => {
    const row = buildDeliverySheetRow({
      order: {
        id: 'order-paid',
        orderRef: 'SIB-PAID',
        paymentStatus: 'paid',
        paidAt: '2026-05-06T10:00:00.000Z',
        buyerFullName: 'Maya Buyer',
        listingTitle: 'Blue jacket',
      },
    })

    expect(row.delivery_status).toBe('awaiting_pickup')
  })

  it('creates paid-order logistics rows idempotently in the database lifecycle migration', () => {
    const migration = readFileSync(resolve(root, 'supabase/migrations/20260506120000_paid_order_logistics_lifecycle.sql'), 'utf8')
    const logisticsTab = readFileSync(resolve(root, 'src/components/LogisticsTab.jsx'), 'utf8')
    const useLogistics = readFileSync(resolve(root, 'src/hooks/useLogistics.js'), 'utf8')

    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.ensure_paid_order_logistics')
    expect(migration).toContain("delivery_status")
    expect(migration).toContain("'awaiting_pickup'")
    expect(migration).toContain('INSERT INTO public.shipments')
    expect(migration).toContain('INSERT INTO public.logistics_delivery_sheet')
    expect(migration).toContain('IF NOT FOUND THEN')
    expect(migration).toContain('DROP TRIGGER IF EXISTS trg_ensure_paid_order_logistics')
    expect(migration).toContain('AFTER INSERT OR UPDATE OF payment_status, paid_at, status')
    expect(migration).toContain('SELECT public.ensure_paid_order_logistics(id)')
    expect(logisticsTab).toContain("row.deliveryStatus || row.delivery_status || 'awaiting_pickup'")
    expect(useLogistics).toContain("{ id: 'awaiting_pickup'")
    expect(useLogistics).toContain("label: 'Awaiting Pickup'")
  })
})
