-- Live RLS verification for dispute_messages using temporary QA rows.
-- Requires dispute_messages_live_setup.sql first and dispute_messages_live_cleanup.sql after.

CREATE TEMP TABLE qa_results (
  check_name TEXT,
  ok BOOLEAN,
  detail TEXT
);
GRANT ALL ON qa_results TO authenticated;

CREATE TEMP TABLE qa_ids (
  key TEXT PRIMARY KEY,
  id UUID NOT NULL
);
GRANT ALL ON qa_ids TO authenticated;

-- Buyer opens own dispute while trying to spoof p_source='admin'.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000101', false);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000101","role":"authenticated"}', false);

INSERT INTO qa_results
SELECT
  'buyer_open_dispute_source_derived',
  source = 'buyer',
  'source=' || coalesce(source, '<null>')
FROM public.open_dispute_case(
  '30000000-0000-4000-8000-000000000301',
  'QA RLS dispute',
  'QA RLS details',
  'not_as_described',
  'admin'
);

INSERT INTO qa_ids (key, id)
SELECT 'buyer_dispute_id', id
FROM public.disputes
WHERE order_id = '30000000-0000-4000-8000-000000000301'
ON CONFLICT (key) DO UPDATE SET id = EXCLUDED.id;

INSERT INTO qa_results
SELECT
  'buyer_can_read_initial_messages',
  count(*) = 3,
  'visible_messages=' || count(*)::text
FROM public.dispute_messages
WHERE order_id = '30000000-0000-4000-8000-000000000301';

INSERT INTO public.dispute_messages (dispute_id, order_id, sender_profile_id, sender_role, message)
SELECT id, order_id, '10000000-0000-4000-8000-000000000101', 'buyer', 'QA buyer evidence'
FROM public.disputes
WHERE order_id = '30000000-0000-4000-8000-000000000301';

INSERT INTO qa_results VALUES ('buyer_can_insert_own_evidence', true, 'insert succeeded');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.dispute_messages (dispute_id, order_id, sender_profile_id, sender_role, message)
    SELECT id, order_id, '10000000-0000-4000-8000-000000000101', 'seller', 'QA buyer spoof seller'
    FROM public.disputes
    WHERE order_id = '30000000-0000-4000-8000-000000000301';
    INSERT INTO qa_results VALUES ('buyer_cannot_spoof_seller', false, 'unexpected insert succeeded');
  EXCEPTION WHEN others THEN
    INSERT INTO qa_results VALUES ('buyer_cannot_spoof_seller', true, SQLSTATE || ':' || SQLERRM);
  END;

  BEGIN
    INSERT INTO public.dispute_messages (dispute_id, order_id, sender_profile_id, sender_role, message)
    SELECT id, order_id, '10000000-0000-4000-8000-000000000101', 'admin', 'QA buyer spoof admin'
    FROM public.disputes
    WHERE order_id = '30000000-0000-4000-8000-000000000301';
    INSERT INTO qa_results VALUES ('buyer_cannot_spoof_admin', false, 'unexpected insert succeeded');
  EXCEPTION WHEN others THEN
    INSERT INTO qa_results VALUES ('buyer_cannot_spoof_admin', true, SQLSTATE || ':' || SQLERRM);
  END;

  BEGIN
    INSERT INTO public.dispute_messages (dispute_id, order_id, sender_profile_id, sender_role, message)
    SELECT id, order_id, '10000000-0000-4000-8000-000000000101', 'system', 'QA buyer spoof system'
    FROM public.disputes
    WHERE order_id = '30000000-0000-4000-8000-000000000301';
    INSERT INTO qa_results VALUES ('buyer_cannot_spoof_system', false, 'unexpected insert succeeded');
  EXCEPTION WHEN others THEN
    INSERT INTO qa_results VALUES ('buyer_cannot_spoof_system', true, SQLSTATE || ':' || SQLERRM);
  END;
END;
$$;

RESET ROLE;

-- Seller can read and submit own evidence, but cannot spoof buyer/admin/system.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000102', false);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000102","role":"authenticated"}', false);

INSERT INTO qa_results
SELECT
  'seller_can_read_dispute_messages',
  count(*) >= 4,
  'visible_messages=' || count(*)::text
FROM public.dispute_messages
WHERE order_id = '30000000-0000-4000-8000-000000000301';

