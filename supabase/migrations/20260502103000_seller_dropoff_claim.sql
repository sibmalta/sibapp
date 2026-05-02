alter table if exists public.shipments
  add column if not exists seller_claimed_dropoff boolean not null default false,
  add column if not exists seller_dropoff_claimed_at timestamptz;

create index if not exists shipments_seller_claimed_dropoff_idx
  on public.shipments (seller_claimed_dropoff)
  where seller_claimed_dropoff = true;
