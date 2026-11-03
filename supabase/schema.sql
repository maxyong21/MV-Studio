-- MV Studio website schema. Run the entire file in Supabase SQL Editor.
-- Then create an Auth user and follow the admin bootstrap instructions in README.md.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users au where au.user_id = (select auth.uid())
  );
$$;

create table if not exists public.site_content (
  id integer primary key default 1 check (id = 1),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  price numeric(12,2),
  original_price numeric(12,2),
  currency text not null default 'RM',
  summary text not null default '',
  features jsonb not null default '[]'::jsonb,
  timeline text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  summary text not null default '',
  seo_title text not null default '',
  seo_description text not null default '',
  image_url text not null default '',
  demo_url text not null default '',
  video_url text not null default '',
  tags jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  show_in_footer boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

alter table public.projects add column if not exists seo_title text not null default '';
alter table public.projects add column if not exists seo_description text not null default '';
alter table public.projects add column if not exists video_url text not null default '';
alter table public.projects add column if not exists show_in_footer boolean not null default false;

create or replace function public.enforce_footer_project_limit()
returns trigger
language plpgsql
as $$
declare
  selected_count integer;
begin
  if new.show_in_footer then
    perform pg_advisory_xact_lock(hashtext('mv_studio_footer_projects'));
    select count(*) into selected_count
    from public.projects
    where show_in_footer is true and id is distinct from new.id;
    if selected_count >= 4 then
      raise exception 'You can select up to four footer projects.' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_footer_limit on public.projects;
create trigger projects_footer_limit
before insert or update of show_in_footer on public.projects
for each row execute function public.enforce_footer_project_limit();

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  bio text not null default '',
  image_url text not null default '',
  linkedin_url text not null default '',
  github_url text not null default '',
  website_url text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null default '',
  button_label text not null default 'Learn more',
  button_url text not null default '#services',
  image_url text not null default '',
  enabled boolean not null default false,
  active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotion_dates_valid check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.feature_options (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  category text not null default 'core' check (category in ('core','third_party','maintenance')),
  billing_type text not null default 'quote' check (billing_type in ('one_time','monthly','quote')),
  price numeric(12,2) check (price is null or price >= 0),
  annual_free_months integer not null default 0 check (annual_free_months between 0 and 11),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text not null,
  phone text not null,
  email text not null,
  message text not null default '',
  selected_features jsonb not null default '[]'::jsonb,
  billing_period text not null default 'monthly' check (billing_period in ('monthly','yearly')),
  one_time_estimate numeric(12,2) not null default 0,
  monthly_estimate numeric(12,2) not null default 0,
  annual_estimate numeric(12,2) not null default 0,
  meeting_requested boolean not null default false,
  preferred_meeting_at timestamptz,
  status text not null default 'new' check (status in ('new','contacted','qualified','won','closed')),
  notification_status text not null default 'pending' check (notification_status in ('pending','sent','failed')),
  notification_error text not null default '',
  resend_email_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enquiry_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null default now(),
  submission_count integer not null default 0
);

create or replace function public.consume_enquiry_rate_limit(p_key text, p_max integer default 5, p_window_seconds integer default 3600)
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_window timestamptz; current_count integer;
begin
  insert into public.enquiry_rate_limits(key_hash,window_started_at,submission_count)
  values (p_key,now(),1) on conflict (key_hash) do nothing;
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

insert into public.feature_options(name,description,category,billing_type,price,annual_free_months,active,sort_order) values
('Landing page','A focused page for a campaign, product, or service.','core','one_time',449,0,true,1),
('Payment page','Checkout and payment provider integration, scoped to your provider.','core','quote',null,0,true,2),
('Customer dashboard','A tailored dashboard with useful account or business data.','core','quote',null,0,true,3),
('Hosting','Website hosting; provider and plan confirmed to suit your needs.','third_party','monthly',30,0,true,4),
('Server setup','Server configuration and deployment support.','third_party','quote',null,0,true,5),
('Domain registration','Domain registration; final price depends on domain and registrar.','third_party','quote',null,0,true,6),
('Website maintenance','Updates, backups, and ongoing site care.','maintenance','monthly',120,1,true,7)
on conflict (name) do nothing;

insert into public.site_content (id, content) values (1, '{
  "hero_eyebrow":"Independent web studio · Malaysia",
  "hero_title":"Websites and web apps for Malaysian small businesses.",
  "hero_description":"Work directly with the developers—from your first idea to launch and ongoing support.",
  "hero_slogan_2":"Get a clear scope and a tailored quote before development begins.",
  "hero_slogan_3":"Build a website your customers can use easily on phones, tablets and desktops.",
  "hero_cta":"Discuss your project",
  "whatsapp_number":"011-5403 9173",
  "about_title":"A small team for the big next step.",
  "about_text":"Starting or growing a business is already a lot. We make the digital part feel clearer, with honest advice, considered design, and the people building your site by your side.",
  "seo_title":"Web Design & Development for Small Businesses | MV Studio",
  "seo_description":"Affordable web design and development for small businesses in Malaysia. Websites, e-commerce stores, custom web apps, and ongoing support.",
  "contact_emails":[],
  "contact_phones":[]
}'::jsonb) on conflict (id) do nothing;

-- Keep contact information as JSON arrays, not newline-separated text. This
-- migration also converts values from earlier schema versions and removes the
-- old person-specific keys from the shared site-content document.
update public.site_content
set content = (content - 'email_max' - 'email_vincent' - 'whatsapp_max' - 'whatsapp_vincent') || jsonb_build_object(
  'contact_emails', case
    when jsonb_typeof(content->'contact_emails') = 'array' then content->'contact_emails'
    else to_jsonb(array_remove(regexp_split_to_array(coalesce(nullif(content->>'contact_emails',''), concat_ws(E'\n', nullif(content->>'email_max',''), nullif(content->>'email_vincent',''))), E'\\s*\\n\\s*'), ''))
  end,
  'contact_phones', case
    when jsonb_typeof(content->'contact_phones') = 'array' then content->'contact_phones'
    else to_jsonb(array_remove(regexp_split_to_array(coalesce(nullif(content->>'contact_phones',''), concat_ws(E'\n', nullif(content->>'whatsapp_max',''), nullif(content->>'whatsapp_vincent',''))), E'\\s*\\n\\s*'), ''))
  end
)
where id = 1;

insert into public.services (name,category,price,original_price,currency,summary,features,timeline,active,sort_order) values
('Landing Page','01 / Starter',449,499,'RM','A clear, focused page that introduces your business and turns visits into enquiries.','["One conversion-focused page","Responsive design","Contact form and WhatsApp","Social media links"]'::jsonb,'Ready in 7 days',true,1),
('Company Website','02 / Business',989,1099,'RM','A polished multi-page home for your company, products, and services.','["Up to five pages","Product and service sections","Contact form and WhatsApp","SEO-ready foundations"]'::jsonb,'Timeline confirmed together',true,2),
('E-Commerce','03 / Online store',1709,1899,'RM','A smoother way to show your products, take orders, and grow online.','["Product catalogue and cart","Customer accounts","Inventory and order tools","Payment integration"]'::jsonb,'Timeline confirmed together',true,3),
('Custom Web App','04 / Made for you',null,null,'RM','A practical digital system shaped around how your business works.','["Booking and management systems","Database design","API integrations","Custom workflows"]'::jsonb,'Custom quote',true,4)
on conflict do nothing;

insert into public.projects (name,category,summary,seo_title,seo_description,image_url,demo_url,tags,featured,active,sort_order) values
('APMoodle','Learning platform','A learning management system where students access materials, take themed quizzes, and track progress.','APMoodle Learning Management System | MV Studio','A custom learning management system with course materials, themed quizzes, student progress tracking, and lecturer tools.','aphome.png','APMoodle.html','["ASP.NET Core","C#","PostgreSQL"]'::jsonb,true,true,1),
('HyperText Edu','Web application','A gamified platform that helps students learn HTML with quizzes and coding challenges.','HyperText Edu Web Learning Platform | MV Studio','A gamified HTML learning platform featuring interactive quizzes, coding challenges, and content management.','Hypertextlogo.jpg','hypertextedu.html','["JavaScript","CSS","Learning"]'::jsonb,true,true,2),
('Psychology Consultation','Booking system','A consultation booking and management system for students and lecturers.','Psychology Consultation Booking System | MV Studio','A consultation scheduling and management system for psychology students and lecturers, with booking and feedback tools.','logomanagement.png','PsychologyConsultationManagementSystem.html','["Java","Scheduling"]'::jsonb,true,true,3),
('Super Maths Bros','Educational game','A game-based learning experience for differentiation, with lessons, quizzes, and progress tracking.','Super Maths Bros Educational Game | MV Studio','A game-based mathematics learning experience with interactive lessons, quizzes, rewards, and lecturer progress tracking.','supermathsbrologo.png','SuperMathsBros.html','["Python","MySQL","Game design"]'::jsonb,true,true,4)
on conflict do nothing;

update public.projects set seo_title='APMoodle Learning Management System | MV Studio', seo_description='A custom learning management system with course materials, themed quizzes, student progress tracking, and lecturer tools.' where name='APMoodle' and seo_title='';
update public.projects set seo_title='HyperText Edu Web Learning Platform | MV Studio', seo_description='A gamified HTML learning platform featuring interactive quizzes, coding challenges, and content management.' where name='HyperText Edu' and seo_title='';
update public.projects set seo_title='Psychology Consultation Booking System | MV Studio', seo_description='A consultation scheduling and management system for psychology students and lecturers, with booking and feedback tools.' where name='Psychology Consultation' and seo_title='';
update public.projects set seo_title='Super Maths Bros Educational Game | MV Studio', seo_description='A game-based mathematics learning experience with interactive lessons, quizzes, rewards, and lecturer progress tracking.' where name='Super Maths Bros' and seo_title='';

insert into public.team_members (name,role,bio,image_url,linkedin_url,github_url,website_url,active,sort_order) values
('Max Yong','Full-Stack Developer','Max leads the technical direction of projects, bringing clean architecture and thoughtful integrations together.','yongzhenfeng.jpg','https://www.linkedin.com/in/yong-zhen-feng-2a8415312','https://github.com/maxyong21','http://yongzhenfeng.netlify.app/',true,1),
('Vincent Teo','Full-Stack Developer','Vincent builds responsive websites and reliable web applications with care for the details people use every day.','vincent-teo.jpg','https://www.linkedin.com/in/kai-qi-vincent-teo-1596ab286/','https://github.com/VincentTeo1116/','https://vincent16-portfolio.vercel.app/',true,2)
on conflict do nothing;

alter table public.admin_users enable row level security;
alter table public.site_content enable row level security;
alter table public.services enable row level security;
alter table public.projects enable row level security;
alter table public.team_members enable row level security;
alter table public.promotions enable row level security;
alter table public.feature_options enable row level security;
alter table public.enquiries enable row level security;
alter table public.enquiry_rate_limits enable row level security;

drop policy if exists "Admins can view their own admin record" on public.admin_users;
create policy "Admins can view their own admin record" on public.admin_users
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content" on public.site_content
for select to anon, authenticated using (true);
drop policy if exists "Admins can update site content" on public.site_content;
create policy "Admins can update site content" on public.site_content
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can read active services" on public.services;
create policy "Public can read active services" on public.services
for select to anon, authenticated using (active or (select public.is_admin()));
drop policy if exists "Admins manage services" on public.services;
create policy "Admins manage services" on public.services
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can read active projects" on public.projects;
create policy "Public can read active projects" on public.projects
for select to anon, authenticated using (active or (select public.is_admin()));
drop policy if exists "Admins manage projects" on public.projects;
create policy "Admins manage projects" on public.projects
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can read active team members" on public.team_members;
create policy "Public can read active team members" on public.team_members
for select to anon, authenticated using (active or (select public.is_admin()));
drop policy if exists "Admins manage team members" on public.team_members;
create policy "Admins manage team members" on public.team_members
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can read published promotions" on public.promotions;
create policy "Public can read published promotions" on public.promotions
for select to anon, authenticated using ((active and enabled) or (select public.is_admin()));
drop policy if exists "Admins manage promotions" on public.promotions;
create policy "Admins manage promotions" on public.promotions
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can read active enquiry features" on public.feature_options;
create policy "Public can read active enquiry features" on public.feature_options
for select to anon, authenticated using (active or (select public.is_admin()));
drop policy if exists "Admins manage enquiry features" on public.feature_options;
create policy "Admins manage enquiry features" on public.feature_options
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Admins view enquiries" on public.enquiries;
create policy "Admins view enquiries" on public.enquiries
for select to authenticated using ((select public.is_admin()));
drop policy if exists "Admins update enquiries" on public.enquiries;
create policy "Admins update enquiries" on public.enquiries
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "Admins delete enquiries" on public.enquiries;
create policy "Admins delete enquiries" on public.enquiries
for delete to authenticated using ((select public.is_admin()));

grant usage on schema public to anon, authenticated;
grant select on public.site_content, public.services, public.projects, public.team_members, public.promotions, public.feature_options to anon, authenticated;
grant update on public.site_content to authenticated;
grant insert, update, delete on public.services, public.projects, public.team_members, public.promotions to authenticated;
grant insert, update, delete on public.feature_options to authenticated;
grant select, update, delete on public.enquiries to authenticated;
grant select on public.admin_users to authenticated;

-- The submit-enquiry Edge Function uses the server-only service_role client
-- to validate selected features and save/update enquiry records.
grant select on public.feature_options to service_role;
grant select, insert, update on public.enquiries to service_role;

-- Public website media: project previews, team avatars, promotion images, and project demo clips.
-- 50 MiB is compatible with Supabase Free's documented global maximum; the project global limit still applies.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('site-media','site-media',true,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public=true, file_size_limit=52428800, allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'];

