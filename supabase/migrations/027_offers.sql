-- ============================================================
-- Migration 027: offers
-- Persists marketplace offers so seller/buyer devices can render
-- and act on offer cards inside message threads.
-- ============================================================

CREATE TABLE IF NOT EXISTS offers (
  id              TEXT PRIMARY KEY,
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  price           NUMERIC(10,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  counter_price   NUMERIC(10,2),
  accepted_price  NUMERIC(10,2),
  expires_at      TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_buyer_created_at
  ON offers(buyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_offers_seller_created_at
  ON offers(seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_offers_listing_status
  ON offers(listing_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_active_per_buyer_listing
  ON offers(buyer_id, listing_id)
  WHERE status IN ('pending', 'countered', 'accepted');

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offers_participant_read" ON offers;
CREATE POLICY "offers_participant_read" ON offers
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "offers_buyer_insert" ON offers;
CREATE POLICY "offers_buyer_insert" ON offers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "offers_participant_update" ON offers;
CREATE POLICY "offers_participant_update" ON offers
  FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP TRIGGER IF EXISTS offers_set_updated_at ON offers;
CREATE TRIGGER offers_set_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE offers;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
