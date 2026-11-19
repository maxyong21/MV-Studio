// Browser check for quotations, end to end against a local copy of the database.
// Run with: npm run test:quotations. Screenshots and a sample PDF are saved in .generated/quotation-check.
// Covers: signature upload, writing a quotation, the share link, every state of the client page
// (shown, expired, withdrawn, connection problem), phone to wide-screen layouts, light and dark,
// the printed A4 form, and an automated accessibility scan. See docs/QUOTATIONS.md.
import {existsSync,readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'vite';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {browserServers} from '../tests/helpers/browser-server.mjs';

const executable=process.env.BROWSER_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
if(!executable)throw new Error('Set BROWSER_PATH to a Chrome or Edge executable.');
const axeSource=readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'),'utf8');
const out='.generated/quotation-check',site='http://127.0.0.1:4188',WIDTHS=[320,375,768,1024,1440,1920];
process.env.VITE_SUPABASE_URL=site;process.env.VITE_SUPABASE_ANON_KEY='local-browser-fixture';process.env.VITE_SITE_URL=site;process.env.VITE_TURNSTILE_REQUIRED='false';
await mkdir(out,{recursive:true});
if(!process.env.QUOTATION_SKIP_BUILD)await build({mode:'test',build:{outDir:'.generated/browser-site'},logLevel:'error'});
const servers=await browserServers(),browser=await chromium.launch({executablePath:executable});
await servers.db.query("update site_content set content=content||jsonb_build_object('contact_emails',jsonb_build_array('hello@mvstudio.example'))");
const problems=[];
const watch=page=>{page.on('pageerror',error=>problems.push(`page error: ${error.message}`));page.on('console',message=>{if(message.type()==='error'&&!/Failed to load resource/.test(message.text()))problems.push(`console: ${message.text()}`);});};
const noSideways=async(page,label)=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${label}: no sideways scrolling`);
// The admin scans look only at the quotation screens; the shared admin frame around them has its own check.
const scan=async(page,label,within='body')=>{
  await page.addScriptTag({content:axeSource});
  const result=await page.evaluate(selector=>axe.run(document.querySelector(selector),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},resultTypes:['violations']}),within);
  const serious=result.violations.filter(item=>['serious','critical'].includes(item.impact));
  assert.deepEqual(serious.map(item=>`${item.id}: ${item.nodes.map(node=>node.target.join(' ')).slice(0,3).join(' | ')}`),[],`${label}: accessibility`);
};
try{
  // ---- Admin: sign in, add a signature, write a quotation, share it.
  const admin=await browser.newContext({viewport:{width:1440,height:900},colorScheme:'light',reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
  const page=await admin.newPage();watch(page);page.setDefaultTimeout(15000);
  await page.goto(`${site}/admin`);
  await page.fill('.login-card input[type=email]','admin@example.test');await page.fill('.login-card input[type=password]','test-password');await page.click('.login-card form button');
  await page.click('.rail-item:has-text("Quotations")');
  await page.waitForSelector('.quotations .empty-state');
  assert.match(await page.textContent('.qt-tip'),/Add a signature first/);
  await page.screenshot({path:`${out}/admin-empty.png`});

  await page.click('button:has-text("Signatures")');
  // Typed: the name is written in the signature font and saved as a picture. The font comes from this site only.
  const fontRequests=[];page.on('request',request=>{if(/\.woff2/.test(request.url()))fontRequests.push(request.url());});
  await page.fill('#qt-sign-name','Vincent Teo');await page.fill('#qt-sign-role','Co-founder, MV Studio');
  assert.equal(await page.inputValue('#qt-sign-text'),'Vincent Teo','The signature text follows the name');
  await page.waitForSelector('.qt-sign-preview img');
  assert.ok(await page.evaluate(()=>document.fonts.check('700 40px "MV Signature"')),'The signature font is loaded');
  assert.ok(fontRequests.some(url=>url.endsWith('/fonts/dancing-script-latin-700-normal.woff2'))&&fontRequests.every(url=>url.startsWith(site)),'The signature font is served by this site');
  // The drawn picture really contains ink, and none of it is cut off at the edges.
  const ink=await page.evaluate(async()=>{const image=document.querySelector('.qt-sign-preview img');await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const context=canvas.getContext('2d');context.drawImage(image,0,0);const {data,width,height}=context.getImageData(0,0,canvas.width,canvas.height);let filled=0,edge=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>40){filled++;if(x<2||y<2||x>width-3||y>height-3)edge++;}return {width,height,share:filled/(width*height),edge};});
  assert.ok(ink.share>.03&&ink.share<.5,'The typed signature is drawn: '+JSON.stringify(ink));assert.equal(ink.edge,0,'No letter is cut off at the edge');assert.ok(ink.width<=640);
  await page.locator('.qt-sign-preview img').screenshot({path:`${out}/signature-typed.png`});
  // Initials or a shorter form can be typed instead of the full name.
  await page.fill('#qt-sign-text','V. Teo');await page.waitForTimeout(500);await page.locator('.qt-sign-preview img').screenshot({path:`${out}/signature-initials.png`});
  await page.fill('#qt-sign-text','Vincent Teo');
  await page.click('button:has-text("Save signature")');
  await page.waitForSelector('.qt-signatures li');
  const stored=(await servers.db.query('select name,length(image) as size,left(image,22) as start from quotation_signatures')).rows[0];
  assert.equal(stored.name,'Vincent Teo');assert.equal(stored.start,'data:image/png;base64,');assert.ok(stored.size>2000&&stored.size<300000,'The typed signature is saved as a small picture');
  // Uploaded: a wrong file type is refused with a message, and a photo is shrunk before saving.
  await page.fill('#qt-sign-name','Max Yong');await page.check('#qt-sign-mode-upload');
  await page.setInputFiles('#qt-sign-file',{name:'notes.gif',mimeType:'image/gif',buffer:Buffer.from('GIF89a')});
  await page.waitForSelector('text=Choose a PNG or JPG picture of the signature.');
  await page.click('button:has-text("Save signature")');await page.waitForSelector('text=Choose a picture of the signature.');
  const signature=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="300"><path d="M40 210c80-190 120-190 150-60s70 90 110-20 90-40 110 30 60 40 120-30 90-60 150 20 110 30 180-40" fill="none" stroke="#1b2a4a" stroke-width="9" stroke-linecap="round"/></svg>')).png().toBuffer();
  await page.setInputFiles('#qt-sign-file',{name:'signature.png',mimeType:'image/png',buffer:signature});
  await page.waitForSelector('.qt-sign-preview img');
  await page.click('button:has-text("Save signature")');
  await page.waitForFunction(()=>document.querySelectorAll('.qt-signatures li').length===2);
  assert.equal((await servers.db.query("select count(*)::int as n from quotation_signatures where length(image)<300000 and image like 'data:image/png;base64,%'")).rows[0].n,2);
  await noSideways(page,'signatures 1440');await scan(page,'signatures','.quotations');
  await page.screenshot({path:`${out}/admin-signatures.png`});
  await page.click('button:has-text("Back to quotations")');

  await page.click('.entity-toolbar button:has-text("New quotation")');
  await page.waitForSelector('#qt-client_name');
  // Saving an empty form explains what is missing and saves nothing.
  await page.click('button:has-text("Save draft")');
  await page.waitForSelector('text=Enter the client’s name.');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'qt-client_name','Focus moves to the first problem');
  assert.equal((await servers.db.query('select count(*)::int as n from quotations')).rows[0].n,0);
  await page.fill('#qt-client_name','Aisyah Rahman');await page.fill('#qt-company_name','Kedai Bunga Aisyah');
  await page.fill('#qt-client_email','aisyah@example.test');await page.fill('#qt-client_phone','+60 12-345 6789');
  // Prices start from the database price list and can then be changed.
  const options=await page.$$eval('#qt-pick option',nodes=>nodes.map(node=>[node.value,node.textContent]));
  const pickOf=text=>options.find(([,label])=>label.startsWith(text))?.[0];
  assert.ok(pickOf('Company Website')&&pickOf('Hosting')&&pickOf('Website maintenance')&&pickOf('Domain registration'),'Packages, hosting, domain and maintenance are offered');
  for(const name of ['Company Website','Hosting','Domain registration','Website maintenance']){await page.selectOption('#qt-pick',pickOf(name));await page.click('button:has-text("Add to quotation")');}
  assert.equal(await page.inputValue('#qt-item-0-min'),'989');assert.equal(await page.inputValue('#qt-item-1-min'),'30');assert.equal(await page.inputValue('#qt-item-2-min'),'','A feature with no database price must be typed');
  await page.fill('#qt-item-0-min','1200');await page.fill('#qt-item-0-max','1500');
  await page.fill('#qt-item-2-min','45');await page.fill('#qt-item-2-max','90');await page.selectOption('#qt-item-2-billing','yearly');
  await page.fill('#qt-extra_requirements','Bilingual pages (English and Bahasa Malaysia).\nLaunch before Chinese New Year.');
  await page.selectOption('#qt-signature_id',{label:'Vincent Teo · Co-founder, MV Studio'});
  assert.match(await page.textContent('.qt-totals'),/RM 1,200 to RM 1,500/);assert.match(await page.textContent('.qt-totals'),/RM 600 to RM 750/);
  await noSideways(page,'admin editor 1440');await page.screenshot({path:`${out}/admin-editor.png`,fullPage:true});
  await scan(page,'admin editor','.quotations');
  for(const width of [320,768]){await page.setViewportSize({width,height:800});await noSideways(page,`admin editor ${width}`);}
  await page.screenshot({path:`${out}/admin-editor-768.png`,fullPage:true});
  await page.setViewportSize({width:1440,height:900});
  // Leaving with unsaved work asks first.
  await page.click('.rail-item:has-text("Enquiries")');await page.waitForSelector('.admin-workspace > .inline-confirm:has-text("your quotation")');
  await page.click('button:has-text("Stay and keep editing")');
  await page.click('button:has-text("Save draft")');
  await page.waitForSelector('.qt-card');
  const row=(await servers.db.query('select * from quotations')).rows[0];
  assert.match(row.quote_number,/^MVQ-\d{8}-001$/);assert.equal(row.status,'draft');assert.equal(row.share_token,null);
  assert.equal(row.items.length,4);assert.deepEqual([row.items[0].min,row.items[0].max],[1200,1500]);assert.equal(row.items[1].paid_to,'third_party');
  assert.equal(row.terms.length,16);assert.equal(row.signer.name,'Vincent Teo');assert.deepEqual(row.studio.emails,['hello@mvstudio.example'],'Studio contact details are copied onto the quotation');assert.ok(row.studio.phones.length>=1);
  assert.match(await page.textContent('.qt-chip'),/Draft/);

  // A draft can be previewed by the administrator, and by nobody else.
  const preview=await admin.newPage();watch(preview);await preview.goto(`${site}/quotation?preview=${row.id}`);
  await preview.waitForSelector('.qd-sheet');assert.match(await preview.textContent('.qd-preview-note'),/client cannot see this yet/);await preview.close();

  await page.click('button:has-text("Create share link")');
  await page.waitForSelector('.qt-link input');
  const link=await page.inputValue('.qt-link input');
  assert.match(link,/^http:\/\/127\.0\.0\.1:4188\/quotation#[A-Za-z0-9_-]{43}$/);
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),link,'The new link is copied');
  assert.match(await page.textContent('.qt-chip'),/Shared/);assert.equal(await page.locator('.qt-card button:has-text("Edit")').count(),0,'A shared quotation is locked');
  assert.match(await page.getAttribute('.qt-link a','href'),/wa\.me\/60123456789\?text=.*quotation/);
  await noSideways(page,'admin list 1440');await page.screenshot({path:`${out}/admin-list.png`,fullPage:true});await scan(page,'admin list','.quotations');
  await page.setViewportSize({width:320,height:800});await noSideways(page,'admin list 320');await page.screenshot({path:`${out}/admin-list-320.png`,fullPage:true});
  await page.setViewportSize({width:1440,height:900});

  // ---- Client: a visitor with only the link.
  const today=(await servers.db.query("select (now() at time zone 'Asia/Kuala_Lumpur')::date::text as d")).rows[0].d;
  for(const scheme of ['light','dark']){
    const visitor=await browser.newContext({viewport:{width:1440,height:900},colorScheme:scheme,reducedMotion:'reduce'});
    const client=await visitor.newPage();watch(client);const sent=[];client.on('request',request=>sent.push(request.url()));
    await client.goto(link);await client.waitForSelector('.qd-sheet');
    const text=await client.textContent('.qd-sheet');
    for(const expected of [row.quote_number,'Aisyah Rahman','Kedai Bunga Aisyah','aisyah@example.test','+60 12-345 6789','RM 1,200 to RM 1,500','RM 30 / month','RM 45 to RM 90 / year','Third-party provider','Deposit to confirm the project','RM 600 to RM 750','Bilingual pages','16. Your responsibilities as the client','up to 2 rounds of design revisions','Personal Data Protection Act 2010','Vincent Teo','Co-founder, MV Studio'])assert.ok(text.includes(expected),`client page shows: ${expected}`);
    assert.equal(await client.locator('.qd-term').count(),16);
    assert.ok(await client.evaluate(()=>{const image=document.querySelector('.qd-signature img');return image.complete&&image.naturalWidth>0;}),'The signature picture is drawn');
    assert.equal(await client.title(),`Quotation ${row.quote_number} | MV Studio`);
    assert.equal(await client.getAttribute('meta[name="robots"]','content'),'noindex,nofollow');
    // The secret never leaves the browser in an address, and no analytics run here.
    const secret=link.split('#')[1];
    assert.ok(sent.every(url=>!url.includes(secret)),'The link secret is not in any requested address');
    assert.ok(sent.every(url=>!/google-analytics|googletagmanager/.test(url)),'No analytics on a quotation');
    for(const width of WIDTHS){
      await client.setViewportSize({width,height:width<769?780:900});await noSideways(client,`client ${scheme} ${width}`);
      assert.ok(await client.evaluate(()=>[...document.querySelectorAll('.qd-bar button, .qd-bar a')].every(node=>{const box=node.getBoundingClientRect();return box.height>=44&&box.right<=window.innerWidth;})),`client ${scheme} ${width}: toolbar fits and is easy to tap`);
      if([320,768,1440].includes(width))await client.screenshot({path:`${out}/client-${scheme}-${width}.png`,fullPage:true});
    }
    await scan(client,`client page ${scheme}`);
    if(scheme==='dark'){
      // Paper is always light, whatever the screen theme.
      await client.emulateMedia({media:'print'});
      // With reduced motion the site shortens every transition to a fraction of a millisecond; let it finish before reading colours.
      await client.waitForTimeout(150);
      assert.equal(await client.evaluate(()=>getComputedStyle(document.querySelector('.qd-sheet')).backgroundColor),'rgb(255, 255, 255)');
      assert.equal(await client.evaluate(()=>getComputedStyle(document.querySelector('.qd-bar')).display),'none');
      assert.equal(await client.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'light','Paper margins are not painted dark');
      await writeFile(`${out}/quotation.pdf`,await client.pdf({format:'A4',printBackground:true,preferCSSPageSize:true}));
      await client.emulateMedia({media:'screen'});
    }
    await visitor.close();
  }

  const visitor=await browser.newContext({viewport:{width:375,height:780},reducedMotion:'reduce'});
  const client=await visitor.newPage();watch(client);
  // Still shown on the last valid day; an expired notice with no prices from the next day.
  await servers.db.query('update quotations set issued_on=$1::date-7,valid_until=$1::date',[today]);
  await client.goto(link);await client.waitForSelector('.qd-sheet');
  await servers.db.query('update quotations set issued_on=$1::date-8,valid_until=$1::date-1',[today]);
  await client.reload();await client.waitForSelector('.qd-notice');
  const expired=await client.textContent('.qd-main');
  assert.match(expired,/This quotation has expired/);assert.ok(expired.includes(row.quote_number));
  assert.ok(!/RM \d|Aisyah|responsibilities/.test(expired),'An expired link shows no prices, client details or terms');
  await noSideways(client,'expired 375');await client.screenshot({path:`${out}/client-expired-375.png`});await scan(client,'expired notice');
  // The admin sees it as expired and can reopen it for 7 days.
  await page.reload();await page.click('.rail-item:has-text("Quotations")');await page.waitForSelector('.qt-chip.chip-expired');
  await page.click('button:has-text("Reopen for 7 days")');await page.waitForSelector('.qt-chip.chip-shared');
  await client.reload();await client.waitForSelector('.qd-sheet');
  // A connection problem says so and offers a retry; it does not claim the link is wrong.
  await client.route('**/rest/v1/rpc/shared_quotation',route=>route.abort());
  await client.reload();await client.waitForSelector('text=The quotation could not be loaded');
  await client.screenshot({path:`${out}/client-failed-375.png`});
  await client.unroute('**/rest/v1/rpc/shared_quotation');await client.click('button:has-text("Try again")');await client.waitForSelector('.qd-sheet');
  // Accepted stays readable; a revoked link, a wrong link and a missing secret show nothing.
  await page.selectOption('.qt-outcome select','accepted');await page.waitForSelector('.qt-chip.chip-accepted');
  await client.reload();await client.waitForSelector('.qd-sheet');
  await page.click('button:has-text("Revoke link")');await page.waitForSelector('.qt-chip.chip-revoked');
  await client.reload();await client.waitForSelector('text=This quotation link is not available');
  await client.screenshot({path:`${out}/client-unavailable-375.png`});
  for(const address of [`${site}/quotation#${'x'.repeat(43)}`,`${site}/quotation`,`${site}/quotation#short`]){await client.goto(`${site}/`);await client.goto(address);await client.waitForSelector('text=This quotation link is not available');}
  // Someone who is not signed in cannot use the preview address.
  await client.goto(`${site}/quotation?preview=${row.id}`);await client.waitForSelector('text=Sign in to preview');
  assert.equal(await (await fetch(`${site}/rest/v1/quotations?select=*`,{headers:{apikey:'local-browser-fixture'}})).status,403);
  await visitor.close();

  // Revoked means editable again, then it can be duplicated and deleted.
  await page.click('.qt-card button:has-text("Edit")');await page.waitForSelector('#qt-client_name');
  assert.equal(await page.inputValue('#qt-client_name'),'Aisyah Rahman');assert.equal(await page.inputValue('#qt-item-0-max'),'1500');
  await page.click('button:has-text("Back to quotations")');await page.waitForSelector('.qt-card');
  await page.click('.qt-card button:has-text("Duplicate")');await page.waitForSelector('#qt-client_name');await page.click('button:has-text("Save draft")');
  await page.waitForFunction(()=>document.querySelectorAll('.qt-card').length===2);
  assert.deepEqual((await servers.db.query('select quote_number from quotations order by quote_number')).rows.map(item=>item.quote_number.slice(-3)),['001','002']);
  await page.click('.qt-card >> nth=0 >> button:has-text("Delete")');await page.click('button:has-text("Delete for good")');
  await page.waitForFunction(()=>document.querySelectorAll('.qt-card').length===1);
  assert.deepEqual(problems,[],'No script errors in the browser');
  console.log(`Quotation browser check passed. Evidence: ${out}`);
}finally{await browser.close();await servers.close();}
