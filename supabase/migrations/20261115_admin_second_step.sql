-- Second-step sign-in for administrators. Repeatable.
--
-- An administrator may add an authenticator app in Admin -> Sign-in security.
-- Once they have a verified one, the password alone is no longer enough: the
-- database treats them as an administrator only when the session also passed
-- the authenticator check (assurance level aal2). Administrators who have not
-- added an authenticator are unaffected.
--
-- If an administrator loses their phone, remove the factor in the Supabase
-- dashboard: Authentication -> Users -> the user -> Remove MFA factors.
begin;
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users au where au.user_id = (select auth.uid())
  ) and (
    not exists (
      select 1 from auth.mfa_factors f where f.user_id = (select auth.uid()) and f.status::text = 'verified'
    )
    or coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2'
  );
$$;
commit;
