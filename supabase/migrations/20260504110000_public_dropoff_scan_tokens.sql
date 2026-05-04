-- Token-based public MYConvenience QR scan access.
-- The public RPCs below expose only a parcel confirmation summary and a fixed
-- drop-off confirmation mutation. They do not grant table access.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.generate_dropoff_scan_token()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SET search_path = public, extensions
AS $$
  SELECT lower(replace(gen_random_uuid()::text, '-', '') || encode(gen_random_bytes(8), 'hex'));
$$;

ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS dropoff_scan_token TEXT;

UPDATE public.orders
SET dropoff_scan_token = public.generate_dropoff_scan_token()
WHERE dropoff_scan_token IS NULL OR btrim(dropoff_scan_token) = '';

ALTER TABLE IF EXISTS public.orders
  ALTER COLUMN dropoff_scan_token SET DEFAULT public.generate_dropoff_scan_token(),
  ALTER COLUMN dropoff_scan_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_dropoff_scan_token
  ON public.orders(dropoff_scan_token);

CREATE OR REPLACE FUNCTION public.normalize_dropoff_order_code(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT upper(regexp_replace(regexp_replace(btrim(coalesce(value, '')), '^#', ''), '\s+', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.get_dropoff_order_code(order_id UUID, order_ref TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN nullif(btrim(coalesce(order_ref, '')), '') IS NOT NULL
      THEN public.normalize_dropoff_order_code(order_ref)
    ELSE 'SIB-' || upper(right(regexp_replace(order_id::text, '[^a-zA-Z0-9]', '', 'g'), 8))
  END;
$$;

CREATE OR REPLACE FUNCTION public.public_dropoff_invalid_response()
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'ok', false,
    'valid', false,
    'canConfirm', false,
    'error', 'invalid_scan',
    'message', 'This QR code is invalid or expired.'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_public_dropoff_scan(
  p_order_id TEXT,
  p_token TEXT,
  p_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_order public.orders%ROWTYPE;
  v_shipment public.shipments%ROWTYPE;
  v_token TEXT := btrim(coalesce(p_token, ''));
  v_expected_code TEXT;
  v_scanned_code TEXT;
  v_code_valid BOOLEAN;
  v_confirmed_at TIMESTAMPTZ;
  v_confirmed BOOLEAN;
  v_paid BOOLEAN;
BEGIN
  BEGIN
    v_order_id := nullif(btrim(coalesce(p_order_id, '')), '')::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN public.public_dropoff_invalid_response();
  END;

  IF v_order_id IS NULL OR length(v_token) < 32 THEN
    RETURN public.public_dropoff_invalid_response();
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = v_order_id
    AND dropoff_scan_token = v_token;

  IF NOT FOUND THEN
    RETURN public.public_dropoff_invalid_response();
  END IF;

  v_expected_code := public.get_dropoff_order_code(v_order.id, v_order.order_ref);
  v_scanned_code := public.normalize_dropoff_order_code(p_code);
  v_code_valid := v_scanned_code = '' OR v_scanned_code = v_expected_code;

  SELECT *
  INTO v_shipment
  FROM public.shipments
  WHERE order_id = v_order.id
  ORDER BY created_at DESC
  LIMIT 1;

  v_paid := lower(coalesce(v_order.payment_status, '')) IN ('paid', 'succeeded')
    OR lower(coalesce(v_order.status, '')) IN ('paid', 'payment_received_seller_payout_pending', 'shipped', 'delivered', 'confirmed', 'completed')
    OR lower(coalesce(v_order.tracking_status, '')) IN ('awaiting_delivery', 'shipped', 'in_transit', 'delivered');

  v_confirmed_at := coalesce(v_order.dropoff_confirmed_at, v_shipment.dropoff_confirmed_at, v_shipment.dropped_off_at);
  v_confirmed := v_confirmed_at IS NOT NULL
    OR coalesce(v_shipment.status, '') = 'dropped_off'
    OR coalesce(v_order.fulfilment_status, '') = 'dropped_off';

  RETURN jsonb_build_object(
    'ok', true,
    'valid', true,
    'codeValid', v_code_valid,
    'eligible', v_paid,
    'orderId', v_order.id,
    'orderCode', v_expected_code,
    'itemTitle', coalesce(nullif(v_order.listing_title, ''), 'Seller parcel'),
    'status', CASE
      WHEN v_confirmed THEN 'dropped_off'
      ELSE coalesce(nullif(v_shipment.status, ''), nullif(v_order.fulfilment_status, ''), nullif(v_order.tracking_status, ''), v_order.status, 'pending')
    END,
    'confirmed', v_confirmed,
    'confirmedAt', v_confirmed_at,
    'canConfirm', v_code_valid AND v_paid AND v_shipment.id IS NOT NULL AND NOT v_confirmed,
    'error', CASE
      WHEN NOT v_code_valid THEN 'code_mismatch'
      WHEN NOT v_paid THEN 'order_not_paid'
      WHEN v_shipment.id IS NULL THEN 'shipment_missing'
      ELSE NULL
    END,
    'message', CASE
      WHEN NOT v_code_valid THEN 'The QR code does not match this parcel code.'
      WHEN NOT v_paid THEN 'This order is not ready for store drop-off confirmation.'
      WHEN v_shipment.id IS NULL THEN 'This parcel is not ready for store drop-off confirmation yet.'
      WHEN v_confirmed THEN 'Parcel already confirmed.'
      ELSE 'Ready to confirm parcel receipt.'
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_public_dropoff_scan(
  p_order_id TEXT,
  p_token TEXT,
  p_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_order public.orders%ROWTYPE;
  v_shipment public.shipments%ROWTYPE;
  v_token TEXT := btrim(coalesce(p_token, ''));
  v_expected_code TEXT;
  v_scanned_code TEXT;
  v_now TIMESTAMPTZ := now();
  v_confirmed_at TIMESTAMPTZ;
  v_confirmed BOOLEAN;
  v_paid BOOLEAN;
  v_store_name TEXT := 'MYConvenience';
  v_location TEXT := 'MYConvenience QR scan';
BEGIN
  BEGIN
    v_order_id := nullif(btrim(coalesce(p_order_id, '')), '')::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN public.public_dropoff_invalid_response();
  END;

  IF v_order_id IS NULL OR length(v_token) < 32 THEN
    RETURN public.public_dropoff_invalid_response();
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = v_order_id
    AND dropoff_scan_token = v_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN public.public_dropoff_invalid_response();
  END IF;

  v_expected_code := public.get_dropoff_order_code(v_order.id, v_order.order_ref);
  v_scanned_code := public.normalize_dropoff_order_code(p_code);

  IF v_scanned_code <> '' AND v_scanned_code <> v_expected_code THEN
    INSERT INTO public.dropoff_scan_logs (order_id, order_code, scan_status, message, dropoff_location)
    VALUES (v_order.id, v_expected_code, 'rejected', 'Public QR scan rejected: code mismatch', v_location);

    RETURN public.get_public_dropoff_scan(p_order_id, p_token, p_code);
  END IF;

  SELECT *
  INTO v_shipment
  FROM public.shipments
  WHERE order_id = v_order.id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  v_paid := lower(coalesce(v_order.payment_status, '')) IN ('paid', 'succeeded')
    OR lower(coalesce(v_order.status, '')) IN ('paid', 'payment_received_seller_payout_pending', 'shipped', 'delivered', 'confirmed', 'completed')
    OR lower(coalesce(v_order.tracking_status, '')) IN ('awaiting_delivery', 'shipped', 'in_transit', 'delivered');

  IF NOT v_paid OR v_shipment.id IS NULL THEN
    RETURN public.get_public_dropoff_scan(p_order_id, p_token, p_code);
  END IF;

  v_confirmed_at := coalesce(v_order.dropoff_confirmed_at, v_shipment.dropoff_confirmed_at, v_shipment.dropped_off_at);
  v_confirmed := v_confirmed_at IS NOT NULL
    OR coalesce(v_shipment.status, '') = 'dropped_off'
    OR coalesce(v_order.fulfilment_status, '') = 'dropped_off';

  IF v_confirmed THEN
    INSERT INTO public.dropoff_scan_logs (order_id, shipment_id, order_code, scan_status, message, dropoff_location)
    VALUES (v_order.id, v_shipment.id, v_expected_code, 'already_confirmed', 'Public QR scan found parcel already confirmed', v_location);

    RETURN public.get_public_dropoff_scan(p_order_id, p_token, p_code)
      || jsonb_build_object('alreadyConfirmed', true);
  END IF;

  UPDATE public.shipments
  SET
    status = 'dropped_off',
    fulfilment_status = 'dropped_off',
    dropoff_store_name = coalesce(nullif(dropoff_store_name, ''), v_store_name),
    dropped_off_at = v_now,
    dropoff_confirmed_at = v_now,
    dropoff_confirmed_by = NULL,
    dropoff_location = v_location,
    current_location = v_location,
    notes = coalesce(nullif(notes, ''), 'Confirmed by MYConvenience public QR scan.'),
    updated_at = v_now
  WHERE id = v_shipment.id;

  UPDATE public.orders
  SET
    fulfilment_status = 'dropped_off',
    dropoff_confirmed_at = v_now,
    dropoff_confirmed_by = NULL,
    dropoff_location = v_location,
    updated_at = v_now
  WHERE id = v_order.id;

  INSERT INTO public.logistics_delivery_sheet (
    order_id,
    shipment_id,
    seller_name,
    buyer_name,
    item_title,
    dropoff_store_name,
    dropped_off_at,
    delivery_status,
    notes,
    order_code,
    updated_at
  )
  VALUES (
    v_order.id,
    v_shipment.id,
    coalesce(v_order.seller_name, ''),
    coalesce(v_order.buyer_full_name, ''),
    coalesce(nullif(v_order.listing_title, ''), 'Seller parcel'),
    v_store_name,
    v_now,
    'dropped_off',
    'Confirmed by MYConvenience public QR scan.',
    v_expected_code,
    v_now
  )
  ON CONFLICT (shipment_id) DO UPDATE
  SET
    order_code = excluded.order_code,
    dropoff_store_name = excluded.dropoff_store_name,
    dropped_off_at = excluded.dropped_off_at,
    delivery_status = excluded.delivery_status,
    notes = excluded.notes,
    updated_at = excluded.updated_at;

  INSERT INTO public.dropoff_scan_logs (order_id, shipment_id, order_code, scan_status, message, dropoff_location)
  VALUES (v_order.id, v_shipment.id, v_expected_code, 'confirmed', 'Parcel received from seller by public QR scan', v_location);

  RETURN public.get_public_dropoff_scan(p_order_id, p_token, p_code)
    || jsonb_build_object('confirmedNow', true);
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_dropoff_scan(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_public_dropoff_scan(TEXT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_dropoff_scan(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_public_dropoff_scan(TEXT, TEXT, TEXT) TO anon, authenticated;
