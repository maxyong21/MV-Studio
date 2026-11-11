# Current email composer workflow

Apply `supabase/migrations/20261111_email_composer.sql` after the existing marketing, outreach and Team migrations. Redeploy `marketing` and the frontend. Existing Gmail secrets and the Cron worker remain valid.

Open Admin → Marketing email → Compose. Type one or more To addresses, and optionally add Cc/Bcc. Commas, semicolons and new lines separate addresses; simple `Name <email@example.com>` entries are accepted. You do not need to create contacts first. Choose a template, edit its message, and reload the team signature if needed. Missing signature fields are identified individually. HTTP and HTTPS portfolio links are allowed; logo images still require HTTPS. Save a draft and send a test: only the signed-in administrator is emailed, never To/Cc/Bcc. Preview links are disabled intentionally; use the real test email to check mailto/tel/website links.

Review the To/Cc/Bcc list before confirming. One SMTP message is sent to that entire group. To/Cc are visible to everyone receiving it; Bcc is excluded from the delivered MIME headers by Nodemailer. Do not use To or Cc for unrelated businesses whose addresses should remain confidential. Group messages use general placeholder fallbacks, not separate personalization for each recipient. Recipients are stored separately from reusable template content.

The backend records entered addresses and sending history automatically without fabricating subscription consent. Repeat one-time introductions to To/Bcc addresses are blocked across messages. Cc copies may recur, so an internal team member can be copied on different customer emails. Do-not-contact requests apply to every role. Existing-customer updates require a specific reason. Record the correct relationship through the selected purpose; selecting it does not establish legal permission by itself.

A group must fit the configured daily budget (50 recipients by default, configurable up to 200). Every To/Cc/Bcc address counts toward that budget. Cron claims the group atomically, so concurrent worker calls cannot create repeated Cc copies. A scheduled group waits until its date and sufficient budget. The existing manual Process next queued email button sends the next eligible group or legacy individual job. Old contact-based scheduled messages remain supported.

The group email footer opens a preference form where the recipient enters their own email. A shared group message cannot contain a different one-click unsubscribe token per person, so this mode uses the form and does not claim RFC 8058 one-click support. No other recipients are shown; Bcc addresses are never listed there. Requests are rate limited, use generic responses, and immediately suppress matching addresses. Use a dedicated campaign provider and individual delivery when bulk mailing requirements demand recipient-specific unsubscribe headers and bounce/complaint automation.

Reports show recipient roles and SMTP acceptance, not confirmed delivery. Explicit temporary SMTP rejections retry at most three times. After partial acceptance the rejected recipients are reported but the whole group is never resent automatically. Ambiguous failures become uncertain; check Gmail Sent before creating another message. The admin can mark an address Do not contact from its recipient report.

## Original setup reference

The setup reference below describes the earlier contact-selection UI. Follow the current workflow above for composing; its Gmail secrets, deployment, Vault and Cron instructions remain applicable.

# Marketing email setup

## Team contact details for signatures

For a `42501` error after deploying the Team-backed signature function, apply `supabase/migrations/20261109_marketing_team_access.sql` (or run `GRANT SELECT ON public.team_members TO service_role;`). Public read access and RLS bypass do not grant the Edge Function SQL table access. The updated handler reports the failing query stage and database code to verified administrators; it does not expose raw database records or credentials.

If **Reload from Team** reports no active profiles while the public Team request returns populated rows, inspect the `marketing` function response. An older deployment may omit `team_members` entirely. Redeploy `marketing`; the updated frontend also falls back to an authenticated Team query when that field is absent. A failed query reports a loading error rather than claiming that profiles do not exist.

For existing installations apply `supabase/migrations/20261108_team_contacts.sql`, then redeploy `marketing` and the frontend. In **Admin → Team**, edit each member and save **Public work email**, **Public work phone**, and **Website URL** (personal portfolio). These are work contact details on publicly readable active team profiles; do not enter private contact information. The general Site content contact lists do not identify an owner and are not assigned to people by array order.

New email signatures load active profiles from the database, selected by default. Templates and draft campaigns refresh their team details when opened; checkbox selections are matched by team ID (or name for older drafts). **Reload from Team** reloads the latest saved contacts and invalidates the draft's previous test. Campaign-specific edits remain in that draft; changes to central profiles belong in Team. Sent/queued campaigns retain their content snapshot. After changing the team email/phone, reopen a draft or reload its signature, save and test again. Missing contacts remain blank and block sending until completed; no personal names or numbers are guessed.

This admin module sends individual HTML and plain-text messages through the existing Gmail SMTP transport. It does not import enquiry addresses as marketing contacts. It supports one-time introductions and documented existing-customer updates. Record the address source and why contact is appropriate. The system checks suppression immediately before delivery; sending once does not remove applicable privacy or email obligations.

