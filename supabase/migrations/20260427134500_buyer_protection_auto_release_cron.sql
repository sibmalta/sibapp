-- Automatic buyer-protection payout release.
-- Runs every 5 minutes and calls the buyer-protection Edge Function with a
-- private bearer secret stored in Supabase Vault.
--
-- Required Vault secrets before enabling in production:
--   supabase_url = https://<project-ref>.supabase.co
--   supabase_service_role_key = service role JWT used by the Edge gateway
--   buyer_protection_cron_secret = same value as Edge Function secret BUYER_PROTECTION_CRON_SECRET

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS auto_release_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_release_result JSONB,
  ADD COLUMN IF NOT EXISTS auto_release_error TEXT;

ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_status_check;
ALTER TABLE public.payouts ADD CONSTRAINT payouts_status_check
CHECK (status IN (
  'pending',
  'processing',
  'held',
  'releasable',
  'completed',
  'failed',
  'transfer_failed',
  'cancelled'
));

CREATE OR REPLACE FUNCTION public.invoke_buyer_protection_auto_release()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net, vault
AS $$
DECLARE
  project_url TEXT;
  service_role_key TEXT;
  cron_secret TEXT;
BEGIN
  SELECT decrypted_secret
  INTO project_url
  FROM vault.decrypted_secrets
  WHERE name IN ('supabase_url', 'SUPABASE_URL')
  ORDER BY name = 'supabase_url' DESC
  LIMIT 1;

  SELECT decrypted_secret
  INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name IN ('supabase_service_role_key', 'SUPABASE_SERVICE_ROLE_KEY', 'service_role_key', 'SERVICE_ROLE_KEY')
  ORDER BY name = 'supabase_service_role_key' DESC
  LIMIT 1;

  SELECT decrypted_secret
  INTO cron_secret
  FROM vault.decrypted_secrets
  WHERE name IN ('buyer_protection_cron_secret', 'BUYER_PROTECTION_CRON_SECRET')
  ORDER BY name = 'buyer_protection_cron_secret' DESC
  LIMIT 1;

  IF project_url IS NULL OR service_role_key IS NULL OR cron_secret IS NULL THEN
    RAISE WARNING 'Buyer protection auto-release skipped: missing supabase_url, supabase_service_role_key, or buyer_protection_cron_secret Vault secret.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/buyer-protection',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key,
      'x-cron-secret', cron_secret
    ),
    body := jsonb_build_object('action', 'auto_release_due'),
    timeout_milliseconds := 15000
  );
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('sib-buyer-protection-auto-release');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
  'sib-buyer-protection-auto-release',
  '*/5 * * * *',
  $$SELECT public.invoke_buyer_protection_auto_release();$$
);
