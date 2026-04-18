-- ============================================================
-- Migration 003: orders, disputes, payouts, shipments
-- Full table definitions matching src/lib/db/orders.js shapes
-- ============================================================

-- ── orders ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref                 TEXT,
  listing_id                UUID REFERENCES listings(id) ON DELETE SET NULL,
  buyer_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_title             TEXT,
  listing_image             TEXT,
  item_price                NUMERIC(10,2) DEFAULT 0,
  bundled_fee               NUMERIC(10,2) DEFAULT 0,
  total_price               NUMERIC(10,2) DEFAULT 0,
  seller_payout             NUMERIC(10,2) DEFAULT 0,
  platform_fee              NUMERIC(10,2) DEFAULT 0,
  amount                    NUMERIC(10,2) DEFAULT 0,
  status                    TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','paid','shipped','delivered','confirmed','completed',
    'cancelled','refunded','disputed'
  )),
  tracking_status           TEXT DEFAULT 'pending',
  payout_status             TEXT DEFAULT 'held' CHECK (payout_status IN (
    'held','pending','released','paid','failed','refunded'
  )),
  delivery_method           TEXT DEFAULT 'sib_delivery',
  tracking_number           TEXT,
  shipping_address          JSONB,
  is_bundle                 BOOLEAN DEFAULT false,
  bundle_listing_ids        UUID[] DEFAULT '{}',
  bundle_offer_id           UUID,
  address                   JSONB,
  overdue_flag              BOOLEAN DEFAULT false,
  overdue_flagged_at        TIMESTAMPTZ,
  auto_confirmed            BOOLEAN DEFAULT false,
  -- Timestamps
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  paid_at                   TIMESTAMPTZ,
  shipped_at                TIMESTAMPTZ,
  delivered_at              TIMESTAMPTZ,
  confirmed_at              TIMESTAMPTZ,
  payout_released_at        TIMESTAMPTZ,
  cancelled_at              TIMESTAMPTZ,
  -- Stripe fields
  stripe_payment_intent_id  TEXT,
  payment_status            TEXT,
  seller_payout_status      TEXT,
  stripe_refund_id          TEXT,
  refunded_at               TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer      ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller     ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_listing    ON orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_pi  ON orders(stripe_payment_intent_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Buyer and seller can read their own orders; admins see all via service role
DROP POLICY IF EXISTS "orders_participant_read" ON orders;
CREATE POLICY "orders_participant_read" ON orders
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Only buyer can create an order (through checkout)
DROP POLICY IF EXISTS "orders_buyer_insert" ON orders;
CREATE POLICY "orders_buyer_insert" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Participants can update their own orders (status transitions)
DROP POLICY IF EXISTS "orders_participant_update" ON orders;
CREATE POLICY "orders_participant_update" ON orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Service role (Edge Functions) gets full access implicitly

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── disputes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              TEXT DEFAULT 'not_as_described' CHECK (type IN (
    'not_as_described','item_not_received','wrong_item','damaged','other'
  )),
  reason            TEXT,
  description       TEXT,
  status            TEXT DEFAULT 'open' CHECK (status IN (
    'open','under_review','resolved','closed','escalated'
  )),
  source            TEXT DEFAULT 'buyer' CHECK (source IN ('buyer','seller','admin')),
  resolution        TEXT,
  evidence_urls     TEXT[] DEFAULT '{}',
  messages          JSONB DEFAULT '[]'::jsonb,
  admin_messages    JSONB DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_order    ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_buyer    ON disputes(buyer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_seller   ON disputes(seller_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status   ON disputes(status);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "disputes_participant_read" ON disputes;
CREATE POLICY "disputes_participant_read" ON disputes
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "disputes_participant_insert" ON disputes;
CREATE POLICY "disputes_participant_insert" ON disputes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "disputes_participant_update" ON disputes;
CREATE POLICY "disputes_participant_update" ON disputes
  FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP TRIGGER IF EXISTS disputes_set_updated_at ON disputes;
CREATE TRIGGER disputes_set_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── payouts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payouts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID REFERENCES orders(id) ON DELETE SET NULL,
  seller_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount              NUMERIC(10,2) DEFAULT 0,
  status              TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','processing','completed','failed','cancelled'
  )),
  method              TEXT,
  reference           TEXT,
  released_at         TIMESTAMPTZ,
  -- Stripe fields
  stripe_transfer_id  TEXT,
  completed_at        TIMESTAMPTZ,
  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payouts_order    ON payouts(order_id);
CREATE INDEX IF NOT EXISTS idx_payouts_seller   ON payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status   ON payouts(status);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Sellers can read their own payouts
DROP POLICY IF EXISTS "payouts_seller_read" ON payouts;
CREATE POLICY "payouts_seller_read" ON payouts
  FOR SELECT TO authenticated
  USING (auth.uid() = seller_id);

-- Only Edge Functions (service role) create payouts; allow insert for auth as fallback
DROP POLICY IF EXISTS "payouts_insert" ON payouts;
CREATE POLICY "payouts_insert" ON payouts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "payouts_update" ON payouts;
CREATE POLICY "payouts_update" ON payouts
  FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id);

DROP TRIGGER IF EXISTS payouts_set_updated_at ON payouts;
CREATE TRIGGER payouts_set_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── shipments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                    UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_ref                   TEXT,
  seller_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id                    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status                      TEXT DEFAULT 'awaiting_shipment' CHECK (status IN (
    'awaiting_shipment','label_created','shipped','in_transit',
    'out_for_delivery','delivered','failed','returned'
  )),
  courier                     TEXT DEFAULT 'MaltaPost',
  tracking_number             TEXT,
  maltapost_consignment_id    TEXT,
  maltapost_barcode           TEXT,
  sender_address              JSONB,
  recipient_address           JSONB,
  ship_by_deadline            TIMESTAMPTZ,
  shipped_at                  TIMESTAMPTZ,
  in_transit_at               TIMESTAMPTZ,
  delivered_at                TIMESTAMPTZ,
  failed_at                   TIMESTAMPTZ,
  returned_at                 TIMESTAMPTZ,
  delivery_proof              TEXT,
  delivery_signature_url      TEXT,
  delivery_photo_url          TEXT,
  failure_reason              TEXT,
  return_reason               TEXT,
  weight_grams                INTEGER,
  parcel_size                 TEXT,
  maltapost_label_url         TEXT,
  maltapost_last_sync         TIMESTAMPTZ,
  maltapost_raw_status        TEXT,
  reminder_sent_at            TIMESTAMPTZ,
  reminder_count              INTEGER DEFAULT 0,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order    ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_seller   ON shipments(seller_id);
CREATE INDEX IF NOT EXISTS idx_shipments_buyer    ON shipments(buyer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status   ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipments_participant_read" ON shipments;
CREATE POLICY "shipments_participant_read" ON shipments
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "shipments_seller_insert" ON shipments;
CREATE POLICY "shipments_seller_insert" ON shipments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "shipments_participant_update" ON shipments;
CREATE POLICY "shipments_participant_update" ON shipments
  FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP TRIGGER IF EXISTS shipments_set_updated_at ON shipments;
CREATE TRIGGER shipments_set_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
