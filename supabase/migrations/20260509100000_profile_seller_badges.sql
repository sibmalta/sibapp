-- Persist admin-managed seller badges on profiles.
-- Badges are intentionally admin-controlled; normal users must not be able
-- to grant themselves trusted/verified seller labels.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seller_badges jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trust_tags jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.valid_seller_badges(value jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(jsonb_typeof(value) = 'array', false)
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(value) AS badge(id)
      WHERE badge.id NOT IN ('trusted_seller', 'verified_vintage_seller', 'verified_seller')
    );
$$;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_seller_badges_valid;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_seller_badges_valid
  CHECK (public.valid_seller_badges(seller_badges));

UPDATE public.profiles
SET seller_badges = (
  SELECT COALESCE(jsonb_agg(DISTINCT normalized_badge), '[]'::jsonb)
  FROM (
    SELECT CASE value
      WHEN 'verified_vintage' THEN 'verified_vintage_seller'
      WHEN 'verified' THEN 'verified_seller'
      ELSE value
    END AS normalized_badge
    FROM jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(seller_badges) = 'array' THEN seller_badges
        ELSE '[]'::jsonb
      END
    )
    UNION ALL
    SELECT 'trusted_seller'
    WHERE is_trusted_seller IS TRUE
  ) badges
  WHERE normalized_badge IN ('trusted_seller', 'verified_vintage_seller', 'verified_seller')
);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.prevent_profile_badge_self_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.seller_badges IS DISTINCT FROM OLD.seller_badges
    OR NEW.trust_tags IS DISTINCT FROM OLD.trust_tags
    OR NEW.is_trusted_seller IS DISTINCT FROM OLD.is_trusted_seller THEN
    RAISE EXCEPTION 'Only admins can update seller badges'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_badge_self_grant ON public.profiles;
CREATE TRIGGER prevent_profile_badge_self_grant
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_badge_self_grant();
