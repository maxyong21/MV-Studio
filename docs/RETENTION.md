# Keeping and deleting personal data

This is the working rule behind section 9 of the privacy policy. If you change a period here, change
the policy text (`src/legal/content.mjs`, English and Bahasa Melayu) at the same time.

| Records | How long | How |
|---|---|---|
| Assistant questions and answers (quality logs) | 30 days | Automatic, every day at 03:30 Malaysia time |
| Assistant estimates nobody sent | 7 days after they expire | Automatic, same daily job |
| Enquiries that did not become a project | 24 months after the last contact from either side | Manual review, at least twice a year |
| Business details forms (Google Business Profile) | While the work lasts, then the same 24 months | Manual review, at least twice a year |
| Enquiries and records of clients | While you work together, and as long as the law requires business and accounting records | Keep; review when the work ends |
| Outreach contacts who never replied | 12 months | Manual review, at least twice a year |
| Do-not-contact (opt-out) records | As long as needed to respect the request | Keep. Never delete these just to tidy up, or the person could be emailed again |
| Automatic problem reports | Not stored in the database (received by email only) | Delete the emails as you see fit |

## One-time setup: the daily clean-up

Run `supabase/migrations/20261118_retention_schedule.sql` in the Supabase SQL Editor. Then confirm the job
exists (this must return one row):

```sql
select jobname, schedule, active from cron.job where jobname = 'chatbot-purge-old-data';
```

If it returns nothing, the scheduler is not enabled: turn on "pg_cron" in Dashboard, Database,
Extensions, then run the file again. **The privacy policy says this job runs every day, so do this
before or together with deploying the policy.**

## The twice-a-year review (about 15 minutes)

Run these in the SQL Editor. They only list records and delete nothing. Look at each list, then delete
or anonymise what no longer needs to be kept (for example from the admin Enquiries and Marketing screens).

```sql
-- Enquiries with no contact for 24 months that never became a project.
select id, name, company_name, status, created_at, updated_at
from public.enquiries
where deleted_at is null and status in ('new', 'contacted', 'qualified', 'closed')
  and greatest(created_at, updated_at, coalesce(follow_up_at, created_at)) < now() - interval '24 months'
order by updated_at;

-- Business details forms (Google Business Profile) finished or cancelled more than 24 months ago.
select id, status, created_at
from public.profile_requests
where status in ('done', 'cancelled') and created_at < now() - interval '24 months'
order by created_at;

-- Outreach contacts added more than 12 months ago that have NOT opted out.
-- Check Marketing, Campaigns first: do not delete someone who replied or became a client.
select id, email, company_name, created_at
from public.marketing_contacts
where suppressed = false and created_at < now() - interval '12 months'
order by created_at;
```

Write the date of each review at the bottom of this file, so you can show it if anyone asks.

Reviews done: _(none yet)_
