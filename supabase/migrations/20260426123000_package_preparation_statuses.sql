-- Support MaltaPost package-preparation states without replacing the existing
-- orders/shipments architecture.

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
CHECK (status IN (
  'pending',
  'accepted',
  'seller_preparing_package',
  'ready_for_pickup',
  'picked_up',
  'paid',
  'shipped',
  'in_transit',
  'delivered',
  'confirmed',
  'completed',
  'cancelled',
  'refunded',
  'disputed'
));

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_status_check;
ALTER TABLE public.shipments ADD CONSTRAINT shipments_status_check
CHECK (status IN (
  'seller_preparing_package',
  'ready_for_pickup',
  'picked_up',
  'awaiting_shipment',
  'label_created',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed',
  'returned'
));
