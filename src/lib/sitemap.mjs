import {escapeHtml} from '../../scripts/seo.mjs';
import {legalPaths} from '../legal/content.mjs';
import {servicePaths} from '../services/content.mjs';
import {alternatesFor,canonicalFor,languagesFor} from './locale.mjs';
import {guides} from '../guides/registry.mjs';

export const projectIdPattern=/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|seed-p\d+)$/i;

export function sitemapPaths(value) {
  const lines=String(value||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const errors=[];
  const paths=[];
  for(const path of lines){
    if(path.length>240||!/^\/(?:[a-zA-Z0-9._~-]+\/?)*(?:[a-zA-Z0-9._~-]+)?$/.test(path)||path.startsWith('//')||/(?:^|\/)\.{1,2}(?:\/|$)/.test(path)||/^\/(?:admin|widgets|business-profile-form|api|assets|optimized|projects)(?:\/|$)/i.test(path)||/^\/(?:sitemap\.xml|robots\.txt)(?:\/|$)/i.test(path))errors.push(path);
    else paths.push(path);
  }
  return {paths:[...new Set(paths)],errors};
}

export function internalDemoPath(value,base) {
  if(typeof value!=='string'||!value.trim())return '';
  try{
    const url=new URL(value,`${base}/`);
    if(url.origin!==base||url.search||url.hash||!url.pathname.toLowerCase().endsWith('.html'))return '';
    return sitemapPaths(url.pathname).paths[0]||'';
  }catch{return '';}
}

export function sitemapXml(base,projects=[],extraPaths='') {
  const urls=new Set([`${base}/`,`${base}/guides`,...servicePaths.map(path=>`${base}${path}`),...guides.map(guide=>`${base}/guides/${guide.slug}`),...legalPaths.map(path=>`${base}${path}`)]);
  const modified=new Map(guides.map(guide=>[`/guides/${guide.slug}`,guide.modified]));
  for(const project of projects){
    if(project?.active===false||!projectIdPattern.test(String(project?.id||'')))continue;
    urls.add(`${base}/projects/${project.id}`);
    const demo=internalDemoPath(project.demo_url,base);
    if(demo)urls.add(`${base}${demo}`);
  }
  for(const path of sitemapPaths(extraPaths).paths)urls.add(`${base}${path}`);
  // The home page, the service pages and some guides exist in several languages. Each language version is
  // listed as its own address. Which versions belong together is declared in each page's own <head> with
  // hreflang links, which search engines accept on their own. Keeping the sitemap free of extra markup also
  // lets a browser show it as a readable list, where a sitemap with language links shows as one run-on block.
  const entries=new Map();
  for(const url of urls){
    const route=url.slice(base.length)||'/',lastmod=modified.get(route);
    const languages=alternatesFor(route,base).length?languagesFor(route):[null];
    for(const lang of languages)entries.set(lang?canonicalFor(route,lang,base):url,lastmod);
  }
  const line=([loc,lastmod])=>`  <url>\n    <loc>${escapeHtml(loc)}</loc>${lastmod?`\n    <lastmod>${lastmod}</lastmod>`:''}\n  </url>`;
  return ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',...[...entries].map(line),'</urlset>',''].join('\n');
}
