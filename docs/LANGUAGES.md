# Languages on the customer site

Visitors can switch the interface between English, Bahasa Malaysia and Chinese with the EN | BM | 中文 control. It is in the top bar on wide screens, inside the menu on phones, and in the footer.

## What is translated

Menus, section headings, buttons, the enquiry form, the FAQ heading and the footer.

## What is not translated

- **Anything typed in the admin:** the homepage headline and story, services, projects, FAQs, promotions, team profiles and client feedback. These show in the language they were typed in.
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
- Search engines see the English page. There are no separate `/ms` or `/zh` addresses, so this helps visitors who arrive, not search ranking in those languages.

## Changing or adding text

1. Wrap the English text in the component: `{t('New text')}`.
2. Add the same key to `src/i18n/ms.js` and `src/i18n/zh.js`.
3. Run `npm test`. `tests/i18n.test.mjs` fails if a key is missing from either language.
