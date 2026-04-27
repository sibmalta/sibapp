export const ACTIVE_OFFER_STATUSES = new Set(['pending', 'countered'])

export function isActiveOffer(offer, nowMs = Date.now()) {
  if (!offer || !ACTIVE_OFFER_STATUSES.has(offer.status)) return false
  if (!offer.expiresAt) return true
  const expiresAt = new Date(offer.expiresAt).getTime()
  return Number.isNaN(expiresAt) || expiresAt > nowMs
}

export function getActiveOfferForListing(offers, buyerId, listingId, nowMs = Date.now()) {
  return (offers || []).find(
    (offer) => offer.buyerId === buyerId && offer.listingId === listingId && isActiveOffer(offer, nowMs),
  ) || null
}

export function getOfferCreationBlockReason(offers, buyerId, listingId, maxActiveOffers, nowMs = Date.now()) {
  const activeOffers = (offers || []).filter((offer) => offer.buyerId === buyerId && isActiveOffer(offer, nowMs))
  if (activeOffers.length >= maxActiveOffers) {
    return `You can only have ${maxActiveOffers} active offers at a time.`
  }

  if (getActiveOfferForListing(activeOffers, buyerId, listingId, nowMs)) {
    return 'You already have an active offer on this item.'
  }

  return null
}
