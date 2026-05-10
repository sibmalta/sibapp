import { describe, expect, it } from 'vitest'
import { CATEGORY_TREE, getCategoryOptions } from '../data/categories'

describe('category ordering', () => {
  const expectedOrder = [
    'fashion',
    'kids',
    'electronics',
    'books',
    'sports',
    'home',
    'furniture',
    'toys',
  ]

  it('keeps Kids & Baby immediately after Fashion in the shared category tree', () => {
    expect(CATEGORY_TREE.map(category => category.id)).toEqual(expectedOrder)
  })

  it('uses the same order for category options after All', () => {
    expect(getCategoryOptions().map(category => category.id)).toEqual(['all', ...expectedOrder])
  })
})