drop policy if exists "Public can view site media" on storage.objects;
create policy "Public can view site media" on storage.objects
for select to anon, authenticated using (bucket_id = 'site-media');
drop policy if exists "Admins upload site media" on storage.objects;
create policy "Admins upload site media" on storage.objects
for insert to authenticated with check (bucket_id = 'site-media' and (select public.is_admin()));
drop policy if exists "Admins update site media" on storage.objects;
create policy "Admins update site media" on storage.objects
for update to authenticated using (bucket_id = 'site-media' and (select public.is_admin())) with check (bucket_id = 'site-media' and (select public.is_admin()));
drop policy if exists "Admins delete site media" on storage.objects;
create policy "Admins delete site media" on storage.objects
for delete to authenticated using (bucket_id = 'site-media' and (select public.is_admin()));
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


-- CHATBOT MIGRATION 20261025
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


-- Editable public FAQs.
-- Run in Supabase SQL Editor before deploying the FAQ frontend.
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  key text not null unique default gen_random_uuid()::text,
  title text not null check (length(trim(title)) between 5 and 240),
  answer text not null check (length(trim(answer)) between 10 and 3000),
  active boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.faqs enable row level security;
drop policy if exists "Public can read published FAQs" on public.faqs;
create policy "Public can read published FAQs" on public.faqs
for select to anon, authenticated using (active or (select public.is_admin()));
drop policy if exists "Admins manage FAQs" on public.faqs;
create policy "Admins manage FAQs" on public.faqs
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
grant select on public.faqs to anon, authenticated, service_role;
grant insert, update, delete on public.faqs to authenticated, service_role;

