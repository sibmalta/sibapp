-- Browse page performance: common active-listing filters and sorts.
CREATE INDEX IF NOT EXISTS idx_listings_status
  ON public.listings (status);

CREATE INDEX IF NOT EXISTS idx_listings_active_created_at
  ON public.listings (created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_listings_active_category_created_at
  ON public.listings (category, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_listings_active_subcategory_created_at
  ON public.listings (subcategory, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_listings_active_category_subcategory_price
  ON public.listings (category, subcategory, price)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_listings_active_price
  ON public.listings (price)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_listings_active_size
  ON public.listings (size)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_listings_active_brand_lower
  ON public.listings (lower(brand))
  WHERE status = 'active' AND brand IS NOT NULL;
