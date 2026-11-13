# Search visibility (SEO)

What the website does to be found on Google, and what still has to be done outside the code.

## What the code does

- **Service pages.** Each service has its own address, so it can be found for its own search:
  - `/services/landing-page`
  - `/services/company-website`
  - `/services/ecommerce-website`
  - `/services/custom-web-app`
- **Live prices.** The price, timeline and feature list on a service page come from the matching service in the admin. No price is typed in the code.
- **Structured data.** The homepage tells search engines about the studio, its services and prices, the team, the projects and the published FAQs. Each service page describes the service, its price, a breadcrumb and its questions.
- **Sitemap.** `/sitemap.xml` lists the homepage, service pages, legal pages and published projects.
- **Internal links.** Each service card on the homepage links to its page, and each service page links to the other three.

## How a service card finds its page

Admin services have no address field. A card is linked by its name:

| Service name contains | Page |
|---|---|
| landing, one-page | `/services/landing-page` |
| company, corporate | `/services/company-website` |
| commerce, online store | `/services/ecommerce-website` |
| custom, web app, system | `/services/custom-web-app` |

If a service is renamed so that it fits none or more than one, the card shows no link and the page shows "Let's talk" in place of a price. The page itself stays online.

## Changing the text

- **Homepage search title and description:** admin, site settings, "Search title" and "Search description". The live site uses the admin values, not the defaults in the code. Suggested values:
  - Title: `Web Design Malaysia | Affordable Websites | MV Studio`
  - Description: `MV Studio designs and builds affordable websites, online stores and web apps for small businesses in Malaysia. Clear prices. Work directly with the developers.`
- **Service page text:** `src/services/content.mjs`. Keep titles within 60 characters and descriptions within 160. `npm test` checks both.
- **A new service page:** add an entry to `src/services/content.mjs` and add its address to the service route in `vercel.json`. `tests/service-pages.test.mjs` fails if the two do not match.

Service pages are built at deploy time. After changing a price in the admin, the page shows the new price to visitors at once, but search engines see it after the next deployment.

## Review needed

- Each service page ends with one sentence in Bahasa Malaysia and one in Chinese. They were written by the developer. Have a native speaker read them.
- The answers on the service pages describe how the studio works (separate hosting costs, one-time development fee, support after launch). Read them and correct anything that does not match your practice.

## What code cannot do

Ranking for a competitive search such as "web design Malaysia" depends mostly on things outside the website:

1. **Own domain.** Move from `mv-aistudio.vercel.app` to a `.com.my` or `.my` domain, set `VITE_SITE_URL` to it, and redirect the old address.
2. **Google Search Console.** Submit `/sitemap.xml`, then request indexing for the four service pages.
3. **Google Business Profile.** Create one as a service-area business and ask each customer for a review.
4. **Links from other websites.** Business directories, client sites ("Website by MV Studio"), LinkedIn and Facebook pages.
5. **Content.** Case studies of real projects and short guides that answer what customers search for.

Expect local and specific searches to move in 2 to 4 months. A top-10 place for a broad search usually takes 9 to 18 months and is not guaranteed.

## Checking the result

- Rich Results Test: `https://search.google.com/test/rich-results`, then paste a page address.
- Search Console, "Pages" report: shows which addresses Google has indexed.
- Google no longer shows FAQ drop-downs in results for most business websites. The FAQ data still helps search engines and AI assistants understand the page.
