# Google Business Profile setups

Customers who buy the Google Business Profile setup send their business details through a form on the website. The details are saved to the database and tracked in the admin under **Customers → Profile setups**.

## Setup

Do these in order. Until all three are done, the form tells customers to send their details on WhatsApp.

1. Run `supabase/migrations/20261116_profile_requests.sql` in the Supabase SQL editor. It is safe to run twice.
2. Deploy the function:
   ```powershell
   npx.cmd supabase functions deploy submit-profile-request --project-ref idsomvtnofnbtfmlgwum --no-verify-jwt
   ```
3. Deploy the frontend.

The function reuses the existing secrets: `ALLOWED_ORIGIN`, the Turnstile keys, the Gmail keys and `ENQUIRY_TO_EMAIL`.

## How to use it

1. After a customer agrees to the service, send them `https://<your-site>/business-profile-form`.
2. They fill it in. You get an email, and the request appears in **Profile setups** with a "New" badge in the menu.
3. Ask for their logo and photos on WhatsApp. The form does not take file uploads.
4. Change the status as you go, and keep private notes.

The form is also linked from the service page (`/services/google-business-profile`). It is not in the sitemap and search engines are told not to index it.

## What the customer fills in

| Field | Required |
|---|---|
| Their name and WhatsApp number | Yes |
| Business name and type of business | Yes |
| Address, or the areas served if they travel to customers | Yes |
| Business phone number | Yes |
| Opening hours | Yes |
| Google account email that will own the profile | Yes |
| Confirmation that they may share the details | Yes |
| Description, services, website, social links, notes | No |

The same rules are checked in the browser and again on the server (`supabase/functions/_shared/profile-request.mjs`).

## If something fails

| What fails | What happens |
|---|---|
| The customer refreshes or closes the page | Their answers are kept in their browser and restored when they return. |
| The customer is offline | They are told, and their answers stay in the form. |
| The notification email | The request is still saved. It shows a note in the admin that the email was not sent. |
| The database | The details are emailed to `ENQUIRY_TO_EMAIL` with the subject "NOT SAVED". They do **not** appear in the admin, so keep that email. At most 5 such emails are sent in an hour. |
| The database and the email | The customer sees an error. Their answers stay in the form, with a button that opens WhatsApp with every answer filled in. |

A slow connection cannot save a request twice: a repeat of the same answers returns the first saved request.

## Limits and privacy

- Five submissions an hour per connection, human verification (Turnstile) when configured, and requests from other websites are refused.
- Visitors cannot read or change the table. Only signed-in administrators can.
- Deleting a request in the admin erases it for good. It does not go to Recently deleted.
- **Privacy policy:** this form collects a contact name, phone numbers, an email address and business details. The privacy policy describes this under “Information we collect”, “Why we use your information”, “Browser storage” and “Retention”, in English and Bahasa Malaysia. Read the wording once and confirm it matches how you handle these details.

## What was and was not tested

Tested: the validation rules, saving, duplicate protection, the rate limit, every fallback in the table above, administrator-only access in a real PostgreSQL engine, and the full journey (fill in, failed save, success, admin tracking) in Firefox and WebKit against a local test server.

Not tested: the live Supabase function and real email delivery. After deploying, submit the form once yourself and check that the request appears in the admin and the email arrives.

## Files

- `src/services/ProfileForm.jsx`: the customer form.
- `src/admin/ProfileRequests.jsx`: the admin section.
- `supabase/functions/_shared/profile-request.mjs`: the validation rules.
- `supabase/functions/_shared/profile-handler.mjs`: saving, limits and fallbacks.
- `tests/profile-request.test.mjs`: unit and database tests.
