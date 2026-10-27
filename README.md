# MV Studio — React + Supabase

MV Studio's customer website and private content manager are built with React, Vite, and Supabase. The original project detail pages and their media remain in the project root and are linked from the project cards.

## What this website is for

MV Studio is a small web development studio website for introducing the team and its services to new businesses, startups, and SMEs. Visitors can browse services and project examples, view demo links or videos, request a project estimate, and ask for a short meeting. Administrators sign in to manage services and prices, projects, team profiles, promotions, feature options, contact details, and customer enquiries. The public footer links to key sections, selected projects, and configured contact channels. Supabase stores the website content and enquiry records; Resend sends enquiry notifications when configured.

## Guided project assistant

Visitors can open **Plan your project** to describe an idea, complete adaptive cards, review an itemized preliminary estimate and send a confirmed enquiry. Admins manage approved knowledge, questions, options, branching and regression tests under **Project assistant**, with private preview, review, publication and rollback. Prices come from the existing feature catalogue and are calculated on the backend.

Follow the detailed [chatbot setup and operating guide](docs/CHATBOT.md). Existing installations need the new [`20261025_chatbot.sql`](supabase/migrations/20261025_chatbot.sql) migration and the `chatbot`, `chatbot-admin` and updated `submit-enquiry` functions. New installations can use the complete `supabase/schema.sql`. Default BM25 retrieval works without AI keys; optional Gemini/Groq settings stay server-side. Review and publish the starter draft before the public assistant becomes available.

### Enquiry email design

Admin notifications use the branded HTML template in [`supabase/functions/_shared/email-template.mjs`](supabase/functions/_shared/email-template.mjs): a forest-green header, readable contact details, selected features, a preliminary estimate, optional chatbot scope, meeting preferences and a reply button. Core styles are inline, the layout uses presentation tables, and a small media query adjusts spacing on mobile. The existing plain-text version is also sent. Customer-entered values are HTML-escaped, and the email uses system fonts without external images or stylesheets. Rendering can vary between email clients.

After changing this shared template, redeploy **both** `submit-enquiry` and `retry-enquiry` so new notifications and retried notifications use it. No SQL changes are required for email styling. This project currently sends notifications to the configured team inbox; automatic customer confirmation emails are a separate sending flow. Styling does not change Resend's sender or recipient restrictions: `onboarding@resend.dev` can be used for testing to your own Resend account email, while sending to other recipients requires a verified sending domain.

## Create a Git branch for this work

From the project folder, create and switch to a branch before committing these changes:

```powershell
git status --short
git switch -c feature/supabase-media-demos
git add -A
git diff --cached --stat
git commit -m "Add Supabase project media and video demos"
```

`git switch -c` creates the branch from your current commit and switches to it. Existing uncommitted edits remain in your working tree; `git add -A` stages all project changes, and `git diff --cached --stat` lets you review the staged files before committing. If you only want selected files, replace `git add -A` with paths you choose.

## Run locally

1. Install Node.js 20.19 or newer.
2. Install packages and start Vite:

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

3. Open the local URL Vite prints (usually `http://localhost:5173`). Without Supabase configuration or published content, customers see a branded **Coming soon** page. Connect Supabase to display your live website content.

### Public availability and private diagnostics

The public website shows **Coming soon** when no published content is available, and **Under maintenance** when database reads fail. Empty service/project/team sections have their own coming-soon notices. The chatbot shows Coming soon before a release is published and Under maintenance when paused or unavailable. Request failures use friendly messages; normal input validation remains visible so customers can correct their details. Enquiry submission failures are never reported as successful saves.

Administrators can open **System status** to check the anonymous public database read path and inspect technical diagnostics recorded in the current browser tab. These browser reports are session-local, not central logs from all visitors. Edge Function logs remain in the private Supabase dashboard; notification failures also remain in Admin → Enquiries. No public error-reporting endpoint or database migration is required.

Healthy content is still prerendered for search engines. Builds without content render a coming-soon page with `noindex,follow` and omit sample project listings. Builds with configured Supabase credentials still stop if public reads fail rather than publishing a broken snapshot. Runtime maintenance screens in this static frontend do not change HTTP response status codes; a true HTTP 503/Retry-After response would need hosting/server support. Redeploy the `chatbot` function after updating it so the widget can distinguish an unpublished release from an admin pause.

## Short enquiry and WhatsApp

The main enquiry starts with the four required contact fields and an optional message. Customers can submit immediately, or open **Add project details** for feature selection, recurring billing and a preliminary estimate. Closing that section preserves selections; its summary shows the selected-service count. Both paths use the same validated enquiry endpoint, database records, notification and duplicate protection. Meeting requests remain optional.

