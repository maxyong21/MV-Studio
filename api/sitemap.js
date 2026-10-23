import {siteUrl} from '../scripts/seo.mjs';
import {fallbackContent} from '../src/content.js';
import {sitemapXml} from '../src/lib/sitemap.mjs';

const headers=key=>({apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{})});

export default async function sitemap(request,response){
  if(!['GET','HEAD'].includes(request.method)){
    response.setHeader('Allow','GET, HEAD');return response.status(405).end();
  }
  let base;
  try{base=siteUrl(process.env.VITE_SITE_URL||process.env.SITE_URL);}catch{base='';}
  const endpoint=process.env.VITE_SUPABASE_URL?.replace(/\/$/,'');
  const key=process.env.VITE_SUPABASE_ANON_KEY;
  if(!base||!endpoint||!key){return response.setHeader('Cache-Control','no-store').status(503).end('Sitemap configuration unavailable');}
  try{
    const read=async path=>{
      const result=await fetch(`${endpoint}/rest/v1/${path}`,{headers:headers(key),signal:AbortSignal.timeout(8000)});
      if(!result.ok)throw new Error(`Sitemap database query failed: ${result.status}`);
      const rows=await result.json();
      if(!Array.isArray(rows))throw new Error('Sitemap database response is invalid');
      return rows;
    };
    const [settings]=await read('site_content?select=content&id=eq.1&limit=1');
    const projects=[];
    for(let offset=0;offset<10000;offset+=1000){
      const page=await read(`projects?select=id,demo_url&active=eq.true&order=id.asc&limit=1000&offset=${offset}`);
      projects.push(...page);
      if(page.length<1000)break;
      if(offset===9000)throw new Error('Sitemap exceeds the supported project limit');
    }
    const extra=settings?.content?.sitemap_paths_text??fallbackContent.site_content.content.sitemap_paths_text;
    const xml=sitemapXml(base,projects,extra);
    response.setHeader('Content-Type','application/xml; charset=utf-8');
    response.setHeader('Cache-Control','public, max-age=0, s-maxage=300, stale-while-revalidate=600');
    return response.status(200).send(request.method==='HEAD'?'':xml);
  }catch(error){
    console.error('sitemap generation failed',error);
    return response.setHeader('Cache-Control','no-store').status(503).end('Sitemap temporarily unavailable');
  }
}
