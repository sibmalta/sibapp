-- Ensure paid orders remove inventory from the marketplace at the database layer.
-- This backs up both frontend checkout success and Stripe webhook handling.

create or replace function public.mark_paid_order_listings_sold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  paid_statuses text[] := array[
    'paid',
    'payment_received_seller_payout_pending',
    'shipped',
    'delivered',
    'confirmed',
    'completed'
  ];
  listing_ids uuid[];
  sold_time timestamptz;
begin
  if not (
    coalesce(new.payment_status, '') = 'paid'
    or coalesce(new.status, '') = any(paid_statuses)
  ) then
    return new;
  end if;

  sold_time := coalesce(new.paid_at, new.created_at, now());

  listing_ids := array[]::uuid[];

  if new.listing_id is not null then
    listing_ids := array_append(listing_ids, new.listing_id);
  end if;

  if new.bundle_listing_ids is not null then
    listing_ids := listing_ids || new.bundle_listing_ids;
  end if;

  listing_ids := array(select distinct unnest(listing_ids));

  if array_length(listing_ids, 1) is null then
    return new;
  end if;

  update public.listings
  set
    status = 'sold',
    sold_at = coalesce(public.listings.sold_at, sold_time),
    buyer_id = coalesce(public.listings.buyer_id, new.buyer_id),
    updated_at = now()
  where id = any(listing_ids)
    and coalesce(status, '') <> 'sold';

  return new;
end;
$$;

drop trigger if exists trg_mark_paid_order_listings_sold on public.orders;

create trigger trg_mark_paid_order_listings_sold
after insert or update of status, payment_status, listing_id, bundle_listing_ids, buyer_id, paid_at
on public.orders
for each row
execute function public.mark_paid_order_listings_sold();

-- Backfill any already-paid orders whose listings are still visible.
update public.listings l
set
  status = 'sold',
  sold_at = coalesce(l.sold_at, o.paid_at, o.created_at, now()),
  buyer_id = coalesce(l.buyer_id, o.buyer_id),
  updated_at = now()
from public.orders o
where l.id = o.listing_id
  and (
    coalesce(o.payment_status, '') = 'paid'
    or coalesce(o.status, '') in (
      'paid',
      'payment_received_seller_payout_pending',
      'shipped',
      'delivered',
      'confirmed',
      'completed'
    )
  )
  and coalesce(l.status, '') <> 'sold';

update public.listings l
set
  status = 'sold',
  sold_at = coalesce(l.sold_at, o.paid_at, o.created_at, now()),
  buyer_id = coalesce(l.buyer_id, o.buyer_id),
  updated_at = now()
from public.orders o
where o.bundle_listing_ids is not null
  and l.id = any(o.bundle_listing_ids)
  and (
    coalesce(o.payment_status, '') = 'paid'
    or coalesce(o.status, '') in (
      'paid',
      'payment_received_seller_payout_pending',
      'shipped',
      'delivered',
      'confirmed',
      'completed'
    )
  )
  and coalesce(l.status, '') <> 'sold';
