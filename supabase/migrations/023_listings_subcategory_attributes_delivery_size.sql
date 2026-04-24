-- Add structured listing metadata columns required by the current sell/edit flow.
-- These columns are already used by the app and DB helpers; without them, create/update
-- falls back to an older schema path that drops subcategory and other structured fields.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_size TEXT;

CREATE INDEX IF NOT EXISTS idx_listings_subcategory
  ON public.listings(subcategory);
