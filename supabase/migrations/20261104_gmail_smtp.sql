-- Replace the retired Resend-specific message ID field with a provider-neutral ID.
begin;
do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='enquiries' and column_name='resend_email_id')
     and not exists(select 1 from information_schema.columns where table_schema='public' and table_name='enquiries' and column_name='email_message_id') then
    alter table public.enquiries rename column resend_email_id to email_message_id;
  elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name='enquiries' and column_name='resend_email_id')
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='enquiries' and column_name='email_message_id') then
    update public.enquiries set email_message_id=resend_email_id where email_message_id='' and resend_email_id<>'';
    alter table public.enquiries drop column resend_email_id;
  elsif not exists(select 1 from information_schema.columns where table_schema='public' and table_name='enquiries' and column_name='email_message_id') then
    alter table public.enquiries add column email_message_id text not null default '';
  end if;
end $$;
commit;