1. Apply `supabase/migrations/20261106_marketing.sql`, then `supabase/migrations/20261107_outreach.sql` in Supabase SQL Editor. New installations can use the updated `supabase/schema.sql` instead. The migration is repeatable.
2. Keep `GMAIL_SMTP_USER`, `GMAIL_SMTP_APP_PASSWORD`, `GMAIL_FROM_NAME`, and `ALLOWED_ORIGIN` configured in Edge Function secrets. Marketing recipients come from the campaign, not `ENQUIRY_TO_EMAIL`. Never add these secrets to Vercel or `VITE_` variables.
3. Add `MARKETING_DAILY_LIMIT=50` (rolling 24 hours, shared across marketing campaigns, maximum 200) and `MARKETING_WORKER_SECRET` as a fresh random value of at least 32 bytes. Generate locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep it private. Test emails and transactional notifications also consume Gmail account quota; the marketing budget cannot see mail sent outside this module.
4. Deploy from the project folder:

```powershell
npx.cmd supabase functions deploy marketing --project-ref idsomvtnofnbtfmlgwum --no-verify-jwt
```

5. Enable Supabase Cron (`pg_cron`) and `pg_net` in the dashboard. Store two secrets in Supabase Vault: `marketing_project_url` (your `https://PROJECT.supabase.co`) and `marketing_worker_secret` (exactly the same secret as step 3). Create this Cron job in SQL Editor:

```sql
select cron.schedule('marketing-email-worker', '* * * * *', $$
 select net.http_post(
   url := (select decrypted_secret from vault.decrypted_secrets where name='marketing_project_url') || '/functions/v1/marketing',
   headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
     (select decrypted_secret from vault.decrypted_secrets where name='marketing_worker_secret')),
   body := '{}'::jsonb,
   timeout_milliseconds := 30000
 );
$$);
```

One recipient is processed per invocation, with a global ten-second minimum gap. The once-per-minute Cron cadence is deliberately conservative. Without Cron, the admin's **Process next queued email now** button can process individual jobs. Check Cron run history and `net._http_response` for deployment/authentication problems; a scheduled campaign does not send by itself without a worker invocation.

6. Redeploy the frontend with these code changes. In Admin → Marketing email → Contacts add your own test address, choose Prospect or Existing customer, and record the address source and business relevance. In Compose choose an industry and language, load a starter, edit it and fill the structured team signature: company, logo URL, studio portfolio, and each selected member’s name, email, phone and personal portfolio. Upload up to four images, describe each, and select recipients.
7. Choose **One-time business introduction** or **Existing customer update**. Updates require a customer contact and a specific reason. Introductions exclude previous accepted/uncertain sends and active queued jobs across campaigns. Both Max and Vincent are selected in the signature initially; deselect either if needed. Unconfirmed contact details start blank, so fill them before saving. Save signature details in a reusable template for later use. Save, preview, and send a test to your admin login email. Verify the inbox rendering, links and Spam folder. Any later content edit invalidates the test. Then review recipients and confirm the campaign. Test one recipient first before expanding.
8. Check the recipient report. `accepted` means SMTP accepted the message, not delivered or opened. Gmail SMTP provides no delivery, complaint, click or bounce webhook here. Suppress a contact manually if you receive a complaint or later bounce. Explicit temporary 421/450/451/452 rejections retry at most three attempts with backoff. Permanent failures stop. Ambiguous transport failures and abandoned claims become `uncertain`; check Gmail Sent before making a new campaign. Do not duplicate an uncertain send without reviewing it.
9. Test unsubscribe using the received email. GET displays a confirmation page to avoid scanner-triggered opt-outs. POST immediately suppresses the contact, supports RFC 8058 one-click headers, and is idempotent. Re-importing an existing address fails rather than erasing suppression. Editing a contact cannot clear suppression. The test email uses a dummy unsubscribe token and does not affect contacts.

Images use stable public URLs in `site-media`; never delete an asset still referenced by sent emails. Email styles are inline, image alt text and text alternatives are provided; rendering varies by email client. Keep essential offer details in text. The preview runs in a sandboxed iframe and never sends.

The workspace fetches the most recent 1,000 entries per table for this small pilot. Add pagination and a dedicated campaign provider with bounce/complaint webhooks before scaling. There are no fabricated delivered/opened/clicked statistics. An SMTP response lost after acceptance cannot guarantee exactly-once delivery. Campaign edits are limited to drafts; queued content is frozen and audience starts are transactional. Pause prevents future claims but cannot recall in-flight email. Contacts have immutable suppression through this UI; retain minimal suppression data to honor opt-outs.

Run `node --test tests/marketing.test.mjs`, `npm.cmd test`, `npm.cmd run build`, and `npm.cmd run test:browser` locally. Real delivery additionally requires the hosted setup above and a test send; local tests do not authenticate to Gmail.

## Upgrading the outreach workflow

Apply only `20261107_outreach.sql` if the marketing migration is already installed. Redeploy `marketing` and the frontend. Existing worker secrets and Cron stay valid. The new `public/email-logo.png` is generated from the existing MV Studio favicon so Gmail can display a PNG rather than an unsupported SVG. Its URL and all signature details are editable in Compose. Old consent records remain valid evidence; no consent timestamps are fabricated for new prospects. A source/relevance note is an internal review record, not legal permission. Do-not-contact requests remain effective across both purposes. Use ordinary enquiry replies for operational service incidents: this outreach tool still honors marketing suppression, so it should not be used to bypass it.
