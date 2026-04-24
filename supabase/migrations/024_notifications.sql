-- ============================================================
-- Migration 024: in-app notifications
-- Persists notifications across devices so sellers see sale alerts
-- on mobile and desktop.
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  read            BOOLEAN NOT NULL DEFAULT false,
  order_id        UUID REFERENCES orders(id) ON DELETE CASCADE,
  listing_id      UUID REFERENCES listings(id) ON DELETE CASCADE,
  conversation_id TEXT,
  action_target   TEXT,
  target_path     TEXT,
  status          TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  data            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_order_id
  ON notifications(order_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_sale_dedupe
  ON notifications(user_id, type, order_id)
  WHERE order_id IS NOT NULL AND type IN ('new_sale', 'bundle_sold');

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_user_read" ON notifications;
CREATE POLICY "notifications_user_read" ON notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_authenticated_insert" ON notifications;
CREATE POLICY "notifications_authenticated_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_user_update" ON notifications;
CREATE POLICY "notifications_user_update" ON notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS notifications_set_updated_at ON notifications;
CREATE TRIGGER notifications_set_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
