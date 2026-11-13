export const originAllowed=(origin,env)=>Boolean(origin)&&((env('ALLOWED_ORIGIN')||'').split(',').map(v=>v.trim()).filter(Boolean).length
  ?(env('ALLOWED_ORIGIN')||'').split(',').map(v=>v.trim()).includes(origin)
  :/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
export const headersFor=(origin,env)=>({
  'Access-Control-Allow-Origin':origin&&originAllowed(origin,env)?origin:'null',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin',
});
export const json=(body,status,origin,env)=>new Response(JSON.stringify(body),{status,headers:{...headersFor(origin,env),'Content-Type':'application/json'}});
// Second-step sign-in. When an administrator has a verified authenticator app, a session that only
// proved the password (assurance level aal1) is refused. The token's signature was already checked by
// auth.getUser, so its payload can be read here. Anything unreadable counts as not verified.
export function secondStepSatisfied(user,token){
  if(!(user?.factors||[]).some(factor=>factor?.status==='verified'))return true;
  try{return JSON.parse(atob(String(token).split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).aal==='aal2';}catch{return false;}
}
export const secondStepMessage='Enter the code from your authenticator app to continue. Sign in again if you are not asked for it.';
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

export async function verifyTurnstile(request,input,env,fetcher=fetch,action='enquiry'){
  const secret=env('TURNSTILE_SECRET_KEY');
  const required=env('TURNSTILE_REQUIRED')!=='false';
  if(!secret){
    if(required)throw Object.assign(new Error('Human verification is temporarily unavailable.'),{status:503});
    return;
  }
  const token=input?.turnstile_token;
  if(typeof token!=='string'||token.length<10||token.length>2048)
    throw Object.assign(new Error('Complete the human verification and try again.'),{status:400});
  const body=new URLSearchParams({secret,response:token});
  let result;
  try{
    const response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString(),signal:AbortSignal.timeout(5000)});
    result=await response.json();
    if(!response.ok)throw new Error('Verification service returned an error.');
  }catch{
    throw Object.assign(new Error('Human verification is temporarily unavailable. Please try again.'),{status:503});
  }
  if(!result?.success||result.action!==action)
    throw Object.assign(new Error('Human verification expired or was not accepted. Please try again.'),{status:400});
  const allowed=(env('TURNSTILE_ALLOWED_HOSTNAMES')||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
  if(!allowed.length)throw Object.assign(new Error('Human verification is not configured for this website.'),{status:503});
  if(allowed.length&&!allowed.includes(String(result.hostname||'').toLowerCase()))
    throw Object.assign(new Error('Human verification was not accepted for this site.'),{status:400});
}
