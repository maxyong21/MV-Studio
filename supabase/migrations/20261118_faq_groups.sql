-- Run in the Supabase SQL Editor BEFORE deploying this version of the website.
-- Groups the public FAQs under three headings and adds one answer about the free call and quote.
-- Safe to run more than once. Your own wording is never changed; only the group is set,
-- and only on rows that still have the default group.
begin;

alter table public.faqs add column if not exists category text not null default 'general';
do $$ begin
 if not exists (select 1 from pg_constraint where conname='faqs_category_check') then
  alter table public.faqs add constraint faqs_category_check check (category in ('general','costs','process','support'));
 end if;
end $$;

insert into public.faqs(key,title,answer,active,sort_order,category) values
('free-call-and-quote','Do I pay anything before I get a quote?',
 'No. The first call and the written quote are free. You only pay the first 50% after you have accepted the quote and chosen to go ahead.',true,14,'costs')
on conflict(key) do nothing;

update public.faqs set category=case key
  when 'hosting-costs' then 'costs'
  when 'payment-and-refunds' then 'costs'
  when 'free-call-and-quote' then 'costs'
  when 'renewal-costs' then 'costs'
  when 'timeline-and-replies' then 'process'
  when 'revisions' then 'process'
  when 'content-management' then 'support'
  when 'after-launch-support' then 'support'
  when 'additional-features' then 'support'
  else category end
where category='general' and key in ('hosting-costs','payment-and-refunds','free-call-and-quote','renewal-costs','timeline-and-replies','revisions','content-management','after-launch-support','additional-features');

commit;
