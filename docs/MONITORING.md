# Monitoring, performance and accessibility checks

How to find out the site is broken before a customer does, and how to keep it fast and usable.

## 1. Is the site up? (every 15 minutes)

`.github/workflows/uptime.yml` runs on GitHub every 15 minutes and fails, with an email, if any of these is wrong:

- the home page, a service page, the terms page, the Bahasa Malaysia home page, the sitemap or `/api/health` does not return 200;
- an unknown address does not return a real 404;
- the home page is showing the maintenance or coming-soon page;
- the Content-Security-Policy or X-Frame-Options header has disappeared.

**To receive the email:** GitHub > your profile > Settings > Notifications > Actions, and make sure failed workflow runs notify you by email. GitHub sends the alert to the person who last edited the schedule line in the workflow file.

**To run it now:** repository > Actions > Uptime check > Run workflow.

**Notes**

- GitHub does not run schedules to the minute. A check can be a few minutes late.
- On a public repository, GitHub pauses scheduled workflows after 60 days without any repository activity. Open the Actions tab now and then, or push any change, to keep it running.
- To watch a custom domain later, add a repository variable `SITE_URL` (Settings > Secrets and variables > Actions > Variables), for example `https://www.example.com`.
- The check needs no passwords or keys.

### `/api/health`

`GET /api/health` returns `{"ok":true,"database":"ok","time":"..."}` with status 200 when the site can read its database, and status 503 with a short reason (`unavailable`, `unreachable`, `not configured`, `unexpected response`) when it cannot. It returns no data, keys or error details and is never cached or indexed. Any uptime service can use it. If you would rather use a hosted monitor (for example UptimeRobot or Better Stack, both have free plans), point it at `https://<your-site>/api/health` with a 5-minute interval and an email alert.

## 2. Problems visitors hit

Visitors' browsers report script errors and failed requests by email. See [ERROR_REPORTING.md](ERROR_REPORTING.md).

## 3. Speed (`npm run test:perf`)

Runs the home page in a phone-sized browser and checks that:

- the human-check widget from Cloudflare (about 2.7 MB) is **not** requested on the first screen;
- it loads once the enquiry form is near, and the form becomes usable;
- the page does not shift while loading.

Before this guard, the live home page loaded that widget immediately. On a slow phone (slow 4G, 4x slower processor) that pushed the largest content to about 12.8 seconds. The widget now waits for the form.

For a wider look, run Lighthouse in Chrome (DevTools > Lighthouse > Mobile) on the live site, and repeat it a few times, since single runs vary.

**Project images.** An image uploaded in the admin should come with several sizes. If a project image still loads as one very large original (over about 300 KB), open that project in the admin and upload the image again so smaller sizes are created.

## 4. Accessibility (`npm run test:a11y`)

Scans the home page (English, Bahasa Malaysia and Chinese), a service page, the terms, privacy and data-deletion pages, a project page, the business details form and the not-found page. It uses the axe-core rules for WCAG 2.2 level AA, on a phone and a desktop width, in light and dark themes, and fails on any serious or critical finding.

Automated rules catch only part of what matters. Before a big launch, also:

1. Use the whole site with the keyboard only (Tab, Shift+Tab, Enter, Space, Escape): every control reachable, focus always visible, no trap.
2. Zoom to 200% and check nothing is cut off.
3. Try a screen reader on the home page and the enquiry form (NVDA is free on Windows, VoiceOver is built into iPhone and Mac).

Set `A11Y_REPORT_ONLY=1` to print findings without failing, and `A11Y_SAMPLES=80` to list more affected elements.

## Summary of commands

| Command | What it checks |
| --- | --- |
| `npm test` | Logic, database migrations, translations, SEO, terms |
| `npm run test:browser` | The whole site in a real browser, including the admin |
| `npm run test:perf` | First-screen weight: the human check is deferred, no layout shift |
| `npm run test:a11y` | Automated WCAG 2.2 AA scan, light and dark |
| `npm run test:browsers` | Cross-browser run |
