-- Google Business Profile setups: the business details a customer sends through
-- /business-profile-form, tracked in the admin under "Profile setups". Repeatable.
--
-- Visitors never read or write this table directly. The submit-profile-request
-- function saves rows with the service role; administrators manage them.
begin;
create table if not exists public.profile_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_hash text not null check (length(request_hash) between 16 and 128),
  contact_name text not null check (length(trim(contact_name)) between 2 and 120),
  contact_phone text not null check (length(trim(contact_phone)) between 7 and 40),
  business_name text not null check (length(trim(business_name)) between 2 and 160),
  business_category text not null check (length(trim(business_category)) between 2 and 120),
  location_type text not null check (location_type in ('address','service_area')),
  address text not null default '' check (length(address) <= 500),
  service_areas text not null default '' check (length(service_areas) <= 500),
  business_phone text not null check (length(trim(business_phone)) between 7 and 40),
  opening_hours text not null check (length(trim(opening_hours)) between 5 and 1000),
  owner_email text not null check (length(owner_email) between 6 and 254 and owner_email = lower(owner_email)),
  description text not null default '' check (length(description) <= 750),
  services text not null default '' check (length(services) <= 2000),
  website_url text not null default '' check (length(website_url) <= 310),
  social_links text not null default '' check (length(social_links) <= 500),
  notes text not null default '' check (length(notes) <= 1500),
  status text not null default 'new' check (status in ('new','in_progress','waiting_verification','done','cancelled')),
  admin_notes text not null default '' check (length(admin_notes) <= 3000),
  notification_status text not null default 'pending' check (notification_status in ('pending','sent','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_requests_location check (
    (location_type = 'address' and length(trim(address)) >= 10) or
    (location_type = 'service_area' and length(trim(service_areas)) >= 2)
  )
);
create index if not exists profile_requests_created_idx on public.profile_requests(created_at desc);
create index if not exists profile_requests_status_idx on public.profile_requests(status);

alter table public.profile_requests enable row level security;
drop policy if exists "Admins manage profile requests" on public.profile_requests;
create policy "Admins manage profile requests" on public.profile_requests
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.profile_requests from anon, authenticated;
grant select, update, delete on public.profile_requests to authenticated;
grant all on public.profile_requests to service_role;

create or replace function public.profile_request_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists profile_request_updated_at on public.profile_requests;
create trigger profile_request_updated_at before update on public.profile_requests
for each row execute function public.profile_request_touch_updated_at();
commit;
