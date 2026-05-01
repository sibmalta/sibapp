-- Force-reschedule buyer-protection auto-release cron so production does not
-- keep running an older job command after the observable function was added.

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;

CREATE TABLE IF NOT EXISTS public.buyer_protection_cron_invocations (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT,
  invoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_buyer_protection_cron_invocations_invoked_at
  ON public.buyer_protection_cron_invocations(invoked_at DESC);

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
  request_id BIGINT;
  request_payload JSONB := jsonb_build_object('action', 'auto_release_due');
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
    INSERT INTO public.buyer_protection_cron_invocations(status, error, payload)
    VALUES (
      'skipped',
      'missing supabase_url, supabase_service_role_key, or buyer_protection_cron_secret Vault secret',
      request_payload
    );
    RAISE WARNING 'Buyer protection auto-release skipped: missing supabase_url, supabase_service_role_key, or buyer_protection_cron_secret Vault secret.';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/buyer-protection',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key,
      'x-cron-secret', cron_secret
    ),
    body := request_payload,
    timeout_milliseconds := 15000
  )
  INTO request_id;

  INSERT INTO public.buyer_protection_cron_invocations(request_id, status, payload)
  VALUES (request_id, 'queued', request_payload);
END;
$$;

DO $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN
    SELECT jobid, jobname
    FROM cron.job
    WHERE jobname IN (
      'sib-buyer-protection-auto-release',
      'buyer_protection_auto_release',
      'buyer-protection-auto-release'
    )
    OR command ILIKE '%buyer-protection%'
    OR command ILIKE '%auto_release_due%'
    OR command ILIKE '%invoke_buyer_protection_auto_release%'
  LOOP
    BEGIN
      PERFORM cron.unschedule(job.jobid);
    EXCEPTION
      WHEN OTHERS THEN
        BEGIN
          PERFORM cron.unschedule(job.jobname);
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'Could not unschedule cron job % (%): %', job.jobid, job.jobname, SQLERRM;
        END;
    END;
  END LOOP;
END $$;

SELECT cron.schedule(
  'sib-buyer-protection-auto-release',
  '*/5 * * * *',
  $$SELECT public.invoke_buyer_protection_auto_release();$$
);
