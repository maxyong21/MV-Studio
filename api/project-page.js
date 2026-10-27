import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// Validate publication on every direct project request, including pages added
// after a build and projects unpublished since the last deployment.
export function createProjectPage({env=process.env,fetcher=fetch,read=path=>readFile(resolve('dist',path),'utf8')}={}){
  return async(request,response)=>{
    if(!['GET','HEAD'].includes(request.method)){response.setHeader('Allow','GET, HEAD');return response.status(405).end();}
    const send=async(status,path)=>{
      const html=await read(path);
      response.setHeader('Content-Type','text/html; charset=utf-8');
      response.setHeader('Cache-Control','no-store');
      if(status!==200)response.setHeader('X-Robots-Tag','noindex');
      return response.status(status).send(request.method==='HEAD'?'':html);
    };
    const id=request.query?.id;
    if(typeof id!=='string'||!/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|seed-p\d+)$/i.test(id))return send(404,'404.html');
    try{
      const endpoint=env.VITE_SUPABASE_URL?.replace(/\/$/,'');const key=env.VITE_SUPABASE_ANON_KEY;
      if(!endpoint||!key)return send(503,'maintenance.html');
      const result=await fetcher(`${endpoint}/rest/v1/projects?select=id&id=eq.${encodeURIComponent(id)}&active=eq.true&limit=1`,{headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{})},signal:AbortSignal.timeout(8000)});
      if(!result.ok)throw Error('Project publication lookup unavailable');
      const rows=await result.json();if(!Array.isArray(rows))throw Error('Invalid publication response');
      if(!rows.some(row=>row.id===id))return send(404,'404.html');
      let page;try{page=await read(`projects/${id}/index.html`);}catch{page=await read('index.html');}
      response.setHeader('Content-Type','text/html; charset=utf-8');response.setHeader('Cache-Control','no-store');
      return response.status(200).send(request.method==='HEAD'?'':page);
    }catch(error){console.error('Project page unavailable',error.message);return send(503,'maintenance.html');}
  };
}
export default createProjectPage();
