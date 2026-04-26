-- Only pending/countered offers should block a buyer from making another offer
-- on the same listing. Accepted/declined/expired rows are history.

DROP INDEX IF EXISTS public.idx_offers_active_per_buyer_listing;

UPDATE public.offers
SET status = 'expired',
    updated_at = now()
WHERE status IN ('pending', 'countered')
  AND expires_at IS NOT NULL
  AND expires_at <= now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_active_per_buyer_listing
  ON public.offers(buyer_id, listing_id)
  WHERE status IN ('pending', 'countered');
