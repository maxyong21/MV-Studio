begin;
create table if not exists public.marketing_contacts (
 id uuid primary key default gen_random_uuid(), email text not null unique check(email=lower(trim(email))), first_name text not null default '', company_name text not null default '', industry text not null default 'general', language text not null default 'en', consent_at timestamptz, consent_source text not null default '', consent_notice text not null default '', suppressed boolean not null default false, suppression_reason text not null default '', unsubscribe_token uuid not null default gen_random_uuid() unique, created_at timestamptz not null default now()
);
create table if not exists public.email_templates (id uuid primary key default gen_random_uuid(), name text not null, industry text not null default 'general', language text not null default 'en', content jsonb not null default '{}', archived boolean not null default false, version integer not null default 1, created_at timestamptz not null default now());
create table if not exists public.email_campaigns (id uuid primary key default gen_random_uuid(), name text not null, content jsonb not null, status text not null default 'draft' check(status in ('draft','scheduled','sending','paused','completed','cancelled')), scheduled_at timestamptz, tested_hash text, created_at timestamptz not null default now());
create table if not exists public.email_campaign_recipients (id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.email_campaigns on delete cascade, contact_id uuid not null references public.marketing_contacts, status text not null default 'queued' check(status in ('queued','sending','accepted','failed','uncertain','suppressed')), attempts integer not null default 0, next_attempt_at timestamptz not null default now(), updated_at timestamptz not null default now(), error text not null default '', message_id text, unique(campaign_id,contact_id));
create index if not exists marketing_queue on public.email_campaign_recipients(status,next_attempt_at);
create table if not exists public.marketing_send_slots (id bigint generated always as identity primary key, created_at timestamptz not null default now());
do $$ declare t text; begin foreach t in array array['marketing_contacts','email_templates','email_campaigns','email_campaign_recipients'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('drop policy if exists "Admin marketing read" on public.%I',t);
 execute format('create policy "Admin marketing read" on public.%I for select to authenticated using ((select public.is_admin()))',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop; end $$;
alter table public.marketing_send_slots enable row level security;
grant all on public.marketing_send_slots to service_role;
grant usage,select on sequence public.marketing_send_slots_id_seq to service_role;
create or replace function public.claim_marketing_send(p_limit integer default 50) returns setof public.email_campaign_recipients language plpgsql security definer set search_path=public as $$
declare item public.email_campaign_recipients; begin
 perform pg_advisory_xact_lock(611062026);
 update email_campaign_recipients set status='uncertain',error='Worker stopped before recording SMTP result. Check Gmail Sent before resending.',updated_at=now() where status='sending' and updated_at<now()-interval '5 minutes';
 if (select count(*) from marketing_send_slots where created_at>now()-interval '24 hours')>=least(greatest(p_limit,1),200) then return; end if;
 if exists(select 1 from marketing_send_slots where created_at>now()-interval '10 seconds') then return; end if;
 select r.* into item from email_campaign_recipients r join email_campaigns c on c.id=r.campaign_id where r.status='queued' and r.next_attempt_at<=now() and c.status in ('sending','scheduled') and (c.scheduled_at is null or c.scheduled_at<=now()) order by r.next_attempt_at for update of r skip locked limit 1;
 if item.id is null then return; end if;
 update email_campaign_recipients set status='sending',attempts=attempts+1,updated_at=now() where id=item.id returning * into item;
 insert into marketing_send_slots default values;
 return next item;
end $$;
revoke all on function public.claim_marketing_send(integer) from public,anon,authenticated;
grant execute on function public.claim_marketing_send(integer) to service_role;
create or replace function public.start_marketing_campaign(p_id uuid,p_content jsonb,p_contacts uuid[],p_schedule timestamptz default null) returns void language plpgsql security definer set search_path=public as $$
declare c public.email_campaigns; begin
 select * into c from email_campaigns where id=p_id for update;
 if c.status is distinct from 'draft' or c.tested_hash is null or c.content is distinct from p_content then raise exception 'Draft changed; reload and test again'; end if;
 if cardinality(p_contacts)<1 or cardinality(p_contacts)>200 or p_contacts is null then raise exception 'Invalid audience size'; end if;
 if p_schedule is not null and p_schedule<=now() then raise exception 'Schedule must be in the future'; end if;
 if (select count(*) from marketing_contacts where id=any(p_contacts) and consent_at is not null and consent_source<>'' and consent_notice<>'' and not suppressed)<>cardinality(p_contacts) then raise exception 'Audience no longer eligible'; end if;
 insert into email_campaign_recipients(campaign_id,contact_id) select p_id,unnest(p_contacts) on conflict do nothing;
 update email_campaigns set status=case when p_schedule is null then 'sending' else 'scheduled' end,scheduled_at=p_schedule where id=p_id;
end $$;
revoke all on function public.start_marketing_campaign(uuid,jsonb,uuid[],timestamptz) from public,anon,authenticated;
grant execute on function public.start_marketing_campaign(uuid,jsonb,uuid[],timestamptz) to service_role;
commit;
