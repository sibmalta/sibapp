alter table public.profiles
  add column if not exists is_trusted_seller boolean not null default false;

comment on column public.profiles.is_trusted_seller is
  'Manual profile flag used to display the Trusted Seller badge.';
