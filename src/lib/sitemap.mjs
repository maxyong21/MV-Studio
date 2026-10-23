import {escapeHtml} from '../../scripts/seo.mjs';

export const projectIdPattern=/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|seed-p\d+)$/i;

export function sitemapPaths(value) {
  const lines=String(value||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const errors=[];
  const paths=[];
  for(const path of lines){
    if(path.length>240||!/^\/(?:[a-zA-Z0-9._~-]+\/?)*(?:[a-zA-Z0-9._~-]+)?$/.test(path)||path.startsWith('//')||/(?:^|\/)\.{1,2}(?:\/|$)/.test(path)||/^\/(?:admin|api|assets|optimized|projects)(?:\/|$)/i.test(path)||/^\/(?:sitemap\.xml|robots\.txt)(?:\/|$)/i.test(path))errors.push(path);
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
  const urls=new Set([`${base}/`]);
  for(const project of projects){
    if(project?.active===false||!projectIdPattern.test(String(project?.id||'')))continue;
    urls.add(`${base}/projects/${project.id}`);
    const demo=internalDemoPath(project.demo_url,base);
    if(demo)urls.add(`${base}${demo}`);
  }
  for(const path of sitemapPaths(extraPaths).paths)urls.add(`${base}${path}`);
  return ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',...[...urls].map(url=>`  <url><loc>${escapeHtml(url)}</loc></url>`),'</urlset>',''].join('\n');
}
