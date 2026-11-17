import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {loadEnv} from 'vite';
import {fallbackContent} from '../src/content.js';
import {projectBadge} from '../src/lib/project-type.mjs';
import {emptyPublicContent,hasPublicContent} from '../src/lib/availability.mjs';
import {siteUrl,escapeHtml,safeJson,meta} from './seo.mjs';
import {legalDocuments,legalPaths} from '../src/legal/content.mjs';
import {renderPage} from '../.generated/ssr/entry-server.js';
import {servicePages,serviceForPage} from '../src/services/content.mjs';
import {localizedPage} from '../src/services/localized.mjs';
import {homeMeta} from '../src/lib/seo-locales.mjs';
import {alternatesFor,canonicalFor,htmlLang,ogLocale,parseLocale,prefixes,LOCALES} from '../src/lib/locale.mjs';
import {homeGraph,serviceGraph} from '../src/lib/structured-data.mjs';

const env=loadEnv('production',process.cwd(),'VITE_');
const base=siteUrl(process.env.VITE_SITE_URL||env.VITE_SITE_URL);
const supabaseUrl=process.env.VITE_SUPABASE_URL||env.VITE_SUPABASE_URL;
const key=process.env.VITE_SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY;
let data=emptyPublicContent();
if(supabaseUrl&&key&&!supabaseUrl.includes('your-project-id')){
  const tables=['site_content','services','projects','team_members','promotions','feature_options','testimonials','faqs'];
  const responses=await Promise.all(tables.map(async table=>{
    const filter=table==='site_content'?'id=eq.1':`active=eq.true&order=sort_order.asc${table==='testimonials'?'&permission_confirmed=eq.true':''}`;
    const response=await fetch(`${supabaseUrl.replace(/\/$/,'')}/rest/v1/${table}?select=*&${filter}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error(`Cannot prerender ${table}: HTTP ${response.status}. Check Supabase public read policies and run the latest migration. No preview data will be published over live content.`);
    return [table,await response.json()];
  }));
  data=Object.fromEntries(responses.map(([table,rows])=>[table,table==='site_content'?rows[0]||null:rows]));
}
const published=hasPublicContent(data);
const template=await readFile('dist/index.html','utf8');
const content=data.site_content?.content||fallbackContent.site_content.content;
// route is the address the page is published at, such as /ms or /zh/services/landing-page.
async function page(route,project,service){
  const {lang,route:baseRoute}=parseLocale(route),legal=legalDocuments[route];
  const text=service?localizedPage(service,lang):null,home=homeMeta(lang,content);
  const renderData=legal?{...emptyPublicContent(),site_content:data.site_content}:data;
  const url=base?canonicalFor(baseRoute,lang,base):'';
  const title=legal?`${legal.title} | MV Studio`:!published?'Coming soon | MV Studio':service?text.title:project?(project.seo_title||`${project.name} | MV Studio Projects`):home.title;
  const description=legal?legal.description:!published?'A thoughtful digital experience is on the way. Please check back soon.':service?text.description:project?(project.seo_description||project.summary):home.description;
  const image=base?new URL(project?.image_url||'/aphome.png',`${base}/`).href:'';
  let html=template.replace(/<title>[^<]*<\/title>/i,()=>`<title>${escapeHtml(title)}</title>`).replace(/<html lang="[^"]*"/i,`<html lang="${htmlLang[lang]}"`);
  // The page's own language first, the others as alternates.
  html=html.replace(/<meta property="og:locale:alternate"[^>]*>\s*/gi,'');
  html=meta(html,'og:locale',ogLocale[lang]);
  html=html.replace(/(<meta property="og:locale"[^>]*>)/i,`$1\n${LOCALES.filter(code=>code!==lang).map(code=>`<meta property="og:locale:alternate" content="${ogLocale[code]}" />`).join('\n')}`);
  html=meta(html,'description',description,'name');
  if(legal)html=meta(html,'robots','index,follow','name');
  else if(!published)html=meta(html,'robots','noindex,follow','name');
  for(const [name,value] of [['og:title',title],['og:description',description],['og:image',image],['og:url',url]])html=meta(html,name,value);
  for(const [name,value] of [['twitter:title',title],['twitter:description',description],['twitter:image',image]])html=meta(html,name,value,'name');
  if(base){
    const graph=legal?{'@context':'https://schema.org','@type':'WebPage',name:title,description,url}:project?{'@context':'https://schema.org','@type':'CreativeWork',name:project.name,description,url,image,keywords:[...(project.tags||[]),projectBadge(project)?.label].filter(Boolean).join(', ')||undefined,creator:{'@type':'Organization',name:'MV Studio',url:`${base}/`}}:service?serviceGraph({base,page:text,service:serviceForPage(service,data.services),content,services:data.services,team:data.team_members,lang}):homeGraph({base,content,services:data.services,projects:data.projects,team:data.team_members,faqs:data.faqs,description,lang});
    // The same page in every language, so search engines show each visitor the right one.
    const alternates=published&&!legal&&!project?alternatesFor(baseRoute,base).map(([code,href])=>`<link rel="alternate" hreflang="${code}" href="${escapeHtml(href)}" />`).join('\n'):'';
    html=html.replace('</head>',`<link rel="canonical" href="${escapeHtml(url)}" />\n${alternates?`${alternates}\n`:''}${published||legal?`<script id="mv-studio-jsonld" type="application/ld+json">${safeJson(graph)}</script>\n`:''}</head>`);
  }
  const markup=renderPage(renderData,route);
  html=html.replace('<div id="root"></div>',()=>`<div id="root" data-route="${escapeHtml(route)}">${markup}</div>\n<script id="mv-initial-data" type="application/json">${safeJson(renderData)}</script>\n<noscript>For the interactive enquiry form, enable JavaScript or use the contact details on this page.</noscript>`);
  const directory=route==='/'?'dist':`dist${route}`;
  await mkdir(directory,{recursive:true});await writeFile(`${directory}/index.html`,html);
}
await page('/');
for(const path of legalPaths)await page(path);
// One page per service, so each can be found for its own search. See docs/SEO.md.
for(const service of servicePages)await page(`/services/${service.slug}`,null,service);
// The same home and service pages in Bahasa Malaysia and Chinese, each at its own address.
// Only when the site is published; an unpublished site has nothing to translate.
if(published)for(const code of LOCALES.filter(code=>code!=='en')){
  await page(prefixes[code]);
  for(const service of servicePages)await page(`${prefixes[code]}/services/${service.slug}`,null,service);
}
for(const project of data.projects||[]){
  if(!project.active||!/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|seed-p\d+)$/i.test(project.id))continue;
  await page(`/projects/${project.id}`,project);
}
const robots=['User-agent: *','Allow: /','Disallow: /admin',...(base?[`Sitemap: ${base}/sitemap.xml`]:[]),''].join('\n');
await writeFile('dist/robots.txt',robots);
if(!base)console.warn('Set VITE_SITE_URL to generate canonical URLs and configure the dynamic sitemap.');
// A dedicated shell prevents the public homepage appearing in an admin response.
let adminHtml=template.replace(/<title>[^<]*<\/title>/,'<title>Studio Admin | MV Studio</title>');
adminHtml=meta(adminHtml,'robots','noindex,nofollow','name');
await mkdir('dist/admin',{recursive:true});await writeFile('dist/admin/index.html',adminHtml);
// The widget library is unlisted: its own noindex shell, no sitemap entry, and no robots.txt line that would advertise it.
let widgetsHtml=template.replace(/<title>[^<]*<\/title>/,'<title>Widget Library | MV Studio</title>');
widgetsHtml=meta(widgetsHtml,'robots','noindex,nofollow','name');
await mkdir('dist/widgets',{recursive:true});await writeFile('dist/widgets/index.html',widgetsHtml);
// The business details form is sent to customers by link. It is not indexed and not in the sitemap.
let formHtml=template.replace(/<title>[^<]*<\/title>/,'<title>Google Business Profile details | MV Studio</title>');
formHtml=meta(formHtml,'robots','noindex,follow','name');
await mkdir('dist/business-profile-form',{recursive:true});await writeFile('dist/business-profile-form/index.html',formHtml);
// Prerender the actual error artwork: it remains useful without JavaScript.
let notFound=meta(template.replace(/<title>[^<]*<\/title>/,'<title>Page not found | MV Studio</title>'),'robots','noindex,follow','name');
notFound=notFound.replace('<div id="root"></div>',()=>`<div id="root">${renderPage(emptyPublicContent(),'/page-not-found')}</div>`);
await writeFile('dist/404.html',notFound);
let maintenance=meta(template.replace(/<title>[^<]*<\/title>/,'<title>Under maintenance | MV Studio</title>'),'robots','noindex,follow','name');
maintenance=maintenance.replace('<div id="root"></div>',()=>`<div id="root">${renderPage({...emptyPublicContent(),__availability:'maintenance'},'/')}</div>`);
await writeFile('dist/maintenance.html',maintenance);
console.log(`Prerendered homepage, ${servicePages.length} service pages and ${(data.projects||[]).filter(p=>p.active).length} project pages${base?` for ${base}`:''}.`);
