-- Ensure every paid order enters the logistics pipeline automatically.
-- Orders remain the commercial/payment record; logistics_delivery_sheet is the
-- operational source of truth for dispatch state.

CREATE OR REPLACE FUNCTION public.get_order_buyer_surname(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN nullif(btrim(coalesce(value, '')), '') IS NULL THEN ''
    ELSE split_part(btrim(value), ' ', array_length(regexp_split_to_array(btrim(value), '\s+'), 1))
  END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_paid_order_logistics(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_listing public.listings%ROWTYPE;
  v_buyer public.profiles%ROWTYPE;
  v_seller public.profiles%ROWTYPE;
  v_shipment public.shipments%ROWTYPE;
  v_delivery_sheet public.logistics_delivery_sheet%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_buyer_name TEXT;
  v_seller_name TEXT;
  v_item_title TEXT;
  v_order_code TEXT;
  v_buyer_address TEXT;
  v_buyer_locality TEXT;
  v_buyer_contact TEXT;
  v_created_shipment BOOLEAN := false;
  v_created_delivery_sheet BOOLEAN := false;
BEGIN
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
    AND (
      coalesce(payment_status, '') = 'paid'
      OR paid_at IS NOT NULL
      OR coalesce(status, '') IN ('paid', 'payment_received_seller_payout_pending')
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'skipped', true, 'reason', 'order_not_paid');
  END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = v_order.listing_id;
  SELECT * INTO v_buyer FROM public.profiles WHERE id = v_order.buyer_id;
  SELECT * INTO v_seller FROM public.profiles WHERE id = v_order.seller_id;

  v_buyer_name := coalesce(nullif(v_order.buyer_full_name, ''), nullif(v_buyer.name, ''), nullif(v_buyer.username, ''), '');
  v_seller_name := coalesce(nullif(v_order.seller_name, ''), nullif(v_seller.name, ''), nullif(v_seller.username, ''), '');
  v_item_title := coalesce(nullif(v_order.listing_title, ''), nullif(v_listing.title, ''), 'Parcel');
  v_order_code := public.get_dropoff_order_code(v_order.id, v_order.order_ref);
  v_buyer_address := array_to_string(array_remove(ARRAY[
    nullif(v_order.buyer_city, ''),
    nullif(v_order.buyer_postcode, ''),
    nullif(v_order.shipping_address->>'raw', ''),
    nullif(v_order.address::text, '{}')
  ], NULL), ', ');
  v_buyer_locality := coalesce(
    nullif(v_order.buyer_city, ''),
    nullif(v_order.shipping_address->>'buyerCity', ''),
    nullif(v_order.shipping_address->>'city', ''),
    ''
  );
  v_buyer_contact := array_to_string(array_remove(ARRAY[
    nullif(v_order.buyer_phone, ''),
    nullif(v_buyer.phone, ''),
    nullif(v_buyer.email, '')
  ], NULL), ' / ');

  SELECT *
  INTO v_shipment
  FROM public.shipments
  WHERE order_id = v_order.id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.shipments (
      order_id,
      order_ref,
      seller_id,
      buyer_id,
      status,
      courier,
      fulfilment_provider,
      fulfilment_method,
      fulfilment_price,
      fulfilment_status,
      delivery_type,
      recipient_address,
      sender_address,
      notes,
      created_at,
      updated_at
    )
    VALUES (
      v_order.id,
      v_order.order_ref,
      v_order.seller_id,
      v_order.buyer_id,
      'awaiting_shipment',
      'MYConvenience Courier',
      coalesce(nullif(v_order.fulfilment_provider, ''), 'myconvenience'),
      coalesce(nullif(v_order.fulfilment_method, ''), 'delivery'),
      v_order.fulfilment_price,
      coalesce(nullif(v_order.fulfilment_status, ''), 'awaiting_fulfilment'),
      coalesce(nullif(v_order.delivery_method, ''), 'myconvenience_dropoff'),
      jsonb_build_object(
        'name', nullif(v_buyer_name, ''),
        'phone', nullif(v_order.buyer_phone, ''),
        'address', nullif(v_buyer_address, ''),
        'locality', nullif(v_buyer_locality, '')
      ),
      jsonb_build_object(
        'name', nullif(v_seller_name, ''),
        'phone', nullif(v_order.seller_phone, ''),
        'address', nullif(v_order.seller_address, '')
      ),
      'Automatically created when order became paid.',
      v_now,
      v_now
    )
    RETURNING * INTO v_shipment;
    v_created_shipment := true;
  END IF;

  SELECT *
  INTO v_delivery_sheet
  FROM public.logistics_delivery_sheet
  WHERE order_id = v_order.id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.logistics_delivery_sheet (
      order_id,
      shipment_id,
      order_code,
      seller_name,
      buyer_name,
      buyer_surname,
      buyer_locality,
      item_title,
      buyer_delivery_address,
      buyer_contact,
      delivery_status,
      notes,
      created_at,
      updated_at
    )
    VALUES (
      v_order.id,
      v_shipment.id,
      v_order_code,
      v_seller_name,
      v_buyer_name,
      public.get_order_buyer_surname(v_buyer_name),
      v_buyer_locality,
      v_item_title,
      v_buyer_address,
      v_buyer_contact,
      'awaiting_pickup',
      'Automatically added when order became paid.',
      v_now,
      v_now
    )
    RETURNING * INTO v_delivery_sheet;
    v_created_delivery_sheet := true;
  ELSIF v_delivery_sheet.shipment_id IS NULL AND v_shipment.id IS NOT NULL THEN
    UPDATE public.logistics_delivery_sheet
    SET
      shipment_id = v_shipment.id,
      order_code = coalesce(nullif(order_code, ''), v_order_code),
      seller_name = coalesce(nullif(seller_name, ''), v_seller_name),
      buyer_name = coalesce(nullif(buyer_name, ''), v_buyer_name),
      buyer_surname = coalesce(nullif(buyer_surname, ''), public.get_order_buyer_surname(v_buyer_name)),
      buyer_locality = coalesce(nullif(buyer_locality, ''), v_buyer_locality),
      item_title = coalesce(nullif(item_title, ''), v_item_title),
      buyer_delivery_address = coalesce(nullif(buyer_delivery_address, ''), v_buyer_address),
      buyer_contact = coalesce(nullif(buyer_contact, ''), v_buyer_contact),
      delivery_status = coalesce(nullif(delivery_status, ''), 'awaiting_pickup'),
      updated_at = v_now
    WHERE id = v_delivery_sheet.id
    RETURNING * INTO v_delivery_sheet;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'orderId', v_order.id,
    'shipmentId', v_shipment.id,
    'deliverySheetId', v_delivery_sheet.id,
    'createdShipment', v_created_shipment,
    'createdDeliverySheet', v_created_delivery_sheet
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_paid_order_logistics(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_paid_order_logistics(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_paid_order_logistics_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    coalesce(NEW.payment_status, '') = 'paid'
    OR NEW.paid_at IS NOT NULL
    OR coalesce(NEW.status, '') IN ('paid', 'payment_received_seller_payout_pending')
  ) THEN
    PERFORM public.ensure_paid_order_logistics(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_paid_order_logistics ON public.orders;
CREATE TRIGGER trg_ensure_paid_order_logistics
AFTER INSERT OR UPDATE OF payment_status, paid_at, status
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.ensure_paid_order_logistics_trigger();

-- Backfill existing paid orders so Admin > Logistics does not depend on any
-- historical manual shipment shortcuts.
SELECT public.ensure_paid_order_logistics(id)
FROM public.orders
WHERE coalesce(payment_status, '') = 'paid'
   OR paid_at IS NOT NULL
   OR coalesce(status, '') IN ('paid', 'payment_received_seller_payout_pending');
