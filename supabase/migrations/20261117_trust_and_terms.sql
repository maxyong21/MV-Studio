-- Run in the Supabase SQL Editor BEFORE deploying this version of the website.
-- The admin saves a project label and client name, so the columns must exist first.
-- Safe to run more than once. Anything an admin has already edited is left alone.
-- See docs/BUSINESS_TERMS.md.
begin;

-- 1. Project label: client work, a personal project or a demonstration.
-- Existing projects start as demonstrations, the safest claim. Change each one in the admin.
alter table public.projects add column if not exists project_type text not null default 'demonstration_project';
alter table public.projects add column if not exists client_name text not null default '';
do $$ begin
 if not exists (select 1 from pg_constraint where conname='projects_project_type_check') then
  alter table public.projects add constraint projects_project_type_check
   check (project_type in ('client_project','personal_project','demonstration_project'));
 end if;
 -- A client project must name its client; the other labels never carry a client name.
 if not exists (select 1 from pg_constraint where conname='projects_client_name_check') then
  alter table public.projects add constraint projects_client_name_check
   check ((project_type='client_project' and length(btrim(client_name)) between 2 and 120)
       or (project_type<>'client_project' and client_name=''));
 end if;
end $$;

-- 2. Payment terms and delivery estimates shown on the package cards.
-- Only the older starter wording (or an empty field) is replaced.
update public.services set payment_terms='Pay 50% to confirm the project. After the wireframe, feature list and prototype are approved, pay the remaining 50% before development begins. If you cancel within 7 days of paying and before wireframe work starts, half of the deposit is refunded (25% of the project price); after that the deposit is not refundable. Hosting, domain and third-party charges are separate and paid in full before they are purchased.'
where nullif(btrim(payment_terms),'') is null
   or payment_terms='Website development is a one-time project fee. Payment stages, third-party charges and any recurring subscriptions are confirmed in the proposal before development begins.';

update public.services set timeline='Typically 3–4 months' where name in ('Company Website','E-Commerce') and timeline='Timeline confirmed together';
update public.services set timeline='Typically 3–4 months or more, confirmed in your quote' where name='Custom Web App' and timeline in ('Custom quote','Timeline confirmed together');

-- 3. Two more answers in the public FAQ. Edit or hide them in the admin at any time.
insert into public.faqs(key,title,answer,active,sort_order) values
('payment-and-refunds','How do payments and refunds work?',
 'You pay 50% to confirm your project. We then work on the wireframe, confirm the features with you and build a prototype. Once you approve them, you pay the remaining 50% and real development begins. If you cancel within 7 days of paying and before wireframe work starts, we refund half of the deposit, which is 25% of the project price. After that the deposit is not refundable. Hosting, domain and third-party charges are separate and are paid in full before they are purchased.',true,15),
('timeline-and-replies','How long will my website take, and how fast will you reply?',
 'Landing pages are usually quicker. Full websites and online stores typically take 3–4 months, and custom systems can take longer, so each package shows its own estimate and we confirm the date in your proposal. We reply to enquiries within 2–3 business days, and usually faster on WhatsApp.',true,16)
on conflict(key) do nothing;

-- 4. The project assistant answers from the same terms. Only the old starter text is replaced.
update public.chatbot_documents set body='Payment is 50% to confirm the project. After the wireframe, feature confirmation and prototype are approved, the remaining 50% is paid before development begins. If you cancel within 7 days of paying and before wireframe work starts, half of the deposit is refunded, which is 25% of the project price. After that the deposit is not refundable. Third-party database, hosting and domain costs require full payment before purchase or activation. Domain and hosting accounts belong to the client. The client receives the custom project source code after full project payment. Third-party licences remain subject to their own terms. Handover details are confirmed in the proposal.'
where title='Payment stages account arrangements and source code'
  and body like 'Development deposit amounts and payment stages are confirmed with the team in the proposal.%';
update public.chatbot_test_cases set name='Deposit and refund terms', expected_terms=array['50%']::text[]
where name='No invented deposit' and expected_terms=array['proposal']::text[];

commit;
