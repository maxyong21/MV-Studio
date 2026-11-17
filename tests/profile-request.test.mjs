import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,client} from './helpers/database.mjs';
import {createProfileHandler} from '../supabase/functions/_shared/profile-handler.mjs';
import {validateProfileRequest,normalizeProfileRequest,profileRequestSummary,emptyProfileRequest,PROFILE_LIMITS} from '../supabase/functions/_shared/profile-request.mjs';

const origin='https://mv-aistudio.vercel.app';
const valid=()=>({contact_name:'Aisyah Rahman',contact_phone:'012-345 6789',business_name:'Pusat Tuisyen Cemerlang',business_category:'Tuition centre',location_type:'address',address:'12, Jalan Bakawali 3, 83000 Batu Pahat, Johor',service_areas:'',business_phone:'07-431 2345',opening_hours:'Mon–Fri 2pm–9pm\nSat 9am–1pm',owner_email:'Owner@Example.com',description:'',services:'',website_url:'example.com.my',social_links:'',notes:'',authorised:true});
const environment=overrides=>name=>({ALLOWED_ORIGIN:origin,TURNSTILE_REQUIRED:'false',SUPABASE_SERVICE_ROLE_KEY:'fixture',ENQUIRY_TO_EMAIL:'owner@example.test',...overrides})[name];
const post=(body,headers={})=>new Request('https://functions.example/submit-profile-request',{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'203.0.113.9',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
const quiet=async run=>{const original=console.error;console.error=()=>{};try{return await run();}finally{console.error=original;}};

test('the form rules accept a complete answer and explain each missing or invalid one',()=>{
  assert.deepEqual(validateProfileRequest(valid()),{});
  const empty=validateProfileRequest(emptyProfileRequest());
  for(const key of ['contact_name','contact_phone','business_name','business_category','address','business_phone','opening_hours','owner_email','authorised'])assert.ok(empty[key],`${key} should be required`);
  for(const key of ['description','services','website_url','social_links','notes','service_areas'])assert.equal(empty[key],undefined,`${key} should be optional`);
  assert.ok(validateProfileRequest({...valid(),location_type:'service_area'}).service_areas,'A service-area business must list its areas');
  assert.equal(validateProfileRequest({...valid(),location_type:'service_area',address:'',service_areas:'Batu Pahat, Muar'}).address,undefined);
  assert.ok(validateProfileRequest({...valid(),location_type:'elsewhere'}).location_type);
  assert.ok(validateProfileRequest({...valid(),contact_phone:'call me'}).contact_phone);
  assert.ok(validateProfileRequest({...valid(),business_phone:'123'}).business_phone);
  assert.ok(validateProfileRequest({...valid(),owner_email:'not-an-email'}).owner_email);
  assert.ok(validateProfileRequest({...valid(),website_url:'javascript:alert(1)'}).website_url);
  assert.ok(validateProfileRequest({...valid(),address:'Too short'}).address);
  assert.ok(validateProfileRequest({...valid(),description:'x'.repeat(PROFILE_LIMITS.description+1)}).description);
  assert.ok(validateProfileRequest({...valid(),business_name:['array']}).business_name);
  assert.ok(validateProfileRequest({...valid(),authorised:'yes'}).authorised,'Consent must be an explicit tick');
  for(const bad of [null,[],'text',42])assert.ok(validateProfileRequest(bad).form);
});

test('saved values are trimmed, tidy and carry only the answer for the chosen location type',()=>{
  const record=normalizeProfileRequest({...valid(),contact_name:'  Aisyah Rahman \u0007',service_areas:'left over'});
  assert.equal(record.contact_name,'Aisyah Rahman');assert.equal(record.owner_email,'owner@example.com');
  assert.equal(record.website_url,'https://example.com.my');assert.equal(record.service_areas,'');
  assert.equal(record.authorised,undefined,'The consent tick is checked, not stored');
  const area=normalizeProfileRequest({...valid(),location_type:'service_area',service_areas:'Batu Pahat'});
  assert.equal(area.address,'');assert.equal(area.service_areas,'Batu Pahat');
  assert.equal(normalizeProfileRequest({...valid(),website_url:'http://example.com'}).website_url,'http://example.com');
  const summary=profileRequestSummary(record);
  assert.match(summary,/Business name: Pusat Tuisyen Cemerlang/);assert.match(summary,/Address: 12, Jalan Bakawali/);assert.match(summary,/Opening hours:\nMon–Fri/);
  assert.doesNotMatch(summary,/undefined|null|Areas served|Description/);
  assert.equal(profileRequestSummary(),'');
});

test('a submission is saved once, emailed to the studio, and readable by administrators only',async()=>{
  const db=await database(),mails=[];
  try{
    const handler=createProfileHandler({env:environment(),createAdmin:()=>client(db),sendMail:async message=>{mails.push(message);return {messageId:'<1@test>'};}});
    const body={...valid(),request_id:crypto.randomUUID()};
    const first=await handler(post(body)),result=await first.json();
    assert.equal(first.status,200);assert.equal(result.ok,true);assert.equal(result.saved,true);assert.equal(result.notification,'sent');
    const {rows}=await db.query('select * from public.profile_requests');
    assert.equal(rows.length,1);assert.equal(rows[0].id,result.id);assert.equal(rows[0].status,'new');assert.equal(rows[0].notification_status,'sent');
    assert.equal(rows[0].owner_email,'owner@example.com');assert.equal(rows[0].website_url,'https://example.com.my');
    assert.equal(mails.length,1);assert.match(mails[0].subject,/Pusat Tuisyen Cemerlang/);assert.equal(mails[0].replyTo,'owner@example.com');assert.match(mails[0].text,/Jalan Bakawali/);
    // The same submission sent again (a retry after a slow connection) must not save or email twice.
    const again=await (await handler(post(body))).json();
    assert.equal(again.duplicate,true);assert.equal(again.id,result.id);
    assert.equal((await db.query('select count(*)::int as n from public.profile_requests')).rows[0].n,1);assert.equal(mails.length,1);
    const changed=await handler(post({...body,business_name:'A different business'}));
    assert.equal(changed.status,409);
    // Visitors and ordinary signed-in users can neither read nor write the table.
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.profile_requests'),error=>error.code==='42501');
    await assert.rejects(db.query("update public.profile_requests set status='done'"),error=>error.code==='42501');
    await db.exec('reset role; set role authenticated');
    assert.equal((await db.query('select count(*)::int as n from public.profile_requests')).rows[0].n,0);
    await assert.rejects(db.query("insert into public.profile_requests(request_id,request_hash,contact_name,contact_phone,business_name,business_category,location_type,address,business_phone,opening_hours,owner_email) values (gen_random_uuid(),repeat('a',64),'Name','0123456789','Biz','Shop','address','1 Long Street Name, Town','0123456789','9 to 5','a@b.co')"),error=>error.code==='42501');
    const adminId=crypto.randomUUID();
    await db.exec('reset role');await db.query('insert into auth.users(id) values ($1)',[adminId]);await db.query('insert into admin_users(user_id) values ($1)',[adminId]);
    await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[adminId]);
    assert.equal((await db.query('select count(*)::int as n from public.profile_requests')).rows[0].n,1);
    const updated=await db.query("update public.profile_requests set status='waiting_verification',admin_notes='Video sent' returning status,updated_at,created_at");
    assert.equal(updated.rows[0].status,'waiting_verification');assert.ok(updated.rows[0].updated_at>=updated.rows[0].created_at);
    await assert.rejects(db.query("update public.profile_requests set status='unknown'"),error=>error.code==='23514');
    assert.equal((await db.query('delete from public.profile_requests returning id')).rows.length,1);
  }finally{await db.close();}
});

test('invalid, oversized, automated and cross-site submissions are refused before anything is saved',async()=>{
  const db=await database(),mails=[];
  try{
    const handler=createProfileHandler({env:environment(),createAdmin:()=>client(db),sendMail:async message=>{mails.push(message);return {messageId:'<1@test>'};}});
    const invalid=await handler(post({...valid(),owner_email:'nope',authorised:false})),detail=await invalid.json();
    assert.equal(invalid.status,400);assert.ok(detail.errors.owner_email);assert.ok(detail.errors.authorised);
    assert.equal((await handler(post('{not json'))).status,400);
    assert.equal((await handler(post({...valid(),notes:'x'.repeat(40000)}))).status,400);
    assert.equal((await handler(post({...valid(),request_id:'not-a-uuid'}))).status,400);
    assert.equal((await handler(post(valid(),{origin:'https://evil.example'}))).status,403);
    assert.equal((await handler(new Request('https://functions.example/x',{method:'GET',headers:{origin}}))).status,405);
    assert.equal((await handler(new Request('https://functions.example/x',{method:'OPTIONS',headers:{origin}}))).status,204);
    const trapped=await handler(post({...valid(),fax:'spam'}));
    assert.equal(trapped.status,200,'A filled hidden field is answered politely and ignored');
    assert.equal((await db.query('select count(*)::int as n from public.profile_requests')).rows[0].n,0);assert.equal(mails.length,0);
    // Human verification is required when configured, and a missing token never reaches the database or the fallback email.
    const guarded=createProfileHandler({env:environment({TURNSTILE_REQUIRED:'true',TURNSTILE_SECRET_KEY:'secret'}),createAdmin:()=>{throw new Error('must not be reached');},sendMail:async message=>{mails.push(message);return {messageId:'<1@test>'};}});
    assert.equal((await guarded(post(valid()))).status,400);assert.equal(mails.length,0);
    // Five an hour per connection.
    for(let index=0;index<5;index++)assert.equal((await handler(post({...valid(),business_name:`Business ${index}`}))).status,200);
    const limited=await handler(post({...valid(),business_name:'One too many'}));
    assert.equal(limited.status,429);
    assert.equal((await db.query('select count(*)::int as n from public.profile_requests')).rows[0].n,5);
    assert.equal((await handler(post({...valid(),business_name:'Another visitor'},{'cf-connecting-ip':'198.51.100.7'}))).status,200);
  }finally{await db.close();}
});

test('fallbacks: a failed email still saves, and a failed database emails the details instead',async()=>{
  const db=await database();
  try{
    await quiet(async()=>{
      // 1. Email fails: the request is saved and marked, and the customer still sees success.
      const noMail=createProfileHandler({env:environment(),createAdmin:()=>client(db),sendMail:async()=>{throw Object.assign(new Error('SMTP down'),{code:'ECONNECTION'});}});
      const saved=await noMail(post(valid())),result=await saved.json();
      assert.equal(saved.status,200);assert.equal(result.saved,true);assert.equal(result.notification,'failed');
      assert.equal((await db.query('select notification_status from public.profile_requests where id=$1',[result.id])).rows[0].notification_status,'failed');
      // 2. Database fails: the details are emailed, and the reply says they were not saved.
      const mails=[];let clock=1000;
      const broken={rpc:async()=>({data:null,error:{code:'PGRST000',message:'connection refused'}}),from(){throw new Error('unreachable');}};
      const noDb=createProfileHandler({env:environment(),createAdmin:()=>broken,sendMail:async message=>{mails.push(message);return {messageId:'<2@test>'};},now:()=>clock});
      const emailed=await noDb(post(valid())),fallback=await emailed.json();
      assert.equal(emailed.status,202);assert.equal(fallback.ok,true);assert.equal(fallback.saved,false);
      assert.match(mails[0].subject,/^NOT SAVED/);assert.match(mails[0].text,/does NOT appear in the admin/);assert.match(mails[0].text,/Pusat Tuisyen Cemerlang/);
      // The fallback email is capped, so a database outage cannot be used to flood the inbox.
      for(let index=0;index<4;index++)assert.equal((await noDb(post(valid()))).status,202);
      assert.equal((await noDb(post(valid()))).status,503);assert.equal(mails.length,5);
      clock+=3600001;assert.equal((await noDb(post(valid()))).status,202,'The cap resets after an hour');
      // A crash while creating the database client is handled the same way.
      const crash=createProfileHandler({env:environment(),createAdmin:()=>{throw new Error('no client');},sendMail:async message=>{mails.push(message);return {messageId:'<3@test>'};}});
      assert.equal((await crash(post(valid()))).status,202);
      // 3. Neither works: a clear error, so the form keeps the answers and offers WhatsApp.
      const nothing=createProfileHandler({env:environment(),createAdmin:()=>broken,sendMail:async()=>{throw new Error('SMTP down');}});
      const failed=await nothing(post(valid())),message=await failed.json();
      assert.equal(failed.status,503);assert.match(message.error,/WhatsApp/);assert.equal(message.ok,undefined);
      const unconfigured=createProfileHandler({env:environment({ENQUIRY_TO_EMAIL:''}),createAdmin:()=>broken,sendMail:async()=>({messageId:'<4@test>'})});
      assert.equal((await unconfigured(post(valid()))).status,503);
    });
  }finally{await db.close();}
});

test('the database update is repeatable and the form is routed but kept out of search',async()=>{
  const db=await database();
  try{
    const sql=await readFile('supabase/migrations/20261116_profile_requests.sql','utf8');
    await db.query("insert into public.profile_requests(request_id,request_hash,contact_name,contact_phone,business_name,business_category,location_type,address,business_phone,opening_hours,owner_email) values (gen_random_uuid(),repeat('a',64),'Name','0123456789','Kept business','Shop','address','1 Long Street Name, Town','0123456789','9 to 5','a@b.co')");
    await db.exec(sql);await db.exec(sql);
    assert.equal((await db.query('select business_name from public.profile_requests')).rows[0].business_name,'Kept business');
    await assert.rejects(db.query("insert into public.profile_requests(request_id,request_hash,contact_name,contact_phone,business_name,business_category,location_type,address,business_phone,opening_hours,owner_email) values (gen_random_uuid(),repeat('a',64),'Name','0123456789','No address','Shop','address','','0123456789','9 to 5','a@b.co')"),error=>error.code==='23514');
  }finally{await db.close();}
  const config=JSON.parse(await readFile('vercel.json','utf8'));
  assert.ok(config.routes.some(route=>route.src==='/business-profile-form/?'&&route.dest==='/business-profile-form/index.html'));
  assert.ok(config.routes.some(item=>item.src==='/business-profile-form(.*)'&&item.continue===true&&/noindex/.test(item.headers?.['X-Robots-Tag'])));
  const {sitemapPaths,sitemapXml}=await import('../src/lib/sitemap.mjs');
  assert.deepEqual(sitemapPaths('/business-profile-form').errors,['/business-profile-form']);
  assert.doesNotMatch(sitemapXml(origin,[],''),/business-profile-form/);
  assert.match(await readFile('supabase/config.toml','utf8'),/\[functions\.submit-profile-request\]\r?\n[^\[]*verify_jwt = false/);
});
