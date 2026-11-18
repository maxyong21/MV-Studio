# Languages on the customer site

Visitors can switch the interface between English, Bahasa Malaysia and Chinese with the EN | BM | 中文 control. It is in the top bar on wide screens, inside the menu on phones, and in the footer.

## Separate addresses for each language

The home page and the five service pages exist at their own address in each language, so search engines can index them:

| English | Bahasa Malaysia | Chinese |
| --- | --- | --- |
| `/` | `/ms/` | `/zh/` |
| `/services/landing-page` | `/ms/services/landing-page` | `/zh/services/landing-page` |

The same applies to the other four service pages. Choosing a language on one of these pages moves the visitor to that language's address and keeps their place on the page. Links inside a translated page stay in that language. A visitor who chose Bahasa Malaysia or Chinese before is taken to that language when they return to an English address.

Project pages, the privacy, terms and data-deletion pages, the business details form and the admin keep a single address. They follow the visitor's saved language in the browser, and the privacy policy has its own English and Malay switch.

## What is translated

Menus, section headings, buttons, the enquiry form, the FAQ headings and the footer, the payment and refund block, and the whole text of each service page (heading, introduction, what is included, who it suits and its questions, in `src/services/localized.mjs`). The page title and description that search engines show are also translated (`src/lib/seo-locales.mjs` and `src/services/localized.mjs`).

## What is not translated

- **Anything typed in the admin:** the homepage headline and story, package names, prices, timelines and feature lists, projects, FAQs, promotions, team profiles and client feedback. These show in the language they were typed in (English).
- The project assistant chat.
- Form error messages.
- Legal pages (the privacy policy has its own Malay version).
- The admin.

A page viewed in Bahasa Malaysia or Chinese is therefore partly in English until the admin content is retyped or separate language fields are added.

## Review needed

The Bahasa Malaysia and Chinese text was written by the developer, not a translator. Have a native speaker read `src/i18n/ms.js` and `src/i18n/zh.js` before promoting the site in those languages.

## How it works

- English text is the key. `t('Start a project')` returns the chosen language, or the English text when a translation is missing, so nothing can appear blank.
- Translation files load only when a visitor picks that language. English visitors download nothing extra.
- The choice is remembered in the visitor's browser.
- A translated address is prerendered in its language, so the HTML a search engine receives is already in Bahasa Malaysia or Chinese. Each page names its alternates with `hreflang` and the sitemap lists them (`src/lib/locale.mjs`, `scripts/generate-seo.js`, `src/lib/sitemap.mjs`).
- The language comes from the address on these pages. Elsewhere it is the visitor's saved choice.
- Because package cards, FAQs and the headline are typed in English in the admin, the translated home page is partly English. The service pages are fully translated apart from the price, timeline and feature list.

## Changing or adding text

1. Wrap the English text in the component: `{t('New text')}`.
2. Add the same key to `src/i18n/ms.js` and `src/i18n/zh.js`.
3. Run `npm test`. `tests/i18n.test.mjs` fails if a key is missing from either language.

## Guides

The guides at `/guides` follow the same rule as the service pages. The four most-searched articles (website cost, Facebook page or website, landing page or full website, and tuition centre websites) exist in Bahasa Malaysia at `/ms/guides/<slug>` and in Chinese at `/zh/guides/<slug>`, each with its own title, description and `hreflang` links. The other four are English only. On an English-only article, choosing another language translates the menus and buttons but keeps the English address and text. The translated articles were written by the developer and need a native speaker's review. See [GUIDES.md](GUIDES.md).
