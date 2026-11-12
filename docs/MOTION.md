# Motion and interaction

How the site moves, where the code lives, and the rules that keep it fast.

## What moves

| Interaction | Where | Code |
|---|---|---|
| Theme reveal: the new theme spreads in a circle from the toggle | Public site, legal pages, admin | `src/lib/theme.js`, `src/components/ThemeToggle.jsx`, `motion.css` |
| Sun and moon icon swap with a short spin | Same toggle | `motion.css` |
| Hero artwork leans toward the cursor; the floating notes drift at different depths | Homepage hero, desktop | `usePointerMotion` in `src/lib/motion.js` |
| Soft light follows the cursor across cards | Start paths, service cards, testimonials | `usePointerMotion`, `motion.css` |
| Nav underline, arrow nudges, button press | Site-wide | `motion.css` |
| Menu drops in; FAQ answers ease in | Small screens; FAQ | `motion.css` |
| Scroll reveal now includes section headings, testimonials, FAQs and the contact card | Homepage | `App.jsx` (existing observer) |

## Rules

- Animate `transform`, `opacity`, `translate` and `clip-path` only. Nothing animates size or position, so nothing triggers layout.
- No animation library. The whole layer is one small stylesheet and two small modules.
- JavaScript only writes CSS custom properties, on the element being hovered, at most once per frame. The stylesheet does the rest.
- One delegated `pointermove` listener for the page. Touch devices never attach it.
- The scroll progress bar is updated once per frame on the bar itself. It used to set a property on `<html>` on every scroll event, which restyled the whole page.
- The site's CSP has no `unsafe-inline` for styles, so use `element.style.setProperty`, never inline `<style>` or style attributes in HTML.

## Fallbacks

| Situation | Behaviour |
|---|---|
| Browser without View Transitions | Theme changes instantly, as before |
| `prefers-reduced-motion: reduce` | No reveal, no tilt, no glow, no press or arrow movement. Theme still changes |
| Tab hidden, or the transition call throws | Theme changes instantly |
| Touch or coarse pointer | No tilt or glow. Tap states still work |
| `localStorage` blocked | Theme works for the visit and is not remembered |
| Toggle clicked again mid-reveal | The running reveal is skipped and the new one starts. The stored theme always matches what is shown |

## Checks

`npm run test:browser` asserts that the reveal starts where it is supported, ends on the chosen theme, stores the choice, and is skipped under reduced motion.
