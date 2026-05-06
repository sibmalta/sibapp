BEGIN;

CREATE TEMP TABLE overdue_duplicate_probe_result (
  check_name TEXT,
  ok BOOLEAN,
  detail TEXT
);

DO $$
DECLARE
  v public.notifications%ROWTYPE;
BEGIN
  SELECT *
  INTO v
  FROM public.notifications
  WHERE type = 'overdue_warning'
    AND order_id IS NOT NULL
  LIMIT 1;

  IF v.id IS NULL THEN
    INSERT INTO overdue_duplicate_probe_result
    VALUES ('duplicate_overdue_insert_blocked', false, 'no overdue warning row available for duplicate probe');
  ELSE
    BEGIN
      INSERT INTO public.notifications (user_id, type, title, message, read, order_id)
      VALUES (v.user_id, v.type, v.title, v.message, false, v.order_id);

      INSERT INTO overdue_duplicate_probe_result
      VALUES ('duplicate_overdue_insert_blocked', false, 'duplicate insert unexpectedly succeeded');
    EXCEPTION WHEN unique_violation THEN
      INSERT INTO overdue_duplicate_probe_result
      VALUES ('duplicate_overdue_insert_blocked', true, 'duplicate insert blocked by unique index');
    END;
  END IF;
END;
$$;

SELECT * FROM overdue_duplicate_probe_result;

ROLLBACK;
