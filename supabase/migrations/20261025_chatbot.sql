-- Run after 20261024_growth_and_reliability.sql. No AI keys belong in SQL.
begin;

create table if not exists public.chatbot_releases (
  id uuid primary key,
  label text not null check(length(trim(label)) between 2 and 100),
  draft_revision bigint not null,
  provider_hash text not null,
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.chatbot_state (
  id integer primary key default 1 check(id=1),
  active_release_id uuid references public.chatbot_releases(id),
  enabled boolean not null default true,
  draft_revision bigint not null default 1,
  catalog_revision bigint not null default 1,
  tests_revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
insert into public.chatbot_state(id) values(1) on conflict do nothing;
-- Index approved service policies without relying on hosted default grants.
grant select on public.services to service_role;

create table if not exists public.chatbot_settings (
  id integer primary key default 1 check(id=1),
  name text not null default 'Studio assistant',
  greeting text not null default 'Tell me what you would like to build. I can help you plan the scope and prepare an initial estimate.',
  handoff_message text not null default 'I do not have enough approved information to answer that. You can request a conversation with our team.',
  answer_mode text not null default 'extractive' check(answer_mode in ('extractive','groq')),
  retrieval_mode text not null default 'keyword' check(retrieval_mode in ('keyword','hybrid')),
  updated_at timestamptz not null default now()
);
insert into public.chatbot_settings(id) values(1) on conflict do nothing;

create table if not exists public.chatbot_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(trim(title)) between 2 and 160),
  body text not null check(length(trim(body)) between 10 and 8000),
  category text not null default 'FAQ',
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.chatbot_questions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check(key ~ '^[a-z][a-z0-9_]{1,39}$'),
  title text not null check(length(trim(title)) between 2 and 200),
  help_text text not null default '',
  kind text not null check(kind in ('single','multi','goals','billing','number','text','date','features')),
  required boolean not null default true,
  allow_unsure boolean not null default true,
  min_value integer not null default 0,
  max_value integer not null default 100000,
  catalog_categories text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  check(max_value>=min_value)
);
create table if not exists public.chatbot_options (
  id uuid primary key default gen_random_uuid(),
  question_key text not null references public.chatbot_questions(key) on update cascade on delete cascade,
  value text not null check(value ~ '^[a-z][a-z0-9_]{0,59}$'),
  label text not null check(length(trim(label)) between 1 and 160),
  description text not null default '',
  keywords text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(question_key,value)
);
create table if not exists public.chatbot_rules (
  id uuid primary key default gen_random_uuid(),
  question_key text not null references public.chatbot_questions(key) on update cascade on delete cascade,
  source_key text not null,
  operator text not null check(operator in ('equals','not_equals','includes_any','gte','lte','answered')),
  values text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.chatbot_test_cases (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) between 2 and 160),
  kind text not null default 'answer' check(kind in ('answer','quote')),
  prompt text not null default '',
  expected_action text not null default 'answer' check(expected_action in ('answer','guide','clarify','handoff')),
  expected_terms text[] not null default '{}',
  forbidden_terms text[] not null default '{}',
  answers jsonb not null default '{}'::jsonb,
  expected_one_time numeric(12,2),
  expected_monthly numeric(12,2),
  expected_annual numeric(12,2),
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create unique index if not exists chatbot_documents_title_unique on public.chatbot_documents(title);
create unique index if not exists chatbot_test_cases_name_unique on public.chatbot_test_cases(name);
create unique index if not exists chatbot_rules_condition_unique on public.chatbot_rules(question_key,source_key,operator);
create table if not exists public.chatbot_chunks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.chatbot_releases(id) on delete cascade,
  source_id text not null,
  title text not null,
  content text not null,
  -- Exact cosine search at this catalogue size; no external vector service required.
  embedding jsonb,
  check(embedding is null or jsonb_typeof(embedding)='array')
);
create index if not exists chatbot_chunks_release_idx on public.chatbot_chunks(release_id);
create table if not exists public.chatbot_test_runs (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.chatbot_releases(id),
  catalog_revision bigint not null,
  tests_revision bigint not null,
  provider_hash text not null,
  passed boolean not null,
  results jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.chatbot_publications (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.chatbot_releases(id),
  test_run_id uuid not null references public.chatbot_test_runs(id),
  action text not null check(action in ('publish','rollback')),
  note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.chatbot_estimates (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  release_id uuid not null references public.chatbot_releases(id),
  catalog_revision bigint not null,
  answers jsonb not null,
  brief text not null default '',
  selected_feature_ids uuid[] not null default '{}',
  billing_period text not null check(billing_period in ('monthly','yearly')),
  quote jsonb not null,
  expires_at timestamptz not null default now()+interval '30 minutes',
  created_at timestamptz not null default now()
);
create table if not exists public.chatbot_logs (
  id uuid primary key default gen_random_uuid(),
  release_id uuid references public.chatbot_releases(id),
  message text not null,
  answer text not null,
  action text not null,
  sources jsonb not null default '[]',
  mode text not null,
  latency_ms integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists chatbot_logs_created_idx on public.chatbot_logs(created_at);
create table if not exists public.chatbot_usage (
  day date primary key default current_date,
  calls integer not null default 0
);

alter table public.enquiries add column if not exists chatbot_estimate_id uuid references public.chatbot_estimates(id);
alter table public.enquiries add column if not exists chatbot_release_id uuid references public.chatbot_releases(id);
alter table public.enquiries add column if not exists chatbot_answers jsonb;
create unique index if not exists enquiries_chatbot_estimate_unique on public.enquiries(chatbot_estimate_id) where chatbot_estimate_id is not null;

-- Lock the revision at the final write as well as validating in the Edge Function.
-- Catalogue writes acquire the same state row through their revision trigger.
create or replace function public.chatbot_validate_enquiry()
returns trigger language plpgsql security definer set search_path='' as $$
declare state public.chatbot_state; estimate public.chatbot_estimates;
begin
  if new.chatbot_estimate_id is null then return new; end if;
  select * into state from public.chatbot_state where id=1 for update;
  select * into estimate from public.chatbot_estimates where id=new.chatbot_estimate_id;
  if estimate.id is null or not state.enabled or state.active_release_id is distinct from estimate.release_id
    or state.catalog_revision<>estimate.catalog_revision or estimate.expires_at<=now()
    or new.chatbot_release_id is distinct from estimate.release_id
    or new.billing_period<>estimate.billing_period
    or new.one_time_estimate<>(estimate.quote->>'one_time_estimate')::numeric
    or new.monthly_estimate<>(estimate.quote->>'monthly_estimate')::numeric
    or new.annual_estimate<>(estimate.quote->>'annual_estimate')::numeric then
    raise exception 'The estimate changed or expired. Generate a fresh estimate.';
  end if;
  return new;
end;
$$;
revoke all on function public.chatbot_validate_enquiry() from public,anon,authenticated;
drop trigger if exists chatbot_enquiry_guard on public.enquiries;
create trigger chatbot_enquiry_guard before insert on public.enquiries for each row execute function public.chatbot_validate_enquiry();

create or replace function public.chatbot_touch_revision()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if TG_TABLE_NAME='feature_options' then
    update public.chatbot_state set catalog_revision=catalog_revision+1,updated_at=now() where id=1;
  elsif TG_TABLE_NAME='chatbot_test_cases' then
    update public.chatbot_state set tests_revision=tests_revision+1,updated_at=now() where id=1;
  else
    update public.chatbot_state set draft_revision=draft_revision+1,updated_at=now() where id=1;
  end if;
  return null;
end;
$$;
do $$ declare name text; begin
  foreach name in array array['chatbot_settings','chatbot_documents','chatbot_questions','chatbot_options','chatbot_rules','chatbot_test_cases','feature_options','services'] loop
    execute format('drop trigger if exists chatbot_revision on public.%I',name);
    execute format('create trigger chatbot_revision after insert or update or delete on public.%I for each statement execute function public.chatbot_touch_revision()',name);
  end loop;
end $$;

-- Target references use foreign keys; source references also support the derived
-- $has_recurring condition, so keep question renames/deletes in sync here.
create or replace function public.chatbot_sync_question_refs()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if TG_OP='DELETE' then
    delete from public.chatbot_rules where source_key=old.key;
  elsif old.key<>new.key then
    update public.chatbot_rules set source_key=new.key,updated_at=now() where source_key=old.key;
  end if;
  return null;
end;
$$;
revoke all on function public.chatbot_sync_question_refs() from public,anon,authenticated;
drop trigger if exists chatbot_question_refs on public.chatbot_questions;
create trigger chatbot_question_refs after update of key or delete on public.chatbot_questions
for each row execute function public.chatbot_sync_question_refs();

-- Only the server may create immutable release snapshots and publish them.
create or replace function public.chatbot_store_release(p_id uuid,p_label text,p_revision bigint,p_hash text,p_snapshot jsonb,p_chunks jsonb,p_admin uuid)
returns uuid language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.chatbot_state where id=1 and draft_revision=p_revision for update;
  if not found then raise exception 'Draft changed during indexing. Build a new candidate.'; end if;
  insert into public.chatbot_releases(id,label,draft_revision,provider_hash,snapshot,created_by) values(p_id,p_label,p_revision,p_hash,p_snapshot,p_admin);
  insert into public.chatbot_chunks(release_id,source_id,title,content,embedding)
  select p_id,x->>'source_id',x->>'title',x->>'content',nullif(x->'embedding','null'::jsonb) from jsonb_array_elements(p_chunks) x;
  return p_id;
end;
$$;
create or replace function public.chatbot_publish_release(p_release uuid,p_run uuid,p_hash text,p_admin uuid,p_note text,p_rollback boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare state public.chatbot_state; candidate public.chatbot_releases; report public.chatbot_test_runs;
begin
  select * into state from public.chatbot_state where id=1 for update;
  select * into candidate from public.chatbot_releases where id=p_release;
  select * into report from public.chatbot_test_runs where id=p_run and release_id=p_release;
  if candidate.id is null or report.id is null or not report.passed then raise exception 'Select a candidate with a passing test run.'; end if;
  if p_rollback and not exists(select 1 from public.chatbot_publications where release_id=p_release) then raise exception 'Rollback requires a previously published release.'; end if;
  if not p_rollback and candidate.draft_revision<>state.draft_revision then raise exception 'Draft changed. Build and test a new candidate.'; end if;
  if report.catalog_revision<>state.catalog_revision or report.tests_revision<>state.tests_revision or report.provider_hash<>p_hash or candidate.provider_hash<>p_hash then
    raise exception 'Prices, tests or model configuration changed. Rebuild or rerun tests.';
  end if;
  if length(trim(coalesce(p_note,'')))<5 then raise exception 'Record your review before publishing.'; end if;
  update public.chatbot_state set active_release_id=p_release,updated_at=now() where id=1;
  insert into public.chatbot_publications(release_id,test_run_id,action,note,created_by) values(p_release,p_run,case when p_rollback then 'rollback' else 'publish' end,p_note,p_admin);
  return p_release;
end;
$$;
create or replace function public.consume_chatbot_budget(p_max integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare used integer;
begin
  insert into public.chatbot_usage(day,calls) values(current_date,0) on conflict do nothing;
  select calls into used from public.chatbot_usage where day=current_date for update;
  if used>=p_max then return false; end if;
  update public.chatbot_usage set calls=calls+1 where day=current_date;
  return true;
end;
$$;
create or replace function public.chatbot_purge_old_data()
returns void language plpgsql security definer set search_path='' as $$
begin
  delete from public.chatbot_logs where created_at<now()-interval '30 days';
  delete from public.chatbot_estimates e where expires_at<now()-interval '7 days'
    and not exists(select 1 from public.enquiries q where q.chatbot_estimate_id=e.id);
  delete from public.chatbot_usage where day<current_date-30;
end;
$$;
revoke all on function public.chatbot_purge_old_data() from public,anon,authenticated;
grant execute on function public.chatbot_purge_old_data() to service_role;
revoke all on function public.chatbot_store_release(uuid,text,bigint,text,jsonb,jsonb,uuid),public.chatbot_publish_release(uuid,uuid,text,uuid,text,boolean),public.consume_chatbot_budget(integer) from public,anon,authenticated;
grant execute on function public.chatbot_store_release(uuid,text,bigint,text,jsonb,jsonb,uuid),public.chatbot_publish_release(uuid,uuid,text,uuid,text,boolean),public.consume_chatbot_budget(integer) to service_role;

do $$ declare name text; begin
  foreach name in array array['chatbot_state','chatbot_settings','chatbot_documents','chatbot_questions','chatbot_options','chatbot_rules','chatbot_test_cases','chatbot_releases','chatbot_chunks','chatbot_test_runs','chatbot_publications','chatbot_estimates','chatbot_logs','chatbot_usage'] loop
    execute format('alter table public.%I enable row level security',name);
    execute format('revoke all on public.%I from anon,authenticated',name);
    execute format('drop policy if exists "Admins read chatbot data" on public.%I',name);
    execute format('create policy "Admins read chatbot data" on public.%I for select to authenticated using ((select public.is_admin()))',name);
    execute format('grant select on public.%I to authenticated',name);
    execute format('grant select,insert,update,delete on public.%I to service_role',name);
  end loop;
end $$;

-- Draft CRUD is routed through chatbot-admin, with per-field validation. Browsers
-- cannot mutate snapshots, test results, prices, active releases, or logs directly.

-- Editable starter content; publication remains an explicit admin action.
insert into public.chatbot_documents (title,category,body) values ('How preliminary estimates work','Quotations','An initial estimate is a planning guide. It itemizes selected features using the current catalogue. Custom work and third-party charges may need a separate quotation. Our team confirms the final scope, delivery date and payment terms before work begins.') on conflict do nothing;
insert into public.chatbot_documents (title,category,body) values ('Maintenance and annual billing','Maintenance','Recurring services can be billed monthly or annually. Any free months on an annual plan are configured separately for each service. The estimate shows one-time work separately from recurring charges. Ask our team to confirm the maintenance scope and renewal terms.') on conflict do nothing;
insert into public.chatbot_documents (title,category,body) values ('Requesting a meeting','Contact','You can request a short meeting with a project enquiry. A preferred date is a request for a callback, not a confirmed booking. Our team will contact you to agree a suitable time.') on conflict do nothing;
insert into public.chatbot_questions (help_text,required,allow_unsure,min_value,max_value,catalog_categories,active,key,title,kind,sort_order) values ('Choose the main goals. You can change these later.',true,true,0,100000,array[]::text[],true,'business_goal','What should your system help you do?','goals',10) on conflict do nothing;
insert into public.chatbot_questions (help_text,required,allow_unsure,min_value,max_value,catalog_categories,active,key,title,kind,sort_order) values ('An approximate count helps us understand the scope. This does not automatically multiply your price.',true,true,0,100000,array[]::text[],true,'catalogue_size','About how many products or items do you have?','number',20) on conflict do nothing;
insert into public.chatbot_questions (help_text,required,allow_unsure,min_value,max_value,catalog_categories,active,key,title,kind,sort_order) values ('',true,true,0,100000,array[]::text[],true,'ordering','How should customers place orders?','single',30) on conflict do nothing;
insert into public.chatbot_questions (help_text,required,allow_unsure,min_value,max_value,catalog_categories,active,key,title,kind,sort_order) values ('',true,true,0,100000,array[]::text[],true,'payments','How would you like to collect payments?','single',40) on conflict do nothing;
insert into public.chatbot_questions (help_text,required,allow_unsure,min_value,max_value,catalog_categories,active,key,title,kind,sort_order) values ('',true,true,0,100000,array[]::text[],true,'delivery','How will customers receive their orders?','multi',50) on conflict do nothing;
insert into public.chatbot_questions (help_text,required,allow_unsure,min_value,max_value,catalog_categories,active,key,title,kind,sort_order) values ('Choose only what you need. Custom features will be reviewed by our team.',false,true,0,100000,array['core']::text[],true,'features','Which website or system features do you need?','features',60) on conflict do nothing;
insert into public.chatbot_questions (help_text,required,allow_unsure,min_value,max_value,catalog_categories,active,key,title,kind,sort_order) values ('This helps us suggest a suitable scope. It does not change the catalogue prices.',true,true,0,100000,array[]::text[],true,'budget','What budget range are you planning for?','single',70) on conflict do nothing;
insert into public.chatbot_questions (help_text,required,allow_unsure,min_value,max_value,catalog_categories,active,key,title,kind,sort_order) values ('This is a preference. Delivery is confirmed after scope review.',false,true,0,100000,array[]::text[],true,'target_date','Do you have a preferred launch date?','date',80) on conflict do nothing;
insert into public.chatbot_questions (help_text,required,allow_unsure,min_value,max_value,catalog_categories,active,key,title,kind,sort_order) values ('Optional services may have recurring or third-party charges.',false,true,0,100000,array['third_party','maintenance']::text[],true,'extras','Would you like any additional services?','features',90) on conflict do nothing;
insert into public.chatbot_questions (help_text,required,allow_unsure,min_value,max_value,catalog_categories,active,key,title,kind,sort_order) values ('',true,false,0,100000,array[]::text[],true,'billing_period','How would you prefer to pay for recurring services?','billing',100) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('business_goal','online_sales','Sell products online','Product catalogue, ordering and checkout',array['online shop','online system','bakery','store','sell','ecommerce','e-commerce','网上','面包','kedai','jualan']::text[],true,1) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('business_goal','custom_orders','Accept custom orders','For example, made-to-order cakes or personalized products',array['custom cake','custom order','cake','personalized','蛋糕','tempahan']::text[],true,2) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('business_goal','management','Manage internal operations','Stock, orders, staff tools or reporting',array['inventory','stock','dashboard','staff','management','管理','库存','stok']::text[],true,3) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('ordering','enquiry','Enquiries through WhatsApp','Customers discuss their order with you',array[]::text[],true,4) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('ordering','checkout','Website cart and checkout','Customers submit an order through your website',array[]::text[],true,5) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('ordering','both','Both enquiries and checkout','Support both types of orders',array[]::text[],true,6) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('payments','online','Online payments','Provider and integration scope will be confirmed',array[]::text[],true,7) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('payments','manual','Manual payment or pay on collection','For example, transfer or payment on pickup',array[]::text[],true,8) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('delivery','pickup','Customer pickup','Customers collect their orders',array[]::text[],true,9) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('delivery','delivery','Delivery','Delivery coverage and integration need scoping',array[]::text[],true,10) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('budget','under_1000','Below RM1,000','',array[]::text[],true,11) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('budget','range_1000_3000','RM1,000–RM3,000','',array[]::text[],true,12) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('budget','range_3000_10000','RM3,000–RM10,000','',array[]::text[],true,13) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('budget','over_10000','Above RM10,000','',array[]::text[],true,14) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('billing_period','monthly','Monthly','Recurring services billed monthly',array[]::text[],true,15) on conflict do nothing;
insert into public.chatbot_options (question_key,value,label,description,keywords,active,sort_order) values ('billing_period','yearly','Annual','Apply each service’s configured annual free months',array[]::text[],true,16) on conflict do nothing;
insert into public.chatbot_rules (question_key,source_key,operator,values,active,sort_order) values ('catalogue_size','business_goal','includes_any',array['online_sales','custom_orders']::text[],true,1) on conflict do nothing;
insert into public.chatbot_rules (question_key,source_key,operator,values,active,sort_order) values ('ordering','business_goal','includes_any',array['online_sales','custom_orders']::text[],true,1) on conflict do nothing;
insert into public.chatbot_rules (question_key,source_key,operator,values,active,sort_order) values ('payments','business_goal','includes_any',array['online_sales','custom_orders']::text[],true,1) on conflict do nothing;
insert into public.chatbot_rules (question_key,source_key,operator,values,active,sort_order) values ('delivery','business_goal','includes_any',array['online_sales','custom_orders']::text[],true,1) on conflict do nothing;
insert into public.chatbot_rules (question_key,source_key,operator,values,active,sort_order) values ('billing_period','$has_recurring','equals',array['true']::text[],true,1) on conflict do nothing;
insert into public.chatbot_test_cases (name,kind,prompt,expected_action,expected_terms,forbidden_terms,active,sort_order) values ('Bakery request starts guided planning','answer','I want an online system for my bakery shop','guide',array['scope']::text[],array[]::text[],true,1) on conflict do nothing;
insert into public.chatbot_test_cases (name,kind,prompt,expected_action,expected_terms,forbidden_terms,active,sort_order) values ('Unknown information goes to the team','answer','What is the owner’s favourite holiday destination?','handoff',array['team']::text[],array[]::text[],true,2) on conflict do nothing;
insert into public.chatbot_test_cases (name,kind,prompt,expected_action,expected_terms,forbidden_terms,active,sort_order) values ('A meeting preference is not a booking','answer','Is my preferred meeting date a confirmed booking?','answer',array['not a confirmed booking']::text[],array['guaranteed booking']::text[],true,3) on conflict do nothing;
insert into public.chatbot_test_cases(name,kind,answers,expected_one_time,expected_monthly,expected_annual,sort_order)
values ('Uncertain scope has no invented catalogue charges','quote','{"business_goal":"__unsure__","budget":"__unsure__","features":[],"extras":[]}'::jsonb,0,0,0,4) on conflict do nothing;

commit;
