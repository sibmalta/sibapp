alter table if exists public.orders
  add column if not exists seller_claimed_dropoff boolean not null default false,
  add column if not exists seller_dropoff_claimed_at timestamptz;

update public.orders
set seller_claimed_dropoff = false
where seller_claimed_dropoff is null;

alter table if exists public.orders
  alter column seller_claimed_dropoff set default false,
  alter column seller_claimed_dropoff set not null;

create index if not exists orders_seller_claimed_dropoff_idx
  on public.orders (seller_claimed_dropoff)
  where seller_claimed_dropoff = true;

drop policy if exists "orders_seller_dropoff_claim_update" on public.orders;
create policy "orders_seller_dropoff_claim_update" on public.orders
  for update to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);
