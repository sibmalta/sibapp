-- Support ticket intake for Ask Sib human escalation.

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Order issue',
    'Delivery issue',
    'Refund request',
    'Payout issue',
    'Dispute',
    'Account issue',
    'Other'
  )),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  attachment_urls JSONB DEFAULT '[]'::jsonb,
  ai_conversation JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT support_tickets_attachment_urls_array_check CHECK (attachment_urls IS NULL OR jsonb_typeof(attachment_urls) = 'array'),
  CONSTRAINT support_tickets_ai_conversation_array_check CHECK (ai_conversation IS NULL OR jsonb_typeof(ai_conversation) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_created
  ON public.support_tickets(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_created
  ON public.support_tickets(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_order
  ON public.support_tickets(order_id);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_user_read" ON public.support_tickets;
CREATE POLICY "support_tickets_user_read" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "support_tickets_user_insert" ON public.support_tickets;
CREATE POLICY "support_tickets_user_insert" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "support_tickets_admin_all" ON public.support_tickets;
CREATE POLICY "support_tickets_admin_all" ON public.support_tickets
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS support_tickets_set_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_set_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-ticket-attachments',
  'support-ticket-attachments',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];

DROP POLICY IF EXISTS "support_attachments_user_upload" ON storage.objects;
CREATE POLICY "support_attachments_user_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'support-ticket-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "support_attachments_user_read" ON storage.objects;
CREATE POLICY "support_attachments_user_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-ticket-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );
