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
        dropoffStoreId: 'myc-msida',
        dropoffStoreName: 'MYconvenience Msida',
        dropoffStoreAddress: 'Triq ix-Xatt, Msida',
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
})
