import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { CATEGORY_TREE, getCategoryOptions, getSubcategories } from '../data/categories'

const root = process.cwd()

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
    'pets',
  ]

  it('keeps Kids & Baby immediately after Fashion in the shared category tree', () => {
    expect(CATEGORY_TREE.map(category => category.id)).toEqual(expectedOrder)
  })

  it('uses the same order for category options after All', () => {
    expect(getCategoryOptions().map(category => category.id)).toEqual(['all', ...expectedOrder])
  })

  it('includes Pets with marketplace supply subcategories', () => {
    const pets = CATEGORY_TREE.find(category => category.id === 'pets')

    expect(pets).toMatchObject({
      label: 'Pets',
      slug: 'pets',
      deliveryEligible: true,
    })
    expect(getSubcategories('pets').map(subcategory => subcategory.label)).toEqual([
      'Pet accessories',
      'Pet beds',
      'Pet carriers',
      'Pet clothing',
      'Bowls & feeders',
      'Toys',
      'Grooming',
      'Other',
    ])
  })

  it('feeds Pets into browse filters and the sell category selector from the shared tree', () => {
    const browsePage = readFileSync(resolve(root, 'src/pages/BrowsePage.jsx'), 'utf8')
    const sellPage = readFileSync(resolve(root, 'src/pages/SellPage.jsx'), 'utf8')

    expect(browsePage).toContain('const CATEGORIES = CATEGORY_TREE.map')
    expect(sellPage).toContain('CATEGORY_TREE.map(c => ({ value: c.id, label: c.label }))')
    expect(getCategoryOptions({ includeAll: false }).map(category => category.id)).toContain('pets')
  })

  it('keeps live animals prohibited in policy copy', () => {
    const prohibitedPage = readFileSync(resolve(root, 'src/pages/ProhibitedItemsPage.jsx'), 'utf8')

    expect(prohibitedPage).toContain('Live animals')
    expect(prohibitedPage).toContain('Live animals are prohibited on Sib')
  })
})
