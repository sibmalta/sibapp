import { describe, expect, it } from 'vitest'
import { isLockerEligible } from '../lib/lockerEligibility'

describe('isLockerEligible', () => {
  it('uses explicit true when provided', () => {
    expect(isLockerEligible({ category: 'sports', subcategory: 'cycling', lockerEligible: true })).toBe(true)
  })

  it('uses explicit false as an override', () => {
    expect(isLockerEligible({ category: 'fashion', subcategory: 'tops', lockerEligible: false })).toBe(false)
  })

  it('defaults legacy fashion and books listings to locker eligible', () => {
    expect(isLockerEligible({ category: 'fashion', subcategory: 'tops', lockerEligible: null })).toBe(true)
    expect(isLockerEligible({ category: 'books', lockerEligible: undefined })).toBe(true)
  })

  it('defaults normal Kids & Baby listings to locker eligible', () => {
    expect(isLockerEligible({ category: 'kids', subcategory: 'kids_clothing', lockerEligible: null })).toBe(true)
    expect(isLockerEligible({ category: 'kids-baby', subcategory: 'baby_clothing', lockerEligible: undefined })).toBe(true)
    expect(isLockerEligible({ category: 'Kids', subcategory: 'other_kids', lockerEligible: null })).toBe(true)
  })

  it('keeps oversized Kids & Baby listings ineligible', () => {
    expect(isLockerEligible({ category: 'kids', subcategory: 'pushchairs', lockerEligible: null })).toBe(false)
    expect(isLockerEligible({ category: 'kids-baby', subcategory: 'nursery', lockerEligible: null })).toBe(false)
    expect(isLockerEligible({ category: 'kids', subcategory: 'kids_clothing', deliverySize: 'bulky', lockerEligible: null })).toBe(false)
  })

  it('treats pre-fix default false fashion coats as unknown and locker eligible', () => {
    expect(isLockerEligible({
      category: 'fashion',
      subcategory: 'coats',
      lockerEligible: false,
      createdAt: '2026-04-26T12:00:00.000Z',
    })).toBe(true)
  })

  it('keeps explicit false fashion coats ineligible after the fix date', () => {
    expect(isLockerEligible({
      category: 'fashion',
      subcategory: 'coats',
      lockerEligible: false,
      createdAt: '2026-04-27T12:00:00.000Z',
    })).toBe(false)
  })

  it('keeps bulky categories conservative when eligibility is unknown', () => {
    expect(isLockerEligible({ category: 'furniture', subcategory: 'tables', lockerEligible: null })).toBe(false)
    expect(isLockerEligible({ category: 'sports', subcategory: 'cycling', lockerEligible: null })).toBe(false)
  })
})
