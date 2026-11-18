# Technical Assessment: MV Studio website (security and privacy)

**Assessment date: 2026-11-18.** Scope: the live site at `https://mv-aistudio.vercel.app`, its Supabase
back end (database, storage, server functions) and the repository on `feature/new-mv-studio-web`.
Method: code review plus read-only requests, using only what any visitor has (the public browser key).
Nothing was written to the live database, no enquiry was submitted and no email was sent. The admin
login itself was not exercised, and no load or denial-of-service testing was done.

Two changes are in the working tree and not yet deployed: the sitemap policy and the admin
inline-style policy (see S5).

## Verdict

**It passes a standard baseline security review.** There are no critical or high findings: the
database is closed to the public apart from intended site content, the admin functions reject
anyone without a session, and the browser protections are strong.

**It would not yet pass a strict privacy review** (for example a customer's procurement team asking
for PDPA evidence). The gaps are all in the written notice and retention, not in the code: the
policy never mentions the marketing outreach list, no retention period is defined, and the
notice names no registered business or postal address.

| Area | Score (1 to 5) | Posture |
|---|---|---|
| Security | 4.0 | Strong baseline. One medium item (open sign-up), three low. |
| Privacy | 3.5 | Good behaviour in practice (no tracking before consent). The notice and retention rules are incomplete. |

## Update, same day: status after the fixes

| ID | Status |
|---|---|
| S1 Public sign-up | **Fixed and verified live** (`disable_signup: true`). `npm run test:security` now checks it every Monday, so it cannot reopen unnoticed. |
| S2 File listing | **Ready, not applied.** Run `supabase/migrations/20261118_storage_listing.sql` in the Supabase SQL Editor. The security check fails until then, which is the reminder. |
| S3 `security.txt` | **Done, needs deploy.** Lists both team emails, expires 2027-11-17 (a test fails 60 days before that). |
| S4 Dev-tool advisories | **No fix exists** (`picomatch` 4.0.7 is already the newest). Dev machine only. Documented as accepted in `docs/SECURITY_CHECKS.md`. The Monday job fails if any production dependency gets a high advisory. |
| S5 Admin inline styles | Accepted, locked in by a test. |
| P1 Outreach not in policy | **Done, needs deploy.** New section 5 in English and Bahasa Melayu, and the data-deletion page lists marketing email contacts. |
| P2 Retention | **Done, needs the SQL and deploy.** Periods are written into the policy (24 months for enquiries, 12 months for outreach contacts that never replied, reviewed at least twice a year). The daily cleanup is scheduled by `20261118_retention_schedule.sql`. The policy says it runs every day, so apply that SQL before or with the deploy. Review queries and the schedule are in `docs/RETENTION.md`. |
| P3 Registered business details | **Open.** Waiting for the SSM registration and a business email. |
| P4 Data locations | **Done, needs deploy.** Policy names Supabase in Singapore (as told by the owner; please confirm in Supabase, Project Settings). The website functions now run in Singapore too (`vercel.json`); before, they ran in Washington, US. |
| Breach plan | **Done.** `docs/INCIDENT_RESPONSE.md`. Legal deadlines still need a lawyer to confirm. |

## Findings (as first assessed)

