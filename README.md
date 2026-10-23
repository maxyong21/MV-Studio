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

3. Open the local URL Vite prints (usually `http://localhost:5173`). The customer website works with preview content even before Supabase is configured.

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
8. Rebuild/redeploy after publishing content to refresh the HTML snapshots, project metadata, and sitemap. The browser continues to fetch current database content. Builds with configured Supabase credentials stop if public content cannot be read, so preview data cannot silently replace production content in search snapshots.
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

All persistent content mutations go to Supabase. Row-level security makes website content readable publicly while restricting changes to users explicitly listed in `admin_users`. Do not expose a service-role key in this frontend. To publish, build with `VITE_SITE_URL` set to the canonical HTTPS domain, then deploy the Vite `dist/` output on a static host and add the same public Supabase environment variables to that host. The build writes `robots.txt` and `sitemap.xml` for that domain. Configure the host to serve `index.html` for the `/admin` route.

The public homepage includes a descriptive title and summary, Open Graph and Twitter sharing tags, a canonical URL, and structured data for the studio and portfolio. The `/admin` route is marked `noindex`. After deployment, submit `https://your-domain.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

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
