# WhatsApp project assistant and human inbox

This is an optional channel for the existing MV Studio enquiry system. It uses the official WhatsApp Business Platform / Cloud API, Supabase Edge Functions and PostgreSQL. No additional Render server is required. The website continues to work without WhatsApp configuration.

## What customers experience

- New customers can plan a project, ask an approved FAQ question, or choose human assistance immediately.
- Planning uses your **published** Project assistant questions, choices and branching rules, plus current Enquiry features/prices. Draft content is never retrieved. WhatsApp currently uses approved excerpts and BM25; it does not call Groq/Gemini or require AI keys.
- Questions are sent one at a time. Reply with option numbers; multiple selections use commas. Long choice lists use `MORE` / `PREV` pages. Free text, numbers and dates are validated using the existing backend rules.
- `BACK` edits the preceding scope answer. `NOT SURE` works when the question permits it. `SKIP` works for optional questions. `CONTACT` at review re-enters contact details.
- `PAUSE` saves progress without reminders; `CONTINUE` resumes. `RESTART` asks for confirmation before clearing unfinished answers.
- `HUMAN` queues your team with the current context and pauses automated answers. A complete form is not required for human assistance.
- `STOP`, `QUIT`, `CANCEL` and `UNSUBSCRIBE` end guidance. Unfinished answers are not submitted as an enquiry. Previously saved enquiries remain saved. A later ordinary message does not silently restart the guide; `MENU` explicitly opens it again.
- Review includes the scope, contact details, itemised estimate, recurring costs and a manual-review notice. Large summaries are split into ordered messages; long messages use typed commands instead of interactive buttons.
- Only `SUBMIT` saves a confirmed guided enquiry and invokes your existing enquiry email notification. A price/release change requires a new review. Custom work remains a manual quote, and AI never sets prices.
- Successful submission queues the team automatically. While queued or owned by a teammate, further customer messages are recorded without bot interruptions.

## Website → WhatsApp continuity

Your existing detailed WhatsApp draft stays: entered contact details, message, selected features, billing and meeting preferences. The customer must press **Send** in WhatsApp.

After successful website submission, **Continue on WhatsApp** retains those submitted details and appends `MV-WA:<signed reference>`. The website assistant has a corresponding button after submission. References expire after seven days. The webhook only links the private saved enquiry when the sending WhatsApp number matches the submitted contact number (Malaysian local numbers are normalised). A mismatch/invalid/expired reference goes to human assistance with the customer's supplied message, without revealing a private record.

If someone chooses WhatsApp before submitting the website form, their detailed draft also routes to human assistance. It is stored as conversation context, **not** falsely marked as a confirmed website enquiry. Sending a new detailed website message explicitly requests assistance even if the customer previously stopped the bot.

General hero/footer WhatsApp links do not claim that a website form was submitted. No personal details or signed references are added to analytics events.

## 1. Apply the database migration

Back up your existing database using your normal process. In **Supabase Dashboard → SQL Editor → New query**, run the complete contents of:

[`../supabase/migrations/20261103_whatsapp.sql`](../supabase/migrations/20261103_whatsapp.sql)

This expects the existing enquiry/chatbot schema. For a brand-new installation, use the complete `supabase/schema.sql` instead. Do not rerun an old full schema to upgrade an existing site.

The migration adds private settings, conversations, inbound events, outbound messages, team alerts and server-only queue functions. It is repeatable and does not publish chatbot drafts or enable the channel automatically. Browser administrators have read-only RLS access; authenticated functions perform mutations after checking admin membership.

## 2. Create the Meta test integration first

