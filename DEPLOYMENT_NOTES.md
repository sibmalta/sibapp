# Deployment Notes

## Orders schema contract repair

Production must run migration `20260516120000_orders_schema_contract_repair.sql` before/with app deploy.

This migration repairs the current `public.orders` and `public.shipments` schema contract used by the Orders page, checkout, Stripe webhook, and drop-off flows. It is idempotent and does not delete order, shipment, payout, or listing data.
