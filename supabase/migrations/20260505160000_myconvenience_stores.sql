CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.myconvenience_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  locality TEXT NOT NULL,
  pickup_zone TEXT,
  active BOOLEAN DEFAULT true,
  store_pin_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE IF EXISTS public.orders
  ALTER COLUMN dropoff_store_id TYPE UUID USING (
    CASE
      WHEN dropoff_store_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN dropoff_store_id::UUID
      ELSE NULL
    END
  );

ALTER TABLE IF EXISTS public.shipments
  ALTER COLUMN dropoff_store_id TYPE UUID USING (
    CASE
      WHEN dropoff_store_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN dropoff_store_id::UUID
      ELSE NULL
    END
  );

ALTER TABLE IF EXISTS public.logistics_delivery_sheet
  ADD COLUMN IF NOT EXISTS pickup_zone TEXT,
  ALTER COLUMN dropoff_store_id TYPE UUID USING (
    CASE
      WHEN dropoff_store_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN dropoff_store_id::UUID
      ELSE NULL
    END
  );

ALTER TABLE IF EXISTS public.dropoff_scan_logs
  ADD COLUMN IF NOT EXISTS confirmation_source TEXT,
  ALTER COLUMN dropoff_store_id TYPE UUID USING (
    CASE
      WHEN dropoff_store_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN dropoff_store_id::UUID
      ELSE NULL
    END
  );

CREATE INDEX IF NOT EXISTS idx_myconvenience_stores_active_locality
  ON public.myconvenience_stores(active, locality, name);

DROP TRIGGER IF EXISTS myconvenience_stores_set_updated_at ON public.myconvenience_stores;
CREATE TRIGGER myconvenience_stores_set_updated_at
  BEFORE UPDATE ON public.myconvenience_stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.myconvenience_stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "myconvenience_stores_public_active_read" ON public.myconvenience_stores;

DROP POLICY IF EXISTS "myconvenience_stores_admin_all" ON public.myconvenience_stores;
CREATE POLICY "myconvenience_stores_admin_all" ON public.myconvenience_stores
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

REVOKE ALL ON TABLE public.myconvenience_stores FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.upsert_myconvenience_store(
  p_store_code TEXT,
  p_name TEXT,
  p_address TEXT,
  p_locality TEXT,
  p_pickup_zone TEXT DEFAULT NULL,
  p_active BOOLEAN DEFAULT true,
  p_store_pin TEXT DEFAULT NULL
)
RETURNS public.myconvenience_stores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_store public.myconvenience_stores%ROWTYPE;
  v_store_code TEXT := upper(btrim(p_store_code));
  v_pin_hash TEXT := CASE
    WHEN nullif(btrim(coalesce(p_store_pin, '')), '') IS NULL THEN NULL
    ELSE extensions.crypt(btrim(p_store_pin), extensions.gen_salt('bf'))
  END;
