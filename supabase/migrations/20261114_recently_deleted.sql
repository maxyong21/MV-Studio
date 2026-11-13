-- Recently deleted: deletes made in the admin can be restored for 30 days. Repeatable.
--
-- Website content (services, projects, team, promotions, features, testimonials,
-- FAQs) is copied into admin_trash and removed from its table, so the public
-- read policies need no change and a deleted item can never appear on the site.
--
-- Enquiries are marked with deleted_at instead. They own history and quotation
-- rows and have insert triggers, so removing and re-inserting them would not
-- bring back an identical record.
begin;
create table if not exists public.admin_trash (
  id uuid primary key default gen_random_uuid(),
  source_table text not null check (source_table in ('services','projects','team_members','promotions','feature_options','testimonials','faqs')),
  source_id text not null,
  label text not null default '',
  payload jsonb not null,
  deleted_by uuid default auth.uid(),
  deleted_at timestamptz not null default now()
);
create index if not exists admin_trash_deleted_idx on public.admin_trash(deleted_at);
alter table public.admin_trash enable row level security;
-- No policies on purpose: the table is reached only through the functions below.
alter table public.enquiries add column if not exists deleted_at timestamptz;
create index if not exists enquiries_deleted_idx on public.enquiries(deleted_at) where deleted_at is not null;

create or replace function public.admin_trash_delete(p_table text, p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare item jsonb; begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
  if p_table = 'enquiries' then
    update enquiries set deleted_at = now() where id::text = p_id and deleted_at is null;
    if not found then raise exception 'This enquiry was not found or is already deleted'; end if;
    return;
  end if;
  if p_table not in ('services','projects','team_members','promotions','feature_options','testimonials','faqs') then raise exception 'This content cannot be deleted here'; end if;
  execute format('select to_jsonb(t) from public.%I t where t.id::text = $1', p_table) into item using p_id;
  if item is null then raise exception 'This item was not found or is already deleted'; end if;
  insert into admin_trash(source_table, source_id, label, payload)
  values (p_table, p_id, left(coalesce(nullif(item->>'name',''), nullif(item->>'title',''), 'Untitled'), 200), item);
  execute format('delete from public.%I where id::text = $1', p_table) using p_id;
end $$;

-- One list for the admin page. It also clears anything older than 30 days.
create or replace function public.admin_trash_list() returns table(trash_id text, source_table text, label text, detail text, deleted_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
  delete from admin_trash t where t.deleted_at < now() - interval '30 days';
  delete from enquiries e where e.deleted_at < now() - interval '30 days';
  return query
    select t.id::text, t.source_table, t.label, coalesce(t.payload->>'category', t.payload->>'role', t.payload->>'summary', t.payload->>'answer', t.payload->>'message', t.payload->>'quote', ''), t.deleted_at from admin_trash t
    union all
    select e.id::text, 'enquiries'::text, e.name, e.company_name, e.deleted_at from enquiries e where e.deleted_at is not null
    order by 5 desc;
end $$;

create or replace function public.admin_trash_restore(p_table text, p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare item admin_trash; begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
  if p_table = 'enquiries' then
    update enquiries set deleted_at = null where id::text = p_id and deleted_at is not null;
    if not found then raise exception 'This enquiry is no longer in Recently deleted'; end if;
    return;
  end if;
  select * into item from admin_trash where id::text = p_id and source_table = p_table for update;
  if item.id is null then raise exception 'This item is no longer in Recently deleted'; end if;
  execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', item.source_table, item.source_table) using item.payload;
  delete from admin_trash where id = item.id;
end $$;

create or replace function public.admin_trash_purge(p_table text, p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
  if p_table = 'enquiries' then delete from enquiries where id::text = p_id and deleted_at is not null;
  else delete from admin_trash where id::text = p_id and source_table = p_table; end if;
  if not found then raise exception 'This item is no longer in Recently deleted'; end if;
end $$;

revoke all on table public.admin_trash from public, anon, authenticated;
revoke all on function public.admin_trash_delete(text, text) from public, anon;
revoke all on function public.admin_trash_list() from public, anon;
revoke all on function public.admin_trash_restore(text, text) from public, anon;
revoke all on function public.admin_trash_purge(text, text) from public, anon;
grant execute on function public.admin_trash_delete(text, text) to authenticated;
grant execute on function public.admin_trash_list() to authenticated;
grant execute on function public.admin_trash_restore(text, text) to authenticated;
grant execute on function public.admin_trash_purge(text, text) to authenticated;
commit;
