-- Allow server-side MaltaPost cancellation sync to persist on shipment rows.

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
  'cancelled',
  'returned'
));
