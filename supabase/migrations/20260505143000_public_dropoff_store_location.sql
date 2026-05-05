ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS dropoff_store_id TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_location_name TEXT,
  ADD COLUMN IF NOT EXISTS delivery_timing TEXT;

ALTER TABLE IF EXISTS public.shipments
  ADD COLUMN IF NOT EXISTS dropoff_store_id TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_location_name TEXT,
  ADD COLUMN IF NOT EXISTS delivery_timing TEXT;

ALTER TABLE IF EXISTS public.logistics_delivery_sheet
  ADD COLUMN IF NOT EXISTS buyer_surname TEXT,
  ADD COLUMN IF NOT EXISTS buyer_locality TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_store_id TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_location_name TEXT;

ALTER TABLE IF EXISTS public.dropoff_scan_logs
  ADD COLUMN IF NOT EXISTS dropoff_store_id TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_location_name TEXT;

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
  v_store_name TEXT;
  v_store_id TEXT;
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

  v_confirmed_at := coalesce(v_order.dropoff_confirmed_at, v_shipment.dropoff_confirmed_at, v_shipment.dropped_off_at);
  v_confirmed := v_confirmed_at IS NOT NULL
    OR coalesce(v_shipment.status, '') = 'dropped_off'
    OR coalesce(v_order.fulfilment_status, '') = 'dropped_off';
  v_store_name := coalesce(nullif(v_order.dropoff_location_name, ''), nullif(v_shipment.dropoff_location_name, ''), nullif(v_shipment.dropoff_store_name, ''), nullif(v_order.dropoff_location, ''), nullif(v_shipment.dropoff_location, ''));
  v_store_id := coalesce(nullif(v_order.dropoff_store_id, ''), nullif(v_shipment.dropoff_store_id::TEXT, ''));

  RETURN jsonb_build_object(
    'ok', true,
    'valid', true,
    'codeValid', v_code_valid,
    'eligible', v_code_valid,
    'orderId', v_order.id,
    'orderCode', v_expected_code,
    'itemTitle', coalesce(nullif(v_order.listing_title, ''), 'Seller parcel'),
    'status', CASE WHEN v_confirmed THEN 'dropped_off' ELSE 'ready_for_dropoff' END,
    'confirmed', v_confirmed,
    'confirmedAt', v_confirmed_at,
    'storeId', v_store_id,
    'storeName', v_store_name,
    'dropoffLocationName', v_store_name,
    'deliveryTiming', CASE
      WHEN v_confirmed_at IS NULL THEN NULL
      WHEN (v_confirmed_at AT TIME ZONE 'Europe/Malta')::time < TIME '12:00' THEN 'same_day'
      ELSE 'next_day'
    END,
    'canConfirm', v_code_valid AND NOT v_confirmed,
    'error', CASE WHEN NOT v_code_valid THEN 'code_mismatch' ELSE NULL END,
    'message', CASE
      WHEN NOT v_code_valid THEN 'Invalid or expired QR code.'
      WHEN v_confirmed THEN 'Parcel already confirmed.'
      ELSE 'Ready to confirm this parcel.'
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_public_dropoff_scan(
  p_order_id TEXT,
  p_token TEXT,
  p_code TEXT DEFAULT NULL,
  p_store_id TEXT DEFAULT NULL,
  p_store_name TEXT DEFAULT NULL
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
  v_store_id TEXT := nullif(btrim(coalesce(p_store_id, '')), '');
  v_store_name TEXT := nullif(btrim(coalesce(p_store_name, '')), '');
  v_location TEXT;
  v_delivery_timing TEXT;
  v_buyer_surname TEXT;
  v_buyer_locality TEXT;
  v_logistics_row_created BOOLEAN := false;
BEGIN
  BEGIN
    v_order_id := nullif(btrim(coalesce(p_order_id, '')), '')::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN public.public_dropoff_invalid_response();
  END;

  IF v_order_id IS NULL OR length(v_token) < 32 OR v_store_name IS NULL THEN
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
  v_location := v_store_name;
  v_delivery_timing := CASE
    WHEN (v_now AT TIME ZONE 'Europe/Malta')::time < TIME '12:00' THEN 'same_day'
    ELSE 'next_day'
  END;
  v_buyer_surname := nullif(split_part(reverse(coalesce(v_order.buyer_full_name, '')), ' ', 1), '');
  IF v_buyer_surname IS NOT NULL THEN
    v_buyer_surname := reverse(v_buyer_surname);
  END IF;
  v_buyer_locality := coalesce(nullif(v_order.buyer_city, ''), nullif(v_order.buyer_postcode, ''));

  IF v_scanned_code <> '' AND v_scanned_code <> v_expected_code THEN
    INSERT INTO public.dropoff_scan_logs (order_id, order_code, scan_status, message, dropoff_location, dropoff_store_id, dropoff_location_name)
    VALUES (v_order.id, v_expected_code, 'rejected', 'Public QR scan rejected: code mismatch', v_location, v_store_id, v_store_name);

    RETURN public.get_public_dropoff_scan(p_order_id, p_token, p_code);
  END IF;

  SELECT *
  INTO v_shipment
  FROM public.shipments
  WHERE order_id = v_order.id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  v_confirmed_at := coalesce(v_order.dropoff_confirmed_at, v_shipment.dropoff_confirmed_at, v_shipment.dropped_off_at);
  v_confirmed := v_confirmed_at IS NOT NULL
    OR coalesce(v_shipment.status, '') = 'dropped_off'
    OR coalesce(v_order.fulfilment_status, '') = 'dropped_off';

  IF v_confirmed THEN
    INSERT INTO public.dropoff_scan_logs (order_id, shipment_id, order_code, scan_status, message, dropoff_location, dropoff_store_id, dropoff_location_name)
    VALUES (v_order.id, v_shipment.id, v_expected_code, 'already_confirmed', 'Public QR scan found parcel already confirmed', coalesce(v_location, v_order.dropoff_location), coalesce(v_store_id, v_order.dropoff_store_id), coalesce(v_store_name, v_order.dropoff_location_name));

    RETURN public.get_public_dropoff_scan(p_order_id, p_token, p_code)
      || jsonb_build_object('alreadyConfirmed', true);
  END IF;

  IF v_shipment.id IS NOT NULL THEN
    UPDATE public.shipments
    SET
      status = 'dropped_off',
      fulfilment_status = 'dropped_off',
      dropoff_store_id = v_store_id,
      dropoff_store_name = v_store_name,
      dropoff_location_name = v_store_name,
      dropped_off_at = v_now,
      dropoff_confirmed_at = v_now,
      dropoff_confirmed_by = NULL,
      dropoff_location = v_location,
      delivery_timing = v_delivery_timing,
      current_location = v_location,
      notes = coalesce(nullif(notes, ''), 'Confirmed by MYConvenience public QR scan.'),
      updated_at = v_now
    WHERE id = v_shipment.id;
  END IF;

  UPDATE public.orders
  SET
    fulfilment_status = 'dropped_off',
    dropoff_confirmed_at = v_now,
    dropoff_confirmed_by = NULL,
    dropoff_location = v_location,
    dropoff_store_id = v_store_id,
    dropoff_location_name = v_store_name,
    delivery_timing = v_delivery_timing,
    updated_at = v_now
  WHERE id = v_order.id;

  INSERT INTO public.logistics_delivery_sheet (
    order_id,
    shipment_id,
    seller_name,
    buyer_name,
    buyer_surname,
    buyer_locality,
    item_title,
    dropoff_store_id,
    dropoff_location_name,
    dropoff_store_name,
    dropped_off_at,
    buyer_delivery_address,
    buyer_contact,
    delivery_status,
    notes,
    order_code,
    delivery_timing,
    updated_at
  )
  VALUES (
    v_order.id,
    v_shipment.id,
    coalesce(v_order.seller_name, ''),
    coalesce(v_order.buyer_full_name, ''),
    coalesce(v_buyer_surname, ''),
    coalesce(v_buyer_locality, ''),
    coalesce(nullif(v_order.listing_title, ''), 'Seller parcel'),
    v_store_id,
    v_store_name,
    v_store_name,
    v_now,
    array_to_string(array_remove(ARRAY[
      nullif(v_order.buyer_city, ''),
      nullif(v_order.buyer_postcode, ''),
      nullif(v_order.address::text, '{}')
    ], NULL), ', '),
    coalesce(v_order.buyer_phone, ''),
    'dropped_off',
    'Confirmed by MYConvenience public QR scan.',
    v_expected_code,
    v_delivery_timing,
    v_now
  )
  ON CONFLICT (shipment_id) DO UPDATE
  SET
    order_code = excluded.order_code,
    buyer_surname = excluded.buyer_surname,
    buyer_locality = excluded.buyer_locality,
    dropoff_store_id = excluded.dropoff_store_id,
    dropoff_location_name = excluded.dropoff_location_name,
    dropoff_store_name = excluded.dropoff_store_name,
    dropped_off_at = excluded.dropped_off_at,
    delivery_status = excluded.delivery_status,
    delivery_timing = excluded.delivery_timing,
    notes = excluded.notes,
    updated_at = excluded.updated_at;
  v_logistics_row_created := true;

  INSERT INTO public.dropoff_scan_logs (order_id, shipment_id, order_code, scan_status, message, dropoff_location, dropoff_store_id, dropoff_location_name)
  VALUES (v_order.id, v_shipment.id, v_expected_code, 'confirmed', 'Parcel received from seller by public QR scan', v_location, v_store_id, v_store_name);

  RETURN public.get_public_dropoff_scan(p_order_id, p_token, p_code)
    || jsonb_build_object(
      'confirmedNow', true,
      'storeId', v_store_id,
      'storeName', v_store_name,
      'dropoffLocationName', v_store_name,
      'deliveryTiming', v_delivery_timing,
      'logisticsRowCreated', v_logistics_row_created
    );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_public_dropoff_scan(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_public_dropoff_scan(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
