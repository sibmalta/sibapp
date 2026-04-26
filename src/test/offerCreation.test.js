import { describe, expect, it } from 'vitest'
import { insertOffer } from '../lib/db/offers'

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
