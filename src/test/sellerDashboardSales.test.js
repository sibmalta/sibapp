import { describe, expect, it } from 'vitest'
import { rowToOrder } from '../lib/db/orders'
import { getSaleListingSnapshot } from '../pages/SellerDashboardPage'

describe('seller dashboard sales listing image', () => {
  it('maps joined listing images onto fetched orders', () => {
    const order = rowToOrder({
      id: 'order-1',
      listing_id: 'listing-1',
      seller_id: 'seller-1',
      buyer_id: 'buyer-1',
      item_price: 12,
      total_price: 16,
      seller_payout: 12,
      listing: {
        id: 'listing-1',
        title: 'Blue jacket',
        images: ['https://example.com/jacket.jpg'],
      },
    })

    expect(order.listing.title).toBe('Blue jacket')
    expect(order.listing.images).toEqual(['https://example.com/jacket.jpg'])
    expect(order.listingTitle).toBe('Blue jacket')
    expect(order.listingImage).toBe('https://example.com/jacket.jpg')
  })

  it('prefers live listing image when available', () => {
    expect(getSaleListingSnapshot(
      {
        listingTitle: 'Snapshot title',
        listingImage: 'https://example.com/snapshot.jpg',
        listing: { images: ['https://example.com/order.jpg'] },
      },
      {
        title: 'Live title',
        images: ['https://example.com/live.jpg'],
      },
    )).toEqual({
      title: 'Live title',
      imageUrl: 'https://example.com/live.jpg',
    })
  })

  it('falls back to order listing snapshot when active listing cache misses sold item', () => {
    expect(getSaleListingSnapshot({
      listing: {
        title: 'Sold jacket',
        images: ['https://example.com/sold.jpg'],
      },
    }, null)).toEqual({
      title: 'Sold jacket',
      imageUrl: 'https://example.com/sold.jpg',
    })
  })

  it('falls back safely when no image exists', () => {
    expect(getSaleListingSnapshot({ listingTitle: 'Historical sale' }, null)).toEqual({
      title: 'Historical sale',
      imageUrl: null,
    })
  })
})
