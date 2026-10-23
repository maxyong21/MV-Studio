import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {loadEnv} from 'vite';
import {fallbackContent} from '../src/content.js';
import {emptyPublicContent,hasPublicContent} from '../src/lib/availability.mjs';
import {siteUrl,escapeHtml,safeJson,meta} from './seo.mjs';
import {renderPage} from '../.generated/ssr/entry-server.js';

const env=loadEnv('production',process.cwd(),'VITE_');
const base=siteUrl(process.env.VITE_SITE_URL||env.VITE_SITE_URL);
const supabaseUrl=process.env.VITE_SUPABASE_URL||env.VITE_SUPABASE_URL;
const key=process.env.VITE_SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY;
let data=emptyPublicContent();
if(supabaseUrl&&key&&!supabaseUrl.includes('your-project-id')){
  const tables=['site_content','services','projects','team_members','promotions','feature_options','testimonials'];
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
async function page(route,project){
  const url=base?`${base}${route}`:'';
  const title=!published?'Coming soon | MV Studio':project?(project.seo_title||`${project.name} | MV Studio Projects`):(content.seo_title||'Web Design & Development | MV Studio');
  const description=!published?'A thoughtful digital experience is on the way. Please check back soon.':project?(project.seo_description||project.summary):(content.seo_description||content.hero_description);
  const image=base?new URL(project?.image_url||'/aphome.png',`${base}/`).href:'';
  let html=template.replace(/<title>[^<]*<\/title>/i,()=>`<title>${escapeHtml(title)}</title>`);
  html=meta(html,'description',description,'name');
  if(!published)html=meta(html,'robots','noindex,follow','name');
  for(const [name,value] of [['og:title',title],['og:description',description],['og:image',image],['og:url',url]])html=meta(html,name,value);
  for(const [name,value] of [['twitter:title',title],['twitter:description',description],['twitter:image',image]])html=meta(html,name,value,'name');
  if(base){
    const graph=project?{'@context':'https://schema.org','@type':'CreativeWork',name:project.name,description,url,image,creator:{'@type':'Organization',name:'MV Studio',url:`${base}/`}}:{'@context':'https://schema.org','@type':'ProfessionalService',name:'MV Studio',description,url:`${base}/`,areaServed:{'@type':'Country',name:'Malaysia'},email:content.contact_emails?.[0]||undefined,telephone:content.contact_phones?.[0]||undefined};
    html=html.replace('</head>',`<link rel="canonical" href="${escapeHtml(url)}" />\n${published?`<script id="mv-studio-jsonld" type="application/ld+json">${safeJson(graph)}</script>\n`:''}</head>`);
  }
  const markup=renderPage(data,route);
  html=html.replace('<div id="root"></div>',()=>`<div id="root" data-route="${escapeHtml(route)}">${markup}</div>\n<script id="mv-initial-data" type="application/json">${safeJson(data)}</script>\n<noscript>For the interactive enquiry form, enable JavaScript or use the contact details on this page.</noscript>`);
  const directory=route==='/'?'dist':`dist${route}`;
  await mkdir(directory,{recursive:true});await writeFile(`${directory}/index.html`,html);
}
await page('/');
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
await writeFile('dist/404.html',meta(template,'robots','noindex,follow','name'));
console.log(`Prerendered homepage and ${(data.projects||[]).filter(p=>p.active).length} project pages${base?` for ${base}`:''}.`);
