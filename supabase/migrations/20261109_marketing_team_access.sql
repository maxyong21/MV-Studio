begin;
-- RLS bypass does not grant SQL table privileges. The marketing function uses
-- service_role to read team profiles; public/authenticated grants are separate.
grant usage on schema public to service_role;
grant select on public.team_members to service_role;
commit;
