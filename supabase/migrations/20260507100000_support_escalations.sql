-- Support AI human escalation queue.

CREATE TABLE IF NOT EXISTS public.support_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  source TEXT NOT NULL DEFAULT 'support_ai' CHECK (source IN ('support_ai', 'user', 'admin')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_escalations_user_created
  ON public.support_escalations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_escalations_order
  ON public.support_escalations(order_id);

CREATE INDEX IF NOT EXISTS idx_support_escalations_status
  ON public.support_escalations(status);

ALTER TABLE public.support_escalations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_escalations_user_read" ON public.support_escalations;
CREATE POLICY "support_escalations_user_read" ON public.support_escalations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "support_escalations_user_insert" ON public.support_escalations;
CREATE POLICY "support_escalations_user_insert" ON public.support_escalations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "support_escalations_admin_all" ON public.support_escalations;
CREATE POLICY "support_escalations_admin_all" ON public.support_escalations
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS support_escalations_set_updated_at ON public.support_escalations;
CREATE TRIGGER support_escalations_set_updated_at
  BEFORE UPDATE ON public.support_escalations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
