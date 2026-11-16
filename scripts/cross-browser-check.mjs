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
      await step('business details form: validation, kept answers, failed-save fallback and success',async()=>{
        await page.goto(site+'/services/google-business-profile');await page.click('.service-form-link a');await page.waitForSelector('.pf-form');
        assert.equal(await page.evaluate(()=>document.querySelector('meta[name=robots]').content),'noindex,follow');
        await page.click('.pf-form button[type=submit]');await page.waitForSelector('.pf-summary');
        assert.match(await page.textContent('.pf-summary'),/9/);
        assert.equal(await page.evaluate(()=>document.activeElement.id),'profile-contact_name','The first unanswered field takes focus');
        const answers={contact_name:'Aisyah Rahman',contact_phone:'012-345 6789',business_name:'Pusat Tuisyen Cemerlang '+name,business_category:'Tuition centre',address:'12, Jalan Bakawali 3, 83000 Batu Pahat, Johor',business_phone:'07-431 2345',owner_email:'owner@example.com',opening_hours:'Mon to Fri 2pm to 9pm',website_url:'example.com.my'};
        for(const [key,value] of Object.entries(answers))await page.fill('#profile-'+key,value);
        await page.fill('#profile-owner_email','not-an-email');await page.locator('#profile-owner_email').blur();
        await page.waitForSelector('#profile-owner_email-error');await page.fill('#profile-owner_email',answers.owner_email);
        await page.waitForSelector('#profile-owner_email-error',{state:'detached'});
        for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:800});assert.equal(await overflow(page),false,'Business details form overflows at '+width+'px');}
        await page.setViewportSize({width:1440,height:900});
        // A refresh must not cost the customer their typing.
        await page.reload();await page.waitForSelector('.pf-notice');
        assert.equal(await page.inputValue('#profile-business_name'),answers.business_name);
        await page.check('#profile-authorised');
        // The server cannot save: the answers stay, and the customer is told what to do.
        const before=problems.length,cors={'access-control-allow-origin':site,'access-control-allow-headers':'authorization, apikey, content-type, x-client-info','access-control-allow-methods':'POST, OPTIONS'};
        await page.route('**/functions/v1/submit-profile-request',route=>route.request().method()==='OPTIONS'?route.fulfill({status:204,headers:cors}):route.fulfill({status:503,headers:cors,contentType:'application/json',body:'{"error":"down"}'}));
        await page.click('.pf-form button[type=submit]');await page.waitForSelector('.pf-problem');
        assert.equal(await page.inputValue('#profile-business_name'),answers.business_name,'Answers were lost after a failed save');
        assert.equal((await servers.db.query('select count(*)::int as n from public.profile_requests where business_name=$1',[answers.business_name])).rows[0].n,0);
        await page.unroute('**/functions/v1/submit-profile-request');await page.waitForTimeout(300);problems.length=before;
        await page.click('.pf-form button[type=submit]');await page.waitForSelector('.pf-done h1');
        const saved=(await servers.db.query('select * from public.profile_requests where business_name=$1',[answers.business_name])).rows;
        assert.equal(saved.length,1);assert.equal(saved[0].status,'new');assert.equal(saved[0].website_url,'https://example.com.my');assert.equal(saved[0].address,answers.address);
        assert.ok((await page.textContent('.pf-reference')).includes(saved[0].id));
        assert.equal(await page.evaluate(()=>localStorage.getItem('mv-profile-form-draft')),null,'The kept answers were not cleared after sending');
        assert.equal(await overflow(page),false);
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
      await step('profile setups in the admin: read, change status, save notes and delete',async()=>{
        await page.click('.rail-item:has-text("Profile setups")');await page.waitForSelector('.profile-card');
        assert.ok(await page.evaluate(()=>!!document.querySelector('.rail-item[aria-current=page] .rail-badge')),'New requests are counted in the menu');
        await page.click('.profile-card-head');await page.waitForSelector('.profile-card-body');
        assert.match(await page.textContent('.profile-details'),/Jalan Bakawali/);
        await page.selectOption('.profile-manage select','waiting_verification');
        await page.waitForFunction(()=>document.querySelector('.profile-chip')?.textContent==='Waiting for Google verification');
        await page.fill('.profile-notes textarea','Video sent '+name);await page.waitForSelector('.profile-manage-actions .unsaved-flag');
        await page.click('.profile-manage-actions .button-dark');await page.waitForSelector('.profile-manage-actions .unsaved-flag',{state:'detached'});
        const tracked=(await servers.db.query('select status from public.profile_requests where admin_notes=$1',['Video sent '+name])).rows;
        assert.equal(tracked.length,1);assert.equal(tracked[0].status,'waiting_verification');
        for(const width of [390,1440]){await page.setViewportSize({width,height:900});assert.equal(await overflow(page),false,'Profile setups overflow at '+width+'px');}
        await page.click('.profile-delete');await page.click('.profile-delete-confirm');
        await page.waitForFunction(()=>!document.querySelector('.profile-card'));
        assert.equal((await servers.db.query('select count(*)::int as n from public.profile_requests where admin_notes=$1',['Video sent '+name])).rows[0].n,0);
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
