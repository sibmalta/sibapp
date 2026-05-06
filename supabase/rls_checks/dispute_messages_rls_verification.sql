-- Manual verification checklist for dispute_messages RLS before production application.
-- Run against a disposable/staging project with seeded test users. Replace UUID placeholders.
-- Never use service-role credentials for the participant checks below.

-- 1. As buyer auth user:
--    - SELECT from dispute_messages for own order dispute should return rows.
--    - INSERT sender_role='buyer' and sender_profile_id=auth.uid() should succeed.
--    - INSERT sender_role='seller', 'admin', or 'system' should fail.
--    - INSERT against an unrelated dispute should fail.

-- 2. As seller auth user:
--    - SELECT from dispute_messages for own order dispute should return rows.
--    - INSERT sender_role='seller' and sender_profile_id=auth.uid() should succeed.
--    - INSERT sender_role='buyer', 'admin', or 'system' should fail.
--    - INSERT against an unrelated dispute should fail.

-- 3. As unrelated auth user:
--    - SELECT from dispute_messages should return no unrelated dispute rows.
--    - INSERT into dispute_messages for buyer/seller/admin/system roles should fail.
--    - RPC open_dispute_case for an unrelated order should fail with not_allowed.

-- 4. As admin auth user:
--    - SELECT should return the full dispute timeline.
--    - INSERT sender_role='admin' should succeed.
--    - RPC open_dispute_case should create disputes.source='admin'.

-- 5. RPC source derivation:
--    - Buyer calling open_dispute_case with p_source='admin' should still create source='buyer'.
--    - Seller calling open_dispute_case with p_source='admin' should still create source='seller'.
--    - Admin calling open_dispute_case should create source='admin'.

-- 6. Attachments shape:
--    - INSERT attachments='[]'::jsonb should succeed.
--    - INSERT attachments='{}'::jsonb should fail the dispute_messages_attachments_array_check constraint.
