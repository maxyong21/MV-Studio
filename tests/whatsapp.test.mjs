import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,client} from './helpers/database.mjs';
import {transition,freshState} from '../supabase/functions/_shared/whatsapp/flow.mjs';
import {signature,handoffReference,verifyReference,phoneKey} from '../supabase/functions/_shared/whatsapp/security.mjs';
import {createWebhook,createWhatsAppAdmin,createWorkerHandler} from '../supabase/functions/_shared/whatsapp/handlers.mjs';
import {runWorker,serviceWindow,messageContent} from '../supabase/functions/_shared/whatsapp/worker.mjs';
import {createSubmitHandler} from '../supabase/functions/_shared/submit-handler.mjs';
import {whatsappEnquiryMessage} from '../src/lib/whatsapp-enquiry.mjs';
const baseSecrets={WHATSAPP_ENABLED:'true',WHATSAPP_LINK_SECRET:'fixture-link-secret',WHATSAPP_APP_SECRET:'fixture-app-secret',WHATSAPP_VERIFY_TOKEN:'fixture-verify',WHATSAPP_PHONE_NUMBER_ID:'12345',WHATSAPP_WORKER_SECRET:'fixture-worker',WHATSAPP_ACCESS_TOKEN:'fixture-access',WHATSAPP_API_VERSION:'v25.0',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',ALLOWED_ORIGIN:'https://mv-aistudio.vercel.app'};
const now=()=>Math.floor(Date.now()/1000);
const phone='601154039173';
const snapshot={settings:{name:'Fixture',greeting:'Hello',handoff_message:'Speak to our team',answer_mode:'extractive',retrieval_mode:'keyword'},questions:[{key:'goal',title:'Choose a goal',kind:'single',required:true,allow_unsure:true,sort_order:1},{key:'features',title:'Features',kind:'features',catalog_categories:['core','maintenance'],required:false,allow_unsure:true,sort_order:2}],options:[{question_key:'goal',value:'shop',label:'Shop',sort_order:1}],rules:[],documents:[]};
const featureId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const catalogue=[{id:featureId,name:'Maintenance',billing_type:'monthly',price:100,annual_free_months:1,category:'maintenance',active:true}];
const deps={settings:{enabled:true,greeting:'Welcome to the project assistant',handoff_message:'Queued for a person.'},release:{id:'fixture-release',snapshot},catalogue,link:async()=>null,answer:async()=>({action:'answer',answer:'Approved response.'}),submit:async()=>({ok:true,id:'saved-enquiry'})};
async function step(c,text,overrides={}){const output=await transition(c,{kind:'customer',payload:{text,timestamp:now()}},{...deps,...overrides});return {...c,state:output.state,assigned_to:output.assigned,enquiry_id:output.enquiry,reply:output.reply};}

test('WhatsApp guide: validation, pause/resume, review, changed pricing, submit, human and stop',async()=>{
  let c={phone,state:freshState()};
  c=await step(c,'start');assert.equal(c.reply.buttons.length,3);
  c=await step(c,'plan');assert.equal(c.state.question,'goal');
  c=await step(c,'invalid');assert.equal(c.state.answers.goal,undefined);
  c=await step(c,'1');assert.equal(c.state.answers.goal,'shop');assert.equal(c.state.question,'features');
  c=await step(c,'pause');assert.equal(c.state.mode,'paused');
  c=await step(c,'continue');assert.equal(c.state.question,'features');assert.equal(c.state.answers.features,undefined);
  c=await step(c,'1');assert.equal(c.state.mode,'contact');
  for(const value of ['Vincent Teo','Bakery Sdn Bhd','+601154039173'])c=await step(c,value);
  c=await step(c,'bad email');assert.equal(c.state.contact.email,undefined);
  c=await step(c,'vincent@example.test');assert.equal(c.state.mode,'review');assert.match(c.reply.text,/RM 1100.00\/year/);
  let submits=0;const changed={...deps,catalogue:[{...catalogue[0],price:120}],submit:async()=>{submits++;return {ok:true,id:'saved-enquiry'};}};
  c=await step(c,'submit',changed);assert.equal(submits,0);assert.match(c.reply.text,/pricing changed/);assert.match(c.reply.text,/RM 1320.00\/year/);
  c=await step(c,'submit',changed);assert.equal(submits,1);assert.equal(c.enquiry_id,'saved-enquiry');assert.equal(c.state.mode,'queued');
  c=await step(c,'Some extra context');assert.equal(c.reply,null);
  c=await step(c,'stop');assert.equal(c.state.mode,'stopped');assert.equal(c.enquiry_id,'saved-enquiry');
  c=await step(c,'hello');assert.equal(c.state.mode,'stopped');
  c=await step(c,'menu');assert.equal(c.state.mode,'menu');
  c=await step(c,'plan');assert.equal(c.enquiry_id,null);assert.deepEqual(c.state.answers,{});assert.equal(c.state.question,'goal');
});

test('WhatsApp human ownership, early handoff, restart and release isolation',async()=>{
  let c={phone,state:freshState()};c=await step(c,'plan');c=await step(c,'1');c=await step(c,'restart');assert.equal(c.state.answers.goal,'shop');c=await step(c,'continue');assert.equal(c.state.answers.goal,'shop');
  c=await step(c,'restart');c=await step(c,'confirm_restart');assert.deepEqual(c.state.answers,{});
  c=await step(c,'human');assert.equal(c.state.mode,'queued');assert.equal(c.enquiry_id,null);
  let r=await transition(c,{kind:'claim',actor_id:'owner',payload:{}},deps);c={...c,state:r.state,assigned_to:r.assigned};assert.equal(c.state.mode,'human');
  await assert.rejects(transition(c,{kind:'reply',actor_id:'other',payload:{text:'No'}},deps),/Claim/);
  r=await transition(c,{kind:'reply',actor_id:'owner',payload:{text:'Hello'}},deps);assert.equal(r.reply.text,'Hello');
  c=await step(c,'plan');assert.equal(c.reply,null);
  c={phone,state:freshState()};c=await step(c,'plan');c=await step(c,'1',{release:{id:'new-release',snapshot}});assert.match(c.reply.text,/updated/);assert.deepEqual(c.state.answers,{});
  c={phone,state:freshState()};c=await step(c,"Hi MV Studio, I'd like to discuss a website.\nName: Client\nMy enquiry: Need a shop.");assert.equal(c.state.mode,'queued');assert.match(c.state.website_context,/Need a shop/);
});

test('Signed website references expire, reject changes and retain the detailed message',async()=>{
  const env=k=>baseSecrets[k],id=crypto.randomUUID(),result=await handoffReference({id},env);
  assert.equal(await verifyReference(result.whatsapp_reference,env),id);
  assert.equal(await verifyReference(result.whatsapp_reference+'x',env),null);
  assert.equal(await verifyReference(result.whatsapp_reference,env,Date.now()+8*86400000),null);
  assert.deepEqual(await handoffReference({id},()=>undefined),{});
  assert.equal(phoneKey('011-5403 9173'),phone);
  const message=whatsappEnquiryMessage({name:'Vincent',message:'Bakery project',whatsapp_reference:result.whatsapp_reference},[{name:'Landing page'}]);
  assert.match(message,/Name: Vincent/);assert.match(message,/Bakery project/);assert.match(message,/Landing page/);assert.match(message,/MV-WA:/);
});

test('Long WhatsApp content keeps the complete text and uses typed actions instead of oversized button bodies',()=>{
  const short=messageContent({body:'Choose an option',buttons:[{id:'human',title:'Talk to team'}]});assert.equal(short.type,'interactive');
  const body='Full scope '.repeat(300),long=messageContent({body,buttons:[{id:'submit',title:'Submit to team'}]});assert.equal(long.type,'text');assert.ok(long.text.body.startsWith(body));assert.match(long.text.body,/SUBMIT/);assert.ok(long.text.body.length<=4096);
});

test('WhatsApp PostgreSQL permissions, signed webhook, queue, admin inbox and delivery recovery',async t=>{
  const db=await database(),actor=crypto.randomUUID(),other=crypto.randomUUID(),secrets={...baseSecrets};
  await db.query('insert into auth.users(id) values($1),($2)',[actor,other]);await db.query('insert into admin_users(user_id) values($1),($2)',[actor,other]);
  const admin=client(db,actor),env=k=>secrets[k],calls=[];let failNetwork=false;
  const emailCalls=[];
  const fetcher=async(url,options)=>{if(url.includes('api.resend.com')){emailCalls.push(JSON.parse(options.body));return Response.json({id:'fixture-email'});}calls.push({url,body:JSON.parse(options.body)});if(failNetwork)throw new Error('Network interrupted');return Response.json({messages:[{id:`wamid.out.${calls.length}`}]});};
  const manage=createWhatsAppAdmin({createAdmin:()=>admin,env,fetcher});
  const request=(body,token='admin-token')=>new Request('https://test/whatsapp-admin',{method:'POST',headers:{Origin:secrets.ALLOWED_ORIGIN,Authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body)});
  const backgrounds=[];const hook=createWebhook({createAdmin:()=>admin,env,fetcher,background:p=>backgrounds.push(p)});
  async function incoming(text,{id=crypto.randomUUID(),timestamp=now(),signatureValid=true,numberId='12345'}={}){
    const payload=JSON.stringify({object:'whatsapp_business_account',entry:[{changes:[{value:{metadata:{phone_number_id:numberId},messages:[{id,from:phone,type:'text',text:{body:text},timestamp:String(timestamp)}]}}]}]});
    const response=await hook(new Request('https://test/whatsapp-webhook',{method:'POST',headers:{'x-hub-signature-256':signatureValid?`sha256=${await signature(secrets.WHATSAPP_APP_SECRET,payload)}`:'bad'},body:payload}));await Promise.all(backgrounds.splice(0));return response;
  }
  try{
    await t.test('migration is repeatable; private tables and queue RPCs are denied to visitors',async()=>{
      const sql=await readFile('supabase/migrations/20261103_whatsapp.sql','utf8');assert.ok((await readFile('supabase/schema.sql','utf8')).endsWith(sql));await db.exec(sql);await db.exec(sql);
      await db.exec('set role anon');await assert.rejects(db.query('select * from whatsapp_conversations'),e=>e.code==='42501');await assert.rejects(db.query('select whatsapp_claim()'),e=>e.code==='42501');
      await db.exec('reset role;set role authenticated');assert.equal((await db.query('select * from whatsapp_settings')).rows.length,0);await assert.rejects(db.query("update whatsapp_settings set enabled=true"),e=>e.code==='42501');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[actor]);assert.equal((await db.query('select * from whatsapp_settings')).rows.length,1);await db.exec('reset role;set role service_role');
    });
    await t.test('webhook verification and signatures; one persisted event per Meta message',async()=>{
      assert.equal((await hook(new Request('https://test?hub.mode=subscribe&hub.verify_token=fixture-verify&hub.challenge=123'))).status,200);
      assert.equal((await hook(new Request('https://test?hub.mode=subscribe&hub.verify_token=bad'))).status,403);
      assert.equal((await incoming('hello',{signatureValid:false})).status,403);
      const id='wamid.in.1';assert.equal((await incoming('hello',{id})).status,200);await incoming('hello',{id});
      assert.equal((await db.query('select count(*)::int n from whatsapp_events')).rows[0].n,1);
      assert.equal((await db.query('select state from whatsapp_conversations')).rows[0].state.mode,'queued');
      assert.equal(calls.length,1);assert.match(calls[0].url,/graph.facebook.com/);
    });
    const c=(await db.query('select * from whatsapp_conversations')).rows[0];
    await t.test('admin authorization and claiming/replying without duplicate sends',async()=>{
      assert.equal((await manage(request({action:'status'},'bad-token'))).status,401);
      assert.equal((await manage(request({action:'reply',id:c.id,text:'Hello',request_id:crypto.randomUUID()}))).status,409);
      assert.equal((await manage(request({action:'claim',id:c.id,request_id:crypto.randomUUID()}))).status,200);
      assert.equal((await db.query('select assigned_to from whatsapp_conversations')).rows[0].assigned_to,actor);
      const body={action:'reply',id:c.id,text:'Human response',request_id:crypto.randomUUID()},before=calls.length;
      assert.equal((await manage(request(body))).status,200);await manage(request(body));assert.equal(calls.length,before+1);
      const stranger=createWhatsAppAdmin({createAdmin:()=>client(db,other),env,fetcher});assert.equal((await stranger(request({action:'claim',id:c.id,request_id:crypto.randomUUID()}))).status,409);
      await incoming('More details');assert.equal(calls.length,before+1);
    });
    await t.test('delivery receipts are monotonic and a receipt preceding the send acknowledgement is retained',async()=>{
      const o=(await db.query("select * from whatsapp_outbox where body='Human response'")).rows[0];
      for(const status of ['read','sent','failed','delivered'])await admin.rpc('whatsapp_receipt',{p_provider:o.provider_id,p_status:status,p_code:'fixture'});
      assert.equal((await db.query('select provider_status from whatsapp_outbox where id=$1',[o.id])).rows[0].provider_status,'read');
      await admin.rpc('whatsapp_receipt',{p_provider:'early-receipt',p_status:'delivered',p_code:''});await db.query("update whatsapp_outbox set provider_id='early-receipt' where id=$1",[o.id]);await admin.rpc('whatsapp_receipt',{p_provider:'early-receipt',p_status:'accepted',p_code:''});
      assert.equal((await db.query('select provider_status from whatsapp_outbox where id=$1',[o.id])).rows[0].provider_status,'delivered');
    });
    await t.test('network uncertainty is visible and cannot be blindly retried',async()=>{
      failNetwork=true;await manage(request({action:'reply',id:c.id,text:'Network test',request_id:crypto.randomUUID()}));failNetwork=false;
      const out=(await db.query("select * from whatsapp_outbox where status='uncertain'")).rows[0];assert.ok(out);
      const before=calls.length;await runWorker(admin,{env,fetcher});assert.equal(calls.length,before);
      await manage(request({action:'retry_send',id:c.id,message_id:out.id,request_id:crypto.randomUUID()}));assert.equal(calls.length,before);
      await manage(request({action:'resolve_send',id:c.id,message_id:out.id,request_id:crypto.randomUUID()}));assert.equal((await db.query('select status from whatsapp_outbox where id=$1',[out.id])).rows[0].status,'cancelled');
    });
    await t.test('stop prevents automated guidance and expired windows prevent human replies',async()=>{
      await incoming('stop');assert.equal((await db.query('select state from whatsapp_conversations')).rows[0].state.mode,'stopped');
      await db.query("update whatsapp_conversations set last_customer_at=now()-interval '25 hours'");
      assert.equal((await manage(request({action:'reply',id:c.id,text:'Too late',request_id:crypto.randomUUID()}))).status,409);
      assert.equal(serviceWindow(new Date(Date.now()-25*3600000).toISOString()),false);
      const worker=createWorkerHandler({createAdmin:()=>admin,env,fetcher});assert.equal((await worker(new Request('https://test',{method:'POST'}))).status,403);
    });
    await t.test('website submission returns a signed handoff only when configured and matches WhatsApp phone',async()=>{
      const submit=createSubmitHandler({createAdmin:()=>admin,env,fetcher});
      const response=await submit(request({name:'Vincent Teo',company_name:'Bakery',phone:'+601154039173',email:'vincent@example.test',message:'Need online ordering',request_id:crypto.randomUUID()}));
      const saved=await response.json();assert.ok(saved.whatsapp_reference);assert.equal(await verifyReference(saved.whatsapp_reference,env),saved.id);
      await incoming(`Hi MV Studio, I'd like to discuss a website.\nName: Vincent Teo\nMV-WA:${saved.whatsapp_reference}`);
      assert.equal((await db.query('select enquiry_id from whatsapp_conversations')).rows[0].enquiry_id,saved.id);
      await db.query('update enquiries set phone=$1 where id=$2',['+60129999999',saved.id]);await db.query('update whatsapp_conversations set enquiry_id=null,state=$1',[{mode:'menu',answers:{},completed:[],contact:{}}]);
      await incoming(`MV-WA:${saved.whatsapp_reference}`);assert.equal((await db.query('select enquiry_id from whatsapp_conversations')).rows[0].enquiry_id,null);
    });
    await t.test('real database guided submission is validated, stored and notified exactly once',async()=>{
      secrets.RESEND_API_KEY='fixture';secrets.RESEND_FROM_EMAIL='sender@example.test';secrets.ENQUIRY_TO_EMAIL='owner@example.test';
      const releaseId=crypto.randomUUID();await db.query('insert into chatbot_releases(id,label,draft_revision,provider_hash,snapshot) values($1,$2,1,$3,$4)',[releaseId,'WhatsApp tested release','fixture',snapshot]);
      await db.query('update chatbot_state set active_release_id=$1,enabled=true',[releaseId]);await db.query('update whatsapp_settings set enabled=true');
      await db.query('update whatsapp_conversations set state=$1,enquiry_id=null,assigned_to=null',[freshState()]);
      await incoming('hello');assert.match(calls.at(-1).body.interactive.body.text,/Choose how/);
      await incoming('plan');await incoming('1');await incoming('skip');
      for(const value of ['Lee Tan','Small Bakery','+601154039173','bakery@example.test'])await incoming(value);
      const review=(await db.query('select state from whatsapp_conversations')).rows[0].state;assert.equal(review.mode,'review');
      const before=emailCalls.length;await incoming('submit');assert.equal(emailCalls.length,before+1);
      const enq=(await db.query("select * from enquiries where email='bakery@example.test'")).rows[0];assert.ok(enq.chatbot_estimate_id);assert.equal(enq.notification_status,'sent');assert.equal(enq.chatbot_answers.summary[0].value,'Shop');
      await incoming('submit');assert.equal(emailCalls.length,before+1);assert.equal((await db.query("select count(*)::int n from enquiries where email='bakery@example.test'")).rows[0].n,1);
      // Simulate a worker crash after save, before the conversation transaction committed.
      await db.query('update whatsapp_conversations set state=$1,enquiry_id=null',[review]);await incoming('submit');assert.equal(emailCalls.length,before+1);assert.equal((await db.query('select enquiry_id from whatsapp_conversations')).rows[0].enquiry_id,enq.id);
    });
    await t.test('early human requests notify the team and failed notifications do not discard the conversation',async()=>{
      await incoming('stop');const before=emailCalls.length;await incoming('human');assert.equal(emailCalls.length,before+1);assert.match(emailCalls.at(-1).subject,/assistance/);
      const a=(await db.query('select * from whatsapp_team_alerts order by event_id desc limit 1')).rows[0];assert.equal(a.status,'sent');
    });
    await t.test('database leases serialize a conversation and reject stale completion tokens; long replies are ordered parts',async()=>{
      await db.query('delete from whatsapp_events');await db.query('delete from whatsapp_conversations');
      const cid=(await admin.rpc('whatsapp_enqueue',{p_phone:phone,p_external:'lease-event',p_payload:{text:'start',timestamp:now()}})).data;
      const claim=(await admin.rpc('whatsapp_claim',{})).data;assert.ok(claim);assert.equal((await admin.rpc('whatsapp_claim',{})).data,null);
      const finish={p_event:claim.event.id,p_token:crypto.randomUUID(),p_state:freshState(),p_assigned:null,p_enquiry:null,p_customer_at:new Date().toISOString(),p_reply:{text:'x'.repeat(8000),buttons:[{id:'human',title:'Talk to team'}]}};
      assert.equal((await admin.rpc('whatsapp_finish',finish)).data,false);finish.p_token=claim.token;assert.equal((await admin.rpc('whatsapp_finish',finish)).data,true);
      const out=(await db.query('select * from whatsapp_outbox where conversation_id=$1 order by id',[cid])).rows;assert.equal(out.length,3);assert.equal(out.map(v=>v.body).join(''),'x'.repeat(8000));assert.equal(out[0].buttons.length,0);assert.equal(out.at(-1).buttons.length,1);
      const first=(await admin.rpc('whatsapp_claim_outbox',{})).data;assert.ok(first);assert.equal((await admin.rpc('whatsapp_claim_outbox',{})).data,null);
      await db.query("update whatsapp_outbox set locked_until=now()-interval '1 minute' where id=$1",[first.id]);assert.equal((await admin.rpc('whatsapp_claim_outbox',{})).data,null);assert.equal((await db.query('select status from whatsapp_outbox where id=$1',[first.id])).rows[0].status,'uncertain');
    });
  }finally{await db.close();}
});
