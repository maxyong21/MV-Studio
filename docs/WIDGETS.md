# Widget library (`/widgets`)

An unlisted page that shows 115 working dashboard widgets. It is for walking a customer through options and agreeing which ones suit their project.

## How it stays out of sight

The page is **unlisted, not locked**. Anyone with the address can open it, which is what lets a customer view it without an account.

| Measure | Where |
|---|---|
| No link from the homepage, footer, legal pages or project pages | checked in `scripts/browser-check.mjs` |
| `noindex, nofollow` meta tag and `X-Robots-Tag` header | `scripts/generate-seo.js`, `vercel.json`, `Widgets.jsx` |
| Never in the sitemap, even if an admin types `/widgets` into the sitemap paths | `src/lib/sitemap.mjs` |
| Not named in `robots.txt`, because a Disallow line would advertise the address | `scripts/generate-seo.js` |
| Its code loads only on `/widgets`, so the homepage does not get heavier | lazy route in `src/App.jsx` |

The only link to it is the **Widget library** button in the admin header.

If the page must become private, put the route behind the admin login in `src/App.jsx`. Customers would then need you to share your screen.

## Using it with a customer

- Each card has a number, a name, a working demo and a "Use it when" line.
- Charts show exact values on hover or tap, and **Shuffle data** redraws them with new numbers.
- **☆ Shortlist** marks a widget. The shortlist is kept in that browser only.
- **Shortlist only** filters the page, and **Copy shortlist** copies the numbered names to paste into a message.
- The search box matches names, categories and the "Use it when" text.

## Adding or changing a widget

Widgets live in `src/widgets/`, one file per group. Each entry is:

```js
{name:'Line chart', use:'you want to show…', data:true, wide:false, Demo:Component}
```

- `data:true` shows the readout line and the Shuffle button. Read the seed with `useDemo().seed`.
- `useDemo().say(text)` writes the readout. `useDemo().toast(text)` shows a page message.
- Numbers come from the order of the lists in `Widgets.jsx`, so adding in the middle renumbers later widgets.
- Update the count of 115 in `scripts/browser-check.mjs` when you add or remove one.

## Rules

- No chart library. Charts are plain SVG built with the helpers in `kit.jsx`.
- The site's content security policy blocks inline styles. Colour SVG marks with the classes `f1`–`f8`, `s1`–`s8` and `b1`–`b8`, never a `style` attribute in markup.
- Chart colours are a fixed, colour-blind-checked order with separate light and dark steps (`widgets.css`). Use them in order and do not add new hues. More than three series on scatter-style charts should be grouped instead.
- Status colours (good, warning, serious, critical) always come with an icon and a label.
- Maps are schematic drawings. No map tiles or outside services are loaded.
- All data on the page is made up.
