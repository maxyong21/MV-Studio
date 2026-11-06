# Marketing email setup

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
