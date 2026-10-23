// Uses temporary local PostgreSQL fixtures and a mocked email provider; sends no email.
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {build} from 'vite';
import {browserServers} from '../tests/helpers/browser-server.mjs';

const executable=process.env.BROWSER_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
if(!executable)throw new Error('Set BROWSER_PATH to a Chrome or Edge executable.');
process.env.VITE_SUPABASE_URL='http://127.0.0.1:4188';process.env.VITE_SUPABASE_ANON_KEY='local-browser-fixture';process.env.VITE_SITE_URL='http://127.0.0.1:4188';
await build({mode:'test',build:{outDir:'.generated/browser-site'},logLevel:'warn'});
const servers=await browserServers(),folder=await mkdtemp(join(tmpdir(),'mv-studio-browser-'));
const browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9228',`--user-data-dir=${folder}/profile`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket,send;const errors=[],requests=[];
try{
  let target;
  for(let i=0;i<60;i++){try{target=(await(await fetch('http://127.0.0.1:9228/json',{signal:AbortSignal.timeout(500)})).json()).find(t=>t.type==='page');if(target)break;}catch{}await new Promise(r=>setTimeout(r,250));}
  if(!target)throw new Error('Headless browser did not start.');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let sequence=0;const pending=new Map();
  socket.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);if(!p)return;pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(new Error(JSON.stringify(msg.error))):p.resolve(msg.result);}else if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);else if(msg.method==='Runtime.consoleAPICalled'&&msg.params.type==='error')errors.push(msg.params.args.map(v=>v.value||v.description).join(' '));else if(msg.method==='Network.requestWillBeSent')requests.push(msg.params.request.url);};
  send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timed out: ${method}`));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  const wait=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw new Error(`UI timeout: ${expression}`);};
  const navigate=async(url,selector='h1')=>{await send('Page.navigate',{url});await wait(`document.readyState==='complete'&&!!document.querySelector(${JSON.stringify(selector)})`);};
  const fill=async(selector,value)=>evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw new Error('Missing input: '+${JSON.stringify(selector)});const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const click=async selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const viewport=async width=>{await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<769});await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');};
  const screenshot=async name=>{const result=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,name),Buffer.from(result.data,'base64'));};
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await viewport(1440);
  await navigate('http://127.0.0.1:4187/');
  await wait("!!document.querySelector('.theme-button')");
  assert.ok(!requests.some(url=>/\/Admin-[^/]+\.js/.test(url)),'Admin bundle must not be requested by the homepage');
  assert.ok(!requests.some(url=>/\/supabase-[^/]+\.js/.test(url)),'Admin authentication SDK must not be requested by the homepage');
  assert.ok((await readFile('dist/index.html','utf8')).includes('<h1>Digital, made more human.</h1>'));
  for(const width of [1440,768,760,520,390,320]){
    await viewport(width);
    const overflow=await evaluate('document.documentElement.scrollWidth>innerWidth');
    if(overflow)console.log(await evaluate("[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+2).slice(0,12).map(el=>({tag:el.tagName,class:el.className,width:el.getBoundingClientRect().width,right:el.getBoundingClientRect().right}))"));
    assert.equal(overflow,false,`Horizontal overflow at ${width}px`);
    if(width<=760)assert.equal(await evaluate("getComputedStyle(document.querySelector('.team-grid')).gridTemplateColumns.split(' ').length"),1);
  }
  await viewport(390);await click('.mobile-menu');await wait("document.querySelector('.mobile-menu').getAttribute('aria-expanded')==='true'");
  await click('.mobile-menu');await click('.theme-button');await wait("document.documentElement.dataset.theme==='dark'");
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.float-code')).animationName"),'none');
  await navigate('http://127.0.0.1:4187/projects/seed-p1');assert.match(await evaluate("document.querySelector('h1').textContent"),/APMoodle/);
  assert.ok(await evaluate("document.querySelector('.project-detail-actions a').getAttribute('href').startsWith('/')"));
  await navigate('http://127.0.0.1:4188/admin','.login-card');
  await fill('.login-card input[type=email]','admin@example.test');await fill('.login-card input[type=password]','test-password');await click('.login-card form button');
  await wait("!!document.querySelector('.entity-row')");
  assert.equal(await evaluate("document.querySelector('meta[name=robots]').content"),'noindex,nofollow');
  for(const width of [1440,768,390,320]){await viewport(width);assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,`Admin overflow at ${width}px`);}
  await viewport(1440);await screenshot('admin-desktop.png');
  await click('.admin-theme-toggle');await wait("document.documentElement.dataset.theme==='dark'");await screenshot('admin-dark.png');await click('.admin-theme-toggle');
  const initialFeatures=(await servers.db.query("select features from services where name='Landing Page'")).rows[0].features;
  await click('.entity-actions button');await wait("!!document.querySelector('#dialog-name')");
  await fill('#dialog-scope','One focused page for a new business.');await fill('#dialog-revisions','Revision scope agreed in the proposal.');
  await click('.dialog-actions .button-dark');await wait("!document.querySelector('.entity-dialog')");
  assert.deepEqual((await servers.db.query("select features from services where name='Landing Page'")).rows[0].features,initialFeatures,'Editing a service must preserve feature arrays');
  await evaluate("[...document.querySelectorAll('.rail-item')].find(el=>el.textContent==='Projects').click()");await wait("document.querySelector('.admin-header h1')?.textContent==='Projects'&&!!document.querySelector('.entity-row')");
  await click('.entity-actions button');await wait("!!document.querySelector('#dialog-challenge')");
  await fill('#dialog-challenge','Explain a learning workflow clearly.');await fill('#dialog-solution','Build a clear student dashboard and course navigation.');await fill('#dialog-outcome','The learning workflow is available through the delivered application.');
  const dom=await send('DOM.getDocument');const fileInput=await send('DOM.querySelector',{nodeId:dom.root.nodeId,selector:'label:has(#dialog-image_url) input[type=file]'});
  await send('DOM.setFileInputFiles',{nodeId:fileInput.nodeId,files:[resolve('public/aphome.png')]});
  await wait("document.querySelector('#dialog-image_url')?.value.includes('/storage/v1/object/public/')&&!document.querySelector('.dialog-actions .button-dark').disabled");
  await click('.dialog-actions .button-dark');await wait("!document.querySelector('.entity-dialog')");
  const editedProject=(await servers.db.query("select * from projects where name='APMoodle'")).rows[0];assert.equal(editedProject.image_variants.length,3);assert.equal(servers.images.size,3);assert.match(editedProject.challenge,/learning workflow/);
  await evaluate("[...document.querySelectorAll('.rail-item')].find(el=>el.textContent==='Client feedback').click()");await wait("document.querySelector('.admin-header h1')?.textContent==='Client feedback'");
  await click('.entity-toolbar-actions .button-dark');await fill('#dialog-name','Local Test Client');await fill('#dialog-quote','The team helped us understand the scope and delivered a clear website.');await click('#dialog-active');await click('.dialog-actions .button-dark');
  await wait("!!document.getElementById('dialog-permission_confirmed-error')");await click('#dialog-permission_confirmed');await click('.dialog-actions .button-dark');await wait("!document.querySelector('.entity-dialog')");
  assert.equal((await servers.db.query('select count(*)::int as n from testimonials where active')).rows[0].n,1);
  await evaluate("[...document.querySelectorAll('.rail-item')].find(el=>el.textContent==='Site content').click()");await wait("!!document.querySelector('#content-contact_emails-0')");
  await fill('#content-contact_emails-0','first@example.test');await evaluate("document.querySelector('#content-contact_emails-0').closest('.contact-list-editor').querySelector('.contact-add-button').click()");
  await wait("!!document.querySelector('#content-contact_emails-1')");await fill('#content-contact_emails-1','second@example.test');
  await fill('#content-contact_phones-0','+1 202-555-0123');await evaluate("document.querySelector('#content-contact_phones-0').closest('.contact-list-editor').querySelector('.contact-add-button').click()");await fill('#content-contact_phones-1','+1 202-555-0124');
  await click('.content-editor-head .button');await wait("document.querySelector('.admin-toast')?.textContent==='Website content saved'");
  const contacts=(await servers.db.query('select content from site_content')).rows[0].content;assert.equal(contacts.contact_emails.length,2);assert.equal(contacts.contact_phones.length,2);
  await viewport(390);assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);await screenshot('admin-mobile.png');
  await navigate(`http://127.0.0.1:4188/projects/${editedProject.id}`);await wait("document.querySelectorAll('.case-study-block').length===3");
  assert.ok(await evaluate("document.querySelector('.project-detail-image img').srcset.includes('480w')"));
  await navigate('http://127.0.0.1:4188/');await wait("!!document.querySelector('#feedback')");
  assert.equal(await evaluate("document.querySelectorAll('.contact-links a[href^=\"mailto:\"]').length"),2);
  assert.equal(await evaluate("document.querySelector('.contact-links a[href*=\"wa.me\"]').href"),'https://wa.me/12025550123');
  await click('.enquiry-form button[type=submit], .enquiry-form > button');await wait("!!document.querySelector('#enquiry-name-error')");
  for(const [key,value] of Object.entries({name:'Alex Tan',company_name:'Browser Test Company',phone:'+1 202-555-0123',email:'client@example.test'}))await fill(`#enquiry-${key}`,value);
  await evaluate("[...document.querySelectorAll('.feature-option')].find(el=>el.textContent.includes('Website maintenance')).querySelector('input').click()");
  await evaluate("[...document.querySelectorAll('.billing-choice label')].find(el=>el.textContent.includes('Annual')).querySelector('input').click()");
  await wait("document.querySelector('.annual-savings')?.textContent.includes('pay 11 months')");
  await click('.meeting-toggle input');await fill('#enquiry-preferred_meeting_at','2099-01-01T10:00');await click('.enquiry-form > button');
  await wait("document.querySelector('.enquiry-feedback')?.textContent.includes('has been saved')");
  assert.equal(servers.mails,1);const saved=(await servers.db.query('select * from enquiries')).rows;assert.equal(saved.length,1);assert.equal(saved[0].meeting_requested,true);assert.equal(+saved[0].annual_estimate,1320);
  await evaluate("document.querySelector('.site-footer-full').scrollIntoView({behavior:'instant',block:'end'})");await screenshot('footer-mobile.png');
  await navigate('http://127.0.0.1:4188/unknown-page');await wait("document.querySelector('meta[name=robots]')?.content==='noindex,follow'");await wait("location.pathname==='/'&&!!document.querySelector('.hero')");
  assert.deepEqual(errors,[],'Browser runtime and hydration errors');
  console.log(JSON.stringify({passed:true,checks:['prerendered HTML and hydration','public bundle excludes admin and auth SDK','six responsive widths','mobile menu and reduced motion','project deep links and editable case studies','admin login and metadata','service edits preserve features','responsive WebP upload and storage variants','testimonial publication permission','multiple contact fields','WhatsApp URL','enquiry validation, storage, email notification and meeting','unknown route and automatic redirect'],screenshots:folder},null,2));
}finally{
  if(send)try{await send('Browser.close');}catch{}
  socket?.close();browser.kill();await servers.close();
}
