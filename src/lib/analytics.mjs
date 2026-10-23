export function trackEvent(name, parameters = {}) {
  // Tracking must never interrupt an enquiry, including when a blocker removes the tag.
  try { if (typeof window !== 'undefined') window.mvAnalytics?.event(name, parameters); } catch {}
}
