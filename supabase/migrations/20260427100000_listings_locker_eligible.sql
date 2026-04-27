-- Explicit locker eligibility is based on physical dimensions, not delivery weight tier.
-- Existing listings default to false until a seller explicitly confirms locker fit.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS locker_eligible BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_listings_locker_eligible
  ON public.listings(locker_eligible);