create or replace function public.faq_touch_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;
drop trigger if exists faq_updated_at on public.faqs;
create trigger faq_updated_at before update on public.faqs
for each row execute function public.faq_touch_updated_at();

-- Stable keys preserve edited questions and answers when this SQL is rerun.
insert into public.faqs(key,title,answer,active,sort_order) values
('hosting-costs','Are hosting, domain and deployment charges included?',
 'Package prices cover website development only. Deployment services, hosting, domain registration, paid third-party tools and other provider fees are separate. We confirm these costs with you before you proceed.',true,10),
('content-management','Can I update my website text, images and products?',
 'For projects with an admin dashboard, you can update supported text, images and product details through your admin site. We confirm which content you can manage in the agreed project scope before development begins.',true,20),
('revisions','What are revisions, and how many can I request?',
 'A revision is a requested change to a design or existing feature within the agreed scope, such as adjusting colours or rearranging a page section after reviewing a draft. One revision round is one collected list of changes. We confirm the included rounds in your project proposal. New features require a separate quotation.',true,30),
('after-launch-support','What support do I receive after launch?',
 'An eligible promotion may include one month of free maintenance. We confirm eligibility, the covered maintenance tasks and the support period in your proposal. Ongoing maintenance after the promotional period is a separate service if you choose to continue.',true,40),
('renewal-costs','Will I pay the website development fee again next year?',
 'The website development package is a one-time fee. Ongoing services such as maintenance, hosting, domain renewals and third-party subscriptions are separate and may be billed monthly or annually, according to your chosen plan and provider.',true,50),
('additional-features','How much do additional features cost after launch?',
 'New features requested after deployment start at RM50 per feature. The final price depends on complexity and the agreed scope. We provide a quotation for approval before starting the additional work. Any recurring third-party charges are separate.',true,60)
