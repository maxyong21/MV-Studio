# Google Analytics 4

Measurement ID: **G-D92C2BPTH3**. The shared `public/analytics.js` script is included in the React shell and four public project demos. It runs only on `https://mv-aistudio.vercel.app`; localhost and Vercel preview domains do not contribute traffic. If the production domain changes, update `productionOrigin` in that script along with `VITE_SITE_URL`.

## Finish setup in Google Analytics

1. Deploy the frontend commit to the Vercel production branch. No Supabase SQL or Edge Function deployment is needed for analytics.
2. Open GA4 **Admin → Data streams → your web stream** and confirm its measurement ID is `G-D92C2BPTH3`.
3. Turn **Enhanced measurement off** for this stream. This implementation sends page views and events itself. At minimum, automatic history page views, form interactions and outbound-click measurement must be off: history tracking can double-count React navigation even with `send_page_view: false`, while automatic form/link events can collect unwanted parameters. Do not enable user-provided data collection for these forms.
4. Open the production site in a fresh browser session and choose **Allow analytics**. Use GA4 **Realtime** to verify a page view, then visit a project and check that a second page view appears. Section-anchor navigation should not create extra page views. Ad blockers may block collection.
5. Mark **generate_lead** as a key event after it appears in GA4. It means the server confirmed that an enquiry was saved, not that somebody simply clicked Submit. It is not a sale or proof of email delivery.
6. Submit the site's `https://mv-aistudio.vercel.app/sitemap.xml` in Google Search Console. GA4 measurement does not submit a sitemap or directly improve rankings.

## Collected events

| Event | When | Custom data |
| --- | --- | --- |
| `page_view` | An available public homepage, project detail page or static demo is viewed | Title, URL without query strings or fragments, previous public URL/external referring origin |
| `contact_click` | An email, phone or WhatsApp link is clicked | `method`: email, phone or whatsapp |
| `chatbot_open` | The customer opens the project assistant | No chat content |
| `generate_lead` | A normal enquiry or chatbot enquiry is successfully saved | `method`: enquiry_form or chatbot |

No names, email addresses, phone numbers, company names, messages, answers, enquiry IDs, quote values, or clicked contact URLs are sent in these events. Query parameters are deliberately excluded, including UTM tags, so campaign-level attribution is limited in this initial implementation. External referrers are reduced to their origin. Only allowlisted public routes and event parameters are accepted.

## Visitor choice and exclusions

Visitors can allow or decline analytics and reopen **Analytics choices** at the bottom left. The choice is stored locally. No Google Analytics script or analytics requests are initiated by this integration before acceptance. Declining or revoking the choice disables future collection. Existing Google cookies may remain until they expire. Advertiser storage, ad user data and ad personalization are denied, and Google signals are disabled.

The admin area and unknown/unavailable public pages do not initialize tracking. If a visitor moves from the public React site to `/admin`, event collection is disabled for that route. Keep the GA4 Enhanced measurement setting off as described above. Add a public privacy notice explaining your actual analytics, enquiry, chatbot-provider and retention practices before launching campaigns; the preference control is not a substitute for that notice.

The source integration can be tested without sending anything to Google using `node --test tests/analytics.test.mjs`. Successful local tests do not prove receipt in your GA4 account; Realtime verification happens after production deployment and visitor acceptance.

Google references: [Manual pageviews and SPA history settings](https://developers.google.com/analytics/devguides/collection/ga4/views), [recommended events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events).
