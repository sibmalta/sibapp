-- Dispute case timeline and evidence workflow.

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS source TEXT;

CREATE TABLE IF NOT EXISTS public.dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  sender_profile_id UUID REFERENCES public.profiles(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('buyer', 'seller', 'admin', 'system')),
  message TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dispute_messages_attachments_array_check'
      AND conrelid = 'public.dispute_messages'::regclass
  ) THEN
    ALTER TABLE public.dispute_messages
      ADD CONSTRAINT dispute_messages_attachments_array_check
      CHECK (jsonb_typeof(attachments) = 'array');
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_created
  ON public.dispute_messages(dispute_id, created_at);

CREATE INDEX IF NOT EXISTS idx_dispute_messages_order_created
  ON public.dispute_messages(order_id, created_at);

ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dispute_messages_admin_read" ON public.dispute_messages;
CREATE POLICY "dispute_messages_admin_read" ON public.dispute_messages
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "dispute_messages_admin_insert" ON public.dispute_messages;
CREATE POLICY "dispute_messages_admin_insert" ON public.dispute_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "dispute_messages_admin_update" ON public.dispute_messages;
CREATE POLICY "dispute_messages_admin_update" ON public.dispute_messages
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "dispute_messages_participant_read" ON public.dispute_messages;
CREATE POLICY "dispute_messages_participant_read" ON public.dispute_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.disputes d
      WHERE d.id = dispute_messages.dispute_id
        AND auth.uid() IN (d.buyer_id, d.seller_id)
    )
  );

DROP POLICY IF EXISTS "dispute_messages_participant_insert_evidence" ON public.dispute_messages;
CREATE POLICY "dispute_messages_participant_insert_evidence" ON public.dispute_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_profile_id = auth.uid()
    AND sender_role IN ('buyer', 'seller')
    AND EXISTS (
      SELECT 1
      FROM public.disputes d
      WHERE d.id = dispute_messages.dispute_id
        AND dispute_messages.order_id = d.order_id
        AND (
          (sender_role = 'buyer' AND auth.uid() = d.buyer_id)
          OR
          (sender_role = 'seller' AND auth.uid() = d.seller_id)
        )
    )
  );

CREATE OR REPLACE FUNCTION public.open_dispute_case(
  p_order_id UUID,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'admin_review',
  p_source TEXT DEFAULT 'admin'
)
RETURNS public.disputes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_dispute public.disputes%ROWTYPE;
  v_actor UUID := auth.uid();
  v_source TEXT;
  v_reason TEXT := coalesce(nullif(btrim(p_reason), ''), 'Dispute opened');
  v_details TEXT := nullif(btrim(coalesce(p_details, p_reason, '')), '');
  v_order_code TEXT;
  v_is_admin BOOLEAN := public.is_admin();
BEGIN
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF NOT (
    v_is_admin
    OR v_actor = v_order.buyer_id
    OR v_actor = v_order.seller_id
  ) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF v_is_admin THEN
    v_source := 'admin';
  ELSIF v_actor = v_order.buyer_id THEN
    v_source := 'buyer';
  ELSIF v_actor = v_order.seller_id THEN
    v_source := 'seller';
  ELSE
    RAISE EXCEPTION 'not_allowed';
  END IF;

  SELECT *
  INTO v_dispute
  FROM public.disputes
  WHERE order_id = v_order.id
    AND status IN ('open', 'in_review', 'under_review', 'escalated')
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN v_dispute;
  END IF;

  v_order_code := public.get_dropoff_order_code(v_order.id, v_order.order_ref);

  INSERT INTO public.disputes (
    order_id,
    buyer_id,
    seller_id,
    listing_id,
    reason,
    details,
    status,
    source
  )
  VALUES (
    v_order.id,
    v_order.buyer_id,
    v_order.seller_id,
    v_order.listing_id,
    v_reason,
    coalesce(v_details, v_reason),
    'open',
    v_source
  )
  RETURNING * INTO v_dispute;

  INSERT INTO public.dispute_messages (
    dispute_id,
    order_id,
    sender_profile_id,
    sender_role,
    message
  )
  VALUES
    (v_dispute.id, v_order.id, NULL, 'system', 'Dispute opened'),
    (v_dispute.id, v_order.id, NULL, 'system', 'Please provide evidence for order ' || v_order_code || '.'),
    (v_dispute.id, v_order.id, NULL, 'system', 'Please provide evidence for order ' || v_order_code || '.');

  UPDATE public.orders
  SET
    status = 'disputed',
    tracking_status = 'under_review',
    payout_status = 'disputed',
    disputed_at = coalesce(disputed_at, now()),
    updated_at = now()
  WHERE id = v_order.id;

  RETURN v_dispute;
END;
$$;

REVOKE ALL ON FUNCTION public.open_dispute_case(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_dispute_case(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
