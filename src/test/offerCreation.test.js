import { describe, expect, it } from 'vitest'
import { insertOffer } from '../lib/db/offers'
import { getActiveOfferForListing, getOfferCreationBlockReason } from '../lib/offerStatus'

function createSuccessfulOfferSupabaseMock() {
  return {
    from(table) {
      if (table !== 'offers') throw new Error(`Unexpected table ${table}`)
      return {
        insert(row) {
          return {
            select() {
              return {
                single: async () => ({
                  data: {
                    ...row,
                    id: row.id || 'offer-1',
                    listing_id: row.listing_id,
                    buyer_id: row.buyer_id,
                    seller_id: row.seller_id,
                    conversation_id: row.conversation_id || null,
                    price: row.price,
                    status: row.status || 'pending',
                    created_at: '2026-04-26T10:00:00.000Z',
                    updated_at: '2026-04-26T10:00:00.000Z',
                    expires_at: row.expires_at || null,
                    metadata: row.metadata || {},
                  },
                  error: null,
                }),
              }
            },
          }
        },
      }
    },
  }
}

function createDuplicateOfferSupabaseMock() {
  return {
    from(table) {
      if (table !== 'offers') throw new Error(`Unexpected table ${table}`)
      return {
        insert() {
          return {
            select() {
              return {
                single: async () => ({
                  data: null,
                  error: { code: '23505', message: 'duplicate key value violates unique constraint' },
                }),
              }
            },
          }
        },
      }
    },
  }
}

describe('offer creation', () => {
  it('allows a first offer when no active offer exists', async () => {
    const { data, error } = await insertOffer(createSuccessfulOfferSupabaseMock(), {
      id: 'offer-1',
      listingId: 'listing-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      price: 10,
      status: 'pending',
    })

    expect(error).toBeNull()
    expect(data.id).toBe('offer-1')
    expect(data.listingId).toBe('listing-1')
  })

  it('only treats pending/countered offers as active duplicates', () => {
    const now = new Date('2026-04-26T12:00:00.000Z').getTime()
    const inactiveOffers = [
      { id: 'accepted-1', buyerId: 'buyer-1', listingId: 'listing-1', status: 'accepted' },
      { id: 'expired-1', buyerId: 'buyer-1', listingId: 'listing-1', status: 'expired' },
      { id: 'declined-1', buyerId: 'buyer-1', listingId: 'listing-1', status: 'declined' },
    ]

    expect(getActiveOfferForListing(inactiveOffers, 'buyer-1', 'listing-1', now)).toBeNull()
    expect(getActiveOfferForListing([
      ...inactiveOffers,
      { id: 'pending-1', buyerId: 'buyer-1', listingId: 'listing-1', status: 'pending' },
    ], 'buyer-1', 'listing-1', now).id).toBe('pending-1')
  })

  it('blocks duplicate active offers before insert should be attempted', () => {
    const now = new Date('2026-04-26T12:00:00.000Z').getTime()
    const reason = getOfferCreationBlockReason([
      { id: 'pending-1', buyerId: 'buyer-1', listingId: 'listing-1', status: 'pending' },
    ], 'buyer-1', 'listing-1', 10, now)

    expect(reason).toBe('You already have an active offer on this item.')
  })

  it('maps active-offer unique constraint failures to a user-friendly error', async () => {
    const { data, error } = await insertOffer(createDuplicateOfferSupabaseMock(), {
      id: 'offer-1',
      listingId: 'listing-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      price: 10,
      status: 'pending',
    })

    expect(data).toBeNull()
    expect(error.message).toBe('You already have an active offer on this item.')
  })
})
