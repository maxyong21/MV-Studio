# Security checks

## What runs, and when

| Check | Command | When |
|---|---|---|
| Live security check | `npm run test:security` | Every Monday on GitHub (Actions, "Security check"), and any time by hand |
| Production dependency audit | `npm audit --omit=dev --audit-level=high` | Same Monday job |
| Uptime | (see `docs/MONITORING.md`) | Every 15 minutes |

The live check uses only what any visitor has (the public browser key) and writes nothing. It confirms:

1. Public sign-up is switched off.
2. Every private table refuses the public key. The list comes from the migrations, so a new table is expected to be private unless you add it to `PUBLIC_TABLES` in `scripts/security-check.mjs`.
3. The public tables refuse changes.
4. Strangers cannot list the files in image storage.
5. The admin functions refuse a caller with no session, and the server functions refuse other websites.
6. The browser protection headers are sent and the admin page allows no inline scripts.
7. Source maps are not served, a missing page is a real 404, and `/admin` is hidden from search engines.
8. `security.txt` lists a contact and has not expired.

When a Monday run fails, GitHub emails the person who last edited the schedule. Open the run, read the
"Failed:" lines at the end, and fix the setting it names.

## Things only you can check (put a reminder in your calendar every 6 months)

- In Supabase: every administrator has two-step login set up; leaked-password protection and backups are on; the project region is Singapore.
- In Vercel: preview deployments are protected, and no secret is stored as a public (`VITE_`) variable.
- `public/.well-known/security.txt` expires on **2027-11-17**. Renew the date before then (the check fails once it has expired).
- Known and accepted: `npm audit` (all packages) reports 4 high advisories in the build tooling (Vite and `picomatch`). No fixed version exists yet, they affect the developer machine only, and nothing from them is sent to visitors. Re-check about once a month.
