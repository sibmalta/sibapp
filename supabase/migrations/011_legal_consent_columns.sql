-- ============================================================
-- Migration 011: Add legal consent columns to profiles
-- accepted_terms_at: timestamp when user agreed to T&C + Privacy
-- is_over_18: boolean age confirmation
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_over_18 BOOLEAN DEFAULT false;

-- Update the signup trigger to store consent metadata
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
  _raw := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    SPLIT_PART(COALESCE(NEW.email, ''), '@', 1)
  );

  _base := LOWER(REGEXP_REPLACE(_raw, '[^a-zA-Z0-9_-]', '', 'g'));
  IF LENGTH(_base) < 2 THEN
    _base := 'user';
  END IF;

  _base := LEFT(_base, 24);

  LOOP
    IF _i = 0 THEN
      _attempt := _base;
    ELSIF _i <= 5 THEN
      _suffix := LEFT(MD5(NEW.id::text || _i::text), 4);
      _attempt := _base || '_' || _suffix;
    ELSE
      _attempt := LEFT(_base, 20) || '_' || LEFT(REPLACE(NEW.id::text, '-', ''), 12);
    END IF;

    BEGIN
      INSERT INTO public.profiles (
        id, username, name, email, bio, phone, avatar,
        location, is_shop, is_admin, accepted_terms_at, is_over_18
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
        COALESCE((NEW.raw_user_meta_data->>'isAdmin')::boolean, false),
        CASE WHEN (NEW.raw_user_meta_data->>'accepted_terms')::boolean = true
             THEN now() ELSE NULL END,
        COALESCE((NEW.raw_user_meta_data->>'is_over_18')::boolean, false)
      );
      RETURN NEW;
    EXCEPTION
      WHEN unique_violation THEN
        IF SQLERRM LIKE '%profiles_username_key%' THEN
          _i := _i + 1;
          IF _i > 6 THEN
            RAISE WARNING 'handle_new_user: exhausted username attempts for %', NEW.id;
            RETURN NEW;
          END IF;
          CONTINUE;
        ELSE
          RETURN NEW;
        END IF;
    END;
  END LOOP;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$;