The hero and enquiry area offer WhatsApp directly. **Get guided help** opens the existing project assistant on demand and returns focus to its trigger when closed. Contact details already entered into the enquiry remain in place.

Both WhatsApp buttons inside the enquiry section prepare a message using the currently entered contact details, message, selected service names, recurring billing preference and meeting request. The draft URL is generated only when clicked, keeping personal details out of page anchor URLs. Empty fields are omitted, and the form can be partially completed for WhatsApp. The customer reviews the draft and presses Send in WhatsApp. Clicking this button does not save an enquiry or trigger Resend; **Send project enquiry** remains the path that saves to the admin inbox. Hero, footer and contact links start a general conversation. Custom analytics events record the contact method only, never the draft text or full WhatsApp URL; keep GA4 Enhanced measurement disabled as documented in `docs/ANALYTICS.md`.

Run [`supabase/migrations/20261026_short_enquiry_whatsapp.sql`](supabase/migrations/20261026_short_enquiry_whatsapp.sql) to save the requested WhatsApp destination, **011-5403 9173**, and update the original starter CTA. Then deploy the frontend. Manage the destination independently of ordinary call numbers in **Admin → Site content → WhatsApp number**. Local Malaysian numbers are converted to the international `wa.me` format; this number links to `https://wa.me/601154039173`. The existing enquiry tables and functions are reused; no function redeployment is required for this layout change.

## Opening headline and slogans

The main heading stays fixed for a clear offer and search-engine-readable HTML. Up to three supporting slogans rotate every five seconds; all are included in prerendered HTML. The layout reserves space for the longest slogan. Visitors can pause rotation, and it pauses on hover, keyboard focus, when outside the viewport, and in background tabs. Reduced-motion preferences disable automatic rotation by default.

For an existing Supabase installation, run [`supabase/migrations/20261026_clear_hero_slogans.sql`](supabase/migrations/20261026_clear_hero_slogans.sql), then redeploy. It replaces only the original starter headline/description and adds missing slogan fields, preserving customised text. Edit **Admin → Site content → Main heading / Supporting slogans 1–3**. Leave both optional slogans blank to use static supporting text. Rebuild after publishing significant copy changes to refresh prerendered HTML. The full schema includes the same migration for new installs.

## Customer FAQs

For an existing database, run [`supabase/migrations/20261026_public_faqs.sql`](supabase/migrations/20261026_public_faqs.sql) in the Supabase SQL Editor **before deploying** the FAQ frontend. Fresh installations can use the full `supabase/schema.sql`. The migration seeds six editable policy answers and preserves administrator edits when rerun.

Manage questions, answers, publication and ordering at **Admin → FAQs**. Published answers appear in the homepage FAQ accordion and prerendered HTML; hidden answers remain private to administrators. The footer links to FAQs while published entries exist. Redeploy after important edits to refresh the HTML seen before JavaScript loads. No Edge Function deployment is needed for the public FAQ feature.

The revision allowance is currently described as agreed in each project proposal; no fixed number of rounds is promised. Review the seeded wording against your actual packages and promotions before launch. The FAQ content does not automatically change chatbot releases. To make the assistant answer these policies, add the approved wording to its Knowledge section, then build, test and publish a candidate.

## Advertisement popup

Manage posters in **Admin → Promotions**: upload an image, enter the offer text and link, and enable both **Published** and **Popup enabled**. Optional start/end dates control eligibility. Existing Supabase tables and the `site-media` bucket are reused; no SQL migration is needed.

The homepage shows at most one offer per browser per local calendar day, across all promotions. The day is recorded when the popup opens, so refreshes do not repeat it. It waits at least 15 seconds, requires scrolling, and waits for four seconds without scrolling, clicking or typing. It does not interrupt a form that the visitor has started, an open mobile menu, another dialog or the analytics choice panel. A visitor who never meets these conditions may not see an advertisement that day. Clearing browser storage or changing browsers resets the limit; unavailable storage causes the advertisement to be skipped.

Customers can reopen the current promotion at any time using **Offers** in the homepage navigation or **View current offer** in the services section. These controls appear only when an enabled, published promotion is inside its scheduled dates. Manual viewing can be repeated and also counts as today's view, so the automatic popup does not interrupt someone who has already read it. Manual opening still works if browser storage is unavailable.

Visitors can close with Escape, the close button, Continue browsing or the backdrop. Keyboard focus stays within the dialog and returns on close. Posters fit without cropping; long content can scroll without a visible scrollbar, while the close button remains visible. Reduced-motion preferences are respected. Publish changes and redeploy the frontend to activate this behaviour; already-open pages receive admin changes on their next content load.

