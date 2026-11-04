import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database,client} from './helpers/database.mjs';
import {createSubmitHandler} from '../supabase/functions/_shared/submit-handler.mjs';
import {createRetryHandler} from '../supabase/functions/_shared/retry-handler.mjs';
import {estimateFeatures,validateContact} from '../supabase/functions/_shared/enquiry.mjs';
import {verifyTurnstile,originAllowed} from '../supabase/functions/_shared/http.mjs';
import {recoverStaleEmail} from '../src/admin/email-status.mjs';
import {createGmailSendMail} from '../supabase/functions/_shared/notify.mjs';

test('origin and Turnstile verification fail closed when enabled',async()=>{
  assert.equal(originAllowed(undefined,key=>({ALLOWED_ORIGIN:'https://mv-aistudio.vercel.app'})[key]),false);
  const request=new Request('https://functions.test/submit-enquiry',{method:'POST',headers:{Origin:'https://mv-aistudio.vercel.app'}});
  const env=key=>({TURNSTILE_SECRET_KEY:'server-secret',TURNSTILE_ALLOWED_HOSTNAMES:'mv-aistudio.vercel.app'}[key]);
  let verified=false;
  await verifyTurnstile(request,{turnstile_token:'valid-token'},env,async(url,options)=>{
    verified=true;assert.match(url,/siteverify$/);assert.equal(new URLSearchParams(options.body).get('secret'),'server-secret');
    return Response.json({success:true,action:'enquiry',hostname:'mv-aistudio.vercel.app'});
  });
  assert.equal(verified,true);
  await assert.rejects(verifyTurnstile(request,{turnstile_token:'invalid-token'},env,async()=>Response.json({success:false,action:'enquiry'})),error=>error.status===400);
  await assert.rejects(verifyTurnstile(request,{turnstile_token:'valid-token'},key=>({TURNSTILE_REQUIRED:'true'})[key]),error=>error.status===503);
  const pending={notification_status:'pending',updated_at:new Date(0).toISOString()};
  assert.equal(recoverStaleEmail({...pending,updated_at:new Date().toISOString()}).notification_status,'pending');
  assert.equal(recoverStaleEmail(pending).notification_status,'failed');
});

test('Gmail transport uses TLS 465 and keeps credentials out of message fields',async()=>{
  let transportOptions,delivered;
  const nodemailer={createTransport:options=>{transportOptions=options;return {sendMail:async message=>{delivered=message;return {messageId:'<fixture@gmail.test>'};},close(){}};}};
  const env=key=>({GMAIL_SMTP_USER:'studio@gmail.test',GMAIL_SMTP_APP_PASSWORD:'abcd efgh',GMAIL_FROM_NAME:'MV Studio'}[key]);
  const sender=createGmailSendMail(nodemailer,env);
  await sender({to:['owner@example.test'],subject:'Test',text:'Plain text',html:'<p>Styled</p>'});
  assert.equal(transportOptions.host,'smtp.gmail.com');assert.equal(transportOptions.port,465);assert.equal(transportOptions.secure,true);
  assert.equal(transportOptions.auth.user,'studio@gmail.test');assert.equal(transportOptions.auth.pass,'abcdefgh');
  assert.deepEqual(delivered.from,{name:'MV Studio',address:'studio@gmail.test'});assert.equal(delivered.html,'<p>Styled</p>');
});