INSERT INTO public.dispute_messages (dispute_id, order_id, sender_profile_id, sender_role, message)
SELECT id, order_id, '10000000-0000-4000-8000-000000000102', 'seller', 'QA seller evidence'
FROM public.disputes
WHERE order_id = '30000000-0000-4000-8000-000000000301';

INSERT INTO qa_results VALUES ('seller_can_insert_own_evidence', true, 'insert succeeded');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.dispute_messages (dispute_id, order_id, sender_profile_id, sender_role, message)
    SELECT id, order_id, '10000000-0000-4000-8000-000000000102', 'buyer', 'QA seller spoof buyer'
    FROM public.disputes
    WHERE order_id = '30000000-0000-4000-8000-000000000301';
    INSERT INTO qa_results VALUES ('seller_cannot_spoof_buyer', false, 'unexpected insert succeeded');
  EXCEPTION WHEN others THEN
    INSERT INTO qa_results VALUES ('seller_cannot_spoof_buyer', true, SQLSTATE || ':' || SQLERRM);
  END;

  BEGIN
    INSERT INTO public.dispute_messages (dispute_id, order_id, sender_profile_id, sender_role, message)
    SELECT id, order_id, '10000000-0000-4000-8000-000000000102', 'admin', 'QA seller spoof admin'
    FROM public.disputes
    WHERE order_id = '30000000-0000-4000-8000-000000000301';
    INSERT INTO qa_results VALUES ('seller_cannot_spoof_admin', false, 'unexpected insert succeeded');
  EXCEPTION WHEN others THEN
    INSERT INTO qa_results VALUES ('seller_cannot_spoof_admin', true, SQLSTATE || ':' || SQLERRM);
  END;

  BEGIN
    INSERT INTO public.dispute_messages (dispute_id, order_id, sender_profile_id, sender_role, message)
    SELECT id, order_id, '10000000-0000-4000-8000-000000000102', 'system', 'QA seller spoof system'
    FROM public.disputes
    WHERE order_id = '30000000-0000-4000-8000-000000000301';
    INSERT INTO qa_results VALUES ('seller_cannot_spoof_system', false, 'unexpected insert succeeded');
  EXCEPTION WHEN others THEN
    INSERT INTO qa_results VALUES ('seller_cannot_spoof_system', true, SQLSTATE || ':' || SQLERRM);
  END;
END;
$$;

RESET ROLE;

-- Unrelated user cannot read, insert, or open dispute for someone else's order.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000103', false);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000103","role":"authenticated"}', false);

INSERT INTO qa_results
SELECT
  'unrelated_cannot_read_messages',
  count(*) = 0,
  'visible_messages=' || count(*)::text
FROM public.dispute_messages
WHERE order_id = '30000000-0000-4000-8000-000000000301';

DO $$
BEGIN
  BEGIN
    INSERT INTO public.dispute_messages (dispute_id, order_id, sender_profile_id, sender_role, message)
    VALUES (
      (SELECT id FROM qa_ids WHERE key = 'buyer_dispute_id'),
      '30000000-0000-4000-8000-000000000301',
      '10000000-0000-4000-8000-000000000103',
      'buyer',
      'QA unrelated spoof buyer'
    );
    INSERT INTO qa_results VALUES ('unrelated_cannot_insert_message', false, 'unexpected insert succeeded');
  EXCEPTION WHEN others THEN
    INSERT INTO qa_results VALUES ('unrelated_cannot_insert_message', true, SQLSTATE || ':' || SQLERRM);
  END;

  BEGIN
    PERFORM public.open_dispute_case(
      '30000000-0000-4000-8000-000000000301',
      'QA unrelated dispute',
      'QA unrelated details',
      'not_as_described',
      'buyer'
    );
    INSERT INTO qa_results VALUES ('unrelated_cannot_open_dispute', false, 'unexpected rpc succeeded');
  EXCEPTION WHEN others THEN
    INSERT INTO qa_results VALUES ('unrelated_cannot_open_dispute', true, SQLSTATE || ':' || SQLERRM);
  END;
END;
$$;

RESET ROLE;

-- Admin can open an admin-source dispute and add admin messages.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000104', false);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000104","role":"authenticated"}', false);

INSERT INTO qa_results
SELECT
  'admin_open_dispute_source_admin',
  source = 'admin',
  'source=' || coalesce(source, '<null>')
