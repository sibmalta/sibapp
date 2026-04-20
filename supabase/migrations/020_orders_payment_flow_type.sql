-- Migration 020: add explicit payment flow type for orders

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_flow_type TEXT;

ALTER TABLE orders
  ALTER COLUMN payment_flow_type SET DEFAULT 'separate_charge';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_payment_flow_type_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_payment_flow_type_check
      CHECK (payment_flow_type IS NULL OR payment_flow_type IN ('separate_charge', 'destination_charge'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_payment_flow_type
  ON orders(payment_flow_type);
