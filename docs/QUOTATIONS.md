# Quotations

A signed, priced quotation for one client, written in the admin and sent as a link that expires or as a PDF.
Built 19 November 2026. Decisions marked "agreed" were confirmed by the studio that day.

## What it does

| # | Requirement | Where |
| --- | --- | --- |
| Q1 | Only an administrator can create, edit, share, revoke or delete a quotation. | Admin, "Quotations" (Customers group). Database access rules. |
| Q2 | Every quotation has an ID the database gives out: `MVQ-YYYYMMDD-NNN`, by Malaysia date. An ID is never reused, even after a delete. | `quotation_before_write`, `quotation_counters` |
| Q3 | Client name is required. Company, email and phone are optional. | `validateQuotation` |
| Q4 | The issue date is today's date in Malaysia (GMT+8). It is set again on the day the share link is created. | `malaysiaToday`, `share` in `Quotations.jsx` |
| Q5 | Valid for 7 days by default: issued Thursday, good until the end of the next Thursday, expired from Friday. The admin can choose another last day, up to 90 days. | `defaultValidUntil`, `isExpired`, `shared_quotation` |
| Q6 | Price lines start from the price list in the database ("Services & pricing" and "Enquiry features", which hold hosting, domain and maintenance) and can be changed. A line is one price or a range. (agreed) | `catalogueOptions` |
| Q7 | One-time, monthly and yearly charges are totalled separately. The deposit is 50% of MV Studio's own one-time fees. | `totals` |
| Q8 | Optional free-text "Additional requirements". | Editor |
| Q9 | Terms and conditions are added automatically, and a copy is stored with each quotation. | `src/quotations/terms.mjs` |
| Q10 | Signed by a team member chosen per quotation. A signature is either typed (the name or initials drawn in a bold, slanted signature font) or an uploaded picture of a handwritten one. (agreed; typed option added 19 November 2026) | "Signatures" in the admin, `typedSignature`, `quotation_signatures` |
| Q11 | A share link that anyone holding it can read until the end of the valid-until day. After that it shows an expired notice with no prices. (agreed) | `/quotation#<secret>`, `shared_quotation` |
| Q12 | The admin can extend or reopen a link by 7 days, revoke it, and record the outcome (awaiting reply, accepted, declined). The client only views and downloads; acceptance is by WhatsApp or email. (agreed) | List actions |
| Q13 | PDF: the quotation page has a "Save as PDF" button with a clean A4 layout. No PDF library is added. (agreed) | `quotation.css`, `@media print` |
| Q14 | A quotation can be started from an enquiry with the customer's details filled in. The older proposal editor inside an enquiry is removed; its saved proposals stay readable. (agreed) | "Create quotation" on an enquiry |
| Q15 | The public Terms page states the same 2 revision rounds and 30-day bug fixing. (agreed) | `src/legal/content.mjs` sections 3 and 6 |

## How it fits together

| Part | Responsible for |
| --- | --- |
| `src/quotations/quotation.mjs` | The rules: Malaysia dates, expiry, price lines, totals, checks, the link secret. No browser or database code, so the admin, the client page and the tests share it. |
| `src/quotations/terms.mjs` | The wording of the terms, with a version date. |
| `src/admin/Quotations.jsx` | The admin screens: list, editor, signatures. |
| `src/quotations/QuotationPage.jsx` | The client page and the admin preview, and every state: loading, shown, expired, not available, connection problem. |
| `src/quotations/QuotationDocument.jsx` | The document itself, the same on screen, in the preview and on paper. |
| `supabase/migrations/20261119_quotations.sql` | Tables, access rules, the ID, and `shared_quotation`, the only thing a visitor can call. |

How a quotation travels:

1. The admin saves a draft. The browser sends it to the `quotations` table; the database refuses anyone who is not an administrator and gives it an ID.
2. Saving copies three things into the row so later changes never rewrite a sent quotation: the terms, the signer's name, role and signature picture, and the studio's contact details from "Site content".
3. "Create share link" makes a 32-byte random secret in the browser, stores it on the row, sets the status to shared and the issue date to today.
4. The link is `https://<site>/quotation#<secret>`. Everything after `#` stays in the browser: it is not sent to the web host, so it is not in hosting logs, and this page runs no analytics.
5. The client's browser calls `shared_quotation(secret)`. The database answers `active` with the public fields, `expired` with only the ID, date and studio contacts, or `not_found`. It never returns internal ids, the secret or who created it.

