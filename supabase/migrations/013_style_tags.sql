-- ============================================================
-- Migration 013: Add style_tags + manual_style_tags to listings
-- Also adds admin update policy so admins can edit any listing.
-- ============================================================

-- Add columns (idempotent)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS style_tags TEXT[] DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS manual_style_tags TEXT[] DEFAULT '{}';

-- Index for filtering by style tag
CREATE INDEX IF NOT EXISTS idx_listings_style_tags ON listings USING GIN (style_tags);

-- Admin update policy: users with is_admin=true on profiles can update any listing.
-- Uses a SECURITY DEFINER helper to avoid querying listings from a listings policy.
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

-- Drop and recreate the owner update policy to also allow admins
DROP POLICY IF EXISTS "listings_owner_update" ON listings;
CREATE POLICY "listings_owner_update" ON listings
  FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id OR public.is_admin());
