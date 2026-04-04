-- ============================================================
-- Migration 001: profiles + listings + listing_likes
-- Includes updated_at triggers, collision-safe signup trigger
-- with deterministic loop + 12-char UUID fallback.
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  name          TEXT,
  email         TEXT,
  bio           TEXT,
  phone         TEXT,
  avatar        TEXT,
  location      TEXT DEFAULT 'Malta',
  is_shop       BOOLEAN DEFAULT false,
  is_admin      BOOLEAN DEFAULT false,
  rating        NUMERIC(3,2) DEFAULT 5.0,
  review_count  INTEGER DEFAULT 0,
  sales         INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','banned')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_public_read"   ON profiles;
DROP POLICY IF EXISTS "profiles_owner_insert"  ON profiles;
DROP POLICY IF EXISTS "profiles_owner_update"  ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update"  ON profiles;

-- Anyone can read profiles (marketplace is public)
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT USING (true);

-- Users can insert their own profile row (fallback if trigger
-- fails, or for manual profile creation from the client)
CREATE POLICY "profiles_owner_insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_owner_update" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── updated_at helper ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Trigger: auto-create profile on signup ───────────────────
-- SECURITY DEFINER bypasses RLS.
-- Uses a LOOP with deterministic suffixes derived from the user
-- UUID to safely handle UNIQUE(username) collisions.
-- Outer EXCEPTION WHEN OTHERS ensures signup is never blocked.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $
DECLARE
  _raw       TEXT;
  _base      TEXT;
  _attempt   TEXT;
  _suffix    TEXT;
  _i         INTEGER := 0;
BEGIN
  -- 1. Prefer explicit metadata username; fall back to email local-part
  _raw := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    SPLIT_PART(COALESCE(NEW.email, ''), '@', 1)
  );

  -- 2. Sanitise: lowercase, keep only [a-z0-9_-], min 2 chars
  _base := LOWER(REGEXP_REPLACE(_raw, '[^a-zA-Z0-9_-]', '', 'g'));
  IF LENGTH(_base) < 2 THEN
    _base := 'user';
  END IF;

  -- 3. Truncate to 24 chars so suffixes always fit
  _base := LEFT(_base, 24);

  -- 4. Loop: try bare username, then deterministic suffixes
  LOOP
    IF _i = 0 THEN
      _attempt := _base;
    ELSIF _i <= 5 THEN
      -- 4 hex chars from MD5(uuid + iteration) — deterministic, no random()
      _suffix := LEFT(MD5(NEW.id::text || _i::text), 4);
      _attempt := _base || '_' || _suffix;
    ELSE
      -- Final fallback: 12-char UUID prefix (virtually unique)
      _attempt := LEFT(_base, 20) || '_' || LEFT(REPLACE(NEW.id::text, '-', ''), 12);
    END IF;

    BEGIN
      INSERT INTO public.profiles (
        id, username, name, email, bio, phone, avatar,
        location, is_shop, is_admin
      ) VALUES (
        NEW.id,
        _attempt,
        COALESCE(
          NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
          NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
          SPLIT_PART(NEW.email, '@', 1)
        ),
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'bio', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(
          NEW.raw_user_meta_data->>'avatar',
          NEW.raw_user_meta_data->>'avatar_url'
        ),
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'location'), ''), 'Malta'),
        COALESCE((NEW.raw_user_meta_data->>'isShop')::boolean,  false),
        COALESCE((NEW.raw_user_meta_data->>'isAdmin')::boolean, false)
      );
      -- Success — exit loop
      RETURN NEW;
    EXCEPTION
      WHEN unique_violation THEN
        IF SQLERRM LIKE '%profiles_username_key%' THEN
          _i := _i + 1;
          IF _i > 6 THEN
            -- Exhausted all attempts (near-impossible). Signup still succeeds;
            -- profile can be created later via the owner_insert RLS policy.
            RAISE WARNING 'handle_new_user: exhausted username attempts for %', NEW.id;
            RETURN NEW;
          END IF;
          CONTINUE;
        ELSE
          -- PK collision (duplicate trigger fire) — silently exit
          RETURN NEW;
        END IF;
    END;
  END LOOP;

EXCEPTION
  WHEN OTHERS THEN
    -- Never block signup under any circumstances
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── listings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL,
  category      TEXT,
  gender        TEXT,
  size          TEXT,
  brand         TEXT,
  condition     TEXT CHECK (condition IN ('new','likeNew','good','fair')),
  images        TEXT[] DEFAULT '{}',
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','sold','deleted')),
  likes_count   INTEGER DEFAULT 0,
  views_count   INTEGER DEFAULT 0,
  boosted       BOOLEAN DEFAULT false,
  flagged       BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_seller     ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status     ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category   ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_boosted    ON listings(boosted);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listings_public_read"    ON listings;
DROP POLICY IF EXISTS "listings_owner_insert"   ON listings;
DROP POLICY IF EXISTS "listings_owner_update"   ON listings;
DROP POLICY IF EXISTS "listings_owner_delete"   ON listings;

-- Public read: active listings visible to everyone
CREATE POLICY "listings_public_read" ON listings
  FOR SELECT USING (true);

-- Authenticated sellers can create listings
CREATE POLICY "listings_owner_insert" ON listings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can update their own listings
CREATE POLICY "listings_owner_update" ON listings
  FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id);

-- Sellers can delete their own listings
CREATE POLICY "listings_owner_delete" ON listings
  FOR DELETE TO authenticated
  USING (auth.uid() = seller_id);

DROP TRIGGER IF EXISTS listings_set_updated_at ON listings;
CREATE TRIGGER listings_set_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── listing_likes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_likes (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id  UUID NOT NULL REFERENCES listings(id)   ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_likes_user    ON listing_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_likes_listing ON listing_likes(listing_id);

ALTER TABLE listing_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_public_read"   ON listing_likes;
DROP POLICY IF EXISTS "likes_owner_write"   ON listing_likes;
DROP POLICY IF EXISTS "likes_owner_delete"  ON listing_likes;

CREATE POLICY "likes_public_read" ON listing_likes
  FOR SELECT USING (true);

CREATE POLICY "likes_owner_write" ON listing_likes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "likes_owner_delete" ON listing_likes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
