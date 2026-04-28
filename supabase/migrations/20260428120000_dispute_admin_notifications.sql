-- Dispute admin visibility and notification support.
-- Reuses the existing disputes table; no duplicate dispute system is created.

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS details TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'reason'
  ) THEN
    UPDATE public.disputes
    SET details = reason
    WHERE details IS NULL
      AND reason IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_status_check;
    ALTER TABLE public.disputes ADD CONSTRAINT disputes_status_check
    CHECK (status IN (
      'open',
      'in_review',
      'under_review',
      'resolved_buyer',
      'resolved_seller',
      'resolved',
      'closed',
      'escalated'
    ));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_type_check;
    ALTER TABLE public.disputes ADD CONSTRAINT disputes_type_check
    CHECK (type IN (
      'not_as_described',
      'item_not_received',
      'not_received',
      'wrong_item',
      'damaged',
      'delivery_issue',
      'overdue_shipment',
      'admin_review',
      'other'
    ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_disputes_listing ON public.disputes(listing_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'status'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'created_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_disputes_status_created_at ON public.disputes(status, created_at DESC);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

DROP POLICY IF EXISTS "disputes_admin_read" ON public.disputes;
CREATE POLICY "disputes_admin_read" ON public.disputes
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "disputes_admin_update" ON public.disputes;
CREATE POLICY "disputes_admin_update" ON public.disputes
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