1. Sign in at [Meta for Developers](https://developers.facebook.com/), create/configure an app with the WhatsApp use case and open its WhatsApp API setup. Dashboard names can vary.
2. Start with Meta's test business number and add your own permitted test recipient. **Do not migrate or deregister your existing 01154039173 number to experiment.**
3. Collect the **Phone number ID**, test access token, app secret and a supported Graph API version shown in the app's current API setup. The phone number ID is an identifier, not the actual telephone number. A WhatsApp Business Account ID is also a different identifier.
4. Generate three different long random values for webhook verification, scheduler authentication and website-link signing. One way to generate each is:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

5. For production, arrange the appropriate business assets, number registration and a production access token with the necessary WhatsApp messaging permissions. Temporary test tokens expire. Confirm current Meta eligibility and whether your chosen onboarding supports coexistence with the WhatsApp Business app; do not assume your existing app registration can be used unchanged.

## 3. Configure Supabase function secrets

Use **Supabase Dashboard → Edge Functions → Secrets**, or create a local `.env.whatsapp.local` file in the project root. That filename is ignored by Git. Save it as **UTF-8 without BOM**. Never use `VITE_` names for these secrets and never commit real values.

```dotenv
WHATSAPP_ENABLED=true
WHATSAPP_PHONE_NUMBER_ID=your-meta-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-meta-access-token
WHATSAPP_APP_SECRET=your-meta-app-secret
WHATSAPP_VERIFY_TOKEN=your-own-random-verification-value
WHATSAPP_WORKER_SECRET=a-different-long-random-value
WHATSAPP_LINK_SECRET=another-different-long-random-value
WHATSAPP_API_VERSION=the-supported-version-from-meta-for-example-v25.0
```

**Replace the entire API version example with the actual supported value, such as `v25.0` only if your Meta app supports it.** Do not leave the explanatory placeholder as the value.

Other existing secrets remain in use:

| Secret | Purpose |
|---|---|
| `ALLOWED_ORIGIN` | Frontend origins, comma-separated, e.g. your Vercel URL and localhost when needed |
| `RATE_LIMIT_SALT` | Random salt for hashed rate-limit keys |
| `RESEND_API_KEY` | Existing email notification provider |
| `RESEND_FROM_EMAIL` | Sender allowed by your Resend account |
| `ENQUIRY_TO_EMAIL` | Team notification recipient(s), separated by commas |

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to hosted functions. Keep them server-side. A test sender such as `onboarding@resend.dev` still restricts recipients to your Resend account email; adding WhatsApp does not remove this restriction. Email failures are visible in admin and do not discard a saved request.

If using the local secret file:

```powershell
npx.cmd supabase login
npx.cmd supabase secrets set --project-ref idsomvtnofnbtfmlgwum --env-file .env.whatsapp.local
```

`WHATSAPP_ENABLED` is the transport switch. With it off, verified webhook events can still be stored but the worker does not send or process them. Turn it on only when ready; queued messages may be processed when re-enabled. The separate admin switch controls guided planning/FAQ availability: when that is off, incoming requests go to the human queue.

## 4. Deploy functions

From the MV-Studio project root:

```powershell
npx.cmd supabase functions deploy whatsapp-webhook --project-ref idsomvtnofnbtfmlgwum --no-verify-jwt
npx.cmd supabase functions deploy whatsapp-worker --project-ref idsomvtnofnbtfmlgwum --no-verify-jwt
npx.cmd supabase functions deploy whatsapp-admin --project-ref idsomvtnofnbtfmlgwum --no-verify-jwt
npx.cmd supabase functions deploy submit-enquiry --project-ref idsomvtnofnbtfmlgwum --no-verify-jwt
```

These endpoints implement their own authentication: Meta HMAC signature, private worker bearer secret, or Supabase user JWT plus admin membership. Disabling the gateway JWT check does **not** remove those checks. Redeploy `retry-enquiry` too if you need it to pick up other shared-module changes from your checkout.

## 5. Register the webhook

In your Meta app's WhatsApp webhook configuration:

- Callback URL: `https://idsomvtnofnbtfmlgwum.supabase.co/functions/v1/whatsapp-webhook`
- Verify token: the exact `WHATSAPP_VERIFY_TOKEN` value you chose.
- Subscribe to the WhatsApp **messages** field for your WhatsApp Business Account; this carries inbound messages and delivery receipts.

Verification must succeed. Send a message from your permitted test recipient to the Meta test number. Requests with invalid signatures are rejected. Duplicate Meta message IDs are only stored once. The configured phone number ID filters events so other app numbers are not mixed into this inbox.

## 6. Set up recovery scheduling — required

Webhook background tasks normally process messages immediately. A recurring worker is still needed if an execution stops, a database call temporarily fails, or a conversation lease expires. Admin's **Process pending messages** button is a manual recovery tool, not a replacement for scheduling.

In Supabase enable **pg_cron**, **pg_net** and **Vault** using the Database Extensions / Cron interfaces. Store the project URL and the **same** `WHATSAPP_WORKER_SECRET` in Vault using SQL Editor:

```sql
select vault.create_secret('https://idsomvtnofnbtfmlgwum.supabase.co', 'mv_whatsapp_project_url');
select vault.create_secret('YOUR_WHATSAPP_WORKER_SECRET', 'mv_whatsapp_worker_secret');
```

Run those once; if the named secrets already exist, update them through Vault instead of creating duplicates. Then schedule:

```sql
select cron.schedule(
  'mv-whatsapp-recovery',
  '* * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='mv_whatsapp_project_url') || '/functions/v1/whatsapp-worker',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='mv_whatsapp_worker_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $job$
);
```

Check the Cron run history and function logs. A client timeout does not prove that server work stopped; the queue and leases support recovery. Use the Supabase Cron UI to edit an existing named job instead of creating additional schedules. See [Supabase scheduling documentation](https://supabase.com/docs/guides/functions/schedule-functions).

For local Supabase CLI background testing, add `[edge_runtime]` with `policy = "per_worker"` to local config as described in [background tasks](https://supabase.com/docs/guides/functions/background-tasks). Local Node tests invoke processing explicitly and do not require this setting.

## 7. Deploy the frontend and configure admin

1. Run `npm.cmd test`, `npm.cmd run build` and `npm.cmd run test:browser` locally.
2. Push your reviewed branch and deploy the frontend through your usual Vercel workflow.
3. Open `/admin` and sign in as an existing authorised administrator.
4. Open **WhatsApp inbox → Channel setup & messages**. Missing-secret indicators show presence only; they are not a live Meta credential test.
5. Edit your greeting and human-handoff wording. Enable guided planning and save.
6. Under **Project assistant**, review, build, test and publish your approved questions/knowledge as usual. Draft changes do not affect WhatsApp until published. If no release is available, customers are offered human assistance.
7. Only point **Site content → WhatsApp number** at the connected production number after testing. While using Meta's test number, normal site visitors should continue using your existing public contact number.

## 8. Operate the inbox

- Incoming requests appear in **WhatsApp inbox**. The open page refreshes roughly every 12 seconds. Requests for a person remain queued; no claim of immediate availability is made.
- Human requests create a team email alert using your existing Resend configuration. Successful guided submissions use the existing enquiry email instead of sending a second handoff alert. Continuing a website enquiry into WhatsApp can generate a separate handoff alert so your team knows a chat is waiting. A provider acceptance is not a delivery guarantee.
- Select a waiting thread and **Claim conversation**. Only the assigned admin can reply, return it to the queue or close it. Another teammate cannot silently take over an owned conversation.
- Review draft requirements, the original website message, linked enquiry reference and message history. Complete submissions also appear in **Enquiries**.
- Compose a reply. Check its status: queued, accepted/sent, delivered, read, failed or uncertain. Delivery/read updates depend on receipts supplied by Meta.
- Rejected messages can be retried after fixing their cause. For **uncertain** delivery, check the actual conversation first and resolve without resending; compose a new message only when appropriate. This avoids automatic duplicate messages after network timeouts.
- A failed message blocks later outbound messages in the same thread until resolved. New customer input supersedes unsent automated questions. STOP cancels pending messages. In-flight requests may already have been sent.
- Failed inbound events and email alerts expose retry controls. Email alert retries are restricted to less than 23 hours to stay inside the provider's normal idempotency period. Resolve older requests in the inbox directly.
- Normal replies are blocked after 24 hours from the latest actual customer message. Delayed webhook processing does not reset this window. This release deliberately does not send paid follow-up templates. Ask the customer to message again through an appropriate existing contact route, or separately configure approved-template messaging before adding automated follow-ups.
- **Close conversation** ends human handling; the customer can type `MENU` later. The bot never automatically resumes in the middle of a human conversation.

The initial inbox lists the latest 100 conversations and up to 150 incoming/outgoing entries per selected thread. Older records remain in the database. Attachments, voice transcription, marketing campaigns, automatic reminders, multilingual interface translation and paid-template follow-ups are outside this initial release.

## 9. Acceptance tests before using a real business number

Use a permitted test recipient and your Meta test number. Local tests mock Meta and Resend; they do not prove account approval, sender eligibility or real message delivery.

1. Start → plan → invalid input → valid input → pause → continue → back → edit.
2. Choose HUMAN immediately and halfway through. Confirm a thread and email alert exist, and the bot remains silent during human handling.
3. Claim and reply from admin. Confirm the customer receives it and a different admin cannot reply as the owner.
4. STOP during planning and during human handling. Verify no further automated questions or reminders appear.
5. Review a quote, change a catalogue price in admin, then submit. Confirm a new review is required.
6. Submit a valid complete guide. Confirm one enquiry, correct recurring totals/free months, one enquiry notification and the human queue.
7. Submit the website form, then continue on WhatsApp. Confirm the full detailed draft remains and the matching phone links to the saved enquiry.
8. Try an expired/modified reference and a different phone: no private enquiry details should be disclosed.
9. Send the same test webhook twice: one inbound record and no duplicate processing. Simulate an interrupted worker; the scheduled worker should recover it.
10. Verify a failed Meta token is visible in admin. Fix it before retrying a rejected message. Confirm a timeout is marked uncertain, not blindly resent.
11. Verify a closed service window blocks normal replies. Test receipt updates, Resend restrictions and your production number onboarding separately.

## Privacy, retention and costs

Messages and partial answers are private customer data in Supabase. Access is restricted to administrators. Customers should understand that requests are stored for your team. Do not collect passwords, banking credentials or identity documents through the assistant. Set your retention policy before launch: no automatic conversation deletion is enabled, so review and remove expired records through your authorised data-management process. The website's usual analytics consent does not authorise WhatsApp marketing.

Current Meta service messages within the 24-hour customer-service window have no Meta messaging charge. Hosting/database/email usage and any inbox provider can still cost money; template categories may be charged. This implementation uses your own admin inbox and does not add a paid inbox-provider dependency. See [Meta pricing](https://business.whatsapp.com/products/platform-pricing) and [messaging policy](https://business.whatsapp.com/policy) before launch.
