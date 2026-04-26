import { sendOfferReceivedEmail } from './email'

export async function sendNewOfferSellerEmail({
  seller,
  listing,
  offer,
  buyer,
  conversationId,
}) {
  const sellerEmail = seller?.email || null
  const sellerId = offer?.sellerId || listing?.sellerId || seller?.id || null
  const buyerName = buyer?.username || buyer?.name || 'buyer'

  console.info('[offers] offer email send start', {
    offerId: offer?.id || null,
    sellerId,
    hasSellerProfile: !!seller,
    hasSellerEmail: !!sellerEmail,
    conversationId: conversationId || null,
    emailType: 'offer_received',
  })

  const emailResult = await sendOfferReceivedEmail(
    sellerEmail,
    listing?.title || 'item',
    offer?.price,
    buyerName,
    {
      offerId: offer?.id,
      listingId: listing?.id || offer?.listingId,
      conversationId,
      buyerId: buyer?.id || offer?.buyerId,
      sellerId,
      related_entity_type: 'offer',
      related_entity_id: offer?.id,
    },
  )

  console.info('[offers] offer email result', {
    offerId: offer?.id || null,
    sellerId,
    recipientEmail: sellerEmail,
    emailType: 'offer_received',
    success: !!emailResult?.success,
    emailSent: !!emailResult?.emailSent,
    response: emailResult,
  })

  if (!emailResult?.success || !emailResult?.emailSent) {
    console.warn('[offers] offer email failed or not sent', {
      offerId: offer?.id || null,
      sellerId,
      recipientEmail: sellerEmail,
      emailType: 'offer_received',
      response: emailResult,
    })
  }

  return emailResult
}
