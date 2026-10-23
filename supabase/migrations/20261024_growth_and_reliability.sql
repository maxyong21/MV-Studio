-- Existing installations: run this entire migration in Supabase SQL Editor.
begin;

alter table public.services add column if not exists scope text not null default '';
alter table public.services add column if not exists revisions text not null default '';
alter table public.services add column if not exists third_party_costs text not null default '';
alter table public.services add column if not exists maintenance_terms text not null default '';
alter table public.services add column if not exists support_terms text not null default '';
alter table public.services add column if not exists payment_terms text not null default '';

alter table public.projects add column if not exists challenge text not null default '';
alter table public.projects add column if not exists solution text not null default '';
alter table public.projects add column if not exists outcome text not null default '';
alter table public.projects add column if not exists image_variants jsonb not null default '[]'::jsonb;
alter table public.team_members add column if not exists image_variants jsonb not null default '[]'::jsonb;
alter table public.promotions add column if not exists image_variants jsonb not null default '[]'::jsonb;

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  company_name text not null default '',
  role text not null default '',
  quote text not null check (length(trim(quote)) between 10 and 2000),
  project_url text not null default '',
  permission_confirmed boolean not null default false,
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint testimonial_publication_permission check (not active or permission_confirmed)
);
alter table public.testimonials enable row level security;
drop policy if exists "Public can read approved testimonials" on public.testimonials;
create policy "Public can read approved testimonials" on public.testimonials
for select to anon, authenticated using ((active and permission_confirmed) or (select public.is_admin()));
drop policy if exists "Admins manage testimonials" on public.testimonials;
create policy "Admins manage testimonials" on public.testimonials
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.testimonials to authenticated;

alter table public.enquiries add column if not exists request_id uuid;
alter table public.enquiries add column if not exists request_hash text not null default '';
create unique index if not exists enquiries_request_id_unique on public.enquiries(request_id);
grant usage on schema public to service_role;
grant select on public.admin_users, public.feature_options to service_role;
grant select, insert, update on public.enquiries to service_role;

-- Count the first accepted submission once, including concurrent submissions.
create or replace function public.consume_enquiry_rate_limit(p_key text, p_max integer default 5, p_window_seconds integer default 3600)
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_window timestamptz; current_count integer;
begin
  insert into public.enquiry_rate_limits(key_hash,window_started_at,submission_count)
  values (p_key,now(),0) on conflict (key_hash) do nothing;
  select window_started_at,submission_count into current_window,current_count
  from public.enquiry_rate_limits where key_hash=p_key for update;
  if current_window < now() - make_interval(secs => p_window_seconds) then
    update public.enquiry_rate_limits set window_started_at=now(),submission_count=1 where key_hash=p_key;
    return true;
  end if;
  if current_count >= p_max then return false; end if;
  update public.enquiry_rate_limits set submission_count=submission_count+1 where key_hash=p_key;
  return true;
end;
$$;
revoke all on function public.consume_enquiry_rate_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_enquiry_rate_limit(text,integer,integer) to service_role;

commit;