test('enquiry validation, storage, email failures, idempotency, meetings and admin retries',async t=>{
  const db=await database();let mailCalls=0,behavior='success',ip=0;
  const adminId=crypto.randomUUID();
  await db.query('insert into auth.users(id) values($1)',[adminId]);await db.query('insert into admin_users(user_id) values($1)',[adminId]);
  const admin=client(db,adminId);
  const secrets={ALLOWED_ORIGIN:'https://mv-aistudio.vercel.app,http://localhost:5173',TURNSTILE_REQUIRED:'false',SUPABASE_SERVICE_ROLE_KEY:'test-only',GMAIL_SMTP_USER:'studio@gmail.test',GMAIL_SMTP_APP_PASSWORD:'test-only-password',ENQUIRY_TO_EMAIL:'owner@example.test'};
  const env=name=>secrets[name];
  let temporaryFailures=0;
  const sendMail=async message=>{
    mailCalls++;assert.deepEqual(message.to,['owner@example.test']);assert.equal(message.replyTo,'client@example.test');
    assert.match(message.html,/<!doctype html>/i);assert.match(message.html,/style=/i);assert.ok(!message.html.includes('<script>alert'));
    assert.match(message.text,/Name: Alex Tan/);assert.match(message.messageId,/mv-studio-enquiry-/);
    if(behavior==='timeout')throw Object.assign(new Error('Network timeout'),{code:'ETIMEDOUT'});
    if(behavior==='failure')throw Object.assign(new Error('Authentication rejected'),{code:'EAUTH',responseCode:535});
    if(behavior==='temporary'&&temporaryFailures++===0)throw Object.assign(new Error('Try again shortly'),{code:'ETEMP',responseCode:451});
    return {messageId:'<mock.gmail.test>'};
  };
  const submit=createSubmitHandler({createAdmin:()=>admin,env,sendMail});
  const retry=createRetryHandler({createAdmin:()=>admin,env,sendMail});
  const payload=()=>({request_id:crypto.randomUUID(),name:'Alex Tan',company_name:'Example Company',phone:'+60 12-345 6789',email:'client@example.test',message:'<script>alert("x")</script>',billing_period:'yearly',meeting_requested:true,preferred_meeting_at:new Date(Date.now()+86400000).toISOString(),selected_feature_ids:[]});
  const request=(body,{origin='https://mv-aistudio.vercel.app',method='POST',token,address=`test-${++ip}`}={})=>new Request('http://functions.test/submit-enquiry',{method,headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':address,...(token?{Authorization:`Bearer ${token}`}:{})},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
  try{
    await t.test('preflight, origin restriction and invalid JSON',async()=>{
      const response=await submit(request(null,{method:'OPTIONS'}));assert.equal(response.status,204);assert.equal(response.headers.get('access-control-allow-origin'),'https://mv-aistudio.vercel.app');
      assert.equal((await submit(request(payload(),{origin:'https://untrusted.test'}))).status,403);
      assert.equal((await submit(request(payload(),{origin:''}))).status,403);
      assert.equal((await submit(request('{broken'))).status,400);
      assert.equal((await submit(request(null))).status,400);
    });
    await t.test('server validates fields before touching the database',async()=>{
      const response=await submit(request({...payload(),name:'1',company_name:'',phone:'abc',email:'bad',preferred_meeting_at:'2020-01-01'}));
      const result=await response.json();assert.equal(response.status,400);
      for(const key of ['name','company_name','phone','email','preferred_meeting_at'])assert.ok(result.errors[key]);
      assert.equal((await db.query('select count(*)::int as n from enquiries')).rows[0].n,0);
    });
    await t.test('prices are calculated from active DB features, with annual discounts',async()=>{
      const features=(await db.query("select * from feature_options where name in ('Landing page','Hosting','Website maintenance','Payment page')")).rows;
      const response=await submit(request({...payload(),selected_feature_ids:features.map(v=>v.id),one_time_estimate:.01}));
      const result=await response.json();assert.equal(response.status,200);assert.ok(result.ok);assert.equal(result.whatsapp_reference,undefined);
      const saved=(await db.query('select * from enquiries where id=$1',[result.id])).rows[0];
      assert.equal(+saved.one_time_estimate,449);assert.equal(+saved.monthly_estimate,150);assert.equal(+saved.annual_estimate,1680);
      assert.equal(saved.notification_status,'sent');assert.equal(saved.meeting_requested,true);assert.ok(saved.preferred_meeting_at);
    });
    await t.test('unavailable feature IDs are rejected',async()=>{
      assert.equal((await submit(request({...payload(),selected_feature_ids:[crypto.randomUUID()]}))).status,400);
    });
    await t.test('same request is saved and notified once; changed payload is rejected',async()=>{
      const input=payload(),before=mailCalls;
      const first=await (await submit(request(input))).json();const duplicate=await (await submit(request(input))).json();
      assert.equal(first.id,duplicate.id);assert.equal(duplicate.duplicate,true);assert.equal(mailCalls,before+1);
      assert.equal((await submit(request({...input,message:'changed'}))).status,409);
    });
    await t.test('an explicit temporary SMTP rejection retries once',async()=>{
      behavior='temporary';temporaryFailures=0;const before=mailCalls;
      const result=await (await submit(request(payload()))).json();
      assert.equal(result.notification,'sent');assert.equal(mailCalls,before+2);behavior='success';
    });
    await t.test('concurrent retries cannot create duplicate enquiries or emails',async()=>{
      const input=payload(),before=mailCalls;
      const results=await Promise.all([submit(request(input)),submit(request(input))]);
      const bodies=await Promise.all(results.map(v=>v.json()));assert.ok(bodies.every(v=>v.ok));assert.equal(bodies[0].id,bodies[1].id);assert.equal(mailCalls,before+1);
    });
    let failedId;
    await t.test('email rejection and network failure preserve saved enquiries',async()=>{
      for(const mode of ['failure','timeout']){
        behavior=mode;const response=await submit(request(payload()));const result=await response.json();
        assert.equal(response.status,200);assert.equal(result.ok,true);assert.equal(result.notification,'failed');
        const row=(await db.query('select * from enquiries where id=$1',[result.id])).rows[0];assert.equal(row.notification_status,'failed');assert.ok(row.notification_error);failedId=row.id;
      }behavior='success';
    });
    await t.test('notification retry requires a valid administrator and is atomic',async()=>{
      assert.equal((await retry(request({id:failedId}))).status,401);
      assert.equal((await retry(request({id:failedId},{token:'user-token'}))).status,403);
      const before=mailCalls;
      const results=await Promise.all([retry(request({id:failedId},{token:'admin-token'})),retry(request({id:failedId},{token:'admin-token'}))]);
      assert.deepEqual(results.map(v=>v.status).sort(),[200,409]);assert.equal(mailCalls,before+1);
      assert.equal((await db.query('select notification_status from enquiries where id=$1',[failedId])).rows[0].notification_status,'sent');
      await db.query("update enquiries set notification_status='pending',updated_at=now()-interval '11 minutes' where id=$1",[failedId]);
      const recovered=await retry(request({id:failedId},{token:'admin-token'}));assert.equal(recovered.status,200);
      assert.equal((await db.query('select notification_status from enquiries where id=$1',[failedId])).rows[0].notification_status,'sent');
    });
    await t.test('five requests accepted per connection, sixth is rate limited',async()=>{
      const statuses=[];for(let i=0;i<6;i++)statuses.push((await submit(request(payload(),{address:'same-connection'}))).status);
      assert.deepEqual(statuses,[200,200,200,200,200,429]);
    });
    await t.test('missing email secrets preserve the request and record a useful admin error',async()=>{
      delete secrets.GMAIL_SMTP_APP_PASSWORD;
      const result=await (await submit(request(payload()))).json();assert.equal(result.ok,true);assert.equal(result.notification,'failed');
      assert.match((await db.query('select notification_error from enquiries where id=$1',[result.id])).rows[0].notification_error,/GMAIL_SMTP_APP_PASSWORD/);
    });
  }finally{await db.close();}
});

test('estimates handle cents, quoted items and configurable annual discounts',()=>{
  assert.deepEqual(estimateFeatures([{name:'Care',billing_type:'monthly',price:10.1,annual_free_months:2},{name:'Setup',billing_type:'one_time',price:.2},{name:'Custom',billing_type:'quote',price:null}]),{one_time_estimate:.2,monthly_estimate:10.1,annual_estimate:101,quoted:['Custom']});
  assert.ok(validateContact({name:'Alex',company_name:'Company',phone:'+60 12-345 6789',email:'bad'}).email);
});
