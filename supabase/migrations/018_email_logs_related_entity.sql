ALTER TABLE email_logs
ADD COLUMN IF NOT EXISTS related_entity_type TEXT;

ALTER TABLE email_logs
ADD COLUMN IF NOT EXISTS related_entity_id TEXT;

CREATE INDEX IF NOT EXISTS idx_email_logs_related_entity
ON email_logs(related_entity_type, related_entity_id);
