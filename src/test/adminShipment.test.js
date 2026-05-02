import { describe, expect, it } from 'vitest'
import { buildAdminShipmentPayload, formatAdminShipmentPayload } from '../lib/adminShipment'

describe('admin shipment shortcut payload', () => {
  it('prefills legacy home delivery fields from order and buyer', () => {
    const payload = buildAdminShipmentPayload({
      id: 'order-1',
      orderRef: 'SIB-123',
      buyerFullName: 'Maria Borg',
      buyerPhone: '+35699123456',
      buyerPostcode: 'SLM 1000',
      address: '10 Test Street, Sliema',
      fulfilmentMethod: 'delivery',
    }, {
      buyer: { email: 'maria@example.com' },
    })

    expect(payload).toMatchObject({
      recipientName: 'Maria',
      recipientSurname: 'Borg',
      recipientPhone: '+35699123456',
      recipientEmail: 'maria@example.com',
      address: '10 Test Street, Sliema',
      postcode: 'SLM 1000',
      country: 'Malta',
      deliveryType: 'home',
      orderReference: 'SIB-123',
      shipmentReference: 'MP-SIB-123',
    })
  })

  it('uses locker delivery fields when the order fulfilment method is locker', () => {
    const payload = buildAdminShipmentPayload({
      id: 'order-2',
      orderRef: 'SIB-LOCKER',
      buyerFullName: 'Sam',
      lockerAddress: 'Locker A, Valletta',
      fulfilmentMethod: 'locker',
    })

    expect(payload.deliveryType).toBe('locker')
    expect(payload.address).toBe('Locker A, Valletta')
  })

  it('formats a copy-ready payload', () => {
    const payload = buildAdminShipmentPayload({
      id: 'order-3',
      orderRef: 'SIB-COPY',
      buyerFullName: 'Test Buyer',
      address: 'Address',
      fulfilmentMethod: 'delivery',
    })

    expect(formatAdminShipmentPayload(payload)).toContain('Shipment reference: MP-SIB-COPY')
    expect(formatAdminShipmentPayload(payload)).toContain('Delivery type: Legacy delivery method')
  })
})
