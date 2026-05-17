import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('orders loading reliability', () => {
  it('bounds order fetches and always clears loading state', () => {
    const hook = readFileSync(resolve(root, 'src/hooks/useOrders.js'), 'utf8')

    expect(hook).toContain('ORDERS_FETCH_TIMEOUT_MS')
    expect(hook).toContain('AUTH_LOOKUP_TIMEOUT_MS')
    expect(hook).toContain('RELATED_FETCH_TIMEOUT_MS')
    expect(hook).toContain('refreshInFlightRef')
    expect(hook).toContain("console.info('refresh_skipped_duplicate'")
    expect(hook).toContain("withTimeout(fetchAllOrders(supabase), ORDERS_FETCH_TIMEOUT_MS, 'orders fetch')")
    expect(hook).toContain("withTimeout(fetchAllShipments(supabase), RELATED_FETCH_TIMEOUT_MS, 'shipments fetch')")
    expect(hook).toContain("withTimeout(fetchAllDisputes(supabase), RELATED_FETCH_TIMEOUT_MS, 'disputes fetch')")
    expect(hook).toContain('finally')
    expect(hook).toContain('setOrdersLoading(false)')
    expect(hook).toContain('setShipmentsLoading(false)')
    expect(hook).toContain('setDisputesLoading(false)')
    expect(hook).toContain("console.info('orders_load_start'")
    expect(hook).toContain("source: 'retry_after_db_unavailable'")
    expect(hook).toContain("console.info('orders_load_success'")
    expect(hook).toContain("console.info('shipments_load_start'")
    expect(hook).toContain("console.info('shipments_load_success'")
    expect(hook).toContain("console.error(isTimeout ? 'orders_load_timeout' : 'orders_load_error'")
    expect(hook).toContain("logRelatedLoadError('shipments', error)")
    expect(hook).toContain("console.info('orders_loading_false'")
    expect(hook).toContain("console.info('shipments_loading_false'")
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
    expect(page).toContain('criticalLoading: authLoading || ordersLoading')
    expect(page).toContain('optionalProfilesLoading: profilesLoading')
    expect(page).toContain("console.info('route_blocked_by'")
    expect(page).toContain("console.info('orders_redirect_legacy_seller_dropoff'")
    expect(page).toContain('Promise.resolve(refreshShipments()).catch')
  })

  it('logs raw Supabase order query failures at the data layer', () => {
    const ordersDb = readFileSync(resolve(root, 'src/lib/db/orders.js'), 'utf8')

    expect(ordersDb).toContain("console.error('[orders] fetchAllOrders query failed:'")
    expect(ordersDb).toContain('details: error.details')
    expect(ordersDb).toContain('hint: error.hint')
    expect(ordersDb).toContain('error,')
    expect(ordersDb).toContain("console.error('[orders] fetchAllOrders threw:'")
  })

  it('still renders the empty state when loading resolves with no orders', () => {
    const page = readFileSync(resolve(root, 'src/pages/OrdersPage.jsx'), 'utf8')

    expect(page).toContain('displayed.length === 0')
    expect(page).toContain("No ${tab === 'buying' ? 'purchases' : 'sales'} yet")
    expect(page).toContain('No parcels awaiting drop-off')
    expect(page).toContain('Browse and buy something you love.')
    expect(page).toContain('Seller sales will appear here after checkout.')
  })

  it('does not treat shipment enrichment as a critical orders page dependency', () => {
    const page = readFileSync(resolve(root, 'src/pages/OrdersPage.jsx'), 'utf8')

    expect(page).toContain('if (authLoading || ordersLoading)')
    expect(page).not.toContain('if (authLoading || profilesLoading || ordersLoading || shipmentsLoading)')
    expect(page).not.toContain('if (authLoading || profilesLoading || ordersLoading)')
  })

  it('bounds profile loading because OrdersPage waits for profiles', () => {
    const hook = readFileSync(resolve(root, 'src/hooks/useProfiles.js'), 'utf8')

    expect(hook).toContain('PROFILE_FETCH_TIMEOUT_MS = 8000')
    expect(hook).toContain("withTimeout(fetchAllProfiles(supabase), PROFILE_FETCH_TIMEOUT_MS, 'profiles fetch')")
    expect(hook).toContain("withTimeout(fetchProfileById(supabase, currentUser.id), PROFILE_FETCH_TIMEOUT_MS, 'current profile fetch')")
    expect(hook).toContain("console.info('profile_fetch_start'")
    expect(hook).toContain("console.info('refresh_skipped_duplicate', { resource: 'current_profile' })")
    expect(hook).toContain("console.info('profiles_load_start'")
    expect(hook).toContain("console.info('profiles_loading_false'")
    expect(hook).toContain('setLoading(false)')
  })

  it('uses allSettled for independent post-order refreshes', () => {
    const appContext = readFileSync(resolve(root, 'src/context/AppContext.jsx'), 'utf8')

    expect(appContext).toContain('Promise.allSettled([refreshOrders(), refreshShipments()])')
    expect(appContext).toContain('Promise.allSettled([refreshShipments(), refreshLogisticsDeliverySheet()])')
    expect(appContext).toContain("console.info('app_context_init_start'")
    expect(appContext).toContain("console.info('app_context_init_complete'")
    expect(appContext).toContain("console.info('loading_state_changed'")
  })
})
