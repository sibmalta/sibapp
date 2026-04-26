-- Prevent duplicate counter-offer side effects when the same client request is
-- retried or submitted more than once.

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY metadata->>'idempotencyKey'
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM public.messages
  WHERE event_type = 'offer_countered'
    AND metadata ? 'idempotencyKey'
    AND COALESCE(metadata->>'idempotencyKey', '') <> ''
)
UPDATE public.messages m
SET metadata = m.metadata - 'idempotencyKey'
FROM ranked r
WHERE m.id = r.id
  AND r.duplicate_rank > 1;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY metadata->>'idempotencyKey'
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM public.notifications
  WHERE type = 'offer_countered'
    AND metadata ? 'idempotencyKey'
    AND COALESCE(metadata->>'idempotencyKey', '') <> ''
)
UPDATE public.notifications n
SET metadata = n.metadata - 'idempotencyKey'
FROM ranked r
WHERE n.id = r.id
  AND r.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_counter_offer_idempotency
  ON public.messages ((metadata->>'idempotencyKey'))
  WHERE event_type = 'offer_countered'
    AND metadata ? 'idempotencyKey'
    AND COALESCE(metadata->>'idempotencyKey', '') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_counter_offer_idempotency
  ON public.notifications ((metadata->>'idempotencyKey'))
  WHERE type = 'offer_countered'
    AND metadata ? 'idempotencyKey'
    AND COALESCE(metadata->>'idempotencyKey', '') <> '';
