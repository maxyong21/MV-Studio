-- Runs the website assistant's clean-up every day, so the privacy policy's promise holds without anyone
-- remembering to press a button: assistant questions older than 30 days, unsent estimates older than
-- 7 days and old usage counters are deleted (public.chatbot_purge_old_data).
-- 03:30 Malaysia time is 19:30 UTC the day before. Safe to run more than once.
-- If your project does not allow this file to turn the scheduler on, enable it first in
-- Dashboard, Database, Extensions, "pg_cron", then run this file again.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      create extension pg_cron;
    exception when others then
      raise notice 'pg_cron could not be enabled (%). Enable it in Dashboard > Database > Extensions, then run this file again.', sqlerrm;
      return;
    end;
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'chatbot-purge-old-data';
  perform cron.schedule('chatbot-purge-old-data', '30 19 * * *', 'select public.chatbot_purge_old_data()');
end $$;
