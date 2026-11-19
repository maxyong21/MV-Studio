# Business terms and trust details

Where the studio's payment, refund, timeline and reply-time wording lives. Change it in every place below so the site, the proposal and the project assistant never disagree.

## The agreed terms (17 November 2026)

| Topic | Wording |
| --- | --- |
| Payment | 50% of the project fee confirms the project. The wireframe, feature confirmation and prototype follow. After you approve them, the remaining 50% is paid before real development begins. |
| Refund | Cancel in writing within 7 days of paying and before wireframe work starts (whichever comes first): half of the deposit is refunded (25% of the project fee), to the account paid from, within 14 days of confirming the cancellation. After that the deposit is not refundable. Cancelling after the prototype is approved but before the second 50% is paid: no refund, nothing further owed. Development starts as soon as the second 50% is received, so it is not refundable. |
| Delivery | Landing page: as shown on its package card (currently "Ready in 7 days"). Company website and online store: typically 3–4 months. Custom web app: 3–4 months or more, confirmed in the quote. |
| Reply time | 2–3 business days, usually faster on WhatsApp. |
| First steps | A free intro call and a written quote. No payment until the quote is accepted. (A free mockup is not offered.) |
| Enquiry form | Name, phone and email are required. The company name is optional. |
| Source code | Ownership transfers to the client and the code is handed over after full project payment. |
| Design revisions | Up to 2 rounds are included. Further rounds are charged. (19 November 2026) |
| Bug fixing | Free for 30 days after launch. After that, ongoing care needs a maintenance subscription. (19 November 2026) |
| Identity | MV Studio is run by Max Yong and Vincent Teo. It is not a registered company yet, so no company name, registration number or parent organisation is shown. |

The 7-day window, the 14-day refund payout and "no refund once development starts" are the studio's own rules written from the 50/50 and half-deposit decisions. Confirm them with the team, and with an adviser once the business is registered.

## Where each piece is written

| Place | What | Language |
| --- | --- | --- |
| `src/App.jsx` (`WorkAndPay`, `package-disclosure`, contact `reply-note`, footer) | Home page block, disclosure line, reply time, owners in the footer | EN, BM, Chinese (`src/i18n/ms.js`, `zh.js`) |
| `src/components/EnquiryForm.jsx` | Reply time beside the form and in the success message | EN, BM, Chinese |
| `src/services/ServicePage.jsx` | "Clear about costs" on each service page, including the refund line | EN, BM, Chinese |
| `src/legal/content.mjs` (Terms, sections 4 and 6) | Formal payment and refund clause | English |
| `supabase/migrations/20261117_trust_and_terms.sql` (mirrored in `supabase/schema.sql`) | Package payment terms, timelines, two FAQs, assistant answer | English (database content) |
| `src/content.js` | Fallback copy of the same package terms | English |
| `src/quotations/terms.mjs` | The terms printed on every quotation. See [QUOTATIONS.md](QUOTATIONS.md) | English |
| `supabase/functions/_shared/chatbot/industry-content.mjs` | Project assistant answer and its test. Run `node scripts/generate-chatbot-content.mjs` after editing | English |

Text typed in the admin (packages, FAQs, project descriptions) stays English by design. See [LANGUAGES.md](LANGUAGES.md).

## Project labels

Each project has a label chosen in the admin: **Demonstration project** (the default), **Personal project** or **Client project**. A client project must name the client, and that name is public, so only enter it when the client has agreed. The label appears on the project card, the project page, in structured data and in search keywords. A project with no label saved shows none.

## Going live

**Order matters.** Deploy the Supabase pieces first, then the website.

1. Run `supabase/migrations/20261118_faq_groups.sql` in the Supabase SQL Editor. It adds the FAQ groups and one more answer ("Do I pay anything before I get a quote?"). If it has not been run, the FAQ simply stays a single list.
2. Redeploy the functions that validate and email the enquiry form, so a visitor can leave the company name blank:
   ```powershell
   npx.cmd supabase functions deploy submit-enquiry --project-ref idsomvtnofnbtfmlgwum --no-verify-jwt
   npx.cmd supabase functions deploy retry-enquiry --project-ref idsomvtnofnbtfmlgwum --no-verify-jwt
   npx.cmd supabase functions deploy chatbot --project-ref idsomvtnofnbtfmlgwum --no-verify-jwt
   ```
   Until they are redeployed, a form sent without a company name is refused by the server.
3. Deploy the website.

Earlier steps still apply:


1. Run `supabase/migrations/20261117_trust_and_terms.sql` in the Supabase SQL Editor **before** deploying. Saving a project in the admin writes the new columns and fails without it.
2. The migration only replaces older starter wording. Terms you edited yourself (for example a package's payment terms) are kept. Update those by hand if they should match the table above.
3. In the admin, open each project and set its label. Until then all four show "Demonstration project".
4. Redeploy so the prerendered pages and sitemap pick up the new text.