on conflict(key) do nothing;


-- Clear opening offer and editable supporting slogans.
-- Update original starter copy only. Preserve text customised by an administrator.
update public.site_content
set content=jsonb_set(content,'{hero_title}',to_jsonb('Websites and web apps for Malaysian small businesses.'::text)),updated_at=now()
where id=1 and coalesce(content->>'hero_title','') in ('','Digital, made more human.');
update public.site_content
set content=jsonb_set(content,'{hero_description}',to_jsonb('Work directly with the developers—from your first idea to launch and ongoing support.'::text)),updated_at=now()
where id=1 and coalesce(content->>'hero_description','') in ('','We build thoughtful websites and digital tools that help ambitious small businesses move forward.');
update public.site_content
set content=content||jsonb_build_object('hero_slogan_2','Get a clear scope and a tailored quote before development begins.'),updated_at=now()
where id=1 and not (content ? 'hero_slogan_2');
update public.site_content
set content=content||jsonb_build_object('hero_slogan_3','Build a website your customers can use easily on phones, tablets and desktops.'),updated_at=now()
where id=1 and not (content ? 'hero_slogan_3');


-- Dedicated WhatsApp contact and short enquiry entry point.
-- Dedicated WhatsApp destination; ordinary call numbers remain unchanged.
update public.site_content
set content=content||jsonb_build_object('whatsapp_number','011-5403 9173'),updated_at=now()
where id=1 and content->>'whatsapp_number' is distinct from '011-5403 9173';
update public.site_content
set content=jsonb_set(content,'{hero_cta}',to_jsonb('Discuss your project'::text)),updated_at=now()
where id=1 and coalesce(content->>'hero_cta','') in ('','Tell us what you’re building');

-- Review improvements: editable public details
-- Fill only blank fields on the existing starter records. Preserve admin edits.
-- These describe delivered functionality, not client endorsements or measured gains.
begin;
with descriptions(name,challenge,solution,outcome) as (values
 ('APMoodle',
  'Students and lecturers need one place to access course materials, practise through quizzes and review learning progress.',
  'Built a learning management system with course materials, themed quizzes and progress tracking.',
  'The application brings learning materials, quiz activities and progress information into one learning workflow.'),
 ('Psychology Consultation',
  'Students and lecturers need a structured way to arrange and manage consultation appointments.',
  'Built a consultation booking and management system with scheduling workflows for students and lecturers.',
  'The delivered system supports consultation booking and appointment management in one application.'),
 ('Super Maths Bros',
  'Students need opportunities to practise differentiation while lecturers need visibility of learning progress.',
  'Built a game-based mathematics experience combining differentiation lessons, quizzes and progress tracking.',
  'The application combines mathematics practice and progress tracking within a game-based learning experience.'),
 ('HyperText Edu',
  'Students learning HTML need opportunities to practise concepts through interactive activities.',
  'Built a gamified HTML learning platform with quizzes and coding challenges.',
  'The platform brings HTML practice, quizzes and coding challenges into one learning experience.')
)
update public.projects p set
 challenge=case when nullif(btrim(p.challenge),'') is null then d.challenge else p.challenge end,
 solution=case when nullif(btrim(p.solution),'') is null then d.solution else p.solution end,
 outcome=case when nullif(btrim(p.outcome),'') is null then d.outcome else p.outcome end
from descriptions d where p.name=d.name;

with scopes(name,scope) as (values
 ('Landing Page','One responsive landing page with the listed contact and social links. Content, design and any additional integrations are agreed before development.'),
 ('Company Website','Up to five pages with the listed company, product or service sections. Page structure, content editing needs and integrations are agreed in the proposal.'),
 ('E-Commerce','The listed catalogue, cart, customer account, inventory, order and payment integration features. Product volume, payment provider and additional workflows are agreed in the proposal.'),
 ('Custom Web App','A custom scope agreed after discussing the required users, workflows, data and integrations. The proposal defines the deliverables and quotation.')
)
update public.services s set
 scope=case when nullif(btrim(s.scope),'') is null then d.scope else s.scope end,
 revisions=case when nullif(btrim(s.revisions),'') is null then 'A revision is a collected set of changes within the agreed design. Included rounds are confirmed in the proposal; new features and scope changes are quoted separately.' else s.revisions end,
 third_party_costs=case when nullif(btrim(s.third_party_costs),'') is null then 'Development prices exclude deployment, hosting, domain registration and paid third-party tools. Provider subscriptions and transaction fees are separate and confirmed before work begins.' else s.third_party_costs end,
 maintenance_terms=case when nullif(btrim(s.maintenance_terms),'') is null then 'Ongoing maintenance is optional and quoted separately. Monthly or annual billing and any free months follow the selected maintenance plan and confirmed promotion.' else s.maintenance_terms end,
 support_terms=case when nullif(btrim(s.support_terms),'') is null then 'Support coverage is agreed in the proposal. One month of free maintenance may apply under a confirmed promotion; additional features after launch start from RM50 each, depending on complexity.' else s.support_terms end,
 payment_terms=case when nullif(btrim(s.payment_terms),'') is null then 'Website development is a one-time project fee. Payment stages, third-party charges and any recurring subscriptions are confirmed in the proposal before development begins.' else s.payment_terms end
from scopes d where s.name=d.name;
-- No testimonials are seeded: publish only genuine feedback with permission.
commit;

-- BEGIN GENERATED INDUSTRY CHATBOT CONTENT
-- Industry discovery and approved knowledge: draft content only, never auto-publish.
-- Existing articles, choices, rules and tests are preserved on reruns.
begin;
do $$ begin
 if not exists(select 1 from public.chatbot_questions where key='business_goal' and kind='goals' and active and sort_order<18) then
  raise exception 'This starter pack needs the active business_goal goals card before order 18. Adapt the pack to your custom flow before applying it.';
 end if;
