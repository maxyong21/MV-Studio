begin;
alter table public.marketing_contacts add column if not exists relationship text not null default 'prospect' check(relationship in ('prospect','customer'));
alter table public.marketing_contacts add column if not exists contact_source text not null default '';
alter table public.marketing_contacts add column if not exists outreach_note text not null default '';
create or replace function public.marketing_introduction_used(p_contact uuid,p_exclude_campaign uuid default null) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from email_campaign_recipients r join email_campaigns c on c.id=r.campaign_id where r.contact_id=p_contact and (p_exclude_campaign is null or r.campaign_id<>p_exclude_campaign) and coalesce(c.content->>'purpose','introduction')='introduction' and (r.status in ('accepted','uncertain','sending') or (r.status='queued' and c.status in ('sending','scheduled','paused'))))
$$;
create or replace function public.marketing_introduction_history() returns table(contact_id uuid) language sql stable security definer set search_path=public as $$
 select m.id from marketing_contacts m where public.marketing_introduction_used(m.id)
$$;
revoke all on function public.marketing_introduction_used(uuid,uuid) from public,anon,authenticated;
revoke all on function public.marketing_introduction_history() from public,anon,authenticated;
grant execute on function public.marketing_introduction_used(uuid,uuid) to service_role;
grant execute on function public.marketing_introduction_history() to service_role;
create or replace function public.start_marketing_campaign(p_id uuid,p_content jsonb,p_contacts uuid[],p_schedule timestamptz default null) returns void language plpgsql security definer set search_path=public as $$
declare c public.email_campaigns; begin
 perform pg_advisory_xact_lock(611072026);
 select * into c from email_campaigns where id=p_id for update;
 if c.status is distinct from 'draft' or c.tested_hash is null or c.content is distinct from p_content then raise exception 'Draft changed; reload and test again'; end if;
 if cardinality(p_contacts)<1 or cardinality(p_contacts)>200 or p_contacts is null then raise exception 'Invalid audience size'; end if;
 if p_schedule is not null and p_schedule<=now() then raise exception 'Schedule must be in the future'; end if;
 if coalesce(c.content->>'purpose','introduction') not in ('introduction','customer_update') then raise exception 'Invalid email purpose'; end if;
 if c.content->>'purpose'='customer_update' and length(trim(coalesce(c.content->>'followup_reason','')))<10 then raise exception 'Record a specific customer update reason'; end if;
 if (select count(*) from marketing_contacts m where m.id=any(p_contacts) and not m.suppressed and ((m.contact_source<>'' and m.outreach_note<>'') or (m.consent_at is not null and m.consent_source<>'' and m.consent_notice<>'')) and (case when c.content->>'purpose'='customer_update' then m.relationship='customer' else not public.marketing_introduction_used(m.id,p_id) end))<>cardinality(p_contacts) then raise exception 'Audience contains suppressed, unreviewed or previously contacted addresses'; end if;
 insert into email_campaign_recipients(campaign_id,contact_id) select p_id,unnest(p_contacts) on conflict do nothing;
 update email_campaigns set status=case when p_schedule is null then 'sending' else 'scheduled' end,scheduled_at=p_schedule where id=p_id;
end $$;
revoke all on function public.start_marketing_campaign(uuid,jsonb,uuid[],timestamptz) from public,anon,authenticated;
grant execute on function public.start_marketing_campaign(uuid,jsonb,uuid[],timestamptz) to service_role;

commit;
