import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..', '..')

describe('sell listing parcel-size copy', () => {
  it('uses parcel-based wording instead of locker-fit language in the listing flow', () => {
    const sellPage = readFileSync(resolve(root, 'src/pages/SellPage.jsx'), 'utf8')

    expect(sellPage).toContain('Parcel size')
    expect(sellPage).toContain('Can this item be safely carried by one person?')
    expect(sellPage).not.toContain('Locker fit')
    expect(sellPage).not.toContain('locker size')
    expect(sellPage).not.toContain('Does this item fit within 40 x 40 x 60 cm')
    expect(sellPage).not.toContain('Locker delivery will not be offered for this item.')
  })
})
