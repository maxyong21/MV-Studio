import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,join,sep,extname} from 'node:path';
import {database,client} from './database.mjs';
import {createSubmitHandler} from '../../supabase/functions/_shared/submit-handler.mjs';
import {createRetryHandler} from '../../supabase/functions/_shared/retry-handler.mjs';
import {createChatbotHandler,createChatbotAdminHandler} from '../../supabase/functions/_shared/chatbot/handler.mjs';
import {safeJson} from '../../scripts/seo.mjs';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.xml':'application/xml','.txt':'text/plain'};
export async function staticFile(req,res,folder){
  const root=resolve(folder),url=new URL(req.url,'http://localhost');
  let path=resolve(root,`.${decodeURIComponent(url.pathname)}`),data;
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}
  try{data=await readFile(path);}catch{try{path=join(path,'index.html');data=await readFile(path);}catch{path=join(root,'index.html');data=await readFile(path);}}
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(data);
}
export async function browserServers({prerender=false}={}){
  const db=await database(),adminId=crypto.randomUUID(),images=new Map(),mailPayloads=[];let mails=0;
  await db.query('insert into auth.users(id) values($1)',[adminId]);await db.query('insert into admin_users(user_id) values($1)',[adminId]);
  const user={id:adminId,email:'admin@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};
  const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const token=`${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:adminId,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.fixture`;
  const env=name=>({ALLOWED_ORIGIN:'http://127.0.0.1:4188',SUPABASE_SERVICE_ROLE_KEY:'fixture',RESEND_API_KEY:'fixture',RESEND_FROM_EMAIL:'test@example.test',ENQUIRY_TO_EMAIL:'owner@example.test'})[name];
  const deps={env,createAdmin:()=>client(db,adminId,token),fetcher:async(url,options)=>{mails++;mailPayloads.push(JSON.parse(options.body));return Response.json({id:`local-email-${mails}`});}};
  const submit=createSubmitHandler(deps),retry=createRetryHandler(deps),chatbot=createChatbotHandler(deps),chatbotAdmin=createChatbotAdminHandler(deps);
  const tables=new Set(['admin_users','site_content','services','projects','team_members','promotions','feature_options','testimonials','enquiries','faqs']);
  const identifier=value=>{if(!/^[a-z_]+$/.test(value))throw new Error('Invalid field');return `"${value}"`;};
  const fixture=createServer(async(req,res)=>{
    if(['http://127.0.0.1:4187','http://127.0.0.1:4188'].includes(req.headers.origin)){
      res.setHeader('Access-Control-Allow-Origin',req.headers.origin);
      res.setHeader('Access-Control-Allow-Headers','authorization, apikey, content-type, x-client-info');
      res.setHeader('Access-Control-Allow-Methods','GET, POST, PATCH, DELETE, OPTIONS');
    }
    if(req.method==='OPTIONS'&&!req.url.startsWith('/functions/')){res.writeHead(204).end();return;}
    const url=new URL(req.url,'http://127.0.0.1:4188');
    const send=(body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
    try{
      if(url.pathname.startsWith('/storage/v1/object/')){
        if(req.method==='POST'){
          if(req.headers.authorization!==`Bearer ${token}`){send({message:'Not authorized'},403);return;}
          const chunks=[];for await(const chunk of req)chunks.push(chunk);
          let bytes=Buffer.concat(chunks),type=req.headers['content-type'];
          // Supabase's browser SDK wraps Blob/File uploads in multipart form data.
          // Serve the file bytes, as Storage does, rather than the multipart envelope.
          if(type?.startsWith('multipart/form-data')){
            const form=await new Response(bytes,{headers:{'Content-Type':type}}).formData();
            const file=[...form.values()].find(value=>typeof value!=='string'&&typeof value.arrayBuffer==='function');
            if(!file)throw new Error('Missing uploaded image');
            bytes=Buffer.from(await file.arrayBuffer());type=file.type;
          }
          const path=url.pathname.slice('/storage/v1/object/'.length);images.set(path,{bytes,type});
          send({Id:crypto.randomUUID(),Key:path});return;
        }
        if(req.method==='GET'){
          const image=images.get(url.pathname.slice('/storage/v1/object/public/'.length));
          if(!image){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':image.type});res.end(image.bytes);return;
        }
      }
      if(url.pathname.startsWith('/auth/v1/')){
        if(url.pathname==='/auth/v1/logout'){send({});return;}
        if(url.pathname==='/auth/v1/user'){send(user);return;}
        if(url.pathname==='/auth/v1/token'){
          send({access_token:token,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user});return;
        }
      }
      if(url.pathname.startsWith('/functions/v1/')){
        const bytes=[];for await(const chunk of req)bytes.push(chunk);
        const request=new Request(url,{method:req.method,headers:req.headers,body:Buffer.concat(bytes)});
        const handlers={'submit-enquiry':submit,'retry-enquiry':retry,'chatbot':chatbot,'chatbot-admin':chatbotAdmin};
        const handler=handlers[url.pathname.split('/').at(-1)];if(!handler){send({error:'Unknown function'},404);return;}
        const result=await handler(request);
        res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());return;
      }
      if(url.pathname.startsWith('/rest/v1/')){
        const table=url.pathname.split('/').at(-1);if(!tables.has(table)){send({message:'Unknown table'},404);return;}
        const isAdmin=req.headers.authorization===`Bearer ${token}`;
        if(!isAdmin&&(req.method!=='GET'||['enquiries','admin_users'].includes(table))){send({message:'Not authorized'},403);return;}
        const values=[];const param=value=>{values.push(value!==null&&typeof value==='object'?JSON.stringify(value):value);return `$${values.length}`;};
        const clauses=[];
        for(const [key,value] of url.searchParams){
          if(['select','order','limit'].includes(key))continue;
          if(value.startsWith('eq.')){let v=value.slice(3);if(v==='true')v=true;else if(v==='false')v=false;clauses.push(`${identifier(key)}=${param(v)}`);}
        }
        const where=()=>clauses.length?' where '+clauses.join(' and '):'';
        let sql;
        if(req.method==='GET'){
          sql=`select * from public.${identifier(table)}${where()}`;
          const order=url.searchParams.get('order');if(order){const [field,direction]=order.split('.');sql+=` order by ${identifier(field)} ${direction==='desc'?'desc':'asc'}`;}
        }else{
          const chunks=[];for await(const chunk of req)chunks.push(chunk);
          const raw=Buffer.concat(chunks).toString();
          const body=raw?JSON.parse(raw):{};
          if(req.method==='POST')sql=`insert into public.${identifier(table)} (${Object.keys(body).map(identifier).join(',')}) values (${Object.values(body).map(param).join(',')}) returning *`;
          else if(req.method==='PATCH')sql=`update public.${identifier(table)} set ${Object.entries(body).map(([key,value])=>`${identifier(key)}=${param(value)}`).join(',')}${where()} returning *`;
          else if(req.method==='DELETE')sql=`delete from public.${identifier(table)}${where()} returning *`;
        }
        const result=await db.query(sql,values);
        if(req.headers.accept?.includes('vnd.pgrst.object+json'))send(result.rows[0]||null);else send(result.rows);
        return;
      }
      await staticFile(req,res,'.generated/browser-site');
    }catch(error){send({message:error.message,code:error.code},500);}
  });
  // Prerender from this isolated database, never from a developer's dist/env.
  const renderPage=prerender?(await import('../../.generated/browser-ssr/entry-server.js')).renderPage:null;
  const production=createServer(async(req,res)=>{
    if(!prerender){await staticFile(req,res,'dist');return;}
    const path=new URL(req.url,'http://127.0.0.1:4187').pathname;
    if(path==='/'||/^\/projects\/(?:seed-p\d+|[0-9a-f-]{36})$/i.test(path)){
      try{
        const data={};
        for(const table of ['site_content','services','projects','team_members','promotions','feature_options','testimonials','faqs']){
          const {rows}=await db.query(`select * from public.${identifier(table)}${table==='site_content'?'':' where active=true'+(table==='testimonials'?' and permission_confirmed=true':'')}`);
          data[table]=table==='site_content'?rows[0]:rows;
        }
        let html=await readFile('.generated/browser-site/index.html','utf8');
        html=html.replace('<div id="root"></div>',()=>`<div id="root" data-route="${path}">${renderPage(data,path)}</div><script id="mv-initial-data" type="application/json">${safeJson(data)}</script>`);
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);
      }catch(error){res.writeHead(500).end(error.message);}
      return;
    }
    await staticFile(req,res,'.generated/browser-site');
  });
  await Promise.all([new Promise(resolve=>fixture.listen(4188,'127.0.0.1',resolve)),new Promise(resolve=>production.listen(4187,'127.0.0.1',resolve))]);
  return {db,images,mailPayloads,get mails(){return mails;},async close(){fixture.closeAllConnections();production.closeAllConnections();await Promise.all([new Promise(resolve=>fixture.close(resolve)),new Promise(resolve=>production.close(resolve))]);await db.close();}};
}
