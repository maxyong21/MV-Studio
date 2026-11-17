# Business terms and trust details

Where the studio's payment, refund, timeline and reply-time wording lives. Change it in every place below so the site, the proposal and the project assistant never disagree.

## The agreed terms (17 November 2026)

| Topic | Wording |
| --- | --- |
| Payment | 50% of the project fee confirms the project. The wireframe, feature confirmation and prototype follow. After you approve them, the remaining 50% is paid before real development begins. |
| Refund | Cancel within 7 days of paying, before wireframe work starts: half of the deposit is refunded (25% of the project fee). After that the deposit is not refundable. Once the remaining 50% is paid and development has begun, payments are not refundable. |
| Delivery | Landing page: as shown on its package card (currently "Ready in 7 days"). Company website and online store: typically 3–4 months. Custom web app: 3–4 months or more, confirmed in the quote. |
| Reply time | 2–3 business days, usually faster on WhatsApp. |
| Source code | Handed over after full project payment. |
| Identity | MV Studio is run by Max Yong and Vincent Teo. It is not a registered company yet, so no company name, registration number or parent organisation is shown. |

The 7-day refund window and "no refund after development begins" are the studio's own rules written from the 50/50 and half-deposit decisions. Confirm them with the team, and with an adviser once the business is registered.

## Where each piece is written

| Place | What | Language |
| --- | --- | --- |
| `src/App.jsx` (`WorkAndPay`, `package-disclosure`, contact `reply-note`, footer) | Home page block, disclosure line, reply time, owners in the footer | EN, BM, Chinese (`src/i18n/ms.js`, `zh.js`) |
| `src/components/EnquiryForm.jsx` | Reply time beside the form and in the success message | EN, BM, Chinese |
| `src/services/ServicePage.jsx` | "Clear about costs" on each service page | EN, BM, Chinese |
| `src/legal/content.mjs` (Terms, sections 4 and 6) | Formal payment and refund clause | English |
| `supabase/migrations/20261117_trust_and_terms.sql` (mirrored in `supabase/schema.sql`) | Package payment terms, timelines, two FAQs, assistant answer | English (database content) |
| `src/content.js` | Fallback copy of the same package terms | English |
| `supabase/functions/_shared/chatbot/industry-content.mjs` | Project assistant answer and its test. Run `node scripts/generate-chatbot-content.mjs` after editing | English |

Text typed in the admin (packages, FAQs, project descriptions) stays English by design. See [LANGUAGES.md](LANGUAGES.md).

## Project labels

Each project has a label chosen in the admin: **Demonstration project** (the default), **Personal project** or **Client project**. A client project must name the client, and that name is public, so only enter it when the client has agreed. The label appears on the project card, the project page, in structured data and in search keywords. A project with no label saved shows none.

## Going live

1. Run `supabase/migrations/20261117_trust_and_terms.sql` in the Supabase SQL Editor **before** deploying. Saving a project in the admin writes the new columns and fails without it.
2. The migration only replaces older starter wording. Terms you edited yourself (for example a package's payment terms) are kept. Update those by hand if they should match the table above.
3. In the admin, open each project and set its label. Until then all four show "Demonstration project".
4. Redeploy so the prerendered pages and sitemap pick up the new text.
