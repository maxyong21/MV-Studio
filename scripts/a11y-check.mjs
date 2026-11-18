// Automated accessibility scan (WCAG 2.2 AA rules from axe-core) over the public pages.
// Run with: npm run test:a11y. Covers light and dark themes, phone and desktop widths, and the
// translated pages. Automated rules find roughly a third of real problems: a keyboard and
// screen-reader pass by a person is still needed. Fails on any serious or critical finding.
import {existsSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'vite';
import {chromium} from 'playwright';
import {createRequire} from 'node:module';
import {browserServers} from '../tests/helpers/browser-server.mjs';

const executable=process.env.BROWSER_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
if(!executable)throw new Error('Set BROWSER_PATH to a Chrome or Edge executable.');
const axeSource=readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'),'utf8');
process.env.VITE_SUPABASE_URL='http://127.0.0.1:4188';process.env.VITE_SUPABASE_ANON_KEY='local-browser-fixture';process.env.VITE_SITE_URL='http://127.0.0.1:4188';process.env.VITE_TURNSTILE_REQUIRED='false';
if(!process.env.A11Y_SKIP_BUILD){
  await build({mode:'test',build:{outDir:'.generated/browser-site'},logLevel:'error'});
  await build({mode:'test',build:{ssr:'src/entry-server.jsx',outDir:'.generated/browser-ssr'},logLevel:'error'});
}
const servers=await browserServers({prerender:true});
const id=(await servers.db.query("select id from projects order by sort_order limit 1")).rows[0].id;
const pages=[['home','/'],['home (Bahasa Malaysia)','/ms/'],['home (Chinese)','/zh/'],['service page','/services/company-website'],['service page (Bahasa Malaysia)','/ms/services/landing-page'],['terms','/terms'],['privacy','/privacy'],['data deletion','/data-deletion'],['project page',`/projects/${id}`],['business details form','/business-profile-form'],['guides list','/guides'],['guide article','/guides/how-much-does-a-website-cost-in-malaysia'],['guide article (Bahasa Malaysia)','/ms/guides/do-you-need-a-website-if-you-have-a-facebook-page'],['guide article (Chinese)','/zh/guides/tuition-centre-website-what-to-include'],['not found','/page-that-does-not-exist']];
const settings=[['phone light',{width:390,height:844},'light'],['phone dark',{width:390,height:844},'dark'],['desktop light',{width:1440,height:900},'light'],['desktop dark',{width:1440,height:900},'dark']];
const browser=await chromium.launch({executablePath:executable});
const found=new Map();let scans=0;
try{
  for(const [settingName,viewport,scheme] of settings){
    const context=await browser.newContext({viewport,colorScheme:scheme,reducedMotion:'reduce'});
    for(const [pageName,path] of pages){
      const page=await context.newPage();
      page.setDefaultTimeout(30000);
      await page.goto(`http://127.0.0.1:4187${path}`,{waitUntil:'load',timeout:30000});await page.waitForTimeout(1200);
      if(process.env.A11Y_VERBOSE)console.log(`  scanning ${pageName} / ${settingName}`);
      // Reveal everything that animates in on scroll, and open one FAQ and the package comparison, so their text is scanned too.
      await page.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}.reveal-on-scroll{opacity:1!important;transform:none!important}'});
      await page.evaluate(()=>{document.querySelectorAll('.reveal-on-scroll').forEach(e=>e.classList.add('is-visible'));document.querySelector('.faq-item')?.setAttribute('open','');document.querySelector('.package-compare')?.setAttribute('open','');});
      await page.addScriptTag({content:axeSource});
      const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']},resultTypes:['violations']}));
      scans++;
      for(const violation of result.violations){
        const key=`${violation.id}`;
        const entry=found.get(key)||{id:violation.id,impact:violation.impact,help:violation.help,where:new Set(),samples:new Map()};
        entry.where.add(`${pageName} / ${settingName}`);
        for(const node of violation.nodes.slice(0,Number(process.env.A11Y_SAMPLES||6))){const target=node.target.join(' ');if(!entry.samples.has(target))entry.samples.set(target,(node.any[0]?.message||node.failureSummary||'').split('\n')[0].slice(0,170));}
        found.set(key,entry);
      }
      await page.close();
    }
    await context.close();
  }
}finally{await browser.close();await servers.close();}
const list=[...found.values()].sort((a,b)=>['critical','serious','moderate','minor'].indexOf(a.impact)-['critical','serious','moderate','minor'].indexOf(b.impact));
console.log(`Scanned ${scans} page views (${pages.length} pages x ${settings.length} settings).`);
if(!list.length)console.log('No automated findings.');
for(const entry of list){
  console.log(`\n[${entry.impact}] ${entry.id}: ${entry.help}\n  seen on ${entry.where.size} view(s), e.g. ${[...entry.where].slice(0,3).join('; ')}`);
  for(const [target,message] of [...entry.samples].slice(0,Number(process.env.A11Y_SAMPLES||5)))console.log(`    ${target}\n      ${message}`);
}
const blocking=list.filter(entry=>['serious','critical'].includes(entry.impact));
if(process.env.A11Y_REPORT_ONLY)process.exit(0);
assert.equal(blocking.length,0,`${blocking.length} serious or critical accessibility finding(s): ${blocking.map(entry=>entry.id).join(', ')}`);
console.log('\nPassed: no serious or critical automated findings.');
process.exit(0);
