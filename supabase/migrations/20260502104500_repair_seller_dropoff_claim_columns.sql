-- Repair migration: production briefly missed these columns even after the
-- original seller drop-off claim migration was expected to run.
alter table if exists public.shipments
  add column if not exists seller_claimed_dropoff boolean not null default false,
  add column if not exists seller_dropoff_claimed_at timestamptz;

update public.shipments
set seller_claimed_dropoff = false
where seller_claimed_dropoff is null;

alter table if exists public.shipments
  alter column seller_claimed_dropoff set default false,
  alter column seller_claimed_dropoff set not null;

create index if not exists shipments_seller_claimed_dropoff_idx
  on public.shipments (seller_claimed_dropoff)
  where seller_claimed_dropoff = true;
