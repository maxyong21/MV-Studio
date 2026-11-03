-- WhatsApp channel: private conversations, durable inbound queue and outbound delivery.
create table if not exists public.whatsapp_settings (
  id integer primary key default 1 check (id=1),
  enabled boolean not null default false,
  greeting text not null default 'Hi! I am MV Studio''s automated project assistant. Plan a project, ask a question, or speak with our team. Your messages and draft answers are saved so our team can help. Type HUMAN, PAUSE or STOP anytime.',
  handoff_message text not null default 'Your request is queued for our team. We aim to respond within two business days, Monday-Friday, excluding Malaysian public holidays. You do not need to repeat your requirements.',
  updated_at timestamptz not null default now()
);
insert into public.whatsapp_settings(id) values(1) on conflict do nothing;
create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique check (phone ~ '^[0-9]{7,15}$'),
  state jsonb not null default '{"mode":"menu","answers":{},"completed":[],"contact":{}}',
  assigned_to uuid references auth.users(id) on delete set null,
  enquiry_id uuid references public.enquiries(id) on delete set null,
  last_customer_at timestamptz,
  locked_until timestamptz,
  lock_token uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.whatsapp_events (
  id bigint generated always as identity primary key,
  external_id text not null unique,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  kind text not null check(kind in ('customer','claim','reply','close','release','retry_send','resolve_send')),
  payload jsonb not null default '{}',
  actor_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check(status in ('pending','processing','done','failed')),
  attempts integer not null default 0,
  error text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_event_queue on public.whatsapp_events(status,id);
create table if not exists public.whatsapp_outbox (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  event_id bigint not null references public.whatsapp_events(id) on delete cascade,
  part integer not null default 0,
  body text not null,
  buttons jsonb not null default '[]',
  status text not null default 'queued' check(status in ('queued','sending','sent','failed','uncertain','cancelled')),
  provider_id text,
  provider_status text,
  error text not null default '',
  attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  unique(event_id,part)
);
create index if not exists whatsapp_outbound_queue on public.whatsapp_outbox(status,id);
create index if not exists whatsapp_provider_id on public.whatsapp_outbox(provider_id);
create table if not exists public.whatsapp_delivery_receipts (
  provider_id text primary key,
  status text not null,
  error_code text not null default '',
  updated_at timestamptz not null default now()
);
create table if not exists public.whatsapp_team_alerts (
  event_id bigint primary key references public.whatsapp_events(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','sending','sent','failed','cancelled')),
  error text not null default '',
  provider_id text,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

-- Only server code mutates channel state. Browser admin access remains read-only.
do $$ declare t text; begin
  foreach t in array array['whatsapp_settings','whatsapp_conversations','whatsapp_events','whatsapp_outbox','whatsapp_team_alerts','whatsapp_delivery_receipts'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists "Admins read WhatsApp" on public.%I',t);
    execute format('create policy "Admins read WhatsApp" on public.%I for select to authenticated using ((select public.is_admin()))',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
  end loop;
end $$;

-- Receipt delivery can be duplicated, arrive out of order, or precede the send response.
create or replace function public.whatsapp_receipt(p_provider text,p_status text,p_code text default '')
returns void language plpgsql security definer set search_path='' as $$
declare r public.whatsapp_delivery_receipts; begin
  if p_status not in ('accepted','sent','delivered','read','failed') or length(p_provider)>300 then return; end if;
  insert into public.whatsapp_delivery_receipts(provider_id,status,error_code) values(p_provider,p_status,left(p_code,100))
    on conflict(provider_id) do update set status=excluded.status,error_code=excluded.error_code,updated_at=now()
    where (case excluded.status when 'read' then 4 when 'delivered' then 3 when 'failed' then 2 when 'sent' then 1 else 0 end)>=
      (case whatsapp_delivery_receipts.status when 'read' then 4 when 'delivered' then 3 when 'failed' then 2 when 'sent' then 1 else 0 end);
  select * into r from public.whatsapp_delivery_receipts where provider_id=p_provider;
  update public.whatsapp_outbox set provider_status=r.status,
    status=case when status='cancelled' then status when r.status='failed' then 'failed' else 'sent' end,
    error=case when r.status='failed' then 'Meta delivery failure ('||r.error_code||').' else '' end
    where provider_id=p_provider;
end $$;
revoke all on function public.whatsapp_receipt(text,text,text) from public,anon,authenticated;
grant execute on function public.whatsapp_receipt(text,text,text) to service_role;
grant usage,select on sequence public.whatsapp_events_id_seq, public.whatsapp_outbox_id_seq to service_role;

create or replace function public.whatsapp_enqueue(p_phone text,p_external text,p_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare c uuid; begin
  insert into public.whatsapp_conversations(phone) values(p_phone) on conflict(phone) do nothing;
  select id into c from public.whatsapp_conversations where phone=p_phone;
  insert into public.whatsapp_events(external_id,conversation_id,kind,payload)
    values(p_external,c,'customer',p_payload) on conflict(external_id) do nothing;
  return c;
end $$;

create or replace function public.whatsapp_claim()
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.whatsapp_events; c public.whatsapp_conversations; token uuid:=gen_random_uuid(); begin
  select v.* into c from public.whatsapp_conversations v
    where (v.locked_until is null or v.locked_until<now()) and exists(
      select 1 from public.whatsapp_events j where j.conversation_id=v.id and j.status in ('pending','processing'))
    order by v.updated_at for update skip locked limit 1;
  if c.id is null then return null; end if;
  select * into e from public.whatsapp_events where conversation_id=c.id and status in ('pending','processing') order by id limit 1 for update;
  if e.id is null or e.status='failed' then return null; end if;
  update public.whatsapp_conversations set locked_until=now()+interval '90 seconds',lock_token=token where id=c.id;
  update public.whatsapp_events set status='processing',attempts=attempts+1 where id=e.id;
  return jsonb_build_object('event',to_jsonb(e),'conversation',to_jsonb(c),'token',token);
end $$;

create or replace function public.whatsapp_finish(p_event bigint,p_token uuid,p_state jsonb,p_assigned uuid,p_enquiry uuid,p_customer_at timestamptz,p_reply jsonb,p_error text default '')
returns boolean language plpgsql security definer set search_path='' as $$
declare c uuid; part_number integer; parts integer; previous_mode text; begin
  select conversation_id into c from public.whatsapp_events where id=p_event;
  perform 1 from public.whatsapp_conversations where id=c and lock_token=p_token and locked_until>now() for update;
  if not found then return false; end if;
  select state->>'mode' into previous_mode from public.whatsapp_conversations where id=c;
  if p_error<>'' then
    update public.whatsapp_events set status=case when attempts>=5 then 'failed' else 'pending' end,error=left(p_error,500) where id=p_event;
    if (select attempts>=5 from public.whatsapp_events where id=p_event) then
      update public.whatsapp_conversations set state=jsonb_set(state,'{mode}','"queued"'),last_customer_at=p_customer_at,updated_at=now() where id=c;
      insert into public.whatsapp_team_alerts(event_id,conversation_id) values(p_event,c) on conflict do nothing;
    end if;
  else
    update public.whatsapp_conversations set state=p_state,assigned_to=p_assigned,enquiry_id=p_enquiry,last_customer_at=p_customer_at,updated_at=now() where id=c;
    update public.whatsapp_events set status='done',error='' where id=p_event;
    if p_state->>'mode'='queued' and previous_mode not in ('queued','human') and
      (p_enquiry is null or (select lower(coalesce(payload->>'text',''))<>'submit' from public.whatsapp_events where id=p_event)) then
      insert into public.whatsapp_team_alerts(event_id,conversation_id) values(p_event,c) on conflict do nothing;
    end if;
    -- New customer input supersedes automated replies not yet sent.
    if (select kind='customer' from public.whatsapp_events where id=p_event) then
      update public.whatsapp_outbox o set status='cancelled',error='Superseded by newer customer input.'
        where o.conversation_id=c and o.status in ('queued','failed','uncertain') and (p_state->>'mode'='stopped' or exists(select 1 from public.whatsapp_events e where e.id=o.event_id and e.kind='customer'));
    end if;
    if p_reply is not null then
      parts:=greatest(1,ceil(length(p_reply->>'text')/3500.0)::integer);
      for part_number in 0..parts-1 loop
        insert into public.whatsapp_outbox(conversation_id,event_id,part,body,buttons)
          values(c,p_event,part_number,substring(p_reply->>'text' from part_number*3500+1 for 3500),case when part_number=parts-1 then coalesce(p_reply->'buttons','[]') else '[]'::jsonb end)
          on conflict(event_id,part) do nothing;
      end loop;
    end if;
  end if;
  update public.whatsapp_conversations set locked_until=null,lock_token=null where id=c;
  return true;
end $$;

create or replace function public.whatsapp_claim_alert()
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.whatsapp_team_alerts; begin
  update public.whatsapp_team_alerts set status='failed',error='Notification was interrupted. Review before retrying.' where status='sending' and locked_until<now();
  select * into a from public.whatsapp_team_alerts where status='pending' order by event_id for update skip locked limit 1;
  if a.event_id is null then return null; end if;
  update public.whatsapp_team_alerts set status='sending',locked_until=now()+interval '45 seconds' where event_id=a.event_id;
  return to_jsonb(a);
end $$;

create or replace function public.whatsapp_claim_outbox()
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.whatsapp_outbox; begin
  -- An interrupted HTTP request may already have delivered. Never blindly resend it.
  update public.whatsapp_outbox set status='uncertain',error='Delivery could not be confirmed. Check the conversation before retrying.' where status='sending' and locked_until<now();
  select b.* into o from public.whatsapp_outbox b where b.status='queued'
    and not exists(select 1 from public.whatsapp_outbox earlier where earlier.conversation_id=b.conversation_id and earlier.id<b.id and earlier.status in ('queued','sending','uncertain','failed'))
    order by b.id for update skip locked limit 1;
  if o.id is null then return null; end if;
  update public.whatsapp_outbox set status='sending',attempts=attempts+1,locked_until=now()+interval '45 seconds' where id=o.id;
  return to_jsonb(o);
end $$;

revoke all on function public.whatsapp_enqueue(text,text,jsonb),public.whatsapp_claim(),public.whatsapp_finish(bigint,uuid,jsonb,uuid,uuid,timestamptz,jsonb,text),public.whatsapp_claim_outbox() from public,anon,authenticated;
grant execute on function public.whatsapp_enqueue(text,text,jsonb),public.whatsapp_claim(),public.whatsapp_finish(bigint,uuid,jsonb,uuid,uuid,timestamptz,jsonb,text),public.whatsapp_claim_outbox() to service_role;
revoke all on function public.whatsapp_claim_alert() from public,anon,authenticated;
grant execute on function public.whatsapp_claim_alert() to service_role;
