export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const safeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
export function siteUrl(value){
  if(!value)return '';
  const parsed=new URL(value);
  if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/')throw new Error('VITE_SITE_URL must be a public origin, for example https://mv-aistudio.vercel.app');
  return parsed.origin;
}
export function meta(source,key,value,attribute='property'){
  const pattern=new RegExp(`<meta\\s+${attribute}=["']${key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["'][^>]*>`,'i');
  const tag=`<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(value)}" />`;
  return pattern.test(source)?source.replace(pattern,()=>tag):source.replace('</head>',`${tag}\n</head>`);
}
