# Guides (articles)

The guides at `/guides` exist to bring in people who are searching for answers before they hire a developer. They are plain-English articles written by the two of you. This page explains how they work and how to add or change one.

## What is published

| Guide | English | Bahasa Malaysia | Chinese |
| --- | --- | --- | --- |
| How much does a website cost in Malaysia? | yes | yes | yes |
| Google Business Profile setup | yes | | |
| Do you need a website if you already have a Facebook page? | yes | yes | yes |
| Landing page or full website: which does your SME need? | yes | yes | yes |
| The website checklist for a new business or startup | yes | | |
| What a tuition centre website should include | yes | yes | yes |
| Domain, hosting and maintenance costs | yes | | |
| How long does it take to build a website? | yes | | |

An article exists at `/guides/<slug>`, and at `/ms/guides/<slug>` and `/zh/guides/<slug>` where it has been translated. The list is at `/guides`, `/ms/guides` and `/zh/guides`.

## Where things live

| File | What it holds |
| --- | --- |
| `src/guides/registry.mjs` | The small facts every page needs: title, search title, description, dates, reading time, related articles and services. Loaded on every page, so keep it small. |
| `src/guides/articles/<slug>.mjs` | The article text in each language. Loaded only on guide pages. |
| `src/guides/articles.mjs` | Gathers all the article files. |
| `src/guides/tokens.mjs` | Fills `{price:landing}` and `{fee:hosting}` from the live prices. |
| `src/guides/GuidePage.jsx`, `GuidesIndex.jsx`, `GuideParts.jsx` | The pages. |
| `src/lib/structured-data.mjs` (`articleGraph`) | The article, author, breadcrumb and question markup for Google. |

## Adding an article

1. **Registry.** Add an entry to `guides` in `registry.mjs`: slug, `published` and `modified` dates, `topic`, related `services` and `related` articles, and the `en` text (`title`, `seoTitle`, `description`, `minutes`). Add a short label to `shortTitle` if it will appear in the footer.
2. **Text.** Create `src/guides/articles/<slug>.mjs` (copy a short one) and add it to `articles.mjs`.
3. **Routes.** Run `npm run guides:routes`. It updates `vercel.json`.
4. **Tests.** Run `npm test`. They check the dates, title and description lengths, links, prices, translations and the writing rules below.
5. **Deploy.** The build creates the page, adds it to the sitemap and puts it in the footer or home page only if you add it to `featuredSlugs` or it is among the three newest.

To translate an article, add `ms` and `zh` to its registry entry and to its article file. Bahasa Malaysia and Chinese always come as a pair, because the page and the language links in its `<head>` depend on it.

## Writing rules (the tests enforce most of these)

- **Be specific and honest.** Write what you know. Do not invent client stories, numbers, awards or "years of experience". The studio has no client projects to cite yet, so use examples that are clearly hypothetical, such as "say you run a small bakery".
- **Sound like a person.** Use contractions and short sentences. Avoid filler and the usual AI phrases. The tests reject a list of them, and em dashes.
- **Never type a package price by hand.** Write `{price:landing}`, `{price:company}`, `{price:ecommerce}`, `{fee:hosting}` or `{fee:maintenance}`, so articles follow the real prices.
- **Link well.** Use descriptive anchor text, such as "how much a website costs in Malaysia", never "click here". Every article links to at least two other guides and one service page.
- **US English** for the English text. The one exception is "tuition centre", the spelling Malaysians search for.
- **Cite official sources** for facts that can change, and label reference prices as such. Google's own guidance asks for original, people-first content and honest authorship; it does not set a word count.

## Dates

`published` and `modified` are the dates shown on the page and in the search markup. Change `modified` only when the article has really changed, such as a corrected price or a new section. Google asks site owners not to refresh dates just to look current.

## Facts that must stay in step with the rest of the site

These appear in several articles. If one changes, search the articles for it.

- Payment: 50% to confirm, 50% before development, half of the deposit refunded within 7 days and before wireframe work.
- A free intro call and a written quote, with no payment until the quote is accepted.
- Timelines: a landing page in about 7 days once content is ready; a company website or online store in 3 to 4 months.
- Extra features after launch from RM50 each.
- Domain, hosting and third-party costs are not in the package prices. MV Studio helps set them up, tells the client the charge first, and the accounts are in the client's name.
- Reference prices in the domain and hosting article (checked November 2026): `.com.my` about RM80 a year, entry shared hosting from under RM100 to a few hundred ringgit a year, Google Workspace Starter about RM29 per user per month before tax. Re-check them every few months.

## After publishing

- Submit the sitemap again in Google Search Console and use URL Inspection to request indexing for new articles.
- Watch the Performance report for the queries each article gets, and improve the titles and first paragraphs of pages that show impressions but few clicks.
- Add real examples as soon as you have clients, with their permission. They make the articles stronger than anything we can write now.
