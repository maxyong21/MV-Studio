// Runs the main customer and admin journeys in Firefox and in WebKit (the engine
// behind Safari), against the same local fixtures as browser-check.mjs. Chrome is
// covered in depth by browser-check.mjs; this catches what only breaks elsewhere.
// Install the browsers once with: npx playwright install firefox webkit
import assert from 'node:assert/strict';
import {build} from 'vite';
import {firefox,webkit} from 'playwright';
import {browserServers} from '../tests/helpers/browser-server.mjs';

process.env.VITE_SUPABASE_URL='http://127.0.0.1:4188';process.env.VITE_SUPABASE_ANON_KEY='local-browser-fixture';process.env.VITE_SITE_URL='http://127.0.0.1:4188';process.env.VITE_TURNSTILE_REQUIRED='false';
await build({mode:'test',build:{outDir:'.generated/browser-site'},logLevel:'warn'});
await build({mode:'test',build:{ssr:'src/entry-server.jsx',outDir:'.generated/browser-ssr'},logLevel:'warn'});
const servers=await browserServers({prerender:true});
const site='http://127.0.0.1:4187',app='http://127.0.0.1:4188',results={};
const overflow=page=>page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);

try{
  for(const [name,engine] of [['firefox',firefox],['webkit',webkit]]){
    const browser=await engine.launch(),context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),problems=[],done=[];
    page.on('pageerror',error=>problems.push(`script error: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')problems.push(`console: ${message.text().slice(0,200)}`);});
    const step=async(label,run)=>{await run();done.push(label);};
    try{
      await step('homepage renders with local fonts',async()=>{
        await page.goto(site+'/');await page.waitForSelector('.service-card');
        assert.equal(await page.evaluate(()=>document.fonts.ready.then(()=>document.fonts.check('16px "DM Sans"')&&document.fonts.check('700 30px Manrope'))),true);
        assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');
      });
      await step('theme toggle',async()=>{
        await page.click('.theme-button');await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
        assert.equal(await page.evaluate(()=>localStorage.getItem('mv-theme')),'dark');
        await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-reveal'));
        await page.click('.theme-button');await page.waitForFunction(()=>document.documentElement.dataset.theme==='light'&&!document.documentElement.classList.contains('theme-reveal'));
      });
      await step('languages',async()=>{
        for(const [lang,cta] of [['ms-MY','Mulakan projek'],['zh-Hans-MY','开始项目'],['en-MY','Start a project']]){
          await page.click(`.nav-language button[lang="${lang}"]`);
          await page.waitForFunction(([wanted,text])=>document.documentElement.lang===wanted&&document.querySelector('.nav-cta')?.textContent.trim()===text,[lang,cta]);
          assert.equal(await overflow(page),false,`${lang} overflows at 1440px`);
        }
        await page.evaluate(()=>localStorage.removeItem('mv-lang'));
      });
      await step('phone layout and menu',async()=>{
        for(const width of [390,320]){await page.setViewportSize({width,height:800});assert.equal(await overflow(page),false,`Homepage overflows at ${width}px`);}
        await page.setViewportSize({width:390,height:800});
        await page.click('.mobile-menu');await page.waitForSelector('.nav-links.open .nav-language-mobile',{state:'visible'});
        await page.click('.mobile-menu');await page.waitForSelector('.nav-links.open',{state:'detached'});
        await page.setViewportSize({width:1440,height:900});
      });
      await step('FAQ, enquiry form validation and project page',async()=>{
        await page.click('.faq-item summary');assert.equal(await page.evaluate(()=>document.querySelector('.faq-item').open),true);
        await page.click('.enquiry-form button[type=submit]');await page.waitForSelector('.enquiry-form [aria-invalid=true]');
        await page.click('.work-card h3 a');await page.waitForSelector('.project-detail h1');
        assert.equal(await overflow(page),false,'Project page overflows');
      });
      await step('service pages',async()=>{
        await page.goto(site+'/');await page.click('.service-card h3 a');await page.waitForSelector('.service-page h1');
        await page.waitForFunction(()=>/Malaysia \| MV Studio$/.test(document.title));
        const graph=JSON.parse(await page.evaluate(()=>document.getElementById('mv-studio-jsonld').textContent));
        for(const type of ['Service','BreadcrumbList','FAQPage','ProfessionalService'])assert.ok(graph['@graph'].some(node=>node['@type']===type),type+' is missing from the service page');
        assert.ok(await page.evaluate(()=>document.querySelector('link[rel=canonical]').href.includes('/services/')));
        await page.goto(site+'/services/ecommerce-website');await page.waitForSelector('.service-page h1');
        await page.click('.service-page .faq-item summary');assert.equal(await page.evaluate(()=>document.querySelector('.service-page .faq-item').open),true);
        for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:800});assert.equal(await overflow(page),false,'Service page overflows at '+width+'px');}
        await page.setViewportSize({width:1440,height:900});
        await page.click('.service-others a');await page.waitForFunction(()=>!location.pathname.endsWith('ecommerce-website')&&document.querySelector('.service-page h1'));
        await page.goto(app+'/services/no-such-service');await page.waitForSelector('.not-found-page h1');
      });
      await step('legal page and custom 404',async()=>{
        await page.goto(site+'/privacy');await page.waitForSelector('.legal-hero h1');
        await page.goto(app+'/no-such-page');await page.waitForSelector('.not-found-page h1');
      });
      await step('widget library',async()=>{
        await page.goto(app+'/widgets');await page.waitForFunction(()=>document.querySelectorAll('.wg-card').length===115);
        assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.wg-demo [role=alert]')].filter(node=>/could not be shown/.test(node.textContent)).length),0);
        await page.evaluate(()=>document.querySelectorAll('.wg-readout .wg-btn').forEach(button=>button.click()));
        assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.wg-svg *')].filter(node=>[...node.attributes].some(a=>/NaN|undefined|Infinity/.test(a.value))).length),0);
        await page.click('#pop-up-modal .wg-demo .wg-btn');await page.waitForFunction(()=>document.querySelector('#pop-up-modal dialog').open);
        await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#pop-up-modal dialog').open);
        await page.click('#toast-message .wg-demo .wg-btn');await page.waitForSelector('.wg-toast');
        for(const width of [390,1440]){await page.setViewportSize({width,height:900});assert.equal(await overflow(page),false,`Widget library overflows at ${width}px`);}
      });
      await step('admin sign-in, overview and fixed tools',async()=>{
        await page.goto(app+'/admin');await page.waitForSelector('.login-card');
        await page.fill('.login-card input[type=email]','admin@example.test');await page.fill('.login-card input[type=password]','test-password');await page.click('.login-card form button');
        await page.waitForFunction(()=>document.querySelectorAll('.overview-stat').length===4);
        const spot=()=>page.evaluate(()=>{const box=document.querySelector('.admin-tools').getBoundingClientRect();return [Math.round(box.top),Math.round(window.innerWidth-box.right)].join();});
        const onOverview=await spot();
        await page.click('.rail-item:has-text("Services & pricing")');await page.waitForSelector('.entity-row');
        assert.equal(await spot(),onOverview,'Tools moved between pages');
        for(const width of [390,1440]){await page.setViewportSize({width,height:900});assert.equal(await overflow(page),false,`Admin overflows at ${width}px`);}
      });
      await step('admin unsaved-change prompt, recently deleted and sign-in security',async()=>{
        await page.click('.entity-toolbar-actions .button-dark');await page.fill('#dialog-name','Half-typed service');
        await page.keyboard.press('Escape');await page.waitForSelector('.entity-dialog .inline-confirm');
        await page.click('.entity-dialog .dialog-discard');await page.waitForSelector('.entity-dialog',{state:'detached'});
        await page.click('.rail-item:has-text("Recently deleted")');await page.waitForSelector('.trash-page .empty-state');
        await page.click('.rail-item:has-text("Sign-in security")');await page.waitForFunction(()=>document.querySelector('.second-step-status h2')?.textContent==='The second step is off');
      });
      assert.deepEqual(problems,[],'No script or console errors');
      results[name]={passed:true,version:browser.version(),checks:done};
    }catch(error){
      results[name]={passed:false,version:browser.version(),completed:done,failed:String(error.message).split('\n')[0],problems};
    }finally{await browser.close();}
  }
}finally{await servers.close();}
console.log(JSON.stringify(results,null,2));
if(Object.values(results).some(result=>!result.passed))process.exit(1);
