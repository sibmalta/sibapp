import { describe, expect, it, vi } from 'vitest'
import { createListing, updateListing } from '../lib/db/listings'

function createSupabaseMock(row = {}) {
  const single = vi.fn(async () => ({
    data: {
      id: row.id || 'listing-1',
      seller_id: row.seller_id || 'seller-1',
      title: row.title || 'T-shirt',
      price: row.price || 10,
      category: row.category || 'fashion',
      subcategory: row.subcategory || 'tops',
      delivery_size: row.delivery_size || 'small',
      locker_eligible: true,
      status: 'active',
    },
    error: null,
  }))
  const select = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select }))
  const update = vi.fn(() => ({ eq: vi.fn(() => ({ select })) }))
  const from = vi.fn(() => ({ insert, update }))

  return { supabase: { from }, insert, update }
}

describe('listing write delivery launch guards', () => {
  const smallListing = {
    title: 'T-shirt',
    price: 10,
    category: 'fashion',
    subcategory: 'tops',
    deliverySize: 'small',
    lockerEligible: true,
  }

  it('allows small under-5kg listings to be created', async () => {
    const { supabase, insert } = createSupabaseMock()

    const { data, error } = await createListing(supabase, 'seller-1', smallListing)

    expect(error).toBeNull()
    expect(data.id).toBe('listing-1')
    expect(insert).toHaveBeenCalled()
  })

  it('blocks bulky listings before create insert', async () => {
    const { supabase, insert } = createSupabaseMock()

    await expect(createListing(supabase, 'seller-1', {
      ...smallListing,
      deliverySize: 'bulky',
      lockerEligible: false,
    })).rejects.toMatchObject({
      message: 'Large and bulky item delivery is not available yet on Sib.',
      code: 'unsupported_delivery_size',
    })
    expect(insert).not.toHaveBeenCalled()
  })

  it('blocks bulky listing updates before DB update', async () => {
    const { supabase, update } = createSupabaseMock()

    await expect(updateListing(supabase, 'listing-1', {
      ...smallListing,
      category: 'kids',
      subcategory: 'pushchairs',
      deliverySize: 'small',
      lockerEligible: true,
    })).rejects.toMatchObject({
      message: 'Large and bulky item delivery is not available yet on Sib.',
      code: 'unsupported_delivery_size',
    })
    expect(update).not.toHaveBeenCalled()
  })
})
