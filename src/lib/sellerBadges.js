export const SELLER_BADGE_IDS = [
  'verified_seller',
  'verified_vintage_seller',
  'trusted_seller',
]

export const SELLER_BADGE_ALIASES = {
  verified: 'verified_seller',
  verified_vintage: 'verified_vintage_seller',
}

export function normalizeSellerBadgeId(id) {
  return SELLER_BADGE_ALIASES[id] || id
}

export function normalizeSellerBadges(badges, options = {}) {
  const includeTrustedFlag = options.isTrustedSeller ? ['trusted_seller'] : []
  if (!Array.isArray(badges)) return [...new Set(includeTrustedFlag)]
  const allowed = new Set(SELLER_BADGE_IDS)
  return [...new Set(
    [...badges, ...includeTrustedFlag]
      .map(normalizeSellerBadgeId)
      .filter(id => allowed.has(id))
  )]
}
