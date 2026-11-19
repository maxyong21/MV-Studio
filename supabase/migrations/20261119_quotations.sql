-- Quotations: written in the admin under "Quotations" and shown to a client through a
-- temporary link at /quotation. See docs/QUOTATIONS.md. Safe to run more than once.
--
-- Visitors never read these tables. A client's browser calls public.shared_quotation
-- with the secret from the link, and that function decides what may be shown.
begin;

-- Handwritten signatures of the people who may sign a quotation. Kept in the database,
-- not in public file storage, so a signature is only ever shown on a quotation.
create table if not exists public.quotation_signatures (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  role text not null default '' check (length(role) <= 120),
  image text not null check (length(image) <= 300000 and image ~ '^data:image/(png|jpeg);base64,[A-Za-z0-9+/=]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per Malaysia calendar day, so a quotation ID is never given out twice, even after a delete.
create table if not exists public.quotation_counters (
  day date primary key,
  last integer not null check (last > 0)
);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  enquiry_id uuid references public.enquiries(id) on delete set null,
  client_name text not null check (length(trim(client_name)) between 2 and 120),
  company_name text not null default '' check (length(company_name) <= 160),
  client_email text not null default '' check (length(client_email) <= 254),
  client_phone text not null default '' check (length(client_phone) <= 40),
  issued_on date not null default ((now() at time zone 'Asia/Kuala_Lumpur')::date),
  valid_until date not null,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 40),
  extra_requirements text not null default '' check (length(extra_requirements) <= 3000),
  terms jsonb not null default '[]'::jsonb check (jsonb_typeof(terms) = 'array'),
  terms_version text not null default '' check (length(terms_version) <= 40),
  signature_id uuid references public.quotation_signatures(id) on delete set null,
  signer jsonb not null default '{}'::jsonb check (jsonb_typeof(signer) = 'object' and length(signer::text) <= 310000),
  studio jsonb not null default '{}'::jsonb check (jsonb_typeof(studio) = 'object' and length(studio::text) <= 4000),
  status text not null default 'draft' check (status in ('draft','shared','accepted','declined','revoked')),
  share_token text unique check (share_token is null or share_token ~ '^[A-Za-z0-9_-]{32,128}$'),
  shared_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotations_dates check (valid_until >= issued_on and valid_until <= issued_on + 90),
  -- A draft or revoked quotation has no working link.
  constraint quotations_link check (status not in ('draft','revoked') or share_token is null)
);
create index if not exists quotations_created_idx on public.quotations(created_at desc);
create index if not exists quotations_enquiry_idx on public.quotations(enquiry_id);

-- Gives each new quotation its ID (MVQ-20261119-001) and keeps the ID and creation time fixed afterwards.
create or replace function public.quotation_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Kuala_Lumpur')::date;
  next_number integer;
begin
  if tg_op = 'INSERT' then
    insert into public.quotation_counters as c (day, last) values (today, 1)
    on conflict (day) do update set last = c.last + 1
    returning last into next_number;
    new.quote_number := 'MVQ-' || to_char(today, 'YYYYMMDD') || '-' || lpad(next_number::text, 3, '0');
  else
    new.quote_number := old.quote_number;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists quotation_before_write on public.quotations;
create trigger quotation_before_write before insert or update on public.quotations
for each row execute function public.quotation_before_write();
revoke all on function public.quotation_before_write() from public, anon, authenticated;

create or replace function public.quotation_signature_touch()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists quotation_signature_touch on public.quotation_signatures;
create trigger quotation_signature_touch before update on public.quotation_signatures
for each row execute function public.quotation_signature_touch();

alter table public.quotations enable row level security;
alter table public.quotation_signatures enable row level security;
alter table public.quotation_counters enable row level security;
drop policy if exists "Admins manage quotations" on public.quotations;
create policy "Admins manage quotations" on public.quotations
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "Admins manage quotation signatures" on public.quotation_signatures;
create policy "Admins manage quotation signatures" on public.quotation_signatures
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.quotations, public.quotation_signatures, public.quotation_counters from anon, authenticated;
grant select, insert, update, delete on public.quotations, public.quotation_signatures to authenticated;
grant all on public.quotations, public.quotation_signatures, public.quotation_counters to service_role;

-- What a client's browser may see for the secret in a share link.
--   not_found: no such link, or the quotation is a draft, declined, or its link was revoked.
--   expired:   the valid-until day has passed in Malaysia. Only the ID and the date are returned.
--   active:    the quotation, without private fields (internal ids, the link secret, who created it).
create or replace function public.shared_quotation(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  q public.quotations;
  today date := (now() at time zone 'Asia/Kuala_Lumpur')::date;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{32,128}$' then
    return jsonb_build_object('state', 'not_found');
  end if;
  select * into q from public.quotations where share_token = p_token;
  if not found or q.status not in ('shared', 'accepted') then
    return jsonb_build_object('state', 'not_found');
  end if;
  if today > q.valid_until then
    return jsonb_build_object('state', 'expired', 'quote_number', q.quote_number, 'valid_until', q.valid_until, 'studio', q.studio);
  end if;
  return jsonb_build_object('state', 'active', 'quotation', jsonb_build_object(
    'quote_number', q.quote_number, 'client_name', q.client_name, 'company_name', q.company_name,
    'client_email', q.client_email, 'client_phone', q.client_phone, 'issued_on', q.issued_on,
    'valid_until', q.valid_until, 'items', q.items, 'extra_requirements', q.extra_requirements,
    'terms', q.terms, 'terms_version', q.terms_version, 'signer', q.signer, 'studio', q.studio, 'status', q.status));
end;
$$;
revoke all on function public.shared_quotation(text) from public;
grant execute on function public.shared_quotation(text) to anon, authenticated, service_role;
commit;
