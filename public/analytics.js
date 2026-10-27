/* Shared by the React site and static project demos. No customer input is collected. */
(() => {
  'use strict';
  const id = 'G-D92C2BPTH3';
  const productionOrigin = 'https://mv-aistudio.vercel.app';
  const consentKey = 'mv-analytics-consent-v1';
  const demos = new Set(['/APMoodle.html', '/hypertextedu.html', '/PsychologyConsultationManagementSystem.html', '/SuperMathsBros.html']);
  if (location.origin !== productionOrigin || window.mvAnalytics) return;
  let consent = '';
  try { consent = localStorage.getItem(consentKey) || ''; } catch {}
  let context = null, lastPath = null, previousLocation = '', configured = false, panel, choices;
  const allowedPath = path => path === '/' || /^\/projects\/(?:[0-9a-f-]{36}|seed-p\d+)$/i.test(path) || demos.has(path);
  const active = () => context && context.path === location.pathname && allowedPath(location.pathname);
  const syncPanel = () => { if(document.documentElement)document.documentElement.dataset.analyticsPanel=panel&&!panel.hidden?'open':'closed'; };
  const safeReferrer = () => {
    try { const url = new URL(document.referrer); return /^https?:$/.test(url.protocol) ? url.origin : ''; } catch { return ''; }
  };
  function configure() {
    if (configured) return;
    configured = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
    window.gtag('js', new Date());
    window.gtag('config', id, {send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: productionOrigin + context.path, page_referrer: safeReferrer()});
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    tag.id = 'mv-google-analytics';
    document.head.appendChild(tag);
  }
  function pageView() {
    if (consent !== 'granted' || !active()) return;
    window['ga-disable-' + id] = false;
    configure();
    if (lastPath === context.path) return;
    const url = productionOrigin + context.path;
    // Keep automatic session/engagement events on the same sanitized page context.
    window.gtag('set', {page_location: url, page_referrer: previousLocation || safeReferrer(), page_title: context.title});
    window.gtag('event', 'page_view', {send_to: id, page_location: url, page_title: context.title, page_referrer: previousLocation || safeReferrer()});
    previousLocation = url;
    lastPath = context.path;
  }
  function choose(value) {
    consent = value;
    try { localStorage.setItem(consentKey, value); } catch {}
    window['ga-disable-' + id] = value !== 'granted';
    if (configured) window.gtag('consent', 'update', {analytics_storage: value === 'granted' ? 'granted' : 'denied'});
    panel.hidden = true;
    choices.hidden = false;
    syncPanel();
    if (value === 'granted') pageView();
    else lastPath = null;
    choices.focus();
  }
  function showChoices() {
    if (!active()) return;
    if (!panel) {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/analytics.css'; document.head.appendChild(css);
      panel = document.createElement('section');
      panel.id = 'mv-analytics-choice'; panel.setAttribute('aria-label', 'Analytics preferences');
      panel.innerHTML = '<strong>Optional analytics</strong><p>Help us measure visits and enquiries. Form answers and chat messages are excluded.</p><div><button type="button" data-choice="granted">Allow analytics</button><button type="button" data-choice="denied">No thanks</button></div>';
      panel.querySelectorAll('button').forEach(button => button.addEventListener('click', () => choose(button.dataset.choice)));
      choices = document.createElement('button'); choices.type = 'button'; choices.id = 'mv-analytics-preferences'; choices.textContent = 'Analytics choices';
      choices.addEventListener('click', () => { panel.hidden = false; choices.hidden = true; syncPanel();panel.querySelector('button').focus(); });
      document.body.append(panel, choices);
    }
    panel.hidden = consent === 'granted' || consent === 'denied';
    choices.hidden = !panel.hidden;
    const footer=document.querySelector?.('.site-footer-bottom');if(footer)footer.appendChild(choices);
    syncPanel();
  }
  function updatePage(page) {
    if (!page || page.path !== location.pathname || !allowedPath(page.path)) {
      context = null; lastPath = null; window['ga-disable-' + id] = true;
      if (panel) { panel.hidden = true; choices.hidden = true; }
      syncPanel();
      return;
    }
    context = {path: page.path, title: String(page.title || 'MV Studio').slice(0, 160)};
    window['ga-disable-' + id] = consent !== 'granted';
    showChoices(); pageView();
  }
  function event(name, values = {}) {
    if (!active() || consent !== 'granted') return;
    let parameters;
    if (name === 'chatbot_open') parameters = {};
    else if (name === 'contact_click' && ['email', 'phone', 'whatsapp'].includes(values.method)) parameters = {method: values.method};
    else if (name === 'generate_lead' && ['enquiry_form', 'chatbot'].includes(values.method)) parameters = {method: values.method};
    else return;
    pageView();
    window.gtag('event', name, {...parameters, send_to: id, page_location: productionOrigin + context.path, page_title: context.title});
  }
  window.mvAnalytics = {event, updatePage};
  window.addEventListener('mv:analytics-page', () => updatePage(window.mvAnalyticsPage));
  document.addEventListener('click', e => {
    const link = e.target.closest?.('a[href]'); if (!link) return;
    const href = link.getAttribute('href') || '';
    const method = /^mailto:/i.test(href) ? 'email' : /^tel:/i.test(href) ? 'phone' : /^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//i.test(href) ? 'whatsapp' : '';
    if (method) event('contact_click', {method});
  });
  const start = () => {
    if (window.mvAnalyticsPage) updatePage(window.mvAnalyticsPage);
    else if (demos.has(location.pathname)) updatePage({path: location.pathname, title: document.title});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true}); else start();
})();
