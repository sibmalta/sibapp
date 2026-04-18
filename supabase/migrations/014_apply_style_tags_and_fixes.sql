-- ============================================================
-- Migration 014: Apply style_tags columns + missing fixes
-- Combines 013_style_tags.sql with additional schema fixes:
--   1. Add style_tags and manual_style_tags columns
--   2. Add color column (used in code but never migrated)
--   3. Fix status CHECK constraint to include 'hidden'
--   4. Add GIN index on style_tags for filtering
--   5. Add is_admin() helper function for RLS
--   6. Update listings_owner_update policy to allow admin edits
-- ============================================================

-- 1. Add missing columns (idempotent)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS style_tags TEXT[] DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS manual_style_tags TEXT[] DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS color TEXT;

-- 2. GIN index for style tag filtering
CREATE INDEX IF NOT EXISTS idx_listings_style_tags ON listings USING GIN (style_tags);

-- 3. Fix status CHECK to include 'hidden'
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('active','sold','deleted','hidden'));

-- 4. Admin helper function (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 5. Update owner update policy to also allow admins
DROP POLICY IF EXISTS "listings_owner_update" ON listings;
CREATE POLICY "listings_owner_update" ON listings
  FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id OR public.is_admin());
