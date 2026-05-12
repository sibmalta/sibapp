CREATE OR REPLACE FUNCTION public.normalize_myconvenience_store_pin(
  p_store_pin TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(coalesce(p_store_pin, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
$$;

CREATE OR REPLACE FUNCTION public.upsert_myconvenience_store(
  p_store_code TEXT,
  p_name TEXT,
  p_address TEXT,
  p_locality TEXT,
  p_pickup_zone TEXT DEFAULT NULL,
  p_active BOOLEAN DEFAULT true,
  p_phone TEXT DEFAULT NULL,
  p_opening_hours TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
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
  v_pin TEXT := public.normalize_myconvenience_store_pin(p_store_pin);
  v_pin_hash TEXT := CASE
    WHEN nullif(v_pin, '') IS NULL THEN NULL
    ELSE extensions.crypt(v_pin, extensions.gen_salt('bf'))
  END;
BEGIN
  IF coalesce(p_active, true) AND nullif(v_pin, '') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.myconvenience_stores
      WHERE active = true
        AND store_code <> v_store_code
        AND store_pin_hash IS NOT NULL
        AND extensions.crypt(v_pin, store_pin_hash) = store_pin_hash
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
    phone,
    opening_hours,
    notes,
    store_pin_hash
  )
  VALUES (
    v_store_code,
    btrim(p_name),
    btrim(p_address),
    btrim(p_locality),
    nullif(btrim(coalesce(p_pickup_zone, '')), ''),
    coalesce(p_active, true),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_opening_hours, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_pin_hash
  )
  ON CONFLICT (store_code) DO UPDATE
  SET
    name = excluded.name,
    address = excluded.address,
    locality = excluded.locality,
    pickup_zone = excluded.pickup_zone,
    active = excluded.active,
    phone = excluded.phone,
    opening_hours = excluded.opening_hours,
    notes = excluded.notes,
    store_pin_hash = coalesce(v_pin_hash, public.myconvenience_stores.store_pin_hash),
    updated_at = now()
  RETURNING * INTO v_store;

  RETURN v_store;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_myconvenience_store(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_myconvenience_store(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT) TO service_role;

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
  v_pin TEXT := public.normalize_myconvenience_store_pin(p_store_pin);
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
      'pickup_zone', v_store.pickup_zone
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.identify_public_dropoff_store_by_pin(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.identify_public_dropoff_store_by_pin(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_myconvenience_store_diagnostics()
RETURNS TABLE (
  store_code TEXT,
  name TEXT,
  locality TEXT,
  pickup_zone TEXT,
  active BOOLEAN,
  has_pin_hash BOOLEAN,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    s.store_code,
    s.name,
    s.locality,
    s.pickup_zone,
    coalesce(s.active, false),
    s.store_pin_hash IS NOT NULL,
    s.updated_at
  FROM public.myconvenience_stores s
  ORDER BY coalesce(s.active, false) DESC, s.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_myconvenience_store_diagnostics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_myconvenience_store_diagnostics() TO authenticated;