What is stored, and why:

| Data | Where | Why |
| --- | --- | --- |
| Client name, company, email, phone | `quotations` | To address the quotation (Q3) |
| Price lines, extra requirements, dates, status | `quotations` | The quotation itself (Q4 to Q8, Q12) |
| Copy of terms, signer and studio contacts | `quotations` | So a sent quotation does not change (Q9, Q10) |
| Link secret | `quotations.share_token` | So the admin can copy the link again (Q11) |
| Signature pictures | `quotation_signatures` (database, not public file storage) | Q10. A typed signature is turned into a picture when saved, so both kinds are stored and printed the same way. A signature is only ever shown on a quotation |
| Last number used per day | `quotation_counters` | Q2 |

## Going live

Do these in order. Until step 1 is done, the Quotations page in the admin says it is not switched on yet; nothing else breaks.

1. Run `supabase/migrations/20261119_quotations.sql` in the Supabase SQL Editor. It is safe to run twice.
2. Deploy the website.
3. In the admin open Quotations, press "Signatures" and add each signer. Type the name to have it written in the signature font, or upload a photo (dark ink on white paper, cropped close).
4. Check that "Site content" lists the email addresses and phone numbers you want on quotations. If no phone list is set, the WhatsApp number is used.
5. Make one test quotation for yourself, open its link on your phone, save the PDF, then delete it.

## Changing things later

- **Wording of the terms:** edit `src/quotations/terms.mjs` and change `TERMS_VERSION`. Quotations already saved keep their old copy. Keep `docs/BUSINESS_TERMS.md` and the public Terms page in step.
- **Default validity or deposit:** `VALID_DAYS` and `DEPOSIT_PERCENT` in `src/quotations/quotation.mjs`. The deposit percentage is also written in the terms.
- **Signature font:** `public/fonts/dancing-script-latin-700-normal.woff2` (Dancing Script, SIL Open Font Licence, licence text beside it). It is loaded only in the admin when a signature is typed. To use another font, replace the file and its path in `src/admin/Quotations.jsx`; signatures already saved keep their look.
- **Prices offered in the picker:** "Services & pricing" and "Enquiry features" in the admin.

## Fallbacks

| If this fails | What happens |
| --- | --- |
| Database not updated yet | Admin shows "Quotations are not switched on yet" with the file to run and a Retry button |
| Loading the list fails | Error with Retry; nothing is shown as empty |
| Saving fails | Message says it was not saved; the typing stays in the form |
| Price list or site contacts cannot be read | The quotation can still be typed by hand |
| Client's connection fails | "The quotation could not be loaded" with Try again. It does not say the link is wrong |
| Wrong, cut-off, revoked or declined link | "This quotation link is not available" |
| Past the valid-until day | "This quotation has expired" with the ID, the date and how to reach the studio. No prices |
| Clipboard blocked | The link stays visible in a box to select and copy by hand |
| Pop-ups blocked on "Save and preview" | The draft is still saved; open "Preview and PDF" from the list |

## Checks

- `npm test` includes `tests/quotations.test.mjs`: dates and expiry in Malaysia time, totals and deposit, the price list, form checks, the terms' required topics, and the database rules (IDs, who can read, link states, expiry, private fields).
- `npm run test:quotations` drives a real browser against a local database: signature upload, writing and sharing a quotation, every client-page state, six widths from 320 to 1920 px in light and dark, the printed form, and an accessibility scan. Screenshots and a sample PDF land in `.generated/quotation-check`.

## Limits to know about

- Anyone who has the link can read the quotation until it expires. Send it only to the client.
- A PDF that has been saved or sent cannot be expired or withdrawn.
- The page shows the valid-until date in Malaysia time whatever the client's own time zone is.
- The terms are careful plain-language drafting, not legal advice. Have an adviser review them, especially the liability limit, the refund rules and the clauses the studio added on 19 November 2026 (14-day pause, suspension for unlawful use, maintenance billing).
- A deleted quotation is gone for good; it does not go to "Recently deleted".
