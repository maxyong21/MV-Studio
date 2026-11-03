-- Optional retirement for an installation that deployed the removed WhatsApp bot.
-- Run manually in Supabase SQL Editor as the database owner.
-- Preserve all customer information and the normal enquiry / website assistant tables.
do $$
declare scheduled_job record;
begin
  if to_regclass('public.whatsapp_settings') is not null then
    execute 'update public.whatsapp_settings set enabled=false, updated_at=now() where id=1';
  end if;
  if to_regclass('cron.job') is not null then
    for scheduled_job in execute 'select jobid from cron.job where jobname=''mv-whatsapp-recovery''' loop
      execute 'select cron.unschedule($1)' using scheduled_job.jobid;
    end loop;
  end if;
end;
$$;
