begin;
alter table public.team_members add column if not exists email text not null default '';
alter table public.team_members add column if not exists phone text not null default '';
grant select on public.team_members to service_role;
-- Work contact fields are optional; when present validate them at the database boundary.
do $$ begin
 if not exists(select 1 from pg_constraint where conname='team_work_email_valid' and conrelid='public.team_members'::regclass) then
 alter table public.team_members add constraint team_work_email_valid check(email='' or (length(email)<=254 and email ~ '^[^[:space:]@,;<>]+@[^[:space:]@,;<>]+\.[^[:space:]@,;<>]+$'));
 end if;
 if not exists(select 1 from pg_constraint where conname='team_work_phone_valid' and conrelid='public.team_members'::regclass) then
 alter table public.team_members add constraint team_work_phone_valid check(phone='' or (length(phone)<=32 and phone ~ '^[+()0-9.[:space:]-]+$' and length(regexp_replace(phone,'[^0-9]','','g')) between 7 and 15));
 end if;
end $$;
commit;
