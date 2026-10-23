import {test} from 'node:test';
import assert from 'node:assert/strict';
import sitemap from '../api/sitemap.js';
import {sitemapPaths,sitemapXml} from '../src/lib/sitemap.mjs';
import {validateContentField} from '../src/admin/validation.js';

const id='5aa79a0b-d111-4fe9-900e-b7f24958c346';
function response(){
  return {statusCode:200,headers:{},body:'',setHeader(k,v){this.headers[k]=v;return this;},status(v){this.statusCode=v;return this;},send(v){this.body=v;return this;},end(v=''){this.body=v;return this;}};
}

test('sitemap follows published project changes and admin managed site paths',async()=>{
  const old={...process.env},originalFetch=globalThis.fetch;
  try{
    process.env.VITE_SITE_URL='https://mv-aistudio.vercel.app';
    process.env.VITE_SUPABASE_URL='https://database.example';
    process.env.VITE_SUPABASE_ANON_KEY='public-test-key';
    let projects=[{id,demo_url:'APMoodle.html'}];let extra='/faq';
    globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('/projects?')?projects:[{content:{sitemap_paths_text:extra}}]});
    const first=response();await sitemap({method:'GET'},first);
    assert.equal(first.statusCode,200);assert.match(first.headers['Content-Type'],/application\/xml/);
    assert.match(first.body,new RegExp(`/projects/${id}`));assert.match(first.body,/<loc>https:\/\/mv-aistudio.vercel.app\/faq<\/loc>/);
    assert.match(first.body,/<loc>https:\/\/mv-aistudio.vercel.app\/APMoodle.html<\/loc>/);
    assert.doesNotMatch(first.body,/database\.example|admin|mailto:/);
    projects=[];extra='';
    const second=response();await sitemap({method:'GET'},second);
    assert.equal(second.statusCode,200);assert.doesNotMatch(second.body,new RegExp(id));assert.doesNotMatch(second.body,/\/faq|APMoodle/);
  }finally{globalThis.fetch=originalFetch;process.env=old;}
});

test('only local public paths enter the sitemap and invalid admin input is rejected',()=>{
  const invalid='https://other.example/demo\n/admin\n//other.example\n/projects/'+id+'\n/faq?sort=1';
  assert.equal(sitemapPaths(invalid).errors.length,5);
  assert.ok(validateContentField('sitemap_paths_text',invalid));
  const xml=sitemapXml('https://mv-aistudio.vercel.app',[{id,active:true,demo_url:'https://other.example/demo.html'},{id:'bad',active:true},{id:'seed-p1',active:false,demo_url:'/hidden.html'}],'/faq\n/faq\n/guides/a&amp;b');
  assert.equal((xml.match(/\/faq<\/loc>/g)||[]).length,1);
  assert.doesNotMatch(xml,/seed-p1|bad|a&amp;b|other\.example|hidden\.html/);
});

test('database failure returns 503 rather than an incomplete sitemap',async()=>{
  const old={...process.env},originalFetch=globalThis.fetch,originalError=console.error;
  try{
    process.env.VITE_SITE_URL='https://mv-aistudio.vercel.app';process.env.VITE_SUPABASE_URL='https://database.example';process.env.VITE_SUPABASE_ANON_KEY='public-test-key';
    globalThis.fetch=async()=>({ok:false,status:503});console.error=()=>{};
    const result=response();await sitemap({method:'GET'},result);
    assert.equal(result.statusCode,503);assert.equal(result.headers['Cache-Control'],'no-store');
    assert.doesNotMatch(result.body,/<urlset/);
  }finally{globalThis.fetch=originalFetch;console.error=originalError;process.env=old;}
});
