// The uptime endpoint (api/health.js) and the scheduled check that calls it (.github/workflows/uptime.yml).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHealth} from '../api/health.js';

const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(body){this.body=body;return this;},end(){return this;}});
const env={VITE_SUPABASE_URL:'https://db.example/',VITE_SUPABASE_ANON_KEY:'eyJpublic'};
const run=async(handler,method='GET')=>{const res=response();await handler({method},res);return res;};
const now=()=>new Date('2026-11-17T04:00:00Z');

test('health: 200 when the database answers, and nothing from the database is returned',async()=>{
  let url,headers;
  const res=await run(createHealth({env,now,fetcher:async(u,o)=>{url=u;headers=o.headers;return {ok:true,json:async()=>[{id:1}]};}}));
  assert.equal(res.statusCode,200);
  assert.deepEqual(JSON.parse(res.body),{ok:true,database:'ok',time:'2026-11-17T04:00:00.000Z'});
  assert.match(url,/^https:\/\/db\.example\/rest\/v1\/site_content\?select=id/);
  assert.equal(headers.apikey,'eyJpublic');assert.equal(res.headers['Cache-Control'],'no-store');assert.equal(res.headers['X-Robots-Tag'],'noindex');
  assert.doesNotMatch(res.body,/eyJpublic|db\.example/,'no key or address in the reply');
});

test('health: any failure is a 503 with a short reason and no detail',async()=>{
  const cases=[
    ['not configured',createHealth({env:{},now})],
    ['unavailable',createHealth({env,now,fetcher:async()=>({ok:false,json:async()=>[]})})],
    ['unexpected response',createHealth({env,now,fetcher:async()=>({ok:true,json:async()=>({error:'x'})})})],
    ['unreachable',createHealth({env,now,fetcher:async()=>{throw new Error('connect ECONNREFUSED 10.0.0.5')}})],
  ];
  for(const [reason,handler] of cases){
    const res=await run(handler);
    assert.equal(res.statusCode,503,reason);assert.equal(JSON.parse(res.body).ok,false);assert.equal(JSON.parse(res.body).database,reason);
    assert.doesNotMatch(res.body,/ECONNREFUSED|10\.0\.0\.5/);
  }
});

test('health: HEAD has no body, other methods are refused',async()=>{
  const handler=createHealth({env,now,fetcher:async()=>({ok:true,json:async()=>[]})});
  const head=await run(handler,'HEAD');assert.equal(head.statusCode,200);assert.equal(head.body,'');
  const post=await run(handler,'POST');assert.equal(post.statusCode,405);assert.equal(post.headers.Allow,'GET, HEAD');
});

test('uptime workflow checks pages, the 404, the maintenance page and the security headers every 15 minutes',async()=>{
  const workflow=await readFile('.github/workflows/uptime.yml','utf8');
  assert.match(workflow,/cron: '\*\/15 \* \* \* \*'/);assert.match(workflow,/workflow_dispatch/);
  for(const needle of ['/api/health','/services/company-website','/ms/','/sitemap.xml','this-page-does-not-exist','content-security-policy','x-frame-options','Under maintenance'])assert.ok(workflow.toLowerCase().includes(needle.toLowerCase()),needle);
  assert.match(workflow,/permissions:\s*\n\s*contents: read/,'least privilege');
  assert.doesNotMatch(workflow,/secrets\./,'the check needs no secrets');
});
