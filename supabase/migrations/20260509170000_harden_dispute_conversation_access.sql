CREATE OR REPLACE FUNCTION public.ensure_dispute_conversation(p_dispute_id UUID)
RETURNS public.dispute_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_is_admin BOOLEAN := public.is_admin();
  v_dispute public.disputes%ROWTYPE;
  v_conversation public.dispute_conversations%ROWTYPE;
BEGIN
  SELECT *
  INTO v_dispute
  FROM public.disputes
  WHERE id = p_dispute_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'dispute_not_found';
  END IF;

  IF NOT (
    v_is_admin
    OR v_actor = v_dispute.buyer_id
    OR v_actor = v_dispute.seller_id
  ) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  INSERT INTO public.dispute_conversations (
    dispute_id,
    order_id,
    buyer_id,
    seller_id,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_dispute.id,
    v_dispute.order_id,
    v_dispute.buyer_id,
    v_dispute.seller_id,
    coalesce(v_dispute.status, 'open'),
    coalesce(v_dispute.created_at, now()),
    coalesce(v_dispute.created_at, now())
  )
  ON CONFLICT (dispute_id) DO UPDATE SET
    order_id = EXCLUDED.order_id,
    buyer_id = EXCLUDED.buyer_id,
    seller_id = EXCLUDED.seller_id,
    status = EXCLUDED.status,
    updated_at = coalesce(EXCLUDED.created_at, now())
  RETURNING * INTO v_conversation;

  RETURN v_conversation;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_dispute_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_dispute_conversation(UUID) TO authenticated;
