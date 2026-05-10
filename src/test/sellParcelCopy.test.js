import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SIB_EXPRESS_LARGER_ITEMS_COMING_SOON_MESSAGE,
  SIB_EXPRESS_LISTING_BLOCKED_MESSAGE,
  SIB_EXPRESS_SELLER_LIMIT_MESSAGE,
} from '../lib/deliveryEligibility'

const root = resolve(__dirname, '..', '..')

describe('sell listing parcel-size copy', () => {
  it('uses parcel-based wording instead of locker-fit language in the listing flow', () => {
    const sellPage = readFileSync(resolve(root, 'src/pages/SellPage.jsx'), 'utf8')

    expect(sellPage).toContain('Parcel size')
    expect(sellPage).toContain('Small parcel, under 5kg')
    expect(sellPage).toContain('Large/bulky item, over 5kg')
    expect(sellPage).toContain('disabled')
    expect(sellPage).toContain('Coming soon')
    expect(sellPage).toContain('SIB_EXPRESS_SELLER_LIMIT_MESSAGE')
    expect(sellPage).toContain('SIB_EXPRESS_LARGER_ITEMS_COMING_SOON_MESSAGE')
    expect(sellPage).toContain('SIB_EXPRESS_LISTING_BLOCKED_MESSAGE')
    expect(SIB_EXPRESS_SELLER_LIMIT_MESSAGE).toBe('Sib Express currently supports lightweight parcels under 5kg that can safely fit inside a motorcycle courier delivery bag.')
    expect(SIB_EXPRESS_LARGER_ITEMS_COMING_SOON_MESSAGE).toBe('Delivery for larger items is coming soon.')
    expect(SIB_EXPRESS_LISTING_BLOCKED_MESSAGE).toBe('Large and bulky item delivery is not available yet on Sib.')
    expect(sellPage).not.toContain('You can still publish this listing without Sib Express delivery.')
    expect(sellPage).not.toContain('Locker fit')
    expect(sellPage).not.toContain('locker size')
    expect(sellPage).not.toContain('Does this item fit within 40 x 40 x 60 cm')
    expect(sellPage).not.toContain('Locker delivery will not be offered for this item.')
  })
})
