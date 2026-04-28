-- MVP logistics delivery spreadsheet.
-- Store QR scan/drop-off events at MYconvenience stores and keep one
-- spreadsheet-source row per shipment. No driver assignment is required.

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS dropoff_store_id TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_store_name TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_store_address TEXT,
  ADD COLUMN IF NOT EXISTS dropped_off_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_location TEXT,
  ADD COLUMN IF NOT EXISTS fallback_store_name TEXT;

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_status_check;
ALTER TABLE public.shipments ADD CONSTRAINT shipments_status_check
CHECK (status IN (
  'seller_preparing_package',
  'ready_for_pickup',
  'picked_up',
  'dropped_off',
  'awaiting_shipment',
  'label_created',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed',
  'cancelled',
  'returned'
));

CREATE TABLE IF NOT EXISTS public.logistics_delivery_sheet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
  seller_name TEXT,
  buyer_name TEXT,
  item_title TEXT,
  dropoff_store_name TEXT,
  dropoff_store_address TEXT,
  dropped_off_at TIMESTAMPTZ,
  buyer_delivery_address TEXT,
  buyer_contact TEXT,
  delivery_status TEXT,
  fallback_store_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_logistics_delivery_sheet_shipment
  ON public.logistics_delivery_sheet(shipment_id);

CREATE INDEX IF NOT EXISTS idx_logistics_delivery_sheet_order
  ON public.logistics_delivery_sheet(order_id);

CREATE INDEX IF NOT EXISTS idx_logistics_delivery_sheet_status
  ON public.logistics_delivery_sheet(delivery_status);

ALTER TABLE public.logistics_delivery_sheet ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

DROP POLICY IF EXISTS "logistics_delivery_sheet_admin_read" ON public.logistics_delivery_sheet;
CREATE POLICY "logistics_delivery_sheet_admin_read" ON public.logistics_delivery_sheet
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "logistics_delivery_sheet_admin_write" ON public.logistics_delivery_sheet;
CREATE POLICY "logistics_delivery_sheet_admin_write" ON public.logistics_delivery_sheet
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS logistics_delivery_sheet_set_updated_at ON public.logistics_delivery_sheet;
CREATE TRIGGER logistics_delivery_sheet_set_updated_at
  BEFORE UPDATE ON public.logistics_delivery_sheet
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
