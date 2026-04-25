-- ============================================================
-- Migration 025: conversations + messages
-- Persists chat threads across devices and enables recipient
-- notifications/email links to open the same conversation.
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id              TEXT PRIMARY KEY,
  participant_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  listing_id      UUID REFERENCES listings(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text            TEXT NOT NULL DEFAULT '',
  type            TEXT NOT NULL DEFAULT 'message',
  event_type      TEXT,
  flagged         BOOLEAN NOT NULL DEFAULT false,
  read_at         TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_participant_ids
  ON conversations USING GIN(participant_ids);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
  ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
  ON messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread
  ON messages(recipient_id, read_at)
  WHERE read_at IS NULL;

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_participant_read" ON conversations;
CREATE POLICY "conversations_participant_read" ON conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "conversations_participant_insert" ON conversations;
CREATE POLICY "conversations_participant_insert" ON conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "conversations_participant_update" ON conversations;
CREATE POLICY "conversations_participant_update" ON conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = ANY(participant_ids))
  WITH CHECK (auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "messages_participant_read" ON messages;
CREATE POLICY "messages_participant_read" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND auth.uid() = ANY(c.participant_ids)
    )
  );

DROP POLICY IF EXISTS "messages_sender_insert" ON messages;
CREATE POLICY "messages_sender_insert" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND auth.uid() = ANY(c.participant_ids)
    )
  );

DROP POLICY IF EXISTS "messages_recipient_update_read" ON messages;
CREATE POLICY "messages_recipient_update_read" ON messages
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = recipient_id
    OR auth.uid() = sender_id
  )
  WITH CHECK (
    auth.uid() = recipient_id
    OR auth.uid() = sender_id
  );

DROP TRIGGER IF EXISTS conversations_set_updated_at ON conversations;
CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_touch_conversation ON messages;
CREATE TRIGGER messages_touch_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_on_message();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
