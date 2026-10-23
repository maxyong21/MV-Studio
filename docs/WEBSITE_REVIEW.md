# MV Studio website review

Reviewed 23 October 2026 using the live public site at https://mv-aistudio.vercel.app and the local source. This is a design and implementation review, not a Lighthouse score, accessibility certification, or authenticated admin audit. No live enquiries were submitted.

## Assessment

Overall: **7.5/10**. The site presents a coherent studio identity and a useful service offering. Its next improvements should help visitors understand the offer and trust the team, rather than add more animation.

| Area | Assessment | Evidence |
| --- | --- | --- |
| Visual design | 8/10 | Consistent cream, green and orange palette, readable typography and clear section styling. Footer text is readable against its dark background. |
| Offer clarity | 7/10 | Services and pricing are available, but the initial headline does not explain the specific service or target customer. |
| Mobile usability | 7.5/10 | No horizontal overflow at 320, 390 or 1440 pixels. The mobile homepage is roughly 12,800 pixels long; the decorative hero and lengthy forms delay key decisions. |
| Conversion and trust | 7/10 | Contact channels, pricing, enquiry and chatbot are available. Business case studies and clearer package boundaries would strengthen confidence. |
| Technical SEO | 7/10 | Homepage title, canonical, robots and sitemap are present; prerendering exists. Unknown URLs currently return HTTP 200, and fresh database content needs a build to update the prerendered snapshot. |
| Performance | Not scored | One unthrottled browser visit had approximately 181 ms TTFB and a 4.27-second load event. This is not a Core Web Vitals measurement or a reliable user-experience benchmark. |

## Recommended order of work

1. **Make the offer explicit above the fold.** Try “Websites and web apps for Malaysian small businesses” with a short explanation of design, development and aftercare. Use a consistent primary CTA and destination across the hero and navigation. Present starting prices only with clear scope and exclusions.
2. **Strengthen proof.** Turn selected projects into case studies covering the problem, contribution, screenshots and verified outcomes. Clearly identify demonstration or student projects. Add real client testimonials only with permission; do not invent results. Explain revision limits, content responsibilities, recurring costs, support and delivery assumptions for each package.
3. **Shorten the mobile journey.** Reduce decorative space, present a concise package comparison, and make detailed requirements optional after an initial contact step. Keep entered answers when moving between steps. Replace the initial RM0 estimate with “Choose features for an estimate” until a selection exists. Reconcile duplicate section numbering and the different enquiry entry points.
4. **Correct server-level error handling.** The unknown-path probe returned HTTP 200 with homepage metadata before React displayed its error screen. Return a real 404 for missing resources, and use appropriate temporary-unavailability handling for outages. Keep friendly recovery links, but avoid relying on automatic redirects to communicate missing pages. Keep sitemap entries aligned with published, useful pages. Add distinct service pages only when each has substantial original content.
5. **Improve content delivery and resilience.** The public hook loads seven datasets and treats failures as site-wide unavailability. Consider a cached public-content response and section-level friendly fallbacks for optional data. Keep technical diagnostics private. Arrange a rebuild or revalidation workflow after publishing content so search engines receive current HTML and sitemap entries.
6. **Measure performance before adding effects.** Run mobile Lighthouse repeatedly and monitor field Core Web Vitals when enough traffic exists. Review font families and weights, above-the-fold media and network waterfalls. Preserve responsive images, lazy loading for secondary media, code splitting and reduced-motion support. The promotion timer is currently 850 ms; prefer an engagement-based trigger so it does not interrupt the first impression or compete with consent controls.
7. **Document privacy and operations.** Add a public privacy notice covering enquiries, analytics, chatbot providers and retention. Verify database persistence, notification delivery, quotation rules and human handoff using a controlled end-to-end test. Keep saved-enquiry success separate from notification delivery status to prevent duplicate customer submissions.

## Implemented in this change

GA4 `G-D92C2BPTH3` now has a shared public-site integration, optional consent, sanitized page views, contact clicks, chatbot opens and confirmed enquiry events. Admin pages and preview/local hosts are excluded. See [the setup guide](ANALYTICS.md) for required GA4 settings and production verification. The recommendations above are a roadmap, not claims that all have been implemented.

GA4 measures behaviour; it does not directly improve search rankings. Submit the existing sitemap to Search Console, monitor indexing and search queries, and use enquiry conversions to evaluate improvements.

References: [Google guidance on JavaScript error pages](https://developers.google.com/search/docs/crawling-indexing/javascript/fix-search-javascript), [Core Web Vitals](https://web.dev/articles/vitals), [GA4 page-view configuration](https://developers.google.com/analytics/devguides/collection/ga4/views).