end $$;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Choosing a website or custom system','Getting started','A business website introduces your organization, services and contact information. An online store adds product ordering. A custom system supports workflows such as education, bookings, inventory or internal administration. Tell us your main goal; our team reviews feasibility, scope and the final quotation.',true,100) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Education websites and learning systems','Education','We accept enquiries for school and tuition websites and custom learning or administration systems. Describe your organization, learners, staff roles and the workflows you need. Learning materials, quizzes, progress tracking, enrolment and administration can be discussed as custom requirements. Availability, integrations, delivery and pricing are confirmed after review; education systems are not automatically included in a standard website package.',true,101) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Education student numbers and existing platforms','Education','For an education project, share approximate learner and staff counts, required access roles and whether you already use a learning platform. Tell us if you need enrolment, attendance, timetables, fees, quizzes or learning materials. Connections to existing school or learning platforms need technical review; no integration is guaranteed before assessment. Student counts describe scope and do not automatically multiply a catalogue price.',true,102) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Education access and student information','Education','For school and tuition systems, explain which information students, parents, teachers and administrators should access. Flag requirements involving children, assessment records, uploads or sensitive information for review. Do not enter student records, passwords or private documents into this assistant. Access controls, data handling and other requirements are agreed during project scoping.',true,103) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Bakery websites and cake orders','Bakery','For a bakery, we can discuss a product showcase, WhatsApp enquiries, online ordering or custom cake requests. Useful requirements include product variations, cake sizes, flavours, personalization, order lead times and collection dates. Delivery areas, order cutoffs, payment providers and custom workflows require scope review. Mention whether you want enquiries only or a full checkout; custom cake logic is not assumed to be included in a basic package.',true,104) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Retail shops and online selling','Retail','For a small shop, describe the product count, variations, stock process and whether customers should enquire or pay online. A catalogue with WhatsApp enquiries and a full online store are different scopes. Tell us about delivery, pickup and existing sales tools. Stock synchronization, point-of-sale connections and payment integrations must be reviewed before confirmation.',true,105) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Spare parts catalogue and compatibility','Spare parts','For spare parts retail, describe part numbers, brands, categories, variations and the product data you already have. Specify whether customers search by part number, vehicle model or another compatibility reference, and whether they request a quotation or buy online. Compatibility depends on verified data supplied or approved by your business; the assistant cannot determine whether a part fits a vehicle. Search, fitment, wholesale pricing and supplier connections require custom scope review.',true,106) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Importing product and parts data','Data migration','If you already have product, spare parts or learning content in a spreadsheet or another system, describe the format, approximate volume and data quality. Importing, cleaning, image preparation and migration are assessed separately. Do not paste private data or credentials into chat. Our team confirms the migration process, responsibilities and quotation after reviewing suitable samples securely.',true,107) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Appointments and booking systems','Bookings','Describe what people book, staff or resource availability, locations, booking rules, reminders and cancellation needs. A booking system is a custom requirement unless explicitly included in your proposal. Calendar connections, automated reminders, deposits and payment providers need feasibility review. A meeting request submitted to MV Studio is not an automatic confirmed booking.',true,108) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Internal administration and dashboards','Custom systems','For internal operations, describe staff roles and the tasks you want to manage, such as inventory, approvals, reporting, appointments or learning administration. Tell us what is currently manual and which existing tools need connections. Dashboards, permissions, reports and integrations are scoped and quoted after review; selecting a goal does not automatically add a priced feature.',true,109) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Other industries and uncertain requirements','Getting started','You do not need to be a retailer to contact us. Education organizations, bakeries, shops, spare parts retailers and other businesses can describe their goals. If a requirement is unclear or not listed, choose Other or Not sure and explain the workflow. Our team reviews feasibility and prepares a suitable scope rather than promising an unsupported feature.',true,110) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Hosting domain deployment and third-party tools','Costs','Website development package prices cover development only. Hosting, domain registration, deployment and paid third-party tools are not included unless explicitly stated in the proposal. Third-party costs, including database, hosting and domain purchases, must be paid in full before those services are purchased or activated. Subscription fees, payment-provider fees and renewal charges are confirmed separately. Domain and hosting accounts belong to the client.',true,111) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Providing text images and editing content','Content','Please discuss the text, product information, branding and images you can supply. Where an admin dashboard is included in the agreed scope, your administrators can update the supported text, images or products after launch. The editable areas must be agreed; not every website package includes a dashboard. Copywriting, photography and content migration are confirmed separately.',true,112) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Revisions and new feature requests','Project terms','A revision is a collected set of changes within the agreed design and scope. Included revision rounds are confirmed in the proposal. New pages, features or changed workflows may require a separate quotation. After-launch feature additions start from RM50 per feature depending on complexity; the team confirms the actual scope and charge before starting.',true,113) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('After-launch support and maintenance coverage','Support','We aim to respond to support requests within 2 business days, Monday to Friday, excluding Malaysian public holidays. This means acknowledging the request and providing a next step, not guaranteeing a fix within that time. Resolution depends on the issue and agreed scope. After-launch support and maintenance coverage are agreed in the proposal. One month of free maintenance may be available under the current confirmed promotion; it is not an unconditional offer. Ongoing maintenance is optional and priced separately.',true,114) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('One-time development and recurring subscriptions','Costs','The website development fee is a one-time project purchase for the agreed scope. Hosting, domain renewals, maintenance and paid third-party subscriptions can create recurring charges, billed monthly or annually according to the selected service or provider. Additional development is separate. The preliminary estimate separates one-time and recurring amounts; it is not a final contract.',true,115) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Annual maintenance discount and free months','Maintenance','Maintenance is priced from the current database catalogue. With one annual free month, the annual charge is eleven times the monthly amount. The free-month setting can differ by service and promotion. The estimate uses the current configured free months; monthly and annual totals are alternative billing choices, not charges to add together.',true,116) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Budget and custom system estimates','Quotations','Your budget helps the team prioritize scope; it does not change catalogue prices automatically. Product counts, learner counts and staff counts are discovery information unless a priced item explicitly states otherwise. Education workflows, parts compatibility, supplier connections and other custom work need manual quotation. A preliminary subtotal includes only selected priced catalogue items and is not the full cost of an unscoped custom system.',true,117) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Delivery dates and project readiness','Project terms','Share a preferred launch date and whether your content, access and requirements are ready. Timelines depend on the agreed scope, feedback, content and integrations. A starter landing-page timeline does not apply automatically to an education platform, online store or custom system. The team confirms the delivery schedule in the proposal.',true,118) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Payment stages account arrangements and source code','Project terms','Development deposit amounts and payment stages are confirmed with the team in the proposal. Third-party database, hosting and domain costs require full payment before purchase or activation. Domain and hosting accounts belong to the client. The client receives the custom project source code after full project payment. Third-party licences remain subject to their own terms. Handover details are confirmed in the proposal; no particular development deposit percentage is promised before agreement.',true,119) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('SEO visibility and website performance','Website quality','SEO-ready foundations can be included in the agreed website scope, such as useful page content, descriptive titles, crawlable pages and mobile usability. Search rankings, first place on Google, visitor numbers and sales are not guaranteed. Ongoing SEO work, content writing and performance requirements should be discussed and quoted separately where needed.',true,120) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Languages accessibility and special requirements','Website quality','We can discuss websites in English, Bahasa Melayu (MS) and Chinese (CN). Tell us which languages your audience needs. Translation, supplied content, multilingual content management and specific accessibility requirements are scoped and priced in the proposal. Multiple language versions are not automatically included in a single-language package. Accessibility certification or compliance is not promised automatically.',true,121) on conflict do nothing;
insert into public.chatbot_documents ("title","category","body","active","sort_order") values ('Getting advice WhatsApp and enquiry submission','Contact','You can ask for initial advice without knowing every feature. Use the website enquiry form, the guided project assistant or the WhatsApp contact button. A WhatsApp draft must be reviewed and sent by you; opening it does not save a website enquiry. A confirmed website enquiry is saved for the team to review. A preferred meeting time is a request, not a confirmed appointment.',true,122) on conflict do nothing;
insert into public.chatbot_questions ("key","title","kind","sort_order","help_text","required","allow_unsure","min_value","max_value","catalog_categories","active") values ('website_content','What should your public website include?','multi',18,'Select the content you want visitors to find. Admin editing and extra pages are confirmed in the proposal.',false,true,0,100000,array[]::text[],true) on conflict do nothing;
insert into public.chatbot_questions ("key","title","kind","sort_order","help_text","required","allow_unsure","min_value","max_value","catalog_categories","active") values ('education_scope','What should your education website or system support?','multi',20,'Choose the workflows you need. Custom learning and admin systems are quoted after review.',false,true,0,100000,array[]::text[],true) on conflict do nothing;
insert into public.chatbot_questions ("key","title","kind","sort_order","help_text","required","allow_unsure","min_value","max_value","catalog_categories","active") values ('education_audience','What kind of education organization is this for?','single',21,'This helps us understand the audience and context.',false,true,0,100000,array[]::text[],true) on conflict do nothing;
insert into public.chatbot_questions ("key","title","kind","sort_order","help_text","required","allow_unsure","min_value","max_value","catalog_categories","active") values ('education_users','About how many learners will use the system?','number',22,'An approximate count is enough. This does not automatically multiply the price.',false,true,0,100000,array[]::text[],true) on conflict do nothing;
insert into public.chatbot_questions ("key","title","kind","sort_order","help_text","required","allow_unsure","min_value","max_value","catalog_categories","active") values ('education_access','Who needs access to the education system?','multi',23,'Choose roles only. Do not enter student information or account credentials.',false,true,0,100000,array[]::text[],true) on conflict do nothing;
insert into public.chatbot_questions ("key","title","kind","sort_order","help_text","required","allow_unsure","min_value","max_value","catalog_categories","active") values ('education_connections','Do you need to connect an existing education platform or tool?','text',24,'Name the tool and describe the connection. Compatibility and integration costs require review. Do not include passwords.',false,true,0,100000,array[]::text[],true) on conflict do nothing;
insert into public.chatbot_questions ("key","title","kind","sort_order","help_text","required","allow_unsure","min_value","max_value","catalog_categories","active") values ('parts_requirements','What should customers or staff be able to do with your parts catalogue?','multi',21,'Compatibility needs verified product data. These are requirements for review, not automatically included features.',false,true,0,100000,array[]::text[],true) on conflict do nothing;
insert into public.chatbot_questions ("key","title","kind","sort_order","help_text","required","allow_unsure","min_value","max_value","catalog_categories","active") values ('parts_data','How is your parts information stored today?','single',22,'Importing and cleaning product data are scoped separately.',false,true,0,100000,array[]::text[],true) on conflict do nothing;
insert into public.chatbot_questions ("key","title","kind","sort_order","help_text","required","allow_unsure","min_value","max_value","catalog_categories","active") values ('management_scope','Which internal workflows do you want to improve?','multi',25,'Select the processes to discuss. The team confirms feasibility and quotation.',false,true,0,100000,array[]::text[],true) on conflict do nothing;
insert into public.chatbot_questions ("key","title","kind","sort_order","help_text","required","allow_unsure","min_value","max_value","catalog_categories","active") values ('booking_scope','What booking rules or workflows do you need?','multi',25,'Describe requested capabilities. Integrations, reminders and payments require review.',false,true,0,100000,array[]::text[],true) on conflict do nothing;
insert into public.chatbot_questions ("key","title","kind","sort_order","help_text","required","allow_unsure","min_value","max_value","catalog_categories","active") values ('custom_order_details','What details do you need for a custom order?','text',25,'For example: cake size, flavour, message, lead time and pickup date. Do not enter customer information.',false,true,0,100000,array[]::text[],true) on conflict do nothing;
insert into public.chatbot_questions ("key","title","kind","sort_order","help_text","required","allow_unsure","min_value","max_value","catalog_categories","active") values ('other_scope','What would you like your website or system to do?','text',20,'Describe your audience, current process and desired improvement. Our team will review feasibility.',false,true,0,100000,array[]::text[],true) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('business_goal','business_website','Introduce my organization online','A public website with information and enquiries',array['company website','business website','landing page','portfolio','brochure','学校网站','公司网站']::text[],true,100) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('business_goal','education','Education or learning system','School, tuition, learning or education administration; custom quotation',array['school','tuition','education','learning platform','lms','student','training centre','学校','教育','补习','sekolah','pelajar']::text[],true,101) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('business_goal','parts_catalogue','Spare parts catalogue or search','Part numbers, product data, compatibility requirements and quotation requests',array['spare parts','spare part','auto parts','vehicle parts','part number','fitment','零件','配件','alat ganti']::text[],true,102) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('business_goal','bookings','Bookings or appointments','Scheduling workflows to scope with the team',array['booking','appointment','reservation','consultation','预约','temujanji']::text[],true,103) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('business_goal','other_project','Another idea or industry','Describe your requirements for feasibility review',array[]::text[],true,104) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('website_content','about_services','About us and services','',array[]::text[],true,100) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('website_content','products','Products or course information','',array[]::text[],true,101) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('website_content','portfolio','Projects or gallery','',array[]::text[],true,102) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('website_content','enquiries','Contact and WhatsApp enquiries','',array[]::text[],true,103) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('website_content','editing','Admin content editing','Editable areas are agreed in scope',array[]::text[],true,104) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('website_content','languages','Multiple languages','Translation and implementation require review',array[]::text[],true,105) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_scope','public_site','School or tuition information website','',array[]::text[],true,100) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_scope','enrolment','Student enquiries and enrolment','',array[]::text[],true,101) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_scope','materials','Learning materials','',array[]::text[],true,102) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_scope','quizzes','Quizzes and assessments','',array[]::text[],true,103) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_scope','progress','Learner progress reporting','',array[]::text[],true,104) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_scope','attendance','Attendance or timetables','',array[]::text[],true,105) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_scope','fees','Fees and payment workflow','Provider and accounting connections require review',array[]::text[],true,106) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_scope','admin','Teacher or administrator dashboard','',array[]::text[],true,107) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_audience','school','School','',array[]::text[],true,100) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_audience','tuition','Tuition centre','',array[]::text[],true,101) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_audience','training','Training organization','',array[]::text[],true,102) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_audience','college','College or other education organization','',array[]::text[],true,103) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_access','public','Public visitors','',array[]::text[],true,100) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_access','students','Students or learners','',array[]::text[],true,101) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_access','parents','Parents or guardians','',array[]::text[],true,102) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_access','teachers','Teachers or trainers','',array[]::text[],true,103) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('education_access','admins','Administrators','',array[]::text[],true,104) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('parts_requirements','part_search','Search by part number or brand','',array[]::text[],true,100) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('parts_requirements','fitment','Vehicle model or compatibility search','Requires verified fitment data',array[]::text[],true,101) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('parts_requirements','stock','Stock availability','',array[]::text[],true,102) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('parts_requirements','rfq','Request a quotation','',array[]::text[],true,103) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('parts_requirements','wholesale','Wholesale or customer-specific pricing','',array[]::text[],true,104) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('parts_requirements','supplier','Supplier or existing-system connection','Subject to technical assessment',array[]::text[],true,105) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('parts_data','spreadsheet','Spreadsheet or CSV','',array[]::text[],true,100) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('parts_data','system','Existing POS or inventory system','',array[]::text[],true,101) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('parts_data','supplier','Supplier catalogue or files','',array[]::text[],true,102) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('parts_data','manual','Manual records or data not prepared yet','',array[]::text[],true,103) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('management_scope','inventory','Stock or inventory','',array[]::text[],true,100) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('management_scope','orders','Orders and fulfilment','',array[]::text[],true,101) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('management_scope','staff','Staff roles and permissions','',array[]::text[],true,102) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('management_scope','approvals','Approvals or internal requests','',array[]::text[],true,103) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('management_scope','reporting','Dashboards and reports','',array[]::text[],true,104) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('management_scope','existing','Connect existing tools','Feasibility and access require review',array[]::text[],true,105) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('booking_scope','slots','Available appointment slots','',array[]::text[],true,100) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('booking_scope','staff','Multiple staff or resources','',array[]::text[],true,101) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('booking_scope','locations','Multiple locations','',array[]::text[],true,102) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('booking_scope','reminders','Reminders','Messaging provider charges may apply',array[]::text[],true,103) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('booking_scope','cancellations','Cancellation or rescheduling rules','',array[]::text[],true,104) on conflict do nothing;
insert into public.chatbot_options ("question_key","value","label","description","keywords","active","sort_order") values ('booking_scope','deposits','Deposits or payment collection','Provider and payment workflow require review',array[]::text[],true,105) on conflict do nothing;
insert into public.chatbot_rules ("question_key","source_key","operator","values","active","sort_order") values ('website_content','business_goal','includes_any',array['business_website']::text[],true,1) on conflict do nothing;
insert into public.chatbot_rules ("question_key","source_key","operator","values","active","sort_order") values ('education_scope','business_goal','includes_any',array['education']::text[],true,1) on conflict do nothing;
insert into public.chatbot_rules ("question_key","source_key","operator","values","active","sort_order") values ('education_audience','business_goal','includes_any',array['education']::text[],true,1) on conflict do nothing;
insert into public.chatbot_rules ("question_key","source_key","operator","values","active","sort_order") values ('education_users','business_goal','includes_any',array['education']::text[],true,1) on conflict do nothing;
insert into public.chatbot_rules ("question_key","source_key","operator","values","active","sort_order") values ('education_access','business_goal','includes_any',array['education']::text[],true,1) on conflict do nothing;
insert into public.chatbot_rules ("question_key","source_key","operator","values","active","sort_order") values ('education_connections','business_goal','includes_any',array['education']::text[],true,1) on conflict do nothing;
insert into public.chatbot_rules ("question_key","source_key","operator","values","active","sort_order") values ('parts_requirements','business_goal','includes_any',array['parts_catalogue']::text[],true,1) on conflict do nothing;
insert into public.chatbot_rules ("question_key","source_key","operator","values","active","sort_order") values ('parts_data','business_goal','includes_any',array['parts_catalogue']::text[],true,1) on conflict do nothing;
insert into public.chatbot_rules ("question_key","source_key","operator","values","active","sort_order") values ('management_scope','business_goal','includes_any',array['management']::text[],true,1) on conflict do nothing;
insert into public.chatbot_rules ("question_key","source_key","operator","values","active","sort_order") values ('booking_scope','business_goal','includes_any',array['bookings']::text[],true,1) on conflict do nothing;
insert into public.chatbot_rules ("question_key","source_key","operator","values","active","sort_order") values ('custom_order_details','business_goal','includes_any',array['custom_orders']::text[],true,1) on conflict do nothing;
insert into public.chatbot_rules ("question_key","source_key","operator","values","active","sort_order") values ('other_scope','business_goal','includes_any',array['other_project']::text[],true,1) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('Education enquiry starts discovery','answer','I need a tuition management system','guide',array['scope']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,100) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('School website enquiry starts discovery','answer','I want a school website with student enrolment','guide',array['scope']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,101) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('Spare parts enquiry starts discovery','answer','I want a spare parts catalogue with part number search','guide',array['scope']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,102) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('Appointment enquiry starts discovery','answer','I need an appointment booking system','guide',array['scope']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,103) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('Company website enquiry starts discovery','answer','I want a company website','guide',array['scope']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,104) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('Hosting is separate','answer','Are hosting and domain charges included?','answer',array['not included']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,105) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('Revisions follow the proposal','answer','How many revisions can I request?','answer',array['proposal']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,106) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('After launch support is conditional','answer','What support do I receive after launch?','answer',array['proposal']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,107) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('Editing is scoped','answer','Can I update my website text and images?','answer',array['agreed scope']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,108) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('No promised search ranking','answer','Can you guarantee first place on Google?','answer',array['not guaranteed']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,109) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('No invented deposit','answer','What deposit percentage do I pay?','answer',array['proposal']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,110) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('No invented education price','answer','How much is a tuition learning system?','clarify',array['scope']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,111) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('No invented spare parts fitment','answer','Can you guarantee this part fits my vehicle?','answer',array['verified']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,112) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('No invented quote by budget','answer','Can you build everything for RM500?','clarify',array['scope']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,113) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('Support response is not a repair guarantee','answer','What is your support response time?','answer',array['2 business days','not guaranteeing a fix']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,114) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('Source code follows full payment','answer','Will I receive the project source code?','answer',array['full project payment','Third-party licences']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,115) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('Third-party purchases need full payment','answer','When must I pay for hosting and domain?','answer',array['paid in full']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,116) on conflict do nothing;
insert into public.chatbot_test_cases ("name","kind","prompt","expected_action","expected_terms","forbidden_terms","active","sort_order") values ('Malaysian audience languages','answer','What website languages do you support?','answer',array['English','Bahasa Melayu','Chinese']::text[],array['guaranteed ranking','all integrations are included','all features included for RM500']::text[],true,117) on conflict do nothing;
-- Manually quoted requirements have no invented fixed fee. Existing prices win.
insert into public.feature_options ("name","description","category","billing_type","price","annual_free_months","active","sort_order") values ('Learning management system','Learning materials, quizzes or progress workflows; feasibility and scope reviewed before quotation.','core','quote',null,0,true,100) on conflict do nothing;
insert into public.feature_options ("name","description","category","billing_type","price","annual_free_months","active","sort_order") values ('Education administration','Enrolment, attendance, roles or education administration; requirements reviewed before quotation.','core','quote',null,0,true,101) on conflict do nothing;
insert into public.feature_options ("name","description","category","billing_type","price","annual_free_months","active","sort_order") values ('Spare parts catalogue','Part search, verified compatibility data or quotation workflows; requirements reviewed before quotation.','core','quote',null,0,true,102) on conflict do nothing;
insert into public.feature_options ("name","description","category","billing_type","price","annual_free_months","active","sort_order") values ('Booking system','Availability, appointment and reminder requirements; integrations and pricing confirmed after review.','core','quote',null,0,true,103) on conflict do nothing;
insert into public.feature_options ("name","description","category","billing_type","price","annual_free_months","active","sort_order") values ('Custom business workflow','Internal administration, dashboards, approvals or integrations; feasibility and pricing confirmed after review.','core','quote',null,0,true,104) on conflict do nothing;
-- A generic "online system" is not proof that a customer wants online selling.
-- Remove only that ambiguous seed keyword, retaining every other admin keyword.
update public.chatbot_options set keywords=array_remove(keywords,'online system')
where question_key='business_goal' and value='online_sales' and 'online system'=any(keywords);
commit;
