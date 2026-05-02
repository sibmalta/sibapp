-- Track who bought a listing and when it left active inventory.
alter table public.listings
  add column if not exists sold_at timestamptz,
  add column if not exists buyer_id uuid references auth.users(id) on delete set null;

create index if not exists idx_listings_active_inventory_created_at
  on public.listings (status, created_at desc)
  where status in ('active', 'available', 'published', 'approved', 'live');

create index if not exists idx_listings_sold_at
  on public.listings (sold_at desc)
  where sold_at is not null;
