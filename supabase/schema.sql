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
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

alter table public.projects add column if not exists seo_title text not null default '';
alter table public.projects add column if not exists seo_description text not null default '';
alter table public.projects add column if not exists video_url text not null default '';

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
  "hero_title":"Digital, made more human.",
  "hero_description":"We build thoughtful websites and digital tools that help ambitious small businesses move forward.",
  "hero_cta":"Tell us what you’re building",
  "about_title":"A small team for the big next step.",
  "about_text":"Starting or growing a business is already a lot. We make the digital part feel clearer, with honest advice, considered design, and the people building your site by your side.",
  "seo_title":"Web Design & Development for Small Businesses | MV Studio",
  "seo_description":"Affordable web design and development for small businesses in Malaysia. Websites, e-commerce stores, custom web apps, and ongoing support.",
  "email_max":"fengzhen221@gmail.com",
  "email_vincent":"teovincentkq1611@gmail.com",
  "whatsapp_max":"60162238196",
  "whatsapp_vincent":"601154039173"
}'::jsonb) on conflict (id) do nothing;

update public.site_content
set content = jsonb_build_object(
  'seo_title', 'Web Design & Development for Small Businesses | MV Studio',
  'seo_description', 'Affordable web design and development for small businesses in Malaysia. Websites, e-commerce stores, custom web apps, and ongoing support.',
  'contact_emails', 'fengzhen221@gmail.com\nteovincentkq1611@gmail.com',
  'contact_phones', '+60 16-223 8196\n+60 11-5403 9173'
) || content
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
('Vincent Teo','Full-Stack Developer','Vincent builds responsive websites and reliable web applications with care for the details people use every day.','Vincent.webp','https://www.linkedin.com/in/kai-qi-vincent-teo-1596ab286/','https://github.com/VincentTeo1116/','https://vincent16-portfolio.vercel.app/',true,2)
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
