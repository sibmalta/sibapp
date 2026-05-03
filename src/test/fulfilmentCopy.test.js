import { describe, expect, it } from 'vitest'
import {
  getDropoffPendingConfirmationCopy,
  getFulfilmentMethodLabel,
  getFulfilmentMethodShortLabel,
  normalizeFulfilmentMethod,
} from '../lib/fulfilment'

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

  it('keeps MYconvenience/store drop-off wording when store data exists', () => {
    expect(getDropoffPendingConfirmationCopy({
      order: { fulfilmentMethod: null },
      shipment: { dropoffStoreName: 'MY Sliema - Dingli Street' },
    })).toBe('We’re waiting for the MYconvenience store to scan and confirm it.')
  })
})
