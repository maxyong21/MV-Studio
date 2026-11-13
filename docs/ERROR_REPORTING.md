# Problem reports

When the website breaks for a visitor, it emails the studio. Before this, failures were only recorded in the visitor's own browser.

## Setup

1. Deploy the function:
   ```powershell
   npx.cmd supabase functions deploy report-error --project-ref idsomvtnofnbtfmlgwum --no-verify-jwt
   ```
2. Optional: set the secret `ERROR_REPORT_TO` to one or more addresses, separated by commas. Without it, reports go to `ENQUIRY_TO_EMAIL`.

It reuses the existing Gmail secrets and `ALLOWED_ORIGIN`. Until the function is deployed the site behaves exactly as before: the report request fails quietly.

## What is reported

- a script error on any page;
- part of a page failing to display;
- a request to the server failing because of the server (for example the database being unreachable).

Not reported: a visitor's own form mistakes, rate limits, a visitor's dropped connection, and errors from browser extensions.

## Limits

| Limit | Value |
|---|---|
| Per visit | 3 reports, never the same message twice |
| Per visitor | 5 an hour |
| Same problem | once a day |
| Whole site | 20 a day |

Every report counts toward Gmail's daily sending quota, which is the reason for the caps.

## What a report contains

The error message, where on the site it happened, the page path, the time, the browser name, and a short technical detail.

It does not contain form contents. Email addresses, phone numbers, tokens and keys are removed from the text before sending, and the page address is sent without its query string.

**Privacy policy:** the browser name and the error text are collected from visitors. The published privacy policy does not mention this yet. Add a line under the diagnostics or service-provider section before relying on this in production.

## Files

- `src/lib/error-report.mjs`: sends reports from the browser.
- `supabase/functions/_shared/report-handler.mjs`: limits, redaction and the email.
- `tests/error-report.test.mjs`: covers the limits, redaction and failure handling.
