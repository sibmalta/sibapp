import { describe, expect, it } from 'vitest'
import {
  getDropoffPendingConfirmationCopy,
  getFulfilmentPrice,
  getFulfilmentMethodLabel,
  getFulfilmentMethodShortLabel,
  getOrderFulfilmentMethodLabel,
  getOrderFulfilmentProviderLabel,
  normalizeFulfilmentMethod,
} from '../lib/fulfilment'
import { rowToOrder } from '../lib/db/orders'

describe('drop-off confirmation copy', () => {
  it('uses MYconvenience wording only when the fulfilment data names MYconvenience', () => {
    expect(getDropoffPendingConfirmationCopy({
      shipment: { dropoffStoreName: 'MY Sliema - Dingli Street' },
      fulfilmentMethod: 'delivery',
    })).toBe('We’re waiting for the MYconvenience store to scan and confirm it.')
  })

  it('uses generic wording for legacy MaltaPost home delivery orders', () => {
    expect(getDropoffPendingConfirmationCopy({
      order: { fulfilmentProvider: 'MaltaPost', fulfilmentMethod: 'delivery' },
    })).toBe('We’re waiting for confirmation that the item was received.')
  })

  it('uses generic wording when the fulfilment method is unknown', () => {
    expect(getDropoffPendingConfirmationCopy({
      order: { fulfilmentMethod: 'courier_partner' },
    })).toBe('We’re waiting for confirmation that the item was received.')
  })

  it('handles a null fulfilment input without crashing', () => {
    expect(getDropoffPendingConfirmationCopy(null)).toBe('We’re waiting for confirmation that the item was received.')
  })

  it('handles undefined and empty fulfilment objects without crashing', () => {
    expect(getDropoffPendingConfirmationCopy(undefined)).toBe('We’re waiting for confirmation that the item was received.')
    expect(getDropoffPendingConfirmationCopy({})).toBe('We’re waiting for confirmation that the item was received.')
  })

  it('handles null nested order and shipment objects without crashing', () => {
    expect(getDropoffPendingConfirmationCopy({
      order: null,
      shipment: null,
      fulfilmentMethod: undefined,
    })).toBe('We’re waiting for confirmation that the item was received.')
  })
})

describe('fulfilment method labels', () => {
  it('uses the new active MYConvenience courier delivery price', () => {
    expect(getFulfilmentPrice('delivery')).toBe(3.50)
    expect(getFulfilmentPrice('home_delivery')).toBe(3.50)
    expect(getFulfilmentPrice('locker_collection')).toBe(3.50)
  })

  it('preserves historical fulfilment prices stored on orders', () => {
    const order = rowToOrder({
      id: 'order_legacy',
      seller_id: 'seller_1',
      buyer_id: 'buyer_1',
      listing_id: 'listing_1',
      fulfilment_method: 'delivery',
      fulfilment_price: 4.50,
      delivery_fee: 3.50,
    })

    expect(order.fulfilmentPrice).toBe(4.50)
  })

  it('uses Drop-off pending when fulfilment method is missing', () => {
    expect(normalizeFulfilmentMethod(null)).toBeNull()
    expect(normalizeFulfilmentMethod(undefined)).toBeNull()
    expect(getFulfilmentMethodLabel(null)).toBe('Drop-off pending')
    expect(getFulfilmentMethodShortLabel(undefined)).toBe('Drop-off pending')
  })

  it('keeps legacy MaltaPost orders renderable as legacy delivery', () => {
    expect(normalizeFulfilmentMethod('home_delivery')).toBe('delivery')
    expect(getFulfilmentMethodLabel('home_delivery')).toBe('Legacy delivery method')
  })

  it('uses MYConvenience drop-off wording for active paid legacy orders', () => {
    const order = {
      status: 'paid',
      trackingStatus: 'awaiting_delivery',
      fulfilmentMethod: 'delivery',
    }

    expect(getOrderFulfilmentProviderLabel(order)).toBe('MYConvenience drop-off')
    expect(getOrderFulfilmentMethodLabel(order)).toBe('Store drop-off')
  })

  it('keeps legacy wording only for historical completed legacy orders', () => {
    const order = {
      status: 'completed',
      trackingStatus: 'completed',
      fulfilmentMethod: 'delivery',
    }

    expect(getOrderFulfilmentProviderLabel(order)).toBe('Legacy delivery provider')
    expect(getOrderFulfilmentMethodLabel(order)).toBe('Legacy delivery method')
  })

  it('keeps MYconvenience/store drop-off wording when store data exists', () => {
    expect(getDropoffPendingConfirmationCopy({
      order: { fulfilmentMethod: null },
      shipment: { dropoffStoreName: 'MY Sliema - Dingli Street' },
    })).toBe('We’re waiting for the MYconvenience store to scan and confirm it.')
  })
})
