# MV Studio — React + Supabase

MV Studio's customer website and private content manager are built with React, Vite, and Supabase. The original project detail pages and their media remain in the project root and are linked from the project cards.

## What this website is for

MV Studio is a small web development studio website for introducing the team and its services to new businesses, startups, and SMEs. Visitors can browse services and project examples, view demo links or videos, request a project estimate, and ask for a short meeting. Administrators sign in to manage services and prices, projects, team profiles, promotions, feature options, contact details, and customer enquiries. Supabase stores the website content and enquiry records; Resend sends enquiry notifications when configured.

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
- **Projects:** manage project descriptions, demo links, tags, featured status, preview images, and demo video URLs. Add a YouTube URL to embed it on the project detail page, or upload an MP4/WebM/MOV clip to Supabase Storage. The existing project demo URL can also be a YouTube link.
- **Project SEO:** set a unique search title and description for each portfolio project. The same project records power the customer site and the JSON-LD portfolio data.
- **Team:** manage names, biographies, social links, order, and photos.
- **Promotions:** manage popup offer copy, destination, image, publication, enablement, and start/end dates. A visitor who dismisses or follows the offer will not see it again in that browser for 30 minutes.
- **Enquiry features:** manage the customer-facing feature catalogue, third-party options, pricing, availability, and annual free-month rules.
- **Enquiries:** view customer requests, selected features, server-calculated estimates, meeting requests, email delivery state, and update the enquiry status.
- **Site content:** edit the home hero, about copy, business contact information, and multiple contact emails / phone numbers (one per line).
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
3. Run the current [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor. For an existing install, rerun the full script; it adds feature and enquiry tables and preserves saved website content.
4. Add the production Supabase URL and publishable key to the host as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then rebuild/redeploy the site. Keep `VITE_SITE_URL` set to the canonical domain for SEO output.

The function rate-limits to five attempts per IP hash per hour. Meeting requests are requests for a callback; a date preference is not a confirmed booking. Annual recurring estimates apply the feature's `annual_free_months` value (maintenance defaults to one free month, so 11 months are charged). You can change the monthly amount and annual free-month rule in **Admin → Enquiry features**.
