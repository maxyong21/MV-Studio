// First-screen performance guard. Run with: npm run test:perf
// Checks, in a real browser on a phone-sized screen, that the first visit stays light:
//  - the human-check widget (about 2.7 MB of Cloudflare code) is NOT requested until the enquiry form is near;
//  - it IS requested once the form is near, and the form then becomes usable;
//  - no layout shift while the page loads, and no page errors.
// Uses a stand-in for the Cloudflare script, so it never contacts Cloudflare.
import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'vite';
import {chromium} from 'playwright';
import {browserServers} from '../tests/helpers/browser-server.mjs';

const executable=process.env.BROWSER_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
if(!executable)throw new Error('Set BROWSER_PATH to a Chrome or Edge executable.');
process.env.VITE_SUPABASE_URL='http://127.0.0.1:4188';process.env.VITE_SUPABASE_ANON_KEY='local-browser-fixture';process.env.VITE_SITE_URL='http://127.0.0.1:4188';
process.env.VITE_TURNSTILE_SITE_KEY='test-site-key';process.env.VITE_TURNSTILE_REQUIRED='true';
await build({mode:'test',build:{outDir:'.generated/browser-site'},logLevel:'warn'});
await build({mode:'test',build:{ssr:'src/entry-server.jsx',outDir:'.generated/browser-ssr'},logLevel:'warn'});
const servers=await browserServers({prerender:true});
const browser=await chromium.launch({executablePath:executable});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[],cloudflare=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(/challenges\.cloudflare\.com/.test(request.url()))cloudflare.push(request.url());});
  await page.route('https://challenges.cloudflare.com/**',route=>route.fulfill({status:200,contentType:'text/javascript',body:'window.turnstile={render:(element,options)=>{setTimeout(()=>options.callback("test-token"),50);return 1;},remove(){},reset(){}};'}));
  await page.addInitScript(()=>{window.__cls=0;new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__cls+=entry.value;}).observe({type:'layout-shift',buffered:true});});
  await page.goto('http://127.0.0.1:4187/',{waitUntil:'load'});
  await page.waitForTimeout(3000);
  assert.equal(cloudflare.length,0,`The human check must not load with the first screen, but requested: ${cloudflare.join(', ')}`);
  const cls=await page.evaluate(()=>window.__cls);
  assert.ok(cls<0.1,`Layout shift on load should stay under 0.1, got ${cls.toFixed(3)}`);
  // Scrolling to the form brings the widget in, and the send button becomes usable.
  await page.locator('#enquiry').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>!document.querySelector('.enquiry-form button[type=submit]').disabled,null,{timeout:10000});
  assert.ok(cloudflare.some(url=>/turnstile\/v0\/api\.js/.test(url)),'The human check should load once the enquiry form is near');
  assert.deepEqual(errors,[],`Page errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({passed:true,checks:['human check not requested on first load','human check loads near the form and the form becomes usable','layout shift under 0.1',`cls ${cls.toFixed(3)}`]},null,2));
}finally{await browser.close();await servers.close();}
process.exit(0);
