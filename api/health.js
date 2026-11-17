// A tiny "is the site working?" address for uptime checks: GET /api/health.
// It reads one row from the public database with the public key (the same call the home page makes),
// so a 200 means the website, the hosting functions and the database are all reachable.
// It never returns data from the database, secrets or error details.
export function createHealth({env=process.env,fetcher=fetch,now=()=>new Date()}={}){
  return async(request,response)=>{
    if(!['GET','HEAD'].includes(request.method)){response.setHeader('Allow','GET, HEAD');return response.status(405).end();}
    response.setHeader('Cache-Control','no-store');
    response.setHeader('X-Robots-Tag','noindex');
    const endpoint=env.VITE_SUPABASE_URL?.replace(/\/$/,''),key=env.VITE_SUPABASE_ANON_KEY;
    const reply=(status,body)=>response.status(status).setHeader('Content-Type','application/json; charset=utf-8').send(request.method==='HEAD'?'':JSON.stringify({...body,time:now().toISOString()}));
    if(!endpoint||!key)return reply(503,{ok:false,database:'not configured'});
    try{
      const result=await fetcher(`${endpoint}/rest/v1/site_content?select=id&id=eq.1&limit=1`,{headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{})},signal:AbortSignal.timeout(6000)});
      if(!result.ok)return reply(503,{ok:false,database:'unavailable'});
      const rows=await result.json();
      if(!Array.isArray(rows))return reply(503,{ok:false,database:'unexpected response'});
      return reply(200,{ok:true,database:'ok'});
    }catch{return reply(503,{ok:false,database:'unreachable'});}
  };
}
export default createHealth();
