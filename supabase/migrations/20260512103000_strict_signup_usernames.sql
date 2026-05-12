-- Stop silently mutating signup usernames with four-character suffixes.
-- New signups either keep the normalized username they entered or fail on conflict.

CREATE OR REPLACE FUNCTION public.normalize_username(p_username text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(btrim(coalesce(p_username, '')), '^@+', ''),
      '\s+',
      '',
      'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.normalize_username(p_username) ~ '^[a-z0-9._]{2,24}$'
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE lower(username) = public.normalize_username(p_username)
    );
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    GROUP BY lower(username)
    HAVING count(*) > 1
  ) THEN
    RAISE WARNING 'Skipped profiles_username_lower_unique because case-insensitive duplicate usernames exist.';
  ELSE
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique ON public.profiles (lower(username))';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _raw                text;
  _username           text;
  _explicit_username  boolean;
BEGIN
  _raw := NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), '');
  _explicit_username := _raw IS NOT NULL;

  IF _explicit_username THEN
    _username := public.normalize_username(_raw);

    IF _username !~ '^[a-z0-9._]{2,24}$' THEN
      RAISE EXCEPTION 'invalid_username';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE lower(username) = lower(_username)
        AND id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'username_already_taken';
    END IF;
  ELSE
    _username := public.normalize_username(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1));

    IF _username !~ '^[a-z0-9._]{2,24}$' THEN
      _username := 'user_' || LEFT(REPLACE(NEW.id::text, '-', ''), 12);
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id, username, name, email, bio, phone, avatar,
    location, is_shop, is_admin, accepted_terms_at, is_over_18
  ) VALUES (
    NEW.id,
    _username,
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
    COALESCE((NEW.raw_user_meta_data->>'isShop')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'isAdmin')::boolean, false),
    CASE WHEN (NEW.raw_user_meta_data->>'accepted_terms')::boolean = true
         THEN now() ELSE NULL END,
    COALESCE((NEW.raw_user_meta_data->>'is_over_18')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    IF _explicit_username THEN
      RAISE EXCEPTION 'username_already_taken';
    END IF;

    RAISE WARNING 'handle_new_user username collision for generated username on %: %', NEW.id, SQLERRM;
    RETURN NEW;
  WHEN OTHERS THEN
    IF SQLERRM IN ('username_already_taken', 'invalid_username') THEN
      RAISE;
    END IF;

    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
