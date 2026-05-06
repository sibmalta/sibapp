-- Temporary QA setup for live dispute_messages RLS verification.
-- These rows are clearly marked and should be removed by dispute_messages_live_cleanup.sql.

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  is_sso_user, is_anonymous
)
VALUES
  ('10000000-0000-4000-8000-000000000101', 'authenticated', 'authenticated', 'qa-dispute-buyer-do-not-use@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), false, false),
  ('10000000-0000-4000-8000-000000000102', 'authenticated', 'authenticated', 'qa-dispute-seller-do-not-use@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), false, false),
  ('10000000-0000-4000-8000-000000000103', 'authenticated', 'authenticated', 'qa-dispute-unrelated-do-not-use@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), false, false),
  ('10000000-0000-4000-8000-000000000104', 'authenticated', 'authenticated', 'qa-dispute-admin-do-not-use@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, name, email, is_admin, status)
VALUES
  ('10000000-0000-4000-8000-000000000101', 'qa_dispute_buyer_do_not_use', 'QA DISPUTE BUYER DO NOT USE', 'qa-dispute-buyer-do-not-use@example.invalid', false, 'active'),
  ('10000000-0000-4000-8000-000000000102', 'qa_dispute_seller_do_not_use', 'QA DISPUTE SELLER DO NOT USE', 'qa-dispute-seller-do-not-use@example.invalid', false, 'active'),
  ('10000000-0000-4000-8000-000000000103', 'qa_dispute_unrelated_do_not_use', 'QA DISPUTE UNRELATED DO NOT USE', 'qa-dispute-unrelated-do-not-use@example.invalid', false, 'active'),
  ('10000000-0000-4000-8000-000000000104', 'qa_dispute_admin_do_not_use', 'QA DISPUTE ADMIN DO NOT USE', 'qa-dispute-admin-do-not-use@example.invalid', true, 'active')
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  is_admin = EXCLUDED.is_admin,
  status = EXCLUDED.status;

INSERT INTO public.listings (id, seller_id, title, description, price, condition, status)
VALUES
  ('20000000-0000-4000-8000-000000000201', '10000000-0000-4000-8000-000000000102', 'QA DISPUTE LISTING DO NOT USE', 'QA only', 10, 'good', 'sold')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.orders (
  id, buyer_id, seller_id, listing_id, amount, status, payout_status,
  order_ref, listing_title, item_price, total_price, platform_fee, seller_payout
)
VALUES
  ('30000000-0000-4000-8000-000000000301', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000102', '20000000-0000-4000-8000-000000000201', 10, 'paid', 'held', 'QA-DISPUTE-DO-NOT-USE', 'QA DISPUTE LISTING DO NOT USE', 10, 10, 0, 10),
  ('30000000-0000-4000-8000-000000000302', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000102', '20000000-0000-4000-8000-000000000201', 10, 'paid', 'held', 'QA-DISPUTE-ADMIN-DO-NOT-USE', 'QA DISPUTE ADMIN DO NOT USE', 10, 10, 0, 10),
  ('30000000-0000-4000-8000-000000000303', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000102', '20000000-0000-4000-8000-000000000201', 10, 'paid', 'held', 'QA-DISPUTE-CONTROL-DO-NOT-USE', 'QA DISPUTE CONTROL DO NOT USE', 10, 10, 0, 10)
ON CONFLICT (id) DO NOTHING;

SELECT
  'qa_setup_created_or_reused' AS result,
  '30000000-0000-4000-8000-000000000301'::uuid AS dispute_order_id,
  '30000000-0000-4000-8000-000000000302'::uuid AS admin_dispute_order_id,
  '30000000-0000-4000-8000-000000000303'::uuid AS control_order_id;
