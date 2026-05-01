-- Delivery trigger support for buyer-protection holds.
-- When an order is marked delivered, the app stores payout_status as
-- buyer_protection_hold until the buyer confirms or the 48h window expires.

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payout_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payout_status_check
CHECK (payout_status IN (
  'held',
  'buyer_protection_hold',
  'pending',
  'releasable',
  'released',
  'paid',
  'failed',
  'transfer_failed',
  'refunded',
  'disputed'
));

CREATE INDEX IF NOT EXISTS idx_orders_buyer_protection_hold_deadline
  ON public.orders(buyer_confirmation_deadline)
  WHERE payout_status IN ('held', 'buyer_protection_hold') AND delivered_at IS NOT NULL;
