-- Marketplace payment accounting for Stripe separate-charge + delayed-transfer flow.
-- Existing fields are preserved; new *_amount aliases make the accounting view explicit.

ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS seller_stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS seller_payout_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS delivery_fee_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS stripe_fee_amount NUMERIC(10,2);

UPDATE public.orders
SET
  seller_payout_amount = COALESCE(seller_payout_amount, seller_payout),
  platform_fee_amount = COALESCE(platform_fee_amount, platform_fee, bundled_fee),
  delivery_fee_amount = COALESCE(delivery_fee_amount, delivery_fee)
WHERE seller_payout_amount IS NULL
   OR platform_fee_amount IS NULL
   OR delivery_fee_amount IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_stripe_transfer_id
  ON public.orders(stripe_transfer_id)
  WHERE stripe_transfer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_seller_stripe_account_id
  ON public.orders(seller_stripe_account_id)
  WHERE seller_stripe_account_id IS NOT NULL;
