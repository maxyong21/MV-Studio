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
  await navigate('http://127.0.0.1:4188/admin','.login-card');
  await fill('.login-card input[type=email]','admin@example.test');await fill('.login-card input[type=password]','test-password');await click('.login-card form button');
  await wait("!!document.querySelector('.entity-row')");
  await evaluate("[...document.querySelectorAll('.rail-item')].find(el=>el.textContent==='Promotions').click()");
  await wait("document.querySelector('.admin-header h1')?.textContent==='Promotions'");
  await click('.entity-toolbar-actions .button-dark');await wait("!!document.querySelector('#dialog-title')");
  await fill('#dialog-title','Unsaved poster preview');await fill('#dialog-message','This is a draft promotion. '.repeat(18));
  await fill('#dialog-button_label','View our offer');await fill('#dialog-button_url','https://example.com/offer');
  await click('#dialog-active');
  const dom=await send('DOM.getDocument');const input=await send('DOM.querySelector',{nodeId:dom.root.nodeId,selector:'label:has(#dialog-image_url) input[type=file]'});
  await send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[resolve('public/vincent-teo.jpg')]});
  await wait("document.querySelector('#dialog-image_url')?.value.includes('/storage/v1/object/public/')&&!document.querySelector('.promotion-preview-button').disabled");
  await evaluate("localStorage.setItem('mv-promotion-seen-day-v1','already-viewed')");
  const count=(await servers.db.query('select count(*)::int as n from promotions')).rows[0].n;
  const openPreview=async()=>{await click('.promotion-preview-button');await wait("!!document.querySelector('.promotion-dialog img')?.naturalWidth");};
  await openPreview();
  assert.equal(await evaluate("document.querySelector('#promotion-title').textContent"),'Unsaved poster preview');
  assert.equal(await evaluate("document.querySelector('.modal-backdrop').inert"),true);
  for(const [width,height] of [[320,568],[390,844],[768,1024],[1440,900],[844,390]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<769});
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const result=await evaluate(`(()=>{const dialog=document.querySelector('.promotion-dialog'),body=dialog.querySelector('.promotion-body'),img=body.querySelector('img'),r=dialog.getBoundingClientRect(),picture=img.getBoundingClientRect(),close=dialog.querySelector('header button').getBoundingClientRect();return {fits:r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1,closeVisible:close.top>=0&&close.bottom<=innerHeight,overflow:body.scrollWidth>body.clientWidth+1,fullWidth:Math.abs(picture.width-dialog.clientWidth)<2,proportional:Math.abs(picture.width/picture.height-img.naturalWidth/img.naturalHeight)<.02,scrollable:body.scrollHeight>body.clientHeight}})()`);
    assert.equal(result.fits,true);assert.equal(result.closeVisible,true);assert.equal(result.overflow,false);assert.equal(result.fullWidth,true);assert.equal(result.proportional,true);
    console.log(width,height,result);
    if(width===390)await screenshot('promotion-preview-mobile.png');
    if(width===1440)await screenshot('promotion-preview-desktop.png');
  }
  await evaluate("document.querySelector('.promotion-body').scrollTop=99999");
  const location=await evaluate('location.href');await click('.promotion-actions a');assert.equal(await evaluate('location.href'),location);
  await evaluate("document.querySelector('.promotion-dialog header button').focus()");
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
  assert.equal(await evaluate("document.activeElement.textContent"),'Close preview');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"),'Close promotion preview');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await wait("!document.querySelector('.promotion-dialog')&&!!document.querySelector('.entity-dialog')");
  await wait("document.activeElement.classList.contains('promotion-preview-button')");
  assert.equal(await evaluate("document.querySelector('#dialog-title').value"),'Unsaved poster preview');
  assert.equal(await evaluate("document.querySelector('.modal-backdrop').inert"),false);
  await fill('#dialog-title','Updated unsaved preview');await openPreview();
  assert.equal(await evaluate("document.querySelector('#promotion-title').textContent"),'Updated unsaved preview');
  await click('.promotion-dialog header button');await wait("!document.querySelector('.promotion-dialog')");
  await openPreview();await click('.promotion-overlay');await wait("!document.querySelector('.promotion-dialog')");
  assert.equal(await evaluate("localStorage.getItem('mv-promotion-seen-day-v1')"),'already-viewed');
  assert.equal((await servers.db.query('select count(*)::int as n from promotions')).rows[0].n,count);
  assert.equal(await evaluate("document.querySelector('#dialog-enabled').checked"),false);
  await click('.dialog-actions .button-dark');await wait("!document.querySelector('.entity-dialog')");
  assert.equal((await servers.db.query('select count(*)::int as n from promotions')).rows[0].n,count+1);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,checks:['upload preview','unsaved and disabled offer preview','five responsive sizes','uncropped full-width poster','keyboard focus trap and restoration','Escape closes only preview','repeat preview retains edits','preview does not navigate, publish or consume daily limit','save still works'],screenshots:folder},null,2));
}finally{
  if(send)try{await send('Browser.close');}catch{}
  socket?.close();browser.kill();await servers.close();
}
