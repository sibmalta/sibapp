import { describe, expect, it } from 'vitest'
import { buildDeliverySheetRow, DELIVERY_SHEET_FIELDS } from '../lib/logisticsDeliverySheet'

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
        dropoffStoreName: 'MYconvenience Msida',
        dropoffStoreAddress: 'Triq ix-Xatt, Msida',
        droppedOffAt: '2026-04-28T10:00:00.000Z',
        fallbackStoreName: 'MYconvenience Gzira',
        notes: 'Handle with care',
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
      item_title: 'Vintage Jacket',
      dropoff_store_name: 'MYconvenience Msida',
      dropoff_store_address: 'Triq ix-Xatt, Msida',
      dropped_off_at: '2026-04-28T10:00:00.000Z',
      buyer_delivery_address: '1 Main Street, Sliema, SLM 1000, Malta',
      buyer_contact: '+35699999999 / buyer@example.com',
      delivery_status: 'dropped_off',
      fallback_store_name: 'MYconvenience Gzira',
      notes: 'Handle with care',
    })
  })
})
