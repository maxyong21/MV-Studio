// Language-specific addresses. Bahasa Malaysia lives under /ms and Chinese under /zh, so each
// language can be found and indexed on its own. English keeps the plain address.
// Only the home page and the service pages are translated this way. Project pages, the legal
// pages and the admin keep one address; they follow the visitor's chosen language in the browser.
// See docs/LANGUAGES.md and docs/SEO.md.
export const LOCALES=['en','ms','zh'];
export const prefixes={ms:'/ms',zh:'/zh'};
// What search engines call each language. x-default is the English page.
export const hreflangCodes={en:'en-MY',ms:'ms-MY',zh:'zh-Hans'};
export const htmlLang={en:'en-MY',ms:'ms-MY',zh:'zh-Hans-MY'};
export const ogLocale={en:'en_MY',ms:'ms_MY',zh:'zh_CN'};

const trimSlash=path=>path.length>1?path.replace(/\/+$/,''):path;

// '/ms/services/landing-page' -> {lang:'ms',route:'/services/landing-page'}. Anything else is English.
export function parseLocale(pathname='/'){
  const match=String(pathname).match(/^\/(ms|zh)(\/.*)?$/);
  if(!match)return {lang:'en',route:pathname||'/'};
  return {lang:match[1],route:match[2]||'/'};
}

export const isLocalizable=route=>{
  const clean=trimSlash(String(route||'/').split(/[?#]/)[0]||'/');
  return clean==='/'||/^\/services\/[a-z0-9-]+$/.test(clean);
};

// Turns an English address (optionally with ?query and #section) into the one for a language.
// Addresses that are not translated are returned unchanged.
export function localizePath(path,lang){
  const text=String(path||'/');
  const [before,...hash]=text.split('#'),fragment=hash.length?`#${hash.join('#')}`:'';
  const [route,...query]=before.split('?'),search=query.length?`?${query.join('?')}`:'';
  const clean=route||'/';
  if(lang==='en'||!prefixes[lang]||!isLocalizable(clean))return text;
  return `${prefixes[lang]}${trimSlash(clean)==='/'?'/':trimSlash(clean)}${search}${fragment}`;
}

// The same page in every language, for <link rel="alternate" hreflang> and the sitemap.
export function alternatesFor(route,base){
  const clean=trimSlash(route||'/');
  if(!isLocalizable(clean))return [];
  const urlFor=lang=>`${base}${localizePath(clean,lang)}`;
  return [...LOCALES.map(lang=>[hreflangCodes[lang],urlFor(lang)]),['x-default',urlFor('en')]];
}

// The address of a page in one language, without trailing-slash drift.
export const canonicalFor=(route,lang,base)=>`${base}${localizePath(trimSlash(route||'/'),lang)}`;
