-- Add durable email dedupe support for transactional cron emails.
-- Production-safe: only adds missing columns/indexes and preserves existing rows.

alter table if exists public.email_logs
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.email_logs
  add column if not exists dedupe_key text;

create unique index if not exists email_logs_dedupe_key_unique
  on public.email_logs (dedupe_key)
  where dedupe_key is not null;
