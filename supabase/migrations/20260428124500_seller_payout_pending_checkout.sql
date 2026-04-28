-- Allow platform-captured checkout orders to remain buyer-safe while the
-- seller completes payout setup. Funds stay held until Connect payouts are ready.

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
CHECK (status IN (
  'pending',
  'accepted',
  'seller_preparing_package',
  'ready_for_pickup',
  'picked_up',
  'paid',
  'payment_received_seller_payout_pending',
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

CREATE INDEX IF NOT EXISTS idx_orders_seller_payout_pending
  ON public.orders(seller_id, created_at DESC)
  WHERE status = 'payment_received_seller_payout_pending';
