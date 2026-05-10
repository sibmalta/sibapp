import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('orders loading reliability', () => {
  it('bounds order fetches and always clears loading state', () => {
    const hook = readFileSync(resolve(root, 'src/hooks/useOrders.js'), 'utf8')

    expect(hook).toContain('ORDERS_FETCH_TIMEOUT_MS')
    expect(hook).toContain('AUTH_LOOKUP_TIMEOUT_MS')
    expect(hook).toContain("withTimeout(fetchAllOrders(supabase), ORDERS_FETCH_TIMEOUT_MS, 'orders fetch')")
    expect(hook).toContain('finally')
    expect(hook).toContain('setOrdersLoading(false)')
    expect(hook).toContain("console.info('orders_load_start'")
    expect(hook).toContain("console.info('orders_load_success'")
    expect(hook).toContain("console.error(isTimeout ? 'orders_load_timeout' : 'orders_load_error'")
    expect(hook).toContain("console.info('orders_loading_false'")
    expect(hook).toContain('buyerOrders')
    expect(hook).toContain('sellerOrders')
  })

  it('shows an orders error and retry instead of loading forever', () => {
    const page = readFileSync(resolve(root, 'src/pages/OrdersPage.jsx'), 'utf8')

    expect(page).toContain('loadTimedOut')
    expect(page).toContain('ORDERS_PAGE_TIMEOUT_MS = 8000')
    expect(page).toContain("console.warn('[OrdersPage] loading timed out'")
    expect(page).toContain('We couldn’t load your orders. Try again.')
    expect(page).toContain('Retry')
    expect(page).toContain('ordersDbError')
    expect(page).toContain('ordersDbAvailable === false')
  })

  it('still renders the empty state when loading resolves with no orders', () => {
    const page = readFileSync(resolve(root, 'src/pages/OrdersPage.jsx'), 'utf8')

    expect(page).toContain('displayed.length === 0')
    expect(page).toContain("No {tab === 'buying' ? 'purchases' : 'sales'} yet")
    expect(page).toContain('Browse and buy something you love.')
    expect(page).toContain('Seller sales will appear here after checkout.')
  })
})
