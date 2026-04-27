-- Admin MaltaPost shipment shortcut metadata.
-- Keeps the existing orders/shipments architecture and stores one generated
-- admin shipment reference per shipment row.

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS shipment_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipment_reference TEXT,
  ADD COLUMN IF NOT EXISTS delivery_type TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipments_shipment_reference
  ON public.shipments(shipment_reference)
  WHERE shipment_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipments_shipment_created_at
  ON public.shipments(shipment_created_at);
