-- Remove duplicate drop-off reminder notifications while preserving the earliest row
-- per user/order/type, then protect future inserts at the database level.

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, order_id, type
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM public.notifications
  WHERE order_id IS NOT NULL
    AND type IN ('ship_reminder', 'dropoff_reminder')
)
DELETE FROM public.notifications n
USING ranked
WHERE n.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dropoff_reminder_dedupe
ON public.notifications (user_id, order_id, type)
WHERE order_id IS NOT NULL
  AND type IN ('ship_reminder', 'dropoff_reminder');
