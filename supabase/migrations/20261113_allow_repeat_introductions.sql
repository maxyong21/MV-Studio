-- Removes the once-only limit on introductions: an address may be sent an
-- introduction again in a later email. Do-not-contact requests are untouched
-- and still block every send. Repeatable.
--
-- Every check (queueing, the worker and the admin list) asks this one function,
-- so answering "not used" lifts the limit everywhere. To restore the limit,
-- re-run the function definition from 20261111_email_composer.sql.
begin;
create or replace function public.marketing_introduction_used(p_contact uuid,p_exclude_campaign uuid default null) returns boolean language sql stable security definer set search_path=public as $$
 select false
$$;
revoke all on function public.marketing_introduction_used(uuid,uuid) from public,anon,authenticated;
grant execute on function public.marketing_introduction_used(uuid,uuid) to service_role;
commit;
