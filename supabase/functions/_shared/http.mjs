export const originAllowed=(origin,env)=>!origin||((env('ALLOWED_ORIGIN')||'').split(',').map(v=>v.trim()).filter(Boolean).length
  ?(env('ALLOWED_ORIGIN')||'').split(',').map(v=>v.trim()).includes(origin)
  :/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
export const headersFor=(origin,env)=>({
  'Access-Control-Allow-Origin':origin&&originAllowed(origin,env)?origin:'null',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin',
});
export const json=(body,status,origin,env)=>new Response(JSON.stringify(body),{status,headers:{...headersFor(origin,env),'Content-Type':'application/json'}});
export async function digest(value){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export async function readInput(request){
  if(Number(request.headers.get('content-length')||0)>32768)throw new Error('Request is too large.');
  const text=await request.text();
  if(new TextEncoder().encode(text).length>32768)throw new Error('Request is too large.');
  return JSON.parse(text);
}
