import { describe, expect, it } from 'vitest'
import {
  buildDropoffScanPath,
  buildDropoffScanUrl,
  getOrderCode,
  getQrCodeImageUrl,
  isDropoffConfirmed,
  orderCodeMatches,
} from '../lib/dropoffQr'

describe('drop-off QR helpers', () => {
  it('builds a scan URL with order id and human-readable order code', () => {
    const order = { id: '11111111-2222-3333-4444-555555555555', orderRef: 'SIB-M009QOG9' }

    expect(getOrderCode(order)).toBe('SIB-M009QOG9')
    expect(buildDropoffScanPath(order)).toBe('/admin/scan-dropoff?orderId=11111111-2222-3333-4444-555555555555&code=SIB-M009QOG9')
    expect(buildDropoffScanUrl(order, 'https://sibmalta.com')).toBe('https://sibmalta.com/admin/scan-dropoff?orderId=11111111-2222-3333-4444-555555555555&code=SIB-M009QOG9')
  })

  it('generates a fallback short order code when order_ref is missing', () => {
    expect(getOrderCode({ id: '11111111-2222-3333-4444-abcdef123456' })).toBe('SIB-EF123456')
  })

  it('validates scanned codes case-insensitively and accepts leading #', () => {
    const order = { orderRef: 'SIB-M009QOG9' }

    expect(orderCodeMatches(order, '#sib-m009qog9')).toBe(true)
    expect(orderCodeMatches(order, 'SIB-WRONG')).toBe(false)
  })

  it('builds a QR image URL from the scan URL', () => {
    expect(getQrCodeImageUrl('https://sibmalta.com/admin/scan-dropoff?orderId=1&code=SIB-1')).toContain('api.qrserver.com')
    expect(getQrCodeImageUrl('https://sibmalta.com/admin/scan-dropoff?orderId=1&code=SIB-1')).toContain('data=https%3A%2F%2Fsibmalta.com')
  })

  it('detects pending vs confirmed drop-off states safely', () => {
    expect(isDropoffConfirmed({ order: null, shipment: null })).toBe(false)
    expect(isDropoffConfirmed({ shipment: { status: 'awaiting_shipment' } })).toBe(false)
    expect(isDropoffConfirmed({ shipment: { status: 'dropped_off' } })).toBe(true)
    expect(isDropoffConfirmed({ order: { dropoffConfirmedAt: '2026-05-03T10:00:00.000Z' } })).toBe(true)
  })
})