In **Admin → Promotions → Add/Edit**, use **Preview popup** to check the current image and unsaved text using the same popup as the customer site. Preview works for drafts and disabled offers and can be reopened any number of times. It does not save/publish the offer, navigate to the offer link, or consume the visitor's daily impression. Close it to return to the editor with your changes intact. The poster fills the available popup width with its original proportions; tall posters scroll inside the popup instead of being cropped or stretched. Resize the browser to check other screen widths.

Run `npm run test:promotion-preview` for a browser check using a temporary local database and upload storage. It verifies uploaded-image previews, repeated previews, unsaved edits, keyboard handling, and five screen sizes without changing the live database.

## Analytics and website review

GA4 measurement ID `G-D92C2BPTH3` is integrated for the production customer site with optional visitor consent. Follow [the GA4 setup guide](docs/ANALYTICS.md) to finish stream settings and verify events after deployment. The [website review](docs/WEBSITE_REVIEW.md) records the desktop/mobile findings and recommended improvements.

## Upgrade an existing installation

Apply these changes in this order so the frontend and Edge Functions can use the new columns and policies:

1. In **Supabase → SQL Editor**, run [`supabase/migrations/20261024_growth_and_reliability.sql`](supabase/migrations/20261024_growth_and_reliability.sql). It adds package terms, project case studies, image variants, testimonials, and duplicate-submission protection. It preserves existing records. A new project can run the complete [`supabase/schema.sql`](supabase/schema.sql), which includes this migration.
2. Install the updated dependencies with `npm.cmd install`.
3. Deploy both Edge Functions from the repository root, replacing `YOUR_PROJECT_REF`:

   ```powershell
   npx.cmd supabase login
   npx.cmd supabase functions deploy submit-enquiry --project-ref YOUR_PROJECT_REF --no-verify-jwt
   npx.cmd supabase functions deploy retry-enquiry --project-ref YOUR_PROJECT_REF --no-verify-jwt
   ```

   `submit-enquiry` accepts public requests. `retry-enquiry` verifies the bearer token through Supabase Auth and checks the `admin_users` table before allowing a retry. Its server-side authorization is required even though gateway JWT verification is disabled.
4. Check server secrets in **Supabase → Edge Functions → Secrets**: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ENQUIRY_TO_EMAIL`, and `ALLOWED_ORIGIN`. For this deployment, set `ALLOWED_ORIGIN` to `https://mv-aistudio.vercel.app`; add local origins separated by commas if required. `RATE_LIMIT_SALT` is optional. Keep all these secrets out of Vite variables. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the functions by Supabase.
5. In **Vercel → Project → Settings → Environment Variables**, set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SITE_URL=https://mv-aistudio.vercel.app`. Redeploy with build command `npm run build` and output directory `dist`.
6. In `/admin`, edit **Services & pricing** to enter actual scope, revisions, hosting/domain charges, maintenance costs, support, and payment terms. Empty policies stay hidden; the website does not invent guarantees.
7. In **Projects**, add the challenge, approach, and verified outcome for each case study. In **Client feedback**, add genuine quotes and confirm permission before publishing. There are no seeded testimonials or fabricated results.
8. The sitemap updates automatically within about five minutes after publishing or hiding a project. Rebuild/redeploy after publishing content to refresh prerendered HTML and search previews. The browser continues to fetch current database content. Builds with configured Supabase credentials stop if public content cannot be read, so preview data cannot silently replace production content in search snapshots.
9. After deployment, check `/sitemap.xml`, `/robots.txt`, a `/projects/PROJECT_ID` URL, and `/admin`. Send one enquiry with your own details and confirm that it appears in **Admin → Enquiries** and reaches the configured notification inbox. Email “accepted by provider” means Resend accepted it; actual delivery still depends on the recipient/provider. Failed notifications show an error and an admin-only **Retry email** action.

