import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/analytics.js',import.meta.url),'utf8');
function browser({origin='https://mv-aistudio.vercel.app',path='/',consent='',referrer='https://example.org/search?q=private'}={}){
  const inserted=[],handlers={},storage=new Map([['mv-analytics-consent-v1',consent]]);
  const element=tag=>({tag,hidden:false,dataset:{},setAttribute(){},focus(){},addEventListener(name,fn){this[name]=fn;},querySelector(){return this.querySelectorAll()[0];},querySelectorAll(){return this.buttons||=(['granted','denied'].map(choice=>({...element('button'),dataset:{choice}})));}});
  const location={origin,pathname:path,search:'?email=private@example.org',hash:'#secret'};
  const document={title:'MV Studio',readyState:'complete',referrer,head:{appendChild:node=>inserted.push(node)},body:{append:(...nodes)=>inserted.push(...nodes)},createElement:element,addEventListener:(name,fn)=>handlers[name]=fn};
  const window={addEventListener:(name,fn)=>handlers[name]=fn};
  runInNewContext(source,{window,document,location,localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},URL,Set,Date,String});
  return {window,location,inserted,handlers,storage,page:(path='/',title='MV Studio')=>{location.pathname=path;window.mvAnalytics?.updatePage({path,title});},choose:value=>inserted.find(n=>n.id==='mv-analytics-choice').buttons.find(n=>n.dataset.choice===value).click(),events:()=>Array.from(window.dataLayer||[],args=>Array.from(args)).filter(args=>args[0]==='event')};
}
test('no Google script or events before consent; decline remains usable',()=>{
  const b=browser();b.page();assert.equal(b.inserted.filter(n=>n.tag==='script').length,0);
  b.window.mvAnalytics.event('generate_lead',{method:'enquiry_form'});assert.equal(b.events().length,0);
  b.choose('denied');assert.equal(b.inserted.filter(n=>n.tag==='script').length,0);assert.equal(b.storage.get('mv-analytics-consent-v1'),'denied');
});
test('one page view per route, sanitized URLs, bounded events, and a single tag',()=>{
  const b=browser();b.page();b.choose('granted');b.page();b.page();
  assert.equal(b.events().filter(e=>e[1]==='page_view').length,1);
  b.page('/projects/seed-p1','Project');b.page('/projects/seed-p1','Project');b.page('/');
  assert.equal(b.events().filter(e=>e[1]==='page_view').length,3);
  assert.equal(b.inserted.filter(n=>n.tag==='script').length,1);
  b.window.mvAnalytics.event('generate_lead',{method:'chatbot',email:'private@example.org',message:'SECRET',value:999});
  b.window.mvAnalytics.event('unknown',{method:'chatbot'});
  const last=b.events().at(-1);assert.equal(last[1],'generate_lead');assert.equal(last[2].method,'chatbot');
  assert.equal(last[2].email,undefined);assert.equal(last[2].value,undefined);
  assert.ok(!JSON.stringify(b.events()).includes('private'));assert.ok(!JSON.stringify(b.events()).includes('SECRET'));
  assert.equal(b.events()[0][2].page_referrer,'https://example.org');
});
test('admin routes suppress analytics after public navigation, and opt-out stops collection',()=>{
  const b=browser({consent:'granted'});b.page();const count=b.events().length;
  b.page('/admin');b.window.mvAnalytics.event('generate_lead',{method:'chatbot'});
  assert.equal(b.events().length,count);assert.equal(b.window['ga-disable-G-D92C2BPTH3'],true);
  assert.equal(b.inserted.find(n=>n.id==='mv-analytics-preferences').hidden,true);
  b.page('/');b.choose('denied');const denied=b.events().length;
  b.page('/projects/seed-p1');b.window.mvAnalytics.event('chatbot_open');assert.equal(b.events().length,denied);
});
test('local/preview hosts do not initialize, and unknown paths cannot send data',()=>{
  for(const origin of ['http://localhost:5173','https://mv-preview.vercel.app']){const b=browser({origin,consent:'granted'});b.page();assert.equal(b.window.mvAnalytics,undefined);assert.equal(b.inserted.length,0);}
  const b=browser({path:'/admin',consent:'granted'});b.page('/admin');assert.equal(b.inserted.length,0);
  b.page('/someone@example.org');assert.equal(b.inserted.length,0);
});
test('legacy demo pages participate in the same consent and measurement flow',()=>{
  const b=browser({path:'/SuperMathsBros.html',consent:'granted'});
  assert.equal(b.events()[0][1],'page_view');assert.ok(b.events()[0][2].page_location.endsWith('/SuperMathsBros.html'));
});
