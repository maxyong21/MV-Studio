-- Sales workspace: ownership, follow-up, status audit trail, and manual quotes.
begin;

alter table public.enquiries
  add column if not exists assigned_to text not null default '',
  add column if not exists internal_notes text not null default '',
  add column if not exists follow_up_at timestamptz;

create table if not exists public.enquiry_status_history (
  id bigint generated always as identity primary key,
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid default auth.uid()
);
create index if not exists enquiry_status_history_enquiry_idx
  on public.enquiry_status_history(enquiry_id, changed_at desc);

create or replace function public.record_enquiry_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.enquiry_status_history(enquiry_id,old_status,new_status,changed_by)
    values(new.id,null,new.status,auth.uid());
  elsif old.status is distinct from new.status then
    insert into public.enquiry_status_history(enquiry_id,old_status,new_status,changed_by)
    values(new.id,old.status,new.status,auth.uid());
  end if;
  return new;
end;
$$;
drop trigger if exists enquiries_status_history on public.enquiries;
create trigger enquiries_status_history after insert or update of status on public.enquiries
for each row execute function public.record_enquiry_status_change();
revoke all on function public.record_enquiry_status_change() from public,anon,authenticated;

create table if not exists public.enquiry_quotes (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  version integer not null check(version > 0),
  scope text not null default '',
  items jsonb not null default '[]'::jsonb check(jsonb_typeof(items)='array'),
  one_time_total numeric(12,2) not null default 0 check(one_time_total >= 0),
  monthly_total numeric(12,2) not null default 0 check(monthly_total >= 0),
  annual_total numeric(12,2) not null default 0 check(annual_total >= 0),
  revisions text not null default '',
  exclusions text not null default '',
  payment_terms text not null default '',
  status text not null default 'draft' check(status in ('draft','shared','accepted','declined','expired')),
  expires_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(enquiry_id,version)
);
create index if not exists enquiry_quotes_enquiry_idx on public.enquiry_quotes(enquiry_id,version desc);

alter table public.enquiry_status_history enable row level security;
alter table public.enquiry_quotes enable row level security;
drop policy if exists "Admins view enquiry status history" on public.enquiry_status_history;
create policy "Admins view enquiry status history" on public.enquiry_status_history
  for select to authenticated using((select public.is_admin()));
drop policy if exists "Admins manage enquiry quotes" on public.enquiry_quotes;
create policy "Admins manage enquiry quotes" on public.enquiry_quotes
  for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
grant select on public.enquiry_status_history to authenticated;
grant select,insert,update,delete on public.enquiry_quotes to authenticated;
grant usage,select on sequence public.enquiry_status_history_id_seq to authenticated;
grant select,insert,update on public.enquiry_quotes to service_role;
grant select,insert on public.enquiry_status_history to service_role;

commit;
