-- Dispute conversation threads for marketplace resolution.
-- This migration is additive and safe to rerun.

CREATE TABLE IF NOT EXISTS public.dispute_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL UNIQUE REFERENCES public.disputes(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispute_conversations_order
  ON public.dispute_conversations(order_id);

CREATE INDEX IF NOT EXISTS idx_dispute_conversations_buyer
  ON public.dispute_conversations(buyer_id);

CREATE INDEX IF NOT EXISTS idx_dispute_conversations_seller
  ON public.dispute_conversations(seller_id);

ALTER TABLE public.dispute_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dispute_conversations_admin_read" ON public.dispute_conversations;
CREATE POLICY "dispute_conversations_admin_read" ON public.dispute_conversations
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "dispute_conversations_admin_write" ON public.dispute_conversations;
CREATE POLICY "dispute_conversations_admin_write" ON public.dispute_conversations
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "dispute_conversations_participant_read" ON public.dispute_conversations;
CREATE POLICY "dispute_conversations_participant_read" ON public.dispute_conversations
  FOR SELECT TO authenticated
  USING (auth.uid() IN (buyer_id, seller_id));

ALTER TABLE IF EXISTS public.dispute_messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.dispute_conversations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'message';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dispute_messages_visibility_check'
      AND conrelid = 'public.dispute_messages'::regclass
  ) THEN
    ALTER TABLE public.dispute_messages
      ADD CONSTRAINT dispute_messages_visibility_check
      CHECK (visibility IN ('public', 'internal'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dispute_messages_message_type_check'
      AND conrelid = 'public.dispute_messages'::regclass
  ) THEN
    ALTER TABLE public.dispute_messages
      ADD CONSTRAINT dispute_messages_message_type_check
      CHECK (message_type IN ('message', 'note', 'system'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_dispute_messages_conversation_created
  ON public.dispute_messages(conversation_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dispute_message_dedupe
  ON public.notifications(user_id, type, order_id, (metadata->>'disputeId'), (metadata->>'messagePreview'), (metadata->>'senderRole'))
  WHERE type = 'dispute_message'
    AND order_id IS NOT NULL
    AND metadata ? 'disputeId'
    AND metadata ? 'messagePreview'
    AND metadata ? 'senderRole';

INSERT INTO public.dispute_conversations (
  dispute_id,
  order_id,
  buyer_id,
  seller_id,
  status,
  created_at,
  updated_at
)
SELECT
  d.id,
  d.order_id,
  d.buyer_id,
  d.seller_id,
  coalesce(d.status, 'open'),
  coalesce(d.created_at, now()),
  coalesce(d.created_at, now())
FROM public.disputes d
ON CONFLICT (dispute_id) DO UPDATE SET
  order_id = EXCLUDED.order_id,
  buyer_id = EXCLUDED.buyer_id,
  seller_id = EXCLUDED.seller_id,
  status = EXCLUDED.status,
  updated_at = coalesce(EXCLUDED.created_at, now());

UPDATE public.dispute_messages dm
SET
  conversation_id = dc.id,
  visibility = coalesce(dm.visibility, 'public'),
  message_type = CASE
    WHEN dm.sender_role = 'system' THEN 'system'
    ELSE coalesce(dm.message_type, 'message')
  END
FROM public.dispute_conversations dc
WHERE dm.dispute_id = dc.dispute_id
  AND dm.conversation_id IS NULL;

DROP POLICY IF EXISTS "dispute_messages_participant_read" ON public.dispute_messages;
CREATE POLICY "dispute_messages_participant_read" ON public.dispute_messages
  FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    AND EXISTS (
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
    AND visibility = 'public'
    AND message_type = 'message'
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

CREATE OR REPLACE FUNCTION public.ensure_dispute_conversation(p_dispute_id UUID)
RETURNS public.dispute_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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

CREATE OR REPLACE FUNCTION public.dispute_messages_set_thread_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation public.dispute_conversations%ROWTYPE;
BEGIN
  IF NEW.visibility IS NULL THEN
    NEW.visibility := 'public';
  END IF;

  IF NEW.message_type IS NULL THEN
    NEW.message_type := CASE WHEN NEW.sender_role = 'system' THEN 'system' ELSE 'message' END;
  END IF;

  IF NEW.conversation_id IS NULL AND NEW.dispute_id IS NOT NULL THEN
    v_conversation := public.ensure_dispute_conversation(NEW.dispute_id);
    NEW.conversation_id := v_conversation.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dispute_messages_set_thread_defaults_trigger ON public.dispute_messages;
CREATE TRIGGER dispute_messages_set_thread_defaults_trigger
  BEFORE INSERT ON public.dispute_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.dispute_messages_set_thread_defaults();

CREATE OR REPLACE FUNCTION public.add_dispute_thread_message(
  p_dispute_id UUID,
  p_message TEXT,
  p_visibility TEXT DEFAULT 'public',
  p_message_type TEXT DEFAULT 'message',
  p_attachments JSONB DEFAULT '[]'::jsonb
)
RETURNS public.dispute_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_is_admin BOOLEAN := public.is_admin();
  v_dispute public.disputes%ROWTYPE;
  v_conversation public.dispute_conversations%ROWTYPE;
  v_message public.dispute_messages%ROWTYPE;
  v_sender_role TEXT;
  v_visibility TEXT := coalesce(nullif(p_visibility, ''), 'public');
  v_message_type TEXT := coalesce(nullif(p_message_type, ''), 'message');
  v_text TEXT := nullif(btrim(coalesce(p_message, '')), '');
  v_attachments JSONB := coalesce(p_attachments, '[]'::jsonb);
  v_order_code TEXT;
  v_notify_body TEXT;
  v_action_target TEXT;
  v_message_preview TEXT;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_text IS NULL THEN
    RAISE EXCEPTION 'message_required';
  END IF;

  IF jsonb_typeof(v_attachments) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'attachments_must_be_array';
  END IF;

  IF v_visibility NOT IN ('public', 'internal') THEN
    RAISE EXCEPTION 'invalid_visibility';
  END IF;

  IF v_message_type NOT IN ('message', 'note', 'system') THEN
    RAISE EXCEPTION 'invalid_message_type';
  END IF;

  SELECT *
  INTO v_dispute
  FROM public.disputes
  WHERE id = p_dispute_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'dispute_not_found';
  END IF;

  IF v_is_admin THEN
    v_sender_role := CASE WHEN v_message_type = 'system' THEN 'system' ELSE 'admin' END;
  ELSIF v_actor = v_dispute.buyer_id THEN
    v_sender_role := 'buyer';
  ELSIF v_actor = v_dispute.seller_id THEN
    v_sender_role := 'seller';
  ELSE
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF NOT v_is_admin AND (v_visibility <> 'public' OR v_message_type <> 'message') THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  v_conversation := public.ensure_dispute_conversation(v_dispute.id);

  INSERT INTO public.dispute_messages (
    dispute_id,
    conversation_id,
    order_id,
    sender_profile_id,
    sender_role,
    message,
    attachments,
    visibility,
    message_type
  )
  VALUES (
    v_dispute.id,
    v_conversation.id,
    v_dispute.order_id,
    CASE WHEN v_sender_role = 'system' THEN NULL ELSE v_actor END,
    v_sender_role,
    v_text,
    v_attachments,
    v_visibility,
    v_message_type
  )
  RETURNING * INTO v_message;

  IF v_visibility = 'public' AND v_sender_role <> 'system' THEN
    v_order_code := public.get_dropoff_order_code(v_dispute.order_id, NULL);
    v_notify_body := 'There''s a new update on your dispute for order ' || coalesce(v_order_code, left(v_dispute.order_id::text, 8)) || '.';
    v_message_preview := CASE
      WHEN length(v_text) > 140 THEN left(v_text, 137) || '...'
      ELSE v_text
    END;
    v_action_target := '/messages/dispute/' || v_dispute.id::text;

    IF v_sender_role <> 'buyer' AND v_dispute.buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        order_id,
        action_target,
        metadata,
        data
      )
      VALUES (
        v_dispute.buyer_id,
        'dispute_message',
        'New dispute update',
        v_notify_body,
        v_dispute.order_id,
        v_action_target,
        jsonb_build_object('disputeId', v_dispute.id, 'conversationId', v_conversation.id, 'disputeMessageId', v_message.id, 'senderRole', v_sender_role, 'messagePreview', v_message_preview),
        jsonb_build_object('disputeId', v_dispute.id, 'conversationId', v_conversation.id, 'disputeMessageId', v_message.id, 'senderRole', v_sender_role, 'messagePreview', v_message_preview)
      )
      ON CONFLICT DO NOTHING;
    END IF;

    IF v_sender_role <> 'seller' AND v_dispute.seller_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        order_id,
        action_target,
        metadata,
        data
      )
      VALUES (
        v_dispute.seller_id,
        'dispute_message',
        'New dispute update',
        v_notify_body,
        v_dispute.order_id,
        v_action_target,
        jsonb_build_object('disputeId', v_dispute.id, 'conversationId', v_conversation.id, 'disputeMessageId', v_message.id, 'senderRole', v_sender_role, 'messagePreview', v_message_preview),
        jsonb_build_object('disputeId', v_dispute.id, 'conversationId', v_conversation.id, 'disputeMessageId', v_message.id, 'senderRole', v_sender_role, 'messagePreview', v_message_preview)
      )
      ON CONFLICT DO NOTHING;
    END IF;

    IF v_sender_role IN ('buyer', 'seller') THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        order_id,
        action_target,
        metadata,
        data
      )
      SELECT
        p.id,
        'dispute_message',
        'New dispute update',
        v_notify_body,
        v_dispute.order_id,
        v_action_target,
        jsonb_build_object('disputeId', v_dispute.id, 'conversationId', v_conversation.id, 'disputeMessageId', v_message.id, 'senderRole', v_sender_role, 'messagePreview', v_message_preview),
        jsonb_build_object('disputeId', v_dispute.id, 'conversationId', v_conversation.id, 'disputeMessageId', v_message.id, 'senderRole', v_sender_role, 'messagePreview', v_message_preview)
      FROM public.profiles p
      WHERE p.is_admin = true
        AND p.id <> v_actor
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN v_message;
END;
$$;

REVOKE ALL ON FUNCTION public.add_dispute_thread_message(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_dispute_thread_message(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
