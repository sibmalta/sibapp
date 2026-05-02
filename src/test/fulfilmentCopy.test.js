import { describe, expect, it } from 'vitest'
import { getDropoffPendingConfirmationCopy } from '../lib/fulfilment'

describe('drop-off confirmation copy', () => {
  it('uses MYconvenience wording only when the fulfilment data names MYconvenience', () => {
    expect(getDropoffPendingConfirmationCopy({
      shipment: { dropoffStoreName: 'MY Sliema - Dingli Street' },
      fulfilmentMethod: 'delivery',
    })).toBe('We’re waiting for the MYconvenience store to scan and confirm it.')
  })

  it('uses MaltaPost delivery wording for MaltaPost home delivery orders', () => {
    expect(getDropoffPendingConfirmationCopy({
      order: { fulfilmentProvider: 'MaltaPost', fulfilmentMethod: 'delivery' },
    })).toBe('We’re waiting for the drop-off point to confirm receipt.')
  })

  it('uses generic wording when the fulfilment method is unknown', () => {
    expect(getDropoffPendingConfirmationCopy({
      order: { fulfilmentMethod: 'courier_partner' },
    })).toBe('We’re waiting for confirmation that the item was received.')
  })
})
