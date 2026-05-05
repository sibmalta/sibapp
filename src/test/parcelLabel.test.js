import { describe, expect, it } from 'vitest'
import { getParcelLabelDetails } from '../lib/parcelLabel'

describe('parcel label details', () => {
  it('uses order code, buyer surname, and buyer locality for drop-off labels', () => {
    expect(getParcelLabelDetails(
      {
        buyerFullName: 'Joel Sammut',
        buyerCity: 'Sliema',
      },
      null,
      'SIB-1001',
    )).toEqual({
      orderId: 'SIB-1001',
      surname: 'Sammut',
      locality: 'Sliema',
    })
  })

  it('falls back safely when surname or locality is missing', () => {
    expect(getParcelLabelDetails(
      {
        buyerFullName: 'Joel',
      },
      {},
      'SIB-1002',
    )).toEqual({
      orderId: 'SIB-1002',
      surname: 'Not provided',
      locality: 'Not provided',
    })
  })

  it('can derive locality from delivery address snapshots', () => {
    expect(getParcelLabelDetails(
      {
        buyerName: 'Maria Borg',
        deliveryAddressSnapshot: { locality: 'Mosta' },
      },
      {},
      'SIB-1003',
    )).toMatchObject({
      surname: 'Borg',
      locality: 'Mosta',
    })
  })
})
