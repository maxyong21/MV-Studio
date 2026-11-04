# WhatsApp enquiries: manual replies

The website uses ordinary `wa.me` links with a prepared enquiry message. Your existing WhatsApp Business app receives the message after the visitor reviews the draft and presses **Send**. Your team replies manually in WhatsApp Business.

## Customer flow

1. Enter contact information and describe the project on the website. Optional feature selections, billing preference and meeting details are included in the draft.
2. Click **Use WhatsApp instead** to review those details in WhatsApp. This does not submit the website enquiry or send a Gmail SMTP notification.
3. Alternatively, click **Send project enquiry** to save the validated enquiry in Supabase and invoke the Gmail SMTP notification. **Continue on WhatsApp** then keeps the submitted details even though the form resets.
4. The website project assistant remains available. After its confirmed enquiry submission, its **Continue on WhatsApp** button also prepares a detailed message for manual follow-up.

No bot references or estimate access tokens are included in the WhatsApp message. Clicking a button never sends the message automatically. Hero/footer contact links open a general conversation. The destination is managed in **Admin → Site content → WhatsApp number**, independently of ordinary call numbers.

This flow does not require Meta developer onboarding, a Cloud API number, Coexistence, a webhook, a scheduled worker or a paid WhatsApp bot provider. Supabase enquiries, the website assistant, optional analytics consent and Gmail SMTP remain separate existing services with their own setup and usage limits.

## If the removed WhatsApp bot was deployed previously

Removing its files from Git does not disable an already deployed function. The following steps retire only that integration. Keep your normal WhatsApp Business account registered; no phone-account deletion is needed.

1. Temporarily stop the old worker using your Supabase dashboard secrets or this command:

   ```powershell
   npx.cmd supabase secrets set WHATSAPP_ENABLED=false --project-ref idsomvtnofnbtfmlgwum
   ```

2. In the Meta app used for this integration, unsubscribe its WhatsApp `messages` webhook or remove its callback if that callback was used only by this bot. This stops new inbound messages being copied into the retired integration. Do not remove unrelated app integrations.

3. In Supabase SQL Editor, run [`../supabase/disable-whatsapp-bot.sql`](../supabase/disable-whatsapp-bot.sql). It disables legacy guided settings and removes the named `mv-whatsapp-recovery` Cron job if present. It is repeatable and does not delete conversations, enquiries or customer information. Run it using your database-owner dashboard access.

4. Deploy the updated enquiry handler and remove the three old function deployments:

   ```powershell
   npx.cmd supabase functions deploy submit-enquiry --project-ref idsomvtnofnbtfmlgwum --no-verify-jwt
   npx.cmd supabase functions delete whatsapp-webhook --project-ref idsomvtnofnbtfmlgwum
   npx.cmd supabase functions delete whatsapp-worker --project-ref idsomvtnofnbtfmlgwum
   npx.cmd supabase functions delete whatsapp-admin --project-ref idsomvtnofnbtfmlgwum
   ```

   Remove any additional external scheduler you created for these functions. Do not delete `chatbot`, `chatbot-admin`, `retry-enquiry` or `submit-enquiry`; these support the website assistant and ordinary enquiries.

5. Push and redeploy the frontend through your usual Vercel workflow. Confirm the WhatsApp admin inbox is gone and the enquiry button opens your existing Business app conversation with the form details.

6. After the functions and schedule are retired, remove unused `WHATSAPP_*` API secrets through Supabase's secret settings if desired. Keep the normal frontend Supabase settings, Gmail SMTP configuration and `RATE_LIMIT_SALT`. The website's public `whatsapp_number` contact setting is still used.

Old private bot tables and records are left untouched. They are no longer created by `supabase/schema.sql` or accessed by the application. If you later decide to delete archived data, review retention requirements and backups separately before any database removal.

For a project that never deployed the bot, skip the retirement steps. No new database migration is needed to use ordinary WhatsApp enquiry drafts.
