import { describe, expect, it } from 'vitest'
import {
  buildDropoffScanPath,
  buildDropoffScanUrl,
  getDropoffScanToken,
  getOrderCode,
  getQrCodeImageUrl,
  isDropoffConfirmed,
  orderCodeMatches,
} from '../lib/dropoffQr'
import { PUBLIC_DROPOFF_STORES, getPublicDropoffScanState } from '../lib/publicDropoffScan'
import { getCourierDeliveryTiming, getCourierDeliveryTimingLabel, getCourierDeliveryTimingPublicLabel } from '../lib/courierDeliveryTiming'

describe('drop-off QR helpers', () => {
  it('builds a tokenized public scan URL with order id and human-readable order code', () => {
    const order = {
      id: '11111111-2222-3333-4444-555555555555',
      orderRef: 'SIB-M009QOG9',
      dropoffScanToken: 'scan_token_1234567890abcdef1234567890abcdef',
    }

    expect(getOrderCode(order)).toBe('SIB-M009QOG9')
    expect(getDropoffScanToken(order)).toBe('scan_token_1234567890abcdef1234567890abcdef')
    expect(buildDropoffScanPath(order)).toBe('/scan-dropoff?orderId=11111111-2222-3333-4444-555555555555&code=SIB-M009QOG9&token=scan_token_1234567890abcdef1234567890abcdef')
    expect(buildDropoffScanUrl(order, 'https://sibmalta.com')).toBe('https://sibmalta.com/scan-dropoff?orderId=11111111-2222-3333-4444-555555555555&code=SIB-M009QOG9&token=scan_token_1234567890abcdef1234567890abcdef')
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
    expect(getQrCodeImageUrl('https://sibmalta.com/scan-dropoff?orderId=1&code=SIB-1&token=abc')).toContain('api.qrserver.com')
    expect(getQrCodeImageUrl('https://sibmalta.com/scan-dropoff?orderId=1&code=SIB-1&token=abc')).toContain('data=https%3A%2F%2Fsibmalta.com')
  })

  it('detects pending vs confirmed drop-off states safely', () => {
    expect(isDropoffConfirmed({ order: null, shipment: null })).toBe(false)
    expect(isDropoffConfirmed({ shipment: { status: 'awaiting_shipment' } })).toBe(false)
    expect(isDropoffConfirmed({ shipment: { status: 'dropped_off' } })).toBe(true)
    expect(isDropoffConfirmed({ order: { dropoffConfirmedAt: '2026-05-03T10:00:00.000Z' } })).toBe(true)
  })

  it('allows a valid awaiting_fulfilment scan to confirm without leaking internal status', () => {
    const state = getPublicDropoffScanState({
      ok: true,
      valid: true,
      codeValid: true,
      confirmed: false,
      canConfirm: false,
      status: 'awaiting_fulfilment',
      message: 'Old internal readiness message',
    })

    expect(state).toMatchObject({
      canConfirm: true,
      statusLabel: 'Ready for drop-off',
      message: 'Ready to confirm this parcel.',
    })
  })

  it('allows valid scans with a missing shipment record to confirm', () => {
    const state = getPublicDropoffScanState({
      ok: true,
      valid: true,
      codeValid: true,
      confirmed: false,
      canConfirm: false,
      error: 'shipment_missing',
      status: 'awaiting_shipment',
    })

    expect(state.canConfirm).toBe(true)
    expect(state.statusLabel).toBe('Ready for drop-off')
  })

  it('shows already confirmed scans as idempotent and not confirmable', () => {
    const state = getPublicDropoffScanState({
      ok: true,
      valid: true,
      codeValid: true,
      confirmed: true,
      status: 'dropped_off',
    })

    expect(state).toMatchObject({
      confirmed: true,
      canConfirm: false,
      statusLabel: 'Parcel already confirmed',
      message: 'Parcel already confirmed.',
    })
  })

  it('classifies courier delivery timing before and after the noon cutoff', () => {
    expect(getCourierDeliveryTiming(new Date(2026, 4, 5, 11, 59))).toBe('same_day')
    expect(getCourierDeliveryTimingLabel(new Date(2026, 4, 5, 11, 59))).toBe('Same-day')
    expect(getCourierDeliveryTiming(new Date(2026, 4, 5, 12, 0))).toBe('next_day')
    expect(getCourierDeliveryTimingLabel(new Date(2026, 4, 5, 12, 0))).toBe('Next-day')
    expect(getCourierDeliveryTiming('2026-05-05T09:59:00.000Z')).toBe('same_day')
    expect(getCourierDeliveryTimingPublicLabel('2026-05-05T09:59:00.000Z')).toBe('Today')
    expect(getCourierDeliveryTiming('2026-05-05T10:00:00.000Z')).toBe('next_day')
    expect(getCourierDeliveryTimingPublicLabel('2026-05-05T10:00:00.000Z')).toBe('Next working day')
  })

  it('shows delivery timing after public scan confirmation', () => {
    const state = getPublicDropoffScanState({
      ok: true,
      valid: true,
      codeValid: true,
      confirmed: true,
      deliveryTiming: 'same_day',
    })

    expect(state.deliveryTimingLabel).toBe('Today')
  })

  it('exposes configured MYConvenience stores for public scan confirmation', () => {
    expect(PUBLIC_DROPOFF_STORES.map(store => store.name)).toEqual([
      'MYConvenience Sliema',
      'MYConvenience St Julian’s',
      'MYConvenience Valletta',
      'MYConvenience Gzira',
      'MYConvenience Swieqi',
      'Other / Admin confirmed',
    ])
  })

  it('keeps successful public confirmation visibly confirmed with store location', () => {
    const state = getPublicDropoffScanState({
      ok: true,
      valid: true,
      codeValid: true,
      confirmedNow: true,
      storeName: 'MYConvenience Sliema',
      confirmedAt: '2026-05-05T09:30:00.000Z',
      deliveryTiming: 'same_day',
    })

    expect(state).toMatchObject({
      confirmed: true,
      canConfirm: false,
      statusLabel: 'Parcel confirmed',
      message: 'Parcel confirmed.',
      storeName: 'MYConvenience Sliema',
      confirmedAt: '2026-05-05T09:30:00.000Z',
      deliveryTimingLabel: 'Today',
    })
  })

  it('blocks invalid public scan tokens', () => {
    const state = getPublicDropoffScanState({
      ok: false,
      valid: false,
      error: 'invalid_scan',
      message: 'Old invalid token message',
    })

    expect(state).toMatchObject({
      invalid: true,
      canConfirm: false,
      statusLabel: 'Invalid or expired QR code',
      message: 'Invalid or expired QR code.',
    })
  })
})
