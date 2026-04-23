-- Ensure public browse never shows purchased listings because listing status is
-- updated inside the database when a paid order is created.

create or replace function public.mark_paid_order_listings_sold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('paid', 'shipped', 'delivered', 'confirmed', 'completed') then
    if new.listing_id is not null then
      update public.listings
      set status = 'sold',
          updated_at = now()
      where id = new.listing_id
        and status = 'active';
    end if;

    if new.bundle_listing_ids is not null then
      update public.listings
      set status = 'sold',
          updated_at = now()
      where id = any(new.bundle_listing_ids)
        and status = 'active';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_mark_paid_order_listings_sold on public.orders;

create trigger trg_mark_paid_order_listings_sold
after insert or update of status on public.orders
for each row
execute function public.mark_paid_order_listings_sold();

-- Repair any existing live rows where a paid order was created before this
-- trigger existed but the listing stayed active.
update public.listings l
set status = 'sold',
    updated_at = now()
where status = 'active'
  and exists (
    select 1
    from public.orders o
    where o.listing_id = l.id
      and o.status in ('paid', 'shipped', 'delivered', 'confirmed', 'completed')
  );

update public.listings l
set status = 'sold',
    updated_at = now()
where status = 'active'
  and exists (
    select 1
    from public.orders o
    where o.bundle_listing_ids is not null
      and l.id = any(o.bundle_listing_ids)
      and o.status in ('paid', 'shipped', 'delivered', 'confirmed', 'completed')
  );
