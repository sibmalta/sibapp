-- Email logs table: tracks every transactional email sent via the send-email edge function
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  resend_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- sent, failed
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);

-- RLS: only service role can insert (edge function), admins can read via service role
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge function uses service role key)
DROP POLICY IF EXISTS "service_role_all" ON email_logs;
CREATE POLICY "service_role_all" ON email_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated users to read (admin page fetches via anon/auth client)
DROP POLICY IF EXISTS "authenticated_read" ON email_logs;
CREATE POLICY "authenticated_read" ON email_logs FOR SELECT TO authenticated USING (true);
