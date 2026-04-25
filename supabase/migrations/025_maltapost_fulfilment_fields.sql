-- MaltaPost fulfilment fields for orders and shipments.
-- These preserve the existing orders/shipments architecture while making
-- fulfilment provider/method/status explicit for the future MaltaPost API.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfilment_provider TEXT DEFAULT 'MaltaPost',
  ADD COLUMN IF NOT EXISTS fulfilment_method TEXT,
  ADD COLUMN IF NOT EXISTS fulfilment_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS fulfilment_status TEXT DEFAULT 'awaiting_fulfilment',
  ADD COLUMN IF NOT EXISTS locker_location JSONB,
  ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS fulfilment_provider TEXT DEFAULT 'MaltaPost',
  ADD COLUMN IF NOT EXISTS fulfilment_method TEXT,
  ADD COLUMN IF NOT EXISTS fulfilment_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS fulfilment_status TEXT DEFAULT 'awaiting_fulfilment',
  ADD COLUMN IF NOT EXISTS locker_location JSONB,
  ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB;

CREATE INDEX IF NOT EXISTS idx_orders_fulfilment_method
  ON public.orders(fulfilment_method);

CREATE INDEX IF NOT EXISTS idx_orders_fulfilment_status
  ON public.orders(fulfilment_status);