The React app and the build use the same public page components. The build renders visible homepage/project HTML and a safe public content snapshot, then React hydrates it in the browser. Unknown routes still use the animated error page. Vercel serves generated files before applying the SPA fallback; see [Vercel rewrite precedence](https://vercel.com/docs/project-configuration/vercel-json#rewrites).

## Performance and image handling

Public visitors load the public page code and React/router. Public content and enquiries use lightweight HTTP requests; the Supabase authentication SDK, admin editor, and admin styles load only when `/admin` is opened. The build generates responsive WebP copies of local images; the original files stay available to legacy demo pages. New admin image uploads generate WebP variants up to 480, 960, and 1600 pixels before uploading them to `site-media`. GIF uploads keep their animation. Pasting an external image URL uses that image as provided. Video uploads and YouTube embeds retain their existing behavior.

Package estimates show one-time work and recurring charges separately. Annual discounts use each selected feature's configured free months. A yearly maintenance plan with one free month charges eleven monthly payments. Items requiring a custom quote are listed separately from the numeric estimate.

## Checks

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:browser
```

`npm test` uses an in-memory PostgreSQL runtime to run the schema, repeat migrations, check RLS/grants, and exercise enquiry handlers against database records. Resend is mocked; no real emails are sent. The test bootstrap supplies minimal Supabase Auth/Storage schemas and uses PostgreSQL's built-in UUID generator instead of loading the hosted `pgcrypto` extension.

`test:browser` requires Node.js 22 or newer and Chrome or Edge (set `BROWSER_PATH` if it is not detected). It uses ports 4187, 4188, and 9228, a temporary browser profile, a separate fixture build under `.generated/`, and temporary local database records. It checks production hydration, responsive layouts, lazy admin loading, admin editing, contact lists, testimonial permissions, enquiry submission, meetings, and notification handoff. Screenshots are saved to the temporary directory printed by the command. It does not modify your online database or send notifications. Run a production build first.

## Connect Supabase

1. Create a Supabase project.
2. In **SQL Editor**, run all of [`supabase/schema.sql`](supabase/schema.sql). This creates the tables, starter content, RLS policies, and public `site-media` storage bucket for images and project demo videos (up to 50 MiB per file; the Supabase project's global upload limit also applies).
3. In Supabase **Project Settings → API**, copy the Project URL and the publishable key (or legacy anon key). Never put a `service_role` key in a browser app.
4. Copy `.env.example` to `.env.local` and fill in the values:

   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   VITE_SITE_URL=https://your-domain.com
   ```

5. Create your administrator in **Authentication → Users → Add user**. Use a strong password and turn off public sign-ups if you do not need customer accounts.
6. In SQL Editor, grant the user admin access. Replace the email with the email used in step 5:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'you@example.com'
   on conflict (user_id) do nothing;
   ```

7. Restart Vite after changing `.env.local`, then open `/admin` and sign in.

## Admin features

- **Services & pricing:** create, edit, publish/hide, reorder, or delete packages; manage discounts, features, and delivery estimates.
- **Projects:** manage project descriptions, demo links, tags, featured status, preview images, and demo video URLs. Select up to four projects for the customer-site footer with the “Show in footer” checkbox; the database enforces this limit too. Add a YouTube URL to embed it on the project detail page, or upload an MP4/WebM/MOV clip to Supabase Storage. The existing project demo URL can also be a YouTube link.
- **Project SEO:** set a unique search title and description for each portfolio project. The same project records power the customer site and the JSON-LD portfolio data.
- **Team:** manage names, biographies, social links, order, and photos.
- **Promotions:** manage popup offer copy, destination, image, publication, enablement, and start/end dates. A visitor who dismisses or follows the offer will not see it again in that browser for 30 minutes.
- **Enquiry features:** manage the customer-facing feature catalogue, third-party options, pricing, availability, and annual free-month rules.
- **Enquiries:** view customer requests, selected features, server-calculated estimates, meeting requests, email delivery state, and update the enquiry status.
- **Site content:** edit the home hero, about copy, business contact information, and contact email addresses and phone numbers with add/remove controls. These are stored as JSON arrays in Supabase.
- **Media:** project preview images, team avatar photos, promotion/advertisement images, and project demo clips all use the same public `site-media` bucket. Their admin editors can upload images; project editors can upload MP4/WebM/MOV clips or embed a YouTube link. You can also upload through the Supabase Storage dashboard and paste the resulting public URL into an image or video URL field. Public bucket URLs are accessible to anyone who has the URL.

All persistent content mutations go to Supabase. Row-level security makes website content readable publicly while restricting changes to users explicitly listed in `admin_users`. Do not expose a service-role key in this frontend. To publish, build with `VITE_SITE_URL` set to the canonical HTTPS domain, then deploy the Vite `dist/` output to Vercel and add the same public Supabase environment variables to that host. The build writes `robots.txt` for that domain; Vercel serves `/sitemap.xml` through the function in `api/sitemap.js`. Configure other hosts with an equivalent server route if you move away from Vercel.

The public homepage includes a descriptive title and summary, Open Graph and Twitter sharing tags, a canonical URL, and structured data for the studio and portfolio. The `/admin` route is marked `noindex`. After deployment, submit `https://your-domain.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

The sitemap reads **published Projects** from Supabase whenever its five-minute cache expires. Admins can add or hide projects at **Admin → Projects** without editing XML. A published project's same-site HTML demo URL is also included automatically. Other public pages on this domain can be managed at **Admin → Site content → Additional sitemap pages** (one path per line, beginning with `/`). Use only pages that actually exist and should be indexed. External demo links, Supabase media files, `#section` links and `/admin` do not belong in this sitemap. The extra paths are stored in the existing `site_content` JSON, so no database migration is needed. If Supabase cannot be read, the endpoint returns HTTP 503 instead of an incomplete XML file. Prerendered page metadata is still a build snapshot: redeploy after important title, description, or new-project changes for the best search preview.

## Database SQL

The complete setup and seed query is [`supabase/schema.sql`](supabase/schema.sql). It is safe to run again: seeded records have unique names and are inserted only if missing.

## Enquiry email (Resend)

The enquiry form stores customer data only through the `submit-enquiry` Supabase Edge Function. The function recalculates prices from active feature records, inserts the enquiry, then sends an email notification with Resend. The public browser key cannot read or insert enquiries. The database keeps a request even if Resend is temporarily unavailable; its email status and error are visible in the admin inbox. The displayed estimate is a guide, and the team confirms final scope and any third-party charges.

1. Verify a sending domain in Resend and create an API key. Set a verified sender address such as `MV Studio <hello@yourdomain.com>`.
2. Install and authenticate the [Supabase CLI](https://supabase.com/docs/guides/cli), link your project, then set server-only secrets (never add these to `.env.local` or Vite variables):

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase secrets set RESEND_API_KEY=re_xxx ENQUIRY_TO_EMAIL=you@example.com RESEND_FROM_EMAIL="MV Studio <hello@yourdomain.com>" ALLOWED_ORIGIN=https://your-domain.com
   supabase functions deploy submit-enquiry
   ```

   For multiple recipients, comma-separate `ENQUIRY_TO_EMAIL`. For local development, leaving `ALLOWED_ORIGIN` unset permits localhost origins.
3. Run the current [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor. For an existing install, rerun the full script; it adds feature and enquiry tables, preserves saved website content, and converts legacy newline-separated contact values into JSON arrays.
4. Add the production Supabase URL and publishable key to the host as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then rebuild/redeploy the site. Keep `VITE_SITE_URL` set to the canonical domain for SEO output.

The function rate-limits to five attempts per IP hash per hour. Meeting requests are requests for a callback; a date preference is not a confirmed booking. Annual recurring estimates apply the feature's `annual_free_months` value (maintenance defaults to one free month, so 11 months are charged). You can change the monthly amount and annual free-month rule in **Admin → Enquiry features**.

## Review improvements: deployment and content

The mobile chatbot launcher is compact and hides near the enquiry form, contact
section and footer. The analytics choice panel remains optional; its preferences
button is in the footer instead of floating over page content. Mobile spacing is
reduced without reducing input text or removing project and service information.

For an existing Supabase project, run
`supabase/migrations/20261027_complete_public_details.sql` in **Supabase → SQL
Editor** before deploying. It fills only blank case-study and package-detail
fields on the matching starter records, preserves admin edits, and creates no
testimonials. Review the copy in **Admin → Projects / Services** and tailor it to
the scope you actually offer. For a new database, the full `supabase/schema.sql`
already includes this migration.

Add real testimonials through **Admin → Client feedback**, confirm permission,
then publish. The customer section stays hidden until approved feedback exists.
Never add example feedback as if it came from a customer.

Redeploy the repository to Vercel after these changes. `vercel.json` now serves
the designed `404.html` with HTTP **404** for unknown paths, while preserving
static assets, `/admin` and the dynamic sitemap. Direct project requests use a
small Vercel function to check current publication in Supabase: published pages
return **200**, missing/unpublished projects **404**, and lookup failures **503**
with the maintenance design. No separate backend hosting is required. Keep
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` available to Vercel Functions as
well as builds. The service role key is not needed by this function.

`npm.cmd run dev` runs Vite; it does not emulate Vercel's HTTP routing. Use the
deployed preview to verify response statuses after deployment. A newly published
project works through the application shell; redeploy to refresh its prerendered
HTML and search preview. The animated 404 countdown still returns to the homepage.

Validation commands: `npm.cmd test`, `npm.cmd run build`, and
`npm.cmd run test:browser`. Browser tests use a temporary database and mocked
email delivery; they do not send real enquiries or notifications.
