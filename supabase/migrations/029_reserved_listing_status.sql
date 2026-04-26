-- Accepted offers reserve a listing before checkout so it disappears from
-- browse and cannot receive competing offers/checkouts.

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_status_check;

ALTER TABLE public.listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('active','reserved','sold','deleted','hidden'));

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
        and status in ('active', 'reserved');
    end if;

    if new.bundle_listing_ids is not null then
      update public.listings
      set status = 'sold',
          updated_at = now()
      where id = any(new.bundle_listing_ids)
        and status in ('active', 'reserved');
    end if;
  end if;

  return new;
end;
$$;
