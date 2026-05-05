import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { orderToRow, rowToOrder, rowToShipment, shipmentToRow } from '../lib/db/orders'
import { getConfirmedSellerDropoffOrders, getPendingSellerDropoffOrders, isOrderPaidForDropoff, shouldShowSellerDropoffQr } from '../lib/sellerDropoffPrompt'

const root = resolve(__dirname, '..', '..')

describe('seller drop-off flow', () => {
  it('maps official QR/admin drop-off confirmation metadata on orders and shipments', () => {
    const order = rowToOrder({
      id: 'order_1',
      order_ref: 'SIB-M009QOG9',
      seller_id: 'seller_1',
      buyer_id: 'buyer_1',
      listing_id: 'listing_1',
      fulfilment_status: 'dropped_off',
      dropoff_scan_token: 'scan_token_1234567890abcdef1234567890abcdef',
      dropoff_confirmed_at: '2026-05-03T10:00:00.000Z',
      dropoff_confirmed_by: 'admin_1',
      dropoff_location: 'MY Sliema - Dingli Street',
    })
    const shipment = rowToShipment({
      id: 'ship_1',
      order_id: 'order_1',
      status: 'dropped_off',
      dropoff_confirmed_at: '2026-05-03T10:00:00.000Z',
      dropoff_confirmed_by: 'admin_1',
      dropoff_location: 'MY Sliema - Dingli Street',
    })

    expect(order.dropoffConfirmedAt).toBe('2026-05-03T10:00:00.000Z')
    expect(order.dropoffConfirmedBy).toBe('admin_1')
    expect(order.dropoffLocation).toBe('MY Sliema - Dingli Street')
    expect(order.dropoffScanToken).toBe('scan_token_1234567890abcdef1234567890abcdef')
    expect(orderToRow({
      fulfilmentStatus: 'dropped_off',
      dropoffScanToken: order.dropoffScanToken,
      dropoffConfirmedAt: order.dropoffConfirmedAt,
      dropoffConfirmedBy: order.dropoffConfirmedBy,
      dropoffLocation: order.dropoffLocation,
    })).toMatchObject({
      fulfilment_status: 'dropped_off',
      dropoff_scan_token: 'scan_token_1234567890abcdef1234567890abcdef',
      dropoff_confirmed_at: '2026-05-03T10:00:00.000Z',
      dropoff_confirmed_by: 'admin_1',
      dropoff_location: 'MY Sliema - Dingli Street',
    })
    expect(shipment.dropoffConfirmedAt).toBe('2026-05-03T10:00:00.000Z')
    expect(shipmentToRow({
      status: 'dropped_off',
      dropoffConfirmedAt: shipment.dropoffConfirmedAt,
      dropoffConfirmedBy: shipment.dropoffConfirmedBy,
      dropoffLocation: shipment.dropoffLocation,
    })).toMatchObject({
      status: 'dropped_off',
      dropoff_confirmed_at: '2026-05-03T10:00:00.000Z',
      dropoff_confirmed_by: 'admin_1',
      dropoff_location: 'MY Sliema - Dingli Street',
    })
  })

  it('does not map seller self-confirmation as drop-off state', () => {
    const shipment = rowToShipment({
      id: 'ship_1',
      order_id: 'order_1',
      status: 'awaiting_shipment',
      seller_claimed_dropoff: true,
      seller_dropoff_claimed_at: '2026-05-02T10:00:00.000Z',
    })

    expect(shipment.status).toBe('awaiting_shipment')
    expect(shipment.sellerClaimedDropoff).toBeUndefined()
    expect(shipment.sellerDropoffClaimedAt).toBeUndefined()
    expect(shipmentToRow({
      sellerClaimedDropoff: true,
      sellerDropoffClaimedAt: shipment.sellerDropoffClaimedAt,
    })).not.toHaveProperty('seller_claimed_dropoff')
  })

  it('removes seller self-confirmation columns from the active schema', () => {
    const migration = readFileSync(resolve(root, 'supabase/migrations/20260505113000_remove_seller_dropoff_self_confirmation.sql'), 'utf8')
    const ordersDb = readFileSync(resolve(root, 'src/lib/db/orders.js'), 'utf8')
    const appContext = readFileSync(resolve(root, 'src/context/AppContext.jsx'), 'utf8')
    const ordersPage = readFileSync(resolve(root, 'src/pages/OrdersPage.jsx'), 'utf8')

    expect(migration).toContain('drop column if exists seller_claimed_dropoff')
    expect(migration).toContain('drop column if exists seller_dropoff_claimed_at')
    expect(ordersDb).not.toContain('sellerClaimedDropoff')
    expect(ordersDb).not.toContain('sellerDropoffClaimedAt')
    expect(appContext).not.toContain('sellerClaimShipmentDropoff')
    expect(ordersPage).not.toContain('sellerClaimShipmentDropoff')
    expect(ordersPage).not.toContain("I\\u2019ve dropped it off")
  })

  it('includes the QR drop-off confirmation migration and admin scan route', () => {
    const migration = readFileSync(resolve(root, 'supabase/migrations/20260503120000_qr_dropoff_confirmation.sql'), 'utf8')
    const publicMigration = readFileSync(resolve(root, 'supabase/migrations/20260504110000_public_dropoff_scan_tokens.sql'), 'utf8')
    const app = readFileSync(resolve(root, 'src/App.jsx'), 'utf8')
    const scanPage = readFileSync(resolve(root, 'src/pages/AdminScanDropoffPage.jsx'), 'utf8')

    expect(migration).toContain('dropoff_confirmed_at')
    expect(migration).toContain('dropoff_scan_logs')
    expect(migration).toContain('orders_admin_dropoff_update')
    expect(migration).toContain('shipments_admin_dropoff_update')
    expect(publicMigration).toContain('dropoff_scan_token')
    expect(publicMigration).toContain('get_public_dropoff_scan')
    expect(publicMigration).toContain('confirm_public_dropoff_scan')
    expect(publicMigration).toContain("'status', CASE")
    expect(publicMigration).toContain("ELSE 'ready_for_dropoff'")
    expect(publicMigration).toContain("'canConfirm', v_code_valid AND NOT v_confirmed")
    expect(publicMigration).toContain("'Ready to confirm this parcel.'")
    expect(publicMigration).toContain("'Parcel already confirmed.'")
    expect(publicMigration).toContain("'Invalid or expired QR code.'")
    expect(publicMigration).toContain('delivery_timing')
    expect(publicMigration).toContain("TIME '12:00'")
    expect(publicMigration).not.toContain('not ready for store drop-off confirmation')
    expect(publicMigration).not.toContain("'order_not_paid'")
    expect(publicMigration).not.toContain("'shipment_missing'")
    expect(publicMigration).toContain('GRANT EXECUTE ON FUNCTION public.confirm_public_dropoff_scan(TEXT, TEXT, TEXT) TO anon, authenticated')
    expect(app).toContain('admin/scan-dropoff')
    expect(app).toContain('scan-dropoff')
    expect(scanPage).toContain('getPublicDropoffScan')
    expect(scanPage).toContain('confirmPublicDropoffScan')
    expect(scanPage).toContain('Parcel confirmed.')
    expect(scanPage).toContain('Delivery timing')
    expect(scanPage).not.toContain('useApp(')
    expect(scanPage).not.toContain('currentUser')
    expect(scanPage).not.toContain('markShipmentDroppedOff')
    expect(scanPage).not.toContain("navigate('/auth'")
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
      },
      {
        id: 'order_buyer',
        sellerId: 'seller_2',
        buyerId: 'seller_1',
        status: 'paid',
        paymentStatus: 'paid',
      },
    ]

    expect(getPendingSellerDropoffOrders({ orders, shipments: [], currentUserId: 'seller_1' }).map(order => order.id)).toEqual(['order_seller'])
    expect(getPendingSellerDropoffOrders({ orders, shipments: [], currentUserId: 'buyer_1' })).toEqual([])
  })

  it('does not treat unpaid or pending checkout orders as eligible for seller drop-off QR flow', () => {
    expect(isOrderPaidForDropoff({
      id: 'pending_order',
      sellerId: 'seller_1',
      buyerId: 'buyer_1',
      status: 'pending',
      trackingStatus: 'pending',
      paymentStatus: 'pending',
    })).toBe(false)

    expect(getPendingSellerDropoffOrders({
      orders: [{
        id: 'pending_order',
        sellerId: 'seller_1',
        buyerId: 'buyer_1',
        status: 'pending',
        trackingStatus: 'pending',
        paymentStatus: 'pending',
      }],
      shipments: [{ orderId: 'pending_order', status: 'awaiting_shipment' }],
      currentUserId: 'seller_1',
    })).toEqual([])
  })

  it('treats paid seller orders as eligible for QR/drop-off instructions', () => {
    expect(isOrderPaidForDropoff({
      id: 'paid_order',
      sellerId: 'seller_1',
      buyerId: 'buyer_1',
      trackingStatus: 'awaiting_delivery',
      paidAt: '2026-05-03T10:00:00.000Z',
    })).toBe(true)

    expect(getPendingSellerDropoffOrders({
      orders: [{
        id: 'paid_order',
        sellerId: 'seller_1',
        buyerId: 'buyer_1',
        trackingStatus: 'awaiting_delivery',
        paidAt: '2026-05-03T10:00:00.000Z',
      }],
      shipments: [{ orderId: 'paid_order', status: 'awaiting_shipment' }],
      currentUserId: 'seller_1',
    }).map(order => order.id)).toEqual(['paid_order'])
  })

  it('shows QR for paid seller orders with missing fulfilment method', () => {
    expect(shouldShowSellerDropoffQr({
      order: {
        id: 'paid_missing_fulfilment',
        sellerId: 'seller_1',
        buyerId: 'buyer_1',
        paymentStatus: 'paid',
        trackingStatus: 'awaiting_delivery',
        fulfilmentMethod: null,
      },
      shipment: { orderId: 'paid_missing_fulfilment', status: 'awaiting_fulfilment' },
      currentUserId: 'seller_1',
    })).toBe(true)
  })

  it('shows QR for active paid seller orders with legacy fulfilment method', () => {
    expect(shouldShowSellerDropoffQr({
      order: {
        id: 'paid_legacy_fulfilment',
        sellerId: 'seller_1',
        buyerId: 'buyer_1',
        paymentStatus: 'paid',
        trackingStatus: 'awaiting_delivery',
        fulfilmentMethod: 'delivery',
      },
      shipment: { orderId: 'paid_legacy_fulfilment', status: 'label_created' },
      currentUserId: 'seller_1',
    })).toBe(true)
  })

  it('does not show seller QR for buyer view or unpaid orders', () => {
    expect(shouldShowSellerDropoffQr({
      order: {
        id: 'paid_order',
        sellerId: 'seller_1',
        buyerId: 'buyer_1',
        paymentStatus: 'paid',
        trackingStatus: 'awaiting_delivery',
      },
      shipment: { orderId: 'paid_order', status: 'awaiting_shipment' },
      currentUserId: 'buyer_1',
    })).toBe(false)

    expect(shouldShowSellerDropoffQr({
      order: {
        id: 'unpaid_order',
        sellerId: 'seller_1',
        buyerId: 'buyer_1',
        paymentStatus: 'pending',
        trackingStatus: 'pending',
      },
      shipment: { orderId: 'unpaid_order', status: 'awaiting_shipment' },
      currentUserId: 'seller_1',
    })).toBe(false)
  })

  it('routes the seller prompt CTA to the multi-order drop-off QR page', () => {
    const prompt = readFileSync(resolve(root, 'src/components/SellerDropoffPrompt.jsx'), 'utf8')
    const app = readFileSync(resolve(root, 'src/App.jsx'), 'utf8')
    const layout = readFileSync(resolve(root, 'src/components/Layout.jsx'), 'utf8')
    const homePage = readFileSync(resolve(root, 'src/pages/HomePage.jsx'), 'utf8')
    const ordersPage = readFileSync(resolve(root, 'src/pages/OrdersPage.jsx'), 'utf8')
    const sellerDashboardPage = readFileSync(resolve(root, 'src/pages/SellerDashboardPage.jsx'), 'utf8')
    const browsePage = readFileSync(resolve(root, 'src/pages/BrowsePage.jsx'), 'utf8')
    const sellPage = readFileSync(resolve(root, 'src/pages/SellPage.jsx'), 'utf8')
    const listingPage = readFileSync(resolve(root, 'src/pages/ListingPage.jsx'), 'utf8')
    const detail = readFileSync(resolve(root, 'src/pages/OrderDetailPage.jsx'), 'utf8')
    const dropoffPage = readFileSync(resolve(root, 'src/pages/SellerDropoffPage.jsx'), 'utf8')

    expect(prompt).toContain('View drop-off QRs')
    expect(prompt).toContain("navigate('/dropoff')")
    expect(prompt).not.toContain("I\\u2019ve dropped it off")
    expect(prompt).not.toContain("I've dropped it off")
    expect(app).toContain('path="dropoff"')
    expect(app).toContain('SellerDropoffPage')
    expect(layout).not.toContain('SellerDropoffPrompt')
    expect(homePage).toContain('<SellerDropoffPrompt />')
    expect(ordersPage).toContain('<SellerDropoffPrompt />')
    expect(sellerDashboardPage).toContain('<SellerDropoffPrompt />')
    expect(browsePage).not.toContain('SellerDropoffPrompt')
    expect(sellPage).not.toContain('SellerDropoffPrompt')
    expect(listingPage).not.toContain('SellerDropoffPrompt')
    expect(dropoffPage).not.toContain('SellerDropoffPrompt')
    expect(dropoffPage).toContain('No parcels waiting for drop-off.')
    expect(dropoffPage).toContain('No confirmed drop-offs yet.')
    expect(dropoffPage).toContain('buildDropoffScanUrl')
    expect(dropoffPage).toContain('getQrCodeImageUrl(scanUrl, 340)')
    expect(detail).toContain('id="dropoff-qr"')
  })

  it('keeps the seller drop-off detail screen focused on QR-only store scan instructions', () => {
    const detail = readFileSync(resolve(root, 'src/pages/OrderDetailPage.jsx'), 'utf8')

    expect(detail).toContain('Show this QR code at MYConvenience.')
    expect(detail).toContain('Drop off before 12:00pm for same-day delivery.')
    expect(detail).toContain('Drop-offs after 12:00pm are delivered the next working day.')
    expect(detail).toContain('Write on parcel')
    expect(detail).toContain('Required for delivery sorting')
    expect(detail).toContain('ORDER ID')
    expect(detail).toContain('SURNAME')
    expect(detail).toContain('LOCALITY')
    expect(detail).toContain('Write these clearly on the outside of the parcel before handing it to MYConvenience.')
    expect(detail).not.toContain('Write the order number and buyer name clearly on the outside of the parcel.')
    expect(detail).not.toContain('IMPORTANT: Write clearly on parcel')
    expect(detail).not.toContain('Buyer name')
    expect(detail).not.toContain('Write both clearly on the outside of the package before handing it to MYConvenience.')
    expect(detail).toContain('Your parcel will be confirmed once the store scans your QR code.')
    expect(detail).not.toContain('Enter tracking number')
    expect(detail).not.toContain('Official confirmation will be available once the shipment record is created')
    expect(detail).not.toContain('Fulfilment method: Store drop-off')
    expect(detail).not.toContain('Seller next step: {showSellerDropoffQr')
  })

  it('keeps QR/drop-off instructions out of unsold listing pages', () => {
    const listingPage = readFileSync(resolve(root, 'src/pages/ListingPage.jsx'), 'utf8')

    expect(listingPage).not.toContain('Drop-off QR')
    expect(listingPage).not.toContain('Show this QR code at MYConvenience')
    expect(listingPage).not.toContain('Write this order code clearly on your parcel')
    expect(listingPage).not.toContain('admin/scan-dropoff')
  })

  it('moves seller orders from pending to confirmed only after official store drop-off', () => {
    const order = {
      id: 'order_1',
      sellerId: 'seller_1',
      buyerId: 'buyer_1',
      status: 'paid',
      paymentStatus: 'paid',
    }

    expect(getPendingSellerDropoffOrders({ orders: [order], shipments: [], currentUserId: 'seller_1' })).toHaveLength(1)
    expect(getConfirmedSellerDropoffOrders({ orders: [order], shipments: [], currentUserId: 'seller_1' })).toHaveLength(0)
    expect(getPendingSellerDropoffOrders({
      orders: [order],
      shipments: [{ orderId: 'order_1', status: 'dropped_off' }],
      currentUserId: 'seller_1',
    })).toHaveLength(0)
    expect(getConfirmedSellerDropoffOrders({
      orders: [order],
      shipments: [{ orderId: 'order_1', status: 'dropped_off' }],
      currentUserId: 'seller_1',
    })).toHaveLength(1)
  })
})
