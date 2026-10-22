# MV Studio — Cloudflare Web Studio Website

MV Studio is a React website for a small web development studio serving startups, small businesses, and SMEs. Visitors can browse services and prices, view project demos, configure a project estimate, send an enquiry, and request a short meeting. The `/admin` workspace manages the content and enquiry inbox.

## Technology

- React 19 + Vite for the website and admin interface.
- Cloudflare Workers for the same-origin API, admin authorization, SEO routes, enquiries, and media delivery.
- Cloudflare D1 (SQLite) for site content, services, projects, promotion settings, feature options, and enquiries.
- Cloudflare R2 for project images, avatars, advertisement artwork, and uploaded demo videos. The bucket stays private; media is streamed through the Worker.
- Cloudflare Access protects `/admin` and `/api/admin/*`; the Worker also verifies signed Access JWTs and an email allowlist.
- Resend can email new enquiry notifications. Enquiries are saved in D1 even when email delivery is not configured or temporarily fails.

Supabase is no longer used by the application. D1 is accessed only by the Worker, so database credentials never go in the browser bundle.

## Important: Vercel versus Cloudflare deployment

The complete production app (including D1, R2 uploads, Access-protected admin APIs, and the live database-backed sitemap) must run through the Cloudflare Worker. A Vercel static deployment can serve the React pages and a small fallback sitemap, but it does not provide the Worker bindings or Cloudflare Access integration. The repository's `vercel.json` sets the correct Vite client output and SPA fallback; it does **not** host the `/api/*` Worker. For a fully working admin, enquiry, and live-content site, deploy with `npm.cmd run deploy` to Cloudflare and point the production hostname to that Worker. The Worker serves `/sitemap.xml` dynamically from active D1 projects.

If you keep a Vercel preview for the frontend, set `VITE_SITE_URL` to `https://mv-aistudio.vercel.app` in Vercel's Production Environment Variables and redeploy. Vercel will publish a homepage-only fallback at `/sitemap.xml`; it cannot list live D1 projects unless requests are served by the Cloudflare Worker. The build falls back to Vercel's production-domain system variable, then to `https://mv-aistudio.vercel.app`.

## Run it locally

Prerequisites: Node.js 20.19+ and npm.

```powershell
npm.cmd install
Copy-Item .dev.vars.example .dev.vars
npm.cmd run db:setup:local
npm.cmd run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). The local D1 schema includes sample services and feature options. Local admin access is enabled by `.dev.vars` only; use a local-only email there. Never deploy `ENVIRONMENT=development` or `DEV_ADMIN_EMAIL` to production. Local D1 and R2 data are separate from your Cloudflare account.

Useful commands:

```powershell
npm.cmd run build
npm.cmd run db:setup:local
npm.cmd run db:setup:remote
npm.cmd run deploy
```

`db:setup:remote` applies the schema and starter records to the configured production D1 database. Run it once for a new database, and review `cloudflare/schema.sql` before rerunning it on a database with live content. It uses `CREATE TABLE IF NOT EXISTS` and `INSERT OR IGNORE` for the starter records.

## Create Cloudflare resources

1. Create/sign in to a Cloudflare account and install Wrangler through this project's dependencies (`npm install`). Authenticate:

   ```powershell
   npx wrangler login
   ```

2. Create a D1 database:

   ```powershell
   npx wrangler d1 create mv-studio
   ```

   Copy the returned database ID into `database_id` in `wrangler.jsonc`, replacing the all-zero placeholder. Keep `database_name` as `mv-studio`.

3. Create the media bucket:

   ```powershell
   npx wrangler r2 bucket create mv-studio-media
   ```

   The `preview_bucket_name` in the Wrangler config is for local development; it does not need to exist in production.

4. Apply the schema and starter content:

   ```powershell
   npm.cmd run db:setup:remote
   ```

   This creates tables for `services`, `projects`, `team_members`, `promotions`, `feature_options`, `site_content`, `enquiries`, and enquiry rate limits. The authoritative SQL is [`cloudflare/schema.sql`](cloudflare/schema.sql).

5. Add server-side secrets to the Worker. Wrangler prompts for each value:

   ```powershell
   npx wrangler secret put ADMIN_EMAILS
   npx wrangler secret put ACCESS_TEAM_DOMAIN
   npx wrangler secret put ACCESS_AUD
   npx wrangler secret put ENQUIRY_RATE_SALT
   npx wrangler secret put ENQUIRY_TO_EMAIL
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put RESEND_FROM_EMAIL
   ```

   - `ADMIN_EMAILS`: comma-separated email addresses permitted to manage content.
   - `ACCESS_TEAM_DOMAIN`: your Zero Trust team domain, e.g. `your-team.cloudflareaccess.com` (without `https://`).
   - `ACCESS_AUD`: the Application Audience (AUD) tag for the Cloudflare Access application protecting the admin/API paths. If separate applications are used for `/admin*` and `/api/admin*`, provide both AUDs separated by commas.
   - `ENQUIRY_RATE_SALT`: a long random secret used to hash IPs in the enquiry rate limiter.
   - `ENQUIRY_TO_EMAIL`: one or more notification recipients, comma-separated.
   - `RESEND_API_KEY` and `RESEND_FROM_EMAIL`: a Resend key and verified sender, e.g. `MV Studio <hello@yourdomain.com>`. These three email secrets may be omitted if you want enquiries stored in D1 without email notifications.

   Do not put any of these values in `VITE_*` variables or commit them to Git. The local `.dev.vars` file is ignored by Git; `.dev.vars.example` contains placeholders only.

## Protect the admin site with Cloudflare Access

