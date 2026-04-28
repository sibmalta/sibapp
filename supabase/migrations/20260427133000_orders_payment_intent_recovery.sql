-- Make Stripe PaymentIntent recovery idempotent.
-- A paid Stripe event must map to at most one Sib order, even if the frontend
-- success handler and webhook race each other.

WITH ranked_payment_intents AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY stripe_payment_intent_id
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM public.orders
  WHERE stripe_payment_intent_id IS NOT NULL
)
UPDATE public.orders o
SET stripe_payment_intent_id = NULL,
    updated_at = now()
FROM ranked_payment_intents r
WHERE o.id = r.id
  AND r.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_unique
  ON public.orders(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_payment_status_created_at
  ON public.orders(payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_payout_status_created_at
  ON public.orders(payout_status, created_at DESC);
