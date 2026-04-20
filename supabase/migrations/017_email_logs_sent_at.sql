ALTER TABLE email_logs
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

UPDATE email_logs
SET status = 'success'
WHERE status = 'sent';

ALTER TABLE email_logs
ALTER COLUMN status SET DEFAULT 'success';

UPDATE email_logs
SET sent_at = COALESCE(sent_at, created_at, now())
WHERE sent_at IS NULL;
