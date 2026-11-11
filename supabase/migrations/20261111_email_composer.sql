begin;
alter table public.email_campaigns add column if not exists envelope jsonb;
alter table public.email_campaigns add column if not exists preference_token uuid not null default gen_random_uuid();
create unique index if not exists campaign_preference_token on public.email_campaigns(preference_token);
alter table public.email_campaign_recipients add column if not exists recipient_kind text not null default 'to' check(recipient_kind in ('to','cc','bcc'));
create or replace function public.marketing_introduction_used(p_contact uuid,p_exclude_campaign uuid default null) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from email_campaign_recipients r join email_campaigns c on c.id=r.campaign_id where r.contact_id=p_contact and r.recipient_kind<>'cc' and (p_exclude_campaign is null or r.campaign_id<>p_exclude_campaign) and coalesce(c.content->>'purpose','introduction')='introduction' and (r.status in ('accepted','uncertain','sending') or (r.status='queued' and c.status in ('sending','scheduled','paused'))))
$$;
create or replace function public.queue_marketing_email(p_id uuid,p_content jsonb,p_envelope jsonb,p_schedule timestamptz default null) returns void language plpgsql security definer set search_path=public as $$
declare c email_campaigns; addresses text[]; ids uuid[]='{}'; primary_ids uuid[]='{}'; address text; person uuid; begin
 perform pg_advisory_xact_lock(611072026);
 select * into c from email_campaigns where id=p_id for update;
 if c.status is distinct from 'draft' or c.content is distinct from p_content or c.tested_hash is null then raise exception 'Save and test this draft before sending'; end if;
 select array_agg(value) into addresses from (select jsonb_array_elements_text(p_envelope->'to') as value union all select jsonb_array_elements_text(p_envelope->'cc') union all select jsonb_array_elements_text(p_envelope->'bcc')) a;
 if jsonb_array_length(p_envelope->'to')<1 or cardinality(addresses) not between 1 and 200 or addresses is null then raise exception 'Invalid recipients'; end if;
 if (select count(distinct unnest) from unnest(addresses))<>cardinality(addresses) then raise exception 'Duplicate recipients'; end if;
 foreach address in array addresses loop
  if address<>lower(trim(address)) or length(address)>254 or address !~ '^[^[:space:]@,;<>]+@[^[:space:]@,;<>]+\.[^[:space:]@,;<>]+$' then raise exception 'Invalid address'; end if;
  insert into marketing_contacts(email,relationship,contact_source,outreach_note) values(address,case when c.content->>'purpose'='customer_update' then 'customer' else 'prospect' end,'Manually entered by administrator','Business email prepared by administrator: '||left(c.content->>'subject',160)) on conflict(email) do nothing;
  -- Do not erase suppression or invent subscription consent for manually typed addresses.
  update marketing_contacts set contact_source=case when contact_source='' then 'Manually entered by administrator' else contact_source end,outreach_note=case when outreach_note='' then 'Business email prepared by administrator: '||left(c.content->>'subject',160) else outreach_note end,relationship=case when c.content->>'purpose'='customer_update' then 'customer' else relationship end where email=address returning id into person;
  ids=array_append(ids,person);
  if not ((p_envelope->'cc') ? address) then primary_ids=array_append(primary_ids,person); end if;
 end loop;
 if exists(select 1 from marketing_contacts where id=any(ids) and suppressed) then raise exception 'A recipient requested no further outreach'; end if;
 perform public.start_marketing_campaign(p_id,p_content,primary_ids,p_schedule);
 insert into email_campaign_recipients(campaign_id,contact_id) select p_id,unnest(ids) on conflict do nothing;
 update email_campaigns set envelope=p_envelope where id=p_id;
 update email_campaign_recipients r set recipient_kind=case when (p_envelope->'cc') ? m.email then 'cc' when (p_envelope->'bcc') ? m.email then 'bcc' else 'to' end from marketing_contacts m where r.contact_id=m.id and r.campaign_id=p_id;
end $$;
revoke all on function public.queue_marketing_email(uuid,jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.queue_marketing_email(uuid,jsonb,jsonb,timestamptz) to service_role;
create or replace function public.claim_marketing_send(p_limit integer default 50) returns setof public.email_campaign_recipients language plpgsql security definer set search_path=public as $$
declare item email_campaign_recipients; group_envelope jsonb; cost integer; used bigint; begin
 perform pg_advisory_xact_lock(611062026);
 update email_campaign_recipients set status='uncertain',error='Worker stopped before recording SMTP result. Check Gmail Sent before resending.',updated_at=now() where status='sending' and updated_at<now()-interval '5 minutes';
 if exists(select 1 from marketing_send_slots where created_at>now()-interval '10 seconds') then return; end if;
 select r.* into item from email_campaign_recipients r join email_campaigns c on c.id=r.campaign_id where r.status='queued' and r.next_attempt_at<=now() and c.status in ('sending','scheduled') and (c.scheduled_at is null or c.scheduled_at<=now()) order by r.next_attempt_at for update of r skip locked limit 1;
 if item.id is null then return; end if;
 select envelope into group_envelope from email_campaigns where id=item.campaign_id;
 cost=1;
 if group_envelope is not null then
  if exists(select 1 from email_campaign_recipients where campaign_id=item.campaign_id and status in ('sending','accepted','uncertain')) then return; end if;
  select count(*) into cost from email_campaign_recipients where campaign_id=item.campaign_id and status='queued';
 end if;
 select count(*) into used from marketing_send_slots where created_at>now()-interval '24 hours';
 if used+cost>least(greatest(p_limit,1),200) then return; end if;
 if group_envelope is null then update email_campaign_recipients set status='sending',attempts=attempts+1,updated_at=now() where id=item.id returning * into item;
 else update email_campaign_recipients set status='sending',attempts=attempts+1,updated_at=now() where campaign_id=item.campaign_id and status='queued';select * into item from email_campaign_recipients where id=item.id;end if;
 insert into marketing_send_slots(created_at) select now() from generate_series(1,cost);
 return next item;
end $$;
revoke all on function public.claim_marketing_send(integer) from public,anon,authenticated;
grant execute on function public.claim_marketing_send(integer) to service_role;
commit;
