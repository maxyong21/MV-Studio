import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProjectPage} from '../api/project-page.js';
const id='11111111-1111-4111-8111-111111111111';
const env={VITE_SUPABASE_URL:'https://db.example',VITE_SUPABASE_ANON_KEY:'public-test'};
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(body){this.body=body;return this;},end(){return this;}});
const read=async path=>`<html>${path}</html>`;
test('project requests distinguish existing, missing, unpublished and unavailable pages',async()=>{
 let rows=[{id}],failure=false,calls=0;
 const handler=createProjectPage({env,read,fetcher:async()=>{calls++;return {ok:!failure,json:async()=>rows};}});
 const run=async value=>{const res=response();await handler({method:'GET',query:{id:value}},res);return res;};
 assert.equal((await run(id)).statusCode,200);
 rows=[];const missing=await run(id);assert.equal(missing.statusCode,404);assert.match(missing.body,/404.html/);assert.equal(missing.headers['X-Robots-Tag'],'noindex');
 const before=calls;assert.equal((await run('../admin')).statusCode,404);assert.equal(calls,before);
 failure=true;const original=console.error;console.error=()=>{};
 try{const unavailable=await run(id);assert.equal(unavailable.statusCode,503);assert.match(unavailable.body,/maintenance.html/);}finally{console.error=original;}
});
test('new published projects fall back to the application shell; HEAD and methods are correct',async()=>{
 const handler=createProjectPage({env,read:async path=>{if(path.startsWith('projects/'))throw Error('Not built yet');return read(path);},fetcher:async()=>({ok:true,json:async()=>[{id}]})});
 const get=response();await handler({method:'GET',query:{id}},get);assert.equal(get.statusCode,200);assert.match(get.body,/index.html/);
 const head=response();await handler({method:'HEAD',query:{id}},head);assert.equal(head.statusCode,200);assert.equal(head.body,'');
 const post=response();await handler({method:'POST',query:{id}},post);assert.equal(post.statusCode,405);
 const unavailable=response();await createProjectPage({env:{},read})({method:'GET',query:{id}},unavailable);assert.equal(unavailable.statusCode,503);
});
test('Vercel keeps admin, assets and sitemap routes and gives unknown paths a 404',async()=>{
 const config=JSON.parse(await readFile('vercel.json','utf8'));
 assert.equal(config.rewrites,undefined);
 assert.ok(config.routes.some(r=>r.handle==='filesystem'));
 assert.equal(config.routes[0].dest,'/api/sitemap');
 assert.ok(config.routes.some(r=>r.src==='/admin/?'&&r.dest==='/admin/index.html'));
 assert.deepEqual(config.routes.at(-1),{src:'/.*',dest:'/404.html',status:404});
 assert.equal(config.routes[1].dest,'/api/project-page?id=$1');
});
