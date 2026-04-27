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
