-- Separate, personalised sends from the composer. An envelope marked
-- {"separate": true} is claimed one recipient at a time, like a contact
-- campaign, instead of as one shared To/Cc/Bcc message. Repeatable.
begin;
create or replace function public.claim_marketing_send(p_limit integer default 50) returns setof public.email_campaign_recipients language plpgsql security definer set search_path=public as $$
declare item email_campaign_recipients; group_envelope jsonb; cost integer; used bigint; begin
 perform pg_advisory_xact_lock(611062026);
 update email_campaign_recipients set status='uncertain',error='Worker stopped before recording SMTP result. Check Gmail Sent before resending.',updated_at=now() where status='sending' and updated_at<now()-interval '5 minutes';
 if exists(select 1 from marketing_send_slots where created_at>now()-interval '10 seconds') then return; end if;
 select r.* into item from email_campaign_recipients r join email_campaigns c on c.id=r.campaign_id where r.status='queued' and r.next_attempt_at<=now() and c.status in ('sending','scheduled') and (c.scheduled_at is null or c.scheduled_at<=now()) order by r.next_attempt_at for update of r skip locked limit 1;
 if item.id is null then return; end if;
 select envelope into group_envelope from email_campaigns where id=item.campaign_id;
 if group_envelope->>'separate'='true' then group_envelope=null; end if;
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
