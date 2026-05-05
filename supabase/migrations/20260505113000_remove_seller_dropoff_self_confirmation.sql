alter table if exists public.orders
  drop column if exists seller_claimed_dropoff,
  drop column if exists seller_dropoff_claimed_at;

alter table if exists public.shipments
  drop column if exists seller_claimed_dropoff,
  drop column if exists seller_dropoff_claimed_at;
