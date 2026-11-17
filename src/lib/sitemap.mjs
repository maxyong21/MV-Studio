import {escapeHtml} from '../../scripts/seo.mjs';
import {legalPaths} from '../legal/content.mjs';
import {servicePaths} from '../services/content.mjs';
import {alternatesFor,canonicalFor,LOCALES} from './locale.mjs';

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
  const urls=new Set([`${base}/`,...servicePaths.map(path=>`${base}${path}`),...legalPaths.map(path=>`${base}${path}`)]);
  for(const project of projects){
    if(project?.active===false||!projectIdPattern.test(String(project?.id||'')))continue;
    urls.add(`${base}/projects/${project.id}`);
    const demo=internalDemoPath(project.demo_url,base);
    if(demo)urls.add(`${base}${demo}`);
  }
  for(const path of sitemapPaths(extraPaths).paths)urls.add(`${base}${path}`);
  // The home page and the service pages exist in three languages. Each language gets its own entry
  // that lists all of them as alternates, which is how search engines pair the translations.
  const entries=new Map();
  for(const url of urls){
    const route=url.slice(base.length)||'/',alternates=alternatesFor(route,base);
    if(!alternates.length){entries.set(url,[]);continue;}
    for(const lang of LOCALES)entries.set(canonicalFor(route,lang,base),alternates);
  }
  const line=([loc,alternates])=>`  <url><loc>${escapeHtml(loc)}</loc>${alternates.map(([code,href])=>`<xhtml:link rel="alternate" hreflang="${code}" href="${escapeHtml(href)}"/>`).join('')}</url>`;
  return ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',...[...entries].map(line),'</urlset>',''].join('\n');
}
