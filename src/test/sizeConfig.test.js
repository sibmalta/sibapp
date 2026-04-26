import { describe, expect, it } from 'vitest'
import { compareNumericSizes, parseNumericSize, SHOE_SIZES, sizeFilterMatchesListing } from '../utils/sizeConfig'

describe('shoe size configuration', () => {
  it('includes EU half sizes in numeric order', () => {
    expect(SHOE_SIZES).toContain('40.5')
    expect(SHOE_SIZES).toContain('41.5')
    expect(SHOE_SIZES.indexOf('40')).toBeLessThan(SHOE_SIZES.indexOf('40.5'))
    expect(SHOE_SIZES.indexOf('40.5')).toBeLessThan(SHOE_SIZES.indexOf('41'))
  })

  it('parses and sorts decimal shoe sizes numerically', () => {
    expect(parseNumericSize('EU 40.5')).toBe(40.5)
    expect(['42', '40.5', '41', '40'].sort(compareNumericSizes)).toEqual(['40', '40.5', '41', '42'])
  })

  it('matches half-size filters against existing and legacy listing size values', () => {
    expect(sizeFilterMatchesListing('40.5', '40.5')).toBe(true)
    expect(sizeFilterMatchesListing('40.5', 'EU 40.5')).toBe(true)
    expect(sizeFilterMatchesListing('46+', 'EU 46.5')).toBe(true)
    expect(sizeFilterMatchesListing('40.5', '41')).toBe(false)
  })
})
