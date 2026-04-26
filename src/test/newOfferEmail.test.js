import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendNewOfferSellerEmail } from '../lib/offerEmail'
import { sendOfferReceivedEmail } from '../lib/email'

vi.mock('../lib/email', () => ({
  sendOfferReceivedEmail: vi.fn(async () => ({ success: true, emailSent: true, id: 'email-1' })),
}))

describe('new offer seller email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends exactly one offer_received email to the seller email', async () => {
    const result = await sendNewOfferSellerEmail({
      seller: { id: 'seller-1', email: 'seller@example.com', username: 'seller' },
      buyer: { id: 'buyer-1', username: 'buyer' },
      listing: { id: 'listing-1', sellerId: 'seller-1', title: 'Vintage jacket' },
      offer: { id: 'offer-1', listingId: 'listing-1', buyerId: 'buyer-1', sellerId: 'seller-1', price: 12 },
      conversationId: 'conversation-1',
    })

    expect(result.emailSent).toBe(true)
    expect(sendOfferReceivedEmail).toHaveBeenCalledTimes(1)
    expect(sendOfferReceivedEmail).toHaveBeenCalledWith(
      'seller@example.com',
      'Vintage jacket',
      12,
      'buyer',
      expect.objectContaining({
        offerId: 'offer-1',
        listingId: 'listing-1',
        conversationId: 'conversation-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        related_entity_type: 'offer',
        related_entity_id: 'offer-1',
      }),
    )
  })

  it('still calls send-email with sellerId metadata if the frontend profile lacks email', async () => {
    await sendNewOfferSellerEmail({
      seller: { id: 'seller-1', username: 'seller' },
      buyer: { id: 'buyer-1', username: 'buyer' },
      listing: { id: 'listing-1', sellerId: 'seller-1', title: 'Vintage jacket' },
      offer: { id: 'offer-1', listingId: 'listing-1', buyerId: 'buyer-1', sellerId: 'seller-1', price: 12 },
      conversationId: 'conversation-1',
    })

    expect(sendOfferReceivedEmail).toHaveBeenCalledTimes(1)
    expect(sendOfferReceivedEmail).toHaveBeenCalledWith(
      null,
      'Vintage jacket',
      12,
      'buyer',
      expect.objectContaining({ sellerId: 'seller-1' }),
    )
  })
})
