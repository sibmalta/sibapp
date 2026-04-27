-- Preserve explicit seller choices while restoring sensible locker defaults
-- for listings that existed before locker eligibility was captured.

ALTER TABLE public.listings
  ALTER COLUMN locker_eligible DROP NOT NULL,
  ALTER COLUMN locker_eligible DROP DEFAULT;

UPDATE public.listings
SET locker_eligible = true
WHERE locker_eligible IS NULL
  AND (
    category IN ('fashion', 'books', 'women', 'men', 'shoes', 'accessories', 'vintage')
    OR (category = 'home' AND COALESCE(subcategory, '') IN ('decor', 'kitchenware', 'bedding', 'bathroom', 'lighting', 'storage', 'other_home'))
    OR (category = 'toys' AND COALESCE(subcategory, '') IN ('action_figures', 'board_games', 'lego', 'educational', 'plush', 'collectibles'))
    OR (category = 'kids' AND COALESCE(subcategory, '') IN ('baby_clothing', 'kids_clothing', 'maternity'))
  );

-- The previous migration briefly defaulted existing rows to false. Because
-- sellers could not explicitly choose locker eligibility before that release,
-- safely restore likely locker-fit legacy rows created before this feature.
UPDATE public.listings
SET locker_eligible = true
WHERE locker_eligible IS false
  AND COALESCE(created_at, TIMESTAMPTZ '1970-01-01') < TIMESTAMPTZ '2026-04-27 00:00:00+00'
  AND (
    category IN ('fashion', 'books', 'women', 'men', 'shoes', 'accessories', 'vintage')
    OR (category = 'home' AND COALESCE(subcategory, '') IN ('decor', 'kitchenware', 'bedding', 'bathroom', 'lighting', 'storage', 'other_home'))
    OR (category = 'toys' AND COALESCE(subcategory, '') IN ('action_figures', 'board_games', 'lego', 'educational', 'plush', 'collectibles'))
    OR (category = 'kids' AND COALESCE(subcategory, '') IN ('baby_clothing', 'kids_clothing', 'maternity'))
  );
