# Admin safety features

Four things added to the admin to stop work and leads being lost: an overview page, follow-up reminders, recoverable deletes and a second sign-in step.

## What needs deploying

| Change | Needs |
|---|---|
| Overview and follow-up reminders | Frontend only |
| Recently deleted | Frontend, plus `supabase/migrations/20261114_recently_deleted.sql` |
| Second sign-in step | Frontend, plus `supabase/migrations/20261115_admin_second_step.sql`, plus a redeploy of `marketing`, `chatbot-admin` and `retry-enquiry` |

Run the SQL files in the Supabase SQL editor. Both are safe to run twice.

The frontend works before the SQL is run: deleting falls back to a permanent delete with a warning, and the Recently deleted page explains that it is not switched on yet.

## Overview and follow-up reminders

The admin opens on **Overview**. It reads enquiries and published content and changes nothing.

An enquiry is listed under "Needs your attention" when:

- its follow-up date is before today (overdue), or
- its follow-up date is today, or
- it is new, more than a day old, and has no follow-up date.

Enquiries marked won or closed never appear. Clicking an item opens that enquiry. There is no reminder email; the list is the reminder.

## Recently deleted

Deleting in the admin no longer removes things for good.

- **Website content** (services, projects, team, promotions, enquiry features, client feedback, FAQs) is copied into a private table and removed from its own table. The website stops showing it at once.
- **Enquiries** are marked as deleted and keep their notes, history and quotations.

Both wait 30 days in **Housekeeping → Recently deleted**, where they can be restored exactly or deleted for good. Items older than 30 days are removed the next time that page is opened.

Restoring a project that was shown in the footer fails if four footer projects are already chosen. Untick one and restore again.

## Second sign-in step

**Housekeeping → Sign-in security** lets each administrator add an authenticator app. It is optional and per person.

Once an administrator confirms a code:

- signing in asks for the password and then a 6-digit code;
- the database treats a password-only session as a non-administrator, so it can read and change nothing;
- the `marketing`, `chatbot-admin` and `retry-enquiry` functions refuse a password-only session.

The last two points come from the SQL file and the function redeploy. Without them, the code screen still appears, but a stolen password could be used against the database directly. Apply both before relying on it.

### If a phone is lost

In the Supabase dashboard open Authentication → Users, choose the user, and remove the MFA factor. The administrator can then sign in with the password and set up a new authenticator. Make sure more than one person can reach that dashboard.

### What was and was not tested

The setup, the code screen, wrong codes and turning off were tested end to end against a simulated sign-in service, and the database rule was tested in a real PostgreSQL engine. It has **not** been tested against the live Supabase sign-in service. Before relying on it, turn it on for one administrator while a second administrator stays signed in, sign out, and sign back in.