| ID | Area | Rating | Finding | Fix |
|---|---|---|---|---|
| S1 | Security | Medium | Public sign-up is enabled on the database's login system (`disable_signup: false`). Anyone can create an account. It exposes no data today, because every rule requires an admin, but it allows spam accounts and would make any future rule that trusts "any logged-in user" unsafe. | Supabase Dashboard, Authentication, Sign In / Providers: turn off "Allow new users to sign up". Existing admins are unaffected. |
| S2 | Security | Low | Anyone can list the file names in the public `site-media` storage folder, including images of unpublished work. The files are public by URL anyway. | Replace the public "view" storage policy with an admin-only one (public file URLs keep working). Test an image after. |
| S3 | Security | Low | No `/.well-known/security.txt`, so researchers have no stated way to report a problem. | Add the file with a contact address. |
| S4 | Security | Low | `npm audit` reports 4 high advisories in development tools (Vite and a path-matching library). Production dependencies: 0. Nothing here ships to visitors. | No fixed version exists yet; accepted (see the update above). |
| S5 | Security | Info | After deploy, the admin page allows inline styles (needed for the email preview). Scripts stay blocked, and the public site stays strict. A test locks this in. | Accepted trade-off. |
| P1 | Privacy | Medium | The privacy policy does not mention the marketing outreach list (prospect email addresses, where they came from, why we write, how to opt out, how long we keep them). It only says an enquiry does not subscribe you to marketing. The emails do carry an opt-out link, but the notice should match. | Add a short "Business outreach" section. |
| P2 | Privacy | Medium | No retention period is defined for enquiries or business details ("not automatically deleted"). The 30-day chatbot log cleanup exists but nothing schedules it; it only runs when triggered from the admin. | Choose a period (for example 24 months), then schedule the cleanup. |
| P3 | Privacy | Medium | The notice names "MV Studio" with two personal Gmail contacts: no registered business name, SSM number, postal address or named privacy contact. | Fix with the SSM registration and a business email. |
| P4 | Privacy | Low | Overseas processing is stated generically. | Name the providers and the Supabase region. |

Malaysia's 2024 PDPA amendments (in force since 2025) added breach notification and, for some
organisations, a data protection officer. Confirm with a lawyer what applies to MV Studio, and
keep a short written plan for what to do after a data breach.

## Checks that passed

**Security**
- Headers on every page: strict Content-Security-Policy, HSTS (two years), `X-Frame-Options: DENY`, `nosniff`, referrer policy, permissions policy, same-origin opener policy.
- Source maps are not served (403). No secrets, keys or `.env` files in the repo or its history (only `.env.example`).
- The public key can read only the site-content tables (projects, services, FAQs, team, promotions, features, site text). The 24 private tables return "permission denied": enquiries, admin users, marketing contacts and campaigns, quotes, chatbot data, profile requests and others.
- Write attempts with the public key were rejected on all eight public tables, including the site-text table.
- Every other access rule is admin-only.
- Admin functions (`marketing`, `chatbot-admin`, `retry-enquiry`) return 401 with no session or with the public key, and then also check the admin list. The admin login has a second authenticator step.
- Server functions only accept the site's own origin (a foreign site's preflight gets 403). Origin alone is only a browser rule, so the real protection is the next point.
- The enquiry form has human verification that fails closed, a hidden trap field and a limit of 5 per hour per visitor. The chatbot is rate limited too.
- The WhatsApp functions are gone (404). CI runs with read-only permissions.
- No unsafe HTML injection in the app. The admin print window escapes every value.

**Privacy**
- Before consent, a first-time visitor's browser contacts only our own database host. No Google tag, no cookies, no stored data. No Google Fonts calls.
- Analytics are opt-in, with a way to change the choice. Error reports are scrubbed of emails, numbers and tokens. Chatbot questions are redacted before processing.
- The enquiry form shows a notice with links to the privacy policy and terms.
- A data deletion page exists, and the policy is available in English and Bahasa Melayu.
- Marketing emails carry a per-contact opt-out link and a one-click header, and opted-out contacts are skipped.
- The team phone numbers and emails visible through the API are the same ones already shown on the page, so that is not a leak.

## Could not be checked from outside

Supabase dashboard settings (leaked-password protection, whether every admin has a second factor
enrolled, backups, the project region), Vercel project settings (environment variables, preview
deployment protection), email authentication records (SPF, DKIM, DMARC) for the sending address,
and the admin screens behind login.

## Remediation order

1. **Today (5 minutes):** S1, turn off public sign-up.
2. **This week:** P1 (outreach section in the policy), S3 (`security.txt`), S2 (storage listing).
3. **With the SSM registration:** P3, then P2 (retention period and a scheduled cleanup) and P4.
4. **Later:** S4 (development tool updates).