FROM public.open_dispute_case(
  '30000000-0000-4000-8000-000000000302',
  'QA admin RLS dispute',
  'QA admin RLS details',
  'admin_review',
  'buyer'
);

INSERT INTO qa_results
SELECT
  'admin_can_read_full_timeline',
  count(*) >= 8,
  'visible_messages=' || count(*)::text
FROM public.dispute_messages;

INSERT INTO public.dispute_messages (dispute_id, order_id, sender_profile_id, sender_role, message)
SELECT id, order_id, '10000000-0000-4000-8000-000000000104', 'admin', 'QA admin message'
FROM public.disputes
WHERE order_id = '30000000-0000-4000-8000-000000000301';

INSERT INTO qa_results VALUES ('admin_can_insert_admin_message', true, 'insert succeeded');

RESET ROLE;

-- Database-level attachment shape check.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.dispute_messages (dispute_id, order_id, sender_profile_id, sender_role, message, attachments)
    SELECT id, order_id, '10000000-0000-4000-8000-000000000104', 'admin', 'QA bad attachment shape', '{}'::jsonb
    FROM public.disputes
    WHERE order_id = '30000000-0000-4000-8000-000000000301';
    INSERT INTO qa_results VALUES ('attachments_object_rejected', false, 'unexpected insert succeeded');
  EXCEPTION WHEN others THEN
    INSERT INTO qa_results VALUES ('attachments_object_rejected', true, SQLSTATE || ':' || SQLERRM);
  END;
END;
$$;

INSERT INTO qa_results
SELECT
  'opened_dispute_created_case_and_prompts',
  d_count = 1 AND m_count >= 6,
  'disputes=' || d_count::text || ', messages=' || m_count::text
FROM (
  SELECT
    (SELECT count(*) FROM public.disputes WHERE order_id = '30000000-0000-4000-8000-000000000301') AS d_count,
    (SELECT count(*) FROM public.dispute_messages WHERE order_id = '30000000-0000-4000-8000-000000000301') AS m_count
) counts;

INSERT INTO qa_results
SELECT
  'order_status_limited_to_disputed_orders',
  disputed_ok AND admin_disputed_ok AND control_ok,
  'dispute=' || disputed_status || '/' || disputed_payout || ', admin=' || admin_status || '/' || admin_payout || ', control=' || control_status || '/' || control_payout
FROM (
  SELECT
    max(status) FILTER (WHERE id = '30000000-0000-4000-8000-000000000301') AS disputed_status,
    max(payout_status) FILTER (WHERE id = '30000000-0000-4000-8000-000000000301') AS disputed_payout,
    max(status) FILTER (WHERE id = '30000000-0000-4000-8000-000000000302') AS admin_status,
    max(payout_status) FILTER (WHERE id = '30000000-0000-4000-8000-000000000302') AS admin_payout,
    max(status) FILTER (WHERE id = '30000000-0000-4000-8000-000000000303') AS control_status,
    max(payout_status) FILTER (WHERE id = '30000000-0000-4000-8000-000000000303') AS control_payout,
    bool_and((id IN ('30000000-0000-4000-8000-000000000301', '30000000-0000-4000-8000-000000000302') AND status = 'disputed' AND payout_status = 'disputed') OR id = '30000000-0000-4000-8000-000000000303') FILTER (WHERE id IN ('30000000-0000-4000-8000-000000000301', '30000000-0000-4000-8000-000000000302')) AS disputed_pair_ok,
    max((status = 'disputed' AND payout_status = 'disputed')::int) FILTER (WHERE id = '30000000-0000-4000-8000-000000000301') = 1 AS disputed_ok,
    max((status = 'disputed' AND payout_status = 'disputed')::int) FILTER (WHERE id = '30000000-0000-4000-8000-000000000302') = 1 AS admin_disputed_ok,
    max((status = 'paid' AND payout_status = 'held')::int) FILTER (WHERE id = '30000000-0000-4000-8000-000000000303') = 1 AS control_ok
  FROM public.orders
  WHERE id IN (
    '30000000-0000-4000-8000-000000000301',
    '30000000-0000-4000-8000-000000000302',
    '30000000-0000-4000-8000-000000000303'
  )
) statuses;

SELECT check_name, ok, detail
FROM qa_results
ORDER BY check_name;