BEGIN
  IF coalesce(p_active, true) AND nullif(btrim(coalesce(p_store_pin, '')), '') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.myconvenience_stores
      WHERE active = true
        AND store_code <> v_store_code
        AND store_pin_hash IS NOT NULL
        AND extensions.crypt(btrim(p_store_pin), store_pin_hash) = store_pin_hash
    ) THEN
      RAISE EXCEPTION 'store_pin_must_be_unique';
    END IF;
  END IF;

  INSERT INTO public.myconvenience_stores (
    store_code,
    name,
    address,
    locality,
    pickup_zone,
    active,
    store_pin_hash
  )
  VALUES (
    v_store_code,
    btrim(p_name),
    btrim(p_address),
    btrim(p_locality),
    nullif(btrim(coalesce(p_pickup_zone, '')), ''),
    coalesce(p_active, true),
    v_pin_hash
  )
  ON CONFLICT (store_code) DO UPDATE
  SET
    name = excluded.name,
    address = excluded.address,
    locality = excluded.locality,
    pickup_zone = excluded.pickup_zone,
    active = excluded.active,
    store_pin_hash = coalesce(v_pin_hash, public.myconvenience_stores.store_pin_hash),
    updated_at = now()
  RETURNING * INTO v_store;

  RETURN v_store;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_myconvenience_store(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_myconvenience_store(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.identify_public_dropoff_store_by_pin(
  p_store_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_store public.myconvenience_stores%ROWTYPE;
  v_pin TEXT := btrim(coalesce(p_store_pin, ''));
BEGIN
  IF v_pin = '' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Invalid store PIN');
  END IF;

  SELECT *
  INTO v_store
  FROM public.myconvenience_stores
  WHERE active = true
    AND store_pin_hash IS NOT NULL
    AND extensions.crypt(v_pin, store_pin_hash) = store_pin_hash
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Invalid store PIN');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'store', jsonb_build_object(
      'id', v_store.id,
      'name', v_store.name,
      'address', v_store.address,
      'locality', v_store.locality,
      'pickup_zone', v_store.pickup_zone,
      'active', v_store.active
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.identify_public_dropoff_store_by_pin(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.identify_public_dropoff_store_by_pin(TEXT) TO anon, authenticated;

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
  v_store public.myconvenience_stores%ROWTYPE;
  v_token TEXT := btrim(coalesce(p_token, ''));
  v_expected_code TEXT;
  v_scanned_code TEXT;
  v_code_valid BOOLEAN;
  v_confirmed_at TIMESTAMPTZ;
  v_confirmed BOOLEAN;
  v_store_name TEXT;
  v_store_id UUID;
  v_pickup_zone TEXT;
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

  v_store_id := coalesce(v_order.dropoff_store_id, v_shipment.dropoff_store_id);
  IF v_store_id IS NOT NULL THEN
    SELECT *
    INTO v_store
    FROM public.myconvenience_stores
    WHERE id = v_store_id;
    v_pickup_zone := v_store.pickup_zone;
  END IF;

  v_confirmed_at := coalesce(v_order.dropoff_confirmed_at, v_shipment.dropoff_confirmed_at, v_shipment.dropped_off_at);
  v_confirmed := v_confirmed_at IS NOT NULL
    OR coalesce(v_shipment.status, '') = 'dropped_off'
    OR coalesce(v_order.fulfilment_status, '') = 'dropped_off';
  v_store_name := coalesce(nullif(v_order.dropoff_location_name, ''), nullif(v_shipment.dropoff_location_name, ''), nullif(v_shipment.dropoff_store_name, ''), nullif(v_store.name, ''), nullif(v_order.dropoff_location, ''), nullif(v_shipment.dropoff_location, ''));

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
    'pickupZone', v_pickup_zone,
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

DROP FUNCTION IF EXISTS public.confirm_public_dropoff_scan(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.confirm_public_dropoff_scan(TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.confirm_public_dropoff_scan(
  p_order_id TEXT,
  p_token TEXT,
  p_code TEXT DEFAULT NULL,
  p_store_pin TEXT DEFAULT NULL
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
  v_store public.myconvenience_stores%ROWTYPE;
  v_token TEXT := btrim(coalesce(p_token, ''));
  v_pin TEXT := btrim(coalesce(p_store_pin, ''));
  v_expected_code TEXT;
  v_scanned_code TEXT;
  v_now TIMESTAMPTZ := now();
  v_confirmed_at TIMESTAMPTZ;
  v_confirmed BOOLEAN;
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

  IF v_order_id IS NULL OR length(v_token) < 32 OR v_pin = '' THEN
    RETURN public.public_dropoff_invalid_response();
  END IF;

  SELECT *
  INTO v_store
  FROM public.myconvenience_stores
  WHERE active = true
    AND store_pin_hash IS NOT NULL
    AND extensions.crypt(v_pin, store_pin_hash) = store_pin_hash
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'valid', false,
      'error', 'invalid_store_pin',
      'message', 'Invalid store PIN'
    );
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
    INSERT INTO public.dropoff_scan_logs (order_id, order_code, scan_status, message, dropoff_location, dropoff_store_id, dropoff_location_name, confirmation_source)
    VALUES (v_order.id, v_expected_code, 'rejected', 'Public QR scan rejected: code mismatch', v_store.name, v_store.id, v_store.name, 'public_store_pin_scan');

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
    INSERT INTO public.dropoff_scan_logs (order_id, shipment_id, order_code, scan_status, message, dropoff_location, dropoff_store_id, dropoff_location_name, confirmation_source)
    VALUES (v_order.id, v_shipment.id, v_expected_code, 'already_confirmed', 'Public QR scan found parcel already confirmed', coalesce(v_order.dropoff_location_name, v_store.name), coalesce(v_order.dropoff_store_id, v_store.id), coalesce(v_order.dropoff_location_name, v_store.name), 'public_store_pin_scan');

    RETURN public.get_public_dropoff_scan(p_order_id, p_token, p_code)
      || jsonb_build_object('alreadyConfirmed', true);
  END IF;

  IF v_shipment.id IS NOT NULL THEN
    UPDATE public.shipments
    SET
      status = 'dropped_off',
      fulfilment_status = 'dropped_off',
      dropoff_store_id = v_store.id,
      dropoff_store_name = v_store.name,
      dropoff_location_name = v_store.name,
      dropped_off_at = v_now,
      dropoff_confirmed_at = v_now,
      dropoff_confirmed_by = NULL,
      dropoff_location = v_store.name,
      delivery_timing = v_delivery_timing,
      current_location = v_store.name,
      notes = coalesce(nullif(notes, ''), 'Confirmed by MYConvenience public QR scan.'),
      updated_at = v_now
    WHERE id = v_shipment.id;
  END IF;

  UPDATE public.orders
  SET
    fulfilment_status = 'dropped_off',
    dropoff_confirmed_at = v_now,
    dropoff_confirmed_by = NULL,
    dropoff_location = v_store.name,
    dropoff_store_id = v_store.id,
    dropoff_location_name = v_store.name,
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
    pickup_zone,
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
    v_store.id,
    v_store.name,
    v_store.name,
    v_store.pickup_zone,
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
    pickup_zone = excluded.pickup_zone,
    dropped_off_at = excluded.dropped_off_at,
    delivery_status = excluded.delivery_status,
    delivery_timing = excluded.delivery_timing,
    notes = excluded.notes,
    updated_at = excluded.updated_at;
  v_logistics_row_created := true;

  INSERT INTO public.dropoff_scan_logs (order_id, shipment_id, order_code, scan_status, message, dropoff_location, dropoff_store_id, dropoff_location_name, confirmation_source)
  VALUES (v_order.id, v_shipment.id, v_expected_code, 'confirmed', 'Parcel received from seller by public QR scan', v_store.name, v_store.id, v_store.name, 'public_store_pin_scan');

  RETURN public.get_public_dropoff_scan(p_order_id, p_token, p_code)
    || jsonb_build_object(
      'confirmedNow', true,
      'storeId', v_store.id,
      'storeName', v_store.name,
      'pickupZone', v_store.pickup_zone,
      'dropoffLocationName', v_store.name,
      'deliveryTiming', v_delivery_timing,
      'logisticsRowCreated', v_logistics_row_created
    );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_public_dropoff_scan(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_public_dropoff_scan(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
