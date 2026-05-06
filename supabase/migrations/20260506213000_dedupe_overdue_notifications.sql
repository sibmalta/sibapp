-- Dedupe collection overdue notifications and prevent repeats per order.

WITH ranked_overdue_notifications AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, order_id, type
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM public.notifications
  WHERE type = 'overdue_warning'
    AND order_id IS NOT NULL
)
DELETE FROM public.notifications n
USING ranked_overdue_notifications ranked
WHERE n.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_overdue_warning_dedupe
  ON public.notifications(user_id, type, order_id)
  WHERE order_id IS NOT NULL
    AND type = 'overdue_warning';
