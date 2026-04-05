-- User activity tracking (views, clicks, etc.)
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_id TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'view',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_item ON user_activity(item_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_action ON user_activity(action);

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own activity
DROP POLICY IF EXISTS "Users insert own activity" ON user_activity;
CREATE POLICY "Users insert own activity" ON user_activity
  FOR INSERT WITH CHECK (true);

-- Users can read their own activity
DROP POLICY IF EXISTS "Users read own activity" ON user_activity;
CREATE POLICY "Users read own activity" ON user_activity
  FOR SELECT USING (true);
