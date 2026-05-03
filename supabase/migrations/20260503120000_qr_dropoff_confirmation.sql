-- v1 QR/admin drop-off confirmation loop.
-- Uses shipments.status = 'dropped_off' as the official parcel-received state
-- and stores confirmation metadata defensively for admin auditability.

ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS dropoff_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dropoff_confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dropoff_location TEXT;

ALTER TABLE IF EXISTS public.shipments
  ADD COLUMN IF NOT EXISTS dropoff_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dropoff_confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dropoff_location TEXT;

ALTER TABLE IF EXISTS public.logistics_delivery_sheet
  ADD COLUMN IF NOT EXISTS order_code TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_dropoff_confirmed_at
  ON public.orders(dropoff_confirmed_at)
  WHERE dropoff_confirmed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipments_dropoff_confirmed_at
  ON public.shipments(dropoff_confirmed_at)
  WHERE dropoff_confirmed_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.dropoff_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  order_code TEXT,
  scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scan_status TEXT NOT NULL DEFAULT 'confirmed',
  message TEXT,
  dropoff_location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dropoff_scan_logs_order
  ON public.dropoff_scan_logs(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dropoff_scan_logs_status
  ON public.dropoff_scan_logs(scan_status);

ALTER TABLE public.dropoff_scan_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dropoff_scan_logs_admin_read" ON public.dropoff_scan_logs;
CREATE POLICY "dropoff_scan_logs_admin_read" ON public.dropoff_scan_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "dropoff_scan_logs_admin_insert" ON public.dropoff_scan_logs;
CREATE POLICY "dropoff_scan_logs_admin_insert" ON public.dropoff_scan_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "orders_admin_dropoff_read" ON public.orders;
CREATE POLICY "orders_admin_dropoff_read" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "orders_admin_dropoff_update" ON public.orders;
CREATE POLICY "orders_admin_dropoff_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "shipments_admin_dropoff_read" ON public.shipments;
CREATE POLICY "shipments_admin_dropoff_read" ON public.shipments
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "shipments_admin_dropoff_update" ON public.shipments;
CREATE POLICY "shipments_admin_dropoff_update" ON public.shipments
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
