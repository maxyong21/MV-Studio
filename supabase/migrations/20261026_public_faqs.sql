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
