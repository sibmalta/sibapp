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

  it('keeps bulky categories conservative when eligibility is unknown', () => {
    expect(isLockerEligible({ category: 'furniture', subcategory: 'tables', lockerEligible: null })).toBe(false)
    expect(isLockerEligible({ category: 'sports', subcategory: 'cycling', lockerEligible: null })).toBe(false)
  })
})
