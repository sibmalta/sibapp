import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SIB_EXPRESS_SELLER_LIMIT_MESSAGE } from '../lib/deliveryEligibility'

const root = resolve(__dirname, '..', '..')

describe('sell listing parcel-size copy', () => {
  it('uses parcel-based wording instead of locker-fit language in the listing flow', () => {
    const sellPage = readFileSync(resolve(root, 'src/pages/SellPage.jsx'), 'utf8')

    expect(sellPage).toContain('Parcel size')
    expect(sellPage).toContain('Small parcel, under 5kg')
    expect(sellPage).toContain('Large/bulky item, over 5kg')
    expect(sellPage).toContain('SIB_EXPRESS_SELLER_LIMIT_MESSAGE')
    expect(SIB_EXPRESS_SELLER_LIMIT_MESSAGE).toBe('Sib Express delivery currently supports lightweight parcels up to 5kg that can be safely transported by motorcycle courier.')
    expect(sellPage).toContain('Sib delivery for larger items is coming soon.')
    expect(sellPage).not.toContain('Locker fit')
    expect(sellPage).not.toContain('locker size')
    expect(sellPage).not.toContain('Does this item fit within 40 x 40 x 60 cm')
    expect(sellPage).not.toContain('Locker delivery will not be offered for this item.')
  })
})
