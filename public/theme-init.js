// Runs before the page paints, so a returning dark-mode visitor never sees a
// flash of the light theme. It is a separate file because the site's security
// policy does not allow inline scripts. Keep it tiny: it blocks rendering.
// A saved choice wins; otherwise the device's own light/dark setting is used.
(function () {
  var theme = 'light';
  try {
    var saved = localStorage.getItem('mv-theme');
    if (saved === 'dark' || saved === 'light') theme = saved;
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark';
  } catch (error) {
    try { if (window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark'; } catch (ignored) {}
  }
  document.documentElement.dataset.theme = theme;
  var chrome = document.querySelector('meta[name="theme-color"]');
  if (chrome) chrome.setAttribute('content', theme === 'dark' ? '#181a17' : '#f8f7f4');
})();
