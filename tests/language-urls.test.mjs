// Bahasa Malaysia and Chinese pages at their own addresses (/ms, /zh), so each language can be indexed.
// See docs/LANGUAGES.md and docs/SEO.md.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseLocale,isLocalizable,localizePath,alternatesFor,canonicalFor,LOCALES} from '../src/lib/locale.mjs';
import {servicePages,servicePaths} from '../src/services/content.mjs';
import {serviceLocalized,localizedPage} from '../src/services/localized.mjs';
import {homeSeo,homeMeta} from '../src/lib/seo-locales.mjs';
import {sitemapXml} from '../src/lib/sitemap.mjs';
import {guides} from '../src/guides/registry.mjs';
import {serviceGraph,homeGraph} from '../src/lib/structured-data.mjs';

const base='https://example.test';

test('addresses: the language prefix is read, stripped and added back without damage',()=>{
  assert.deepEqual(parseLocale('/'),{lang:'en',route:'/'});
  assert.deepEqual(parseLocale('/ms'),{lang:'ms',route:'/'});
  assert.deepEqual(parseLocale('/zh/'),{lang:'zh',route:'/'});
  assert.deepEqual(parseLocale('/ms/services/landing-page'),{lang:'ms',route:'/services/landing-page'});
  assert.deepEqual(parseLocale('/msx'),{lang:'en',route:'/msx'},'only a whole /ms segment is a language');
  assert.deepEqual(parseLocale('/privacy'),{lang:'en',route:'/privacy'});
  assert.equal(localizePath('/','ms'),'/ms/');
  assert.equal(localizePath('/#terms','zh'),'/zh/#terms');
  assert.equal(localizePath('/services/landing-page','ms'),'/ms/services/landing-page');
  assert.equal(localizePath('/services/landing-page/?a=1#x','zh'),'/zh/services/landing-page?a=1#x');
  assert.equal(localizePath('/#enquiry','en'),'/#enquiry');
  for(const untranslated of ['/privacy','/terms#costs','/projects/seed-p1','/admin','/business-profile-form'])assert.equal(localizePath(untranslated,'ms'),untranslated,`${untranslated} keeps one address`);
  assert.ok(isLocalizable('/')&&isLocalizable('/services/custom-web-app/')&&!isLocalizable('/projects/x')&&!isLocalizable('/privacy'));
});

test('alternates: every translated page lists all languages and x-default, others list none',()=>{
  assert.deepEqual(alternatesFor('/',base),[['en-MY',`${base}/`],['ms-MY',`${base}/ms/`],['zh-Hans',`${base}/zh/`],['x-default',`${base}/`]]);
  const service=alternatesFor('/services/landing-page',base);
  assert.deepEqual(service.map(([code])=>code),['en-MY','ms-MY','zh-Hans','x-default']);
  assert.equal(service[1][1],`${base}/ms/services/landing-page`);
  assert.deepEqual(alternatesFor('/privacy',base),[]);
  assert.deepEqual(alternatesFor('/projects/seed-p1',base),[]);
  assert.equal(canonicalFor('/services/landing-page','zh',base),`${base}/zh/services/landing-page`);
  assert.equal(canonicalFor('/privacy','ms',base),`${base}/privacy`);
});

test('translated service pages are complete: every page has Bahasa Malaysia and Chinese with the same shape as English',()=>{
  assert.deepEqual(Object.keys(serviceLocalized).sort(),servicePages.map(page=>page.slug).sort());
  for(const page of servicePages)for(const lang of ['ms','zh']){
    const text=serviceLocalized[page.slug][lang],label=`${page.slug}/${lang}`;
    for(const field of ['title','description','name','heading','intro'])assert.ok(String(text[field]||'').trim(),`${label}: ${field}`);
    assert.equal(text.includes.length,page.includes.length,`${label}: same number of included items`);
    assert.equal(text.suits.length,page.suits.length,`${label}: same number of "good fit" items`);
    assert.equal(text.faqs.length,page.faqs.length,`${label}: same number of questions`);
    assert.ok(text.faqs.every(([question,answer])=>question.trim()&&answer.trim().length>20),`${label}: questions and answers`);
    assert.ok(text.title.length<=80,`${label}: title length ${text.title.length}`);
    assert.ok(text.description.length<=200,`${label}: description length ${text.description.length}`);
    assert.ok(text.title.includes('MV Studio'),`${label}: brand in title`);
    assert.notEqual(text.heading,page.heading,`${label}: heading is translated`);
  }
  assert.equal(localizedPage(servicePages[0],'en'),servicePages[0],'English is untouched');
  assert.equal(localizedPage(servicePages[0],'ms').slug,servicePages[0].slug);
  assert.equal(localizedPage({slug:'unknown'},'ms').slug,'unknown','a page without a translation falls back to English');
});

test('home page titles and descriptions exist for every language',()=>{
  for(const lang of ['ms','zh']){assert.ok(homeSeo[lang].title.includes('MV Studio')&&homeSeo[lang].title.length<=80);assert.ok(homeSeo[lang].description.length>=30&&homeSeo[lang].description.length<=200);}
  assert.equal(homeMeta('en',{seo_title:'Admin title',seo_description:'Admin text'}).title,'Admin title');
  assert.equal(homeMeta('ms',{seo_title:'Admin title'}).title,homeSeo.ms.title);
  assert.ok(homeMeta('en',{}).title.includes('MV Studio'),'English falls back when the admin has not set one');
});

test('sitemap: every language version is its own entry, and the file stays a plain readable list',()=>{
  const xml=sitemapXml(base,[{id:'seed-p1'}]);
  assert.match(xml,/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  // Language links in a sitemap make Chrome show it as one run-on block, and every page already declares
  // its language versions in its own <head>, so the sitemap carries none.
  assert.doesNotMatch(xml,/xhtml|hreflang|xml-stylesheet/,'no language markup or stylesheet in the sitemap');
  for(const path of ['/','/ms/','/zh/',...servicePaths.flatMap(path=>[path,`/ms${path}`,`/zh${path}`])])assert.ok(xml.includes(`<loc>${base}${path}</loc>`),path);
  assert.equal((xml.match(/<loc>/g)||[]).length,3+servicePaths.length*3+3+1+3+guides.length+guides.filter(guide=>guide.ms&&guide.zh).length*2,'home x3, services x3, three legal pages, one project, the guides list x3 and every guide in the languages it exists in');
  for(const path of ['/privacy','/terms','/data-deletion'])assert.doesNotMatch(xml,new RegExp(`<loc>${base}/(?:ms|zh)${path}`));
  assert.equal(new Set(xml.match(/<loc>[^<]+<\/loc>/g)).size,(xml.match(/<loc>/g)||[]).length,'no address is listed twice');
  assert.equal(LOCALES.length,3);
});

test('structured data describes each language page with its own address and language',()=>{
  const page=localizedPage(servicePages[0],'ms');
  const graph=serviceGraph({base,page,service:null,lang:'ms'})['@graph'];
  const webPage=graph.find(node=>node['@type']==='WebPage');
  assert.equal(webPage.url,`${base}/ms/services/landing-page`);assert.equal(webPage.inLanguage,'ms-MY');assert.equal(webPage.name,page.title);
  assert.equal(graph.find(node=>node['@type']==='BreadcrumbList').itemListElement[0].item,`${base}/ms/`);
  assert.match(JSON.stringify(graph.find(node=>node['@type']==='FAQPage')),/Berapakah kos/);
  assert.deepEqual(homeGraph({base,lang:'zh'})['@graph'].find(node=>node['@type']==='WebSite').inLanguage,['en-MY','ms-MY','zh-Hans-MY']);
});