1. In the Cloudflare Zero Trust dashboard, create a self-hosted Access application for your production hostname. Protect `/admin*` and allow only the administrator emails you intend to use.
2. Protect `/api/admin*` too. An Access application for the API can use the same administrator policy. If the paths require two applications, put both application AUD tags in `ACCESS_AUD`.
3. Copy the team domain and application AUD tag(s) into the Worker secrets above. The Worker validates the Access JWT signature, issuer, expiry, audience, and email allowlist on every admin API request.
4. The Access app should be live before you expose the production hostname. The admin page's API is same-origin and relies on the browser's Access session cookie.

There is no public admin password or public sign-up. For production, do not rely on the local development bypass.

## Deploy to Cloudflare

1. Set the production site URL for the build. For PowerShell in the current terminal:

   ```powershell
   $env:VITE_SITE_URL = 'https://your-domain.com'
   npm.cmd run build
   ```

   The post-build step removes local `.dev.vars` from the generated Worker output. Production secrets must be supplied through Wrangler secrets, never bundled into the assets.

   Or set `VITE_SITE_URL` in your deployment environment. This writes canonical/share metadata and `robots.txt` into the Vite client asset directory. The Worker creates the sitemap dynamically from active projects.

2. Add the Worker custom domain in Cloudflare (Workers & Pages → your Worker → Settings → Domains & Routes). The hostname/DNS should use Cloudflare. Keep the website and API on the same hostname so Access and media uploads work without cross-origin configuration.
3. Deploy:

   ```powershell
   npm.cmd run deploy
   ```

   This builds the client and deploys the Worker/API/assets. Cloudflare's Vite plugin reads `wrangler.jsonc` and bundles the Worker plus static assets.

4. Visit `/`, `/admin`, `/sitemap.xml`, and `/robots.txt` on the deployed hostname. Verify Access blocks visitors who are not on the admin allowlist, then sign in as an allowed email and confirm an edit in the admin appears on the public page.
5. Submit `https://your-domain.com/sitemap.xml` to Google Search Console and Bing Webmaster Tools. Project detail routes include project-specific title, description, canonical URL, Open Graph tags, and structured metadata.

## Admin content and media

- Services: manage package name, category, price, discount/original price, features, timeline, publication, and order.
- Projects: manage summaries, SEO titles/descriptions, tags, active/featured state, project image, and demo/video URL. Use a YouTube link for an externally hosted demo, or upload an MP4/WebM/MOV clip to R2.
- Team: manage profiles and avatar images.
- Promotions: manage popup copy, date range, destination and artwork. The browser remembers a dismissed or clicked promotion for 30 minutes.
- Feature options: manage one-time and monthly quote options. Annual maintenance estimates apply the configured free months; one free month makes the annual total 11 monthly payments. Change the monthly price and `annual_free_months` in the admin.
- Enquiries: review contact details, selected features, server-calculated estimate, meeting request, email delivery status, and update enquiry status.
- Site content: manage the homepage copy and contact emails/phone numbers.
- Media: upload project images, avatars, promotions, and supported video files in the relevant admin forms. The Worker stores objects in R2 and returns same-site `/media/...` URLs. A private bucket avoids exposing bucket credentials or allowing anonymous writes.

## Enquiry email setup (optional)

Create a Resend account, verify your sending domain, and set `ENQUIRY_TO_EMAIL`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` as Worker secrets. The Worker recalculates estimates from active D1 feature records, applies a five submissions per IP-hash-per-hour limit, stores each valid request, then sends the notification. If Resend rejects or cannot send it, the customer request is still saved and the failure is visible in the admin inbox. A meeting time is a callback preference, not a confirmed booking.

## Moving existing content from Supabase

This codebase cannot access your Supabase account, so it has not copied live hosted records or bucket objects automatically. Before changing your public DNS, migrate any content you want to keep:

1. Back up the Supabase project. In the Supabase dashboard, export the rows from `services`, `projects`, `team_members`, `promotions`, `feature_options`, and `site_content` as CSV/JSON. Keep enquiry exports private because they contain personal information.
2. Create the Cloudflare D1 database, then apply `cloudflare/schema.sql`. It seeds starter content; remove/replace those rows if you are importing your own catalogue.
3. Import the exported rows into the matching D1 tables using Cloudflare's D1 dashboard import or `wrangler d1 execute mv-studio --remote --file <migration.sql>`. Map Supabase UUIDs to D1 text IDs, and preserve project `image_url` / `demo_url` values until media is migrated. D1 is SQLite, so use SQLite-compatible SQL and quote text values safely.
4. Download existing Supabase Storage objects and upload them with the admin media uploader after Cloudflare Access is configured. Update the corresponding D1 `image_url` fields to the returned `/media/<object-key>` URLs. You can leave YouTube or other external demo URLs as they are.
5. Verify services, projects, media, enquiries, and admin editing on a staging hostname. Enquiries may contain customer personal data; restrict the export and delete temporary files after the migration.
6. Switch the public domain only after that verification. Keep the Supabase project as a temporary backup until the Cloudflare deployment is confirmed.

For a brand-new site, skip this migration section: the starter data from `cloudflare/schema.sql` is sufficient and all ongoing content is managed in the Cloudflare-backed admin.

## Git workflow

Create a feature branch before committing changes:

```powershell
git status --short
git switch -c feature/cloudflare-migration
git add -A
git diff --cached --stat
git commit -m "Migrate MV Studio backend to Cloudflare"
```

If the branch already exists, switch to it with `git switch feature/cloudflare-migration`. Review staged files before committing, and do not stage `.dev.vars` or production secrets.
