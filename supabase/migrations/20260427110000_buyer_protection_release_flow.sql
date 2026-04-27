-- Buyer protection release flow.
-- Payments are captured immediately, but seller payout remains held until
-- buyer confirmation or the 48-hour post-delivery window expires.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS buyer_confirmation_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
CHECK (status IN (
  'pending',
  'accepted',
  'seller_preparing_package',
  'ready_for_pickup',
  'picked_up',
  'paid',
  'awaiting_delivery',
  'shipped',
  'in_transit',
  'delivered',
  'confirmed',
  'completed',
  'cancelled',
  'refunded',
  'disputed'
));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payout_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payout_status_check
CHECK (payout_status IN (
  'held',
  'pending',
  'releasable',
  'released',
  'paid',
  'failed',
  'refunded',
  'disputed'
));

CREATE INDEX IF NOT EXISTS idx_orders_buyer_confirmation_deadline
  ON public.orders(buyer_confirmation_deadline)
  WHERE payout_status = 'held' AND delivered_at IS NOT NULL;
