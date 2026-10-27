import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,client} from './helpers/database.mjs';
import {defaultQuestions,defaultOptions,defaultRules,defaultDocuments} from '../supabase/functions/_shared/chatbot/defaults.mjs';
import {validateAnswers,visibleQuestions,pruneAnswers,buildQuote,validateSnapshot,UNSURE} from '../supabase/functions/_shared/chatbot/flow.mjs';
import {bm25,cosine,retrieve,chunkDocuments,redact} from '../supabase/functions/_shared/chatbot/retrieval.mjs';
import {answerQuestion} from '../supabase/functions/_shared/chatbot/answer.mjs';
import {embedTexts,chooseSources} from '../supabase/functions/_shared/chatbot/providers.mjs';
import {createChatbotHandler,createChatbotAdminHandler,serveChatAction} from '../supabase/functions/_shared/chatbot/handler.mjs';
import {createSubmitHandler} from '../supabase/functions/_shared/submit-handler.mjs';
const snapshot={questions:defaultQuestions,options:defaultOptions,rules:defaultRules,documents:defaultDocuments,settings:{name:'Test assistant',greeting:'Tell us about your project.',handoff_message:'Our team can help you.',answer_mode:'extractive',retrieval_mode:'keyword'}};
const emptyAnswers={business_goal:UNSURE,budget:UNSURE,features:[],extras:[]};
const catalogue=[{id:crypto.randomUUID(),name:'Landing',category:'core',billing_type:'one_time',price:449,active:true},{id:crypto.randomUUID(),name:'Maintenance',category:'maintenance',billing_type:'monthly',price:120,annual_free_months:1,active:true},{id:crypto.randomUUID(),name:'Custom checkout',category:'core',billing_type:'quote',price:null,active:true}];
test('guided flow branches, prunes hidden answers, validates selections and prices independently',()=>{
  assert.deepEqual(validateSnapshot(snapshot),[]);
  const answers={...emptyAnswers,business_goal:['online_sales'],catalogue_size:20,ordering:'checkout',payments:'online',delivery:['pickup'],features:[catalogue[0].id,catalogue[2].id],extras:[catalogue[1].id],billing_period:'yearly'};
  assert.equal(visibleQuestions(snapshot,answers,catalogue).length,10);
  const quote=buildQuote(snapshot,answers,catalogue);assert.equal(quote.one_time_estimate,449);assert.equal(quote.monthly_estimate,120);assert.equal(quote.annual_estimate,1320);assert.deepEqual(quote.quoted,['Custom checkout']);assert.equal(quote.billing_period,'yearly');
  assert.equal(quote.lines[1].unit_price,null);assert.equal(quote.lines[2].annual_price,1320);
  assert.ok(validateAnswers(snapshot,{...answers,features:['unknown']},catalogue,true).errors.features);
  assert.ok(validateAnswers(snapshot,{...answers,catalogue_size:-1},catalogue,true).errors.catalogue_size);
  assert.ok(validateAnswers(snapshot,{...answers,target_date:'2099-02-31'},catalogue,true).errors.target_date);
  assert.ok(validateAnswers(snapshot,{...answers,unexpected:'yes'},catalogue).errors.unexpected);
  assert.ok(validateAnswers(snapshot,{...answers,billing_period:UNSURE},catalogue,true).errors.billing_period);
  const pruned=pruneAnswers(snapshot,{...answers,business_goal:['management'],extras:[]},catalogue);
  for(const key of ['catalogue_size','ordering','payments','delivery','billing_period'])assert.equal(pruned[key],undefined);
  assert.ok(validateSnapshot({...snapshot,rules:[{question_key:'business_goal',source_key:'budget',operator:'equals',values:['x']}]}).length);
  assert.equal(buildQuote(snapshot,emptyAnswers,catalogue).one_time_estimate,0);
});
test('BM25, semantic fusion, chunk limits and contact redaction',()=>{
  const chunks=[{source_id:'maintenance',title:'Care',content:'Maintenance includes updates and backups.',embedding:[1,0]},{source_id:'meeting',title:'Meeting',content:'A preferred meeting is not a confirmed booking.',embedding:[0,1]}];
  assert.equal(bm25('maintenance updates',chunks)[0].source_id,'maintenance');assert.deepEqual(bm25('unrelated holiday',chunks),[]);
  assert.equal(cosine([1,0],[1,0]),1);assert.equal(cosine([0,0],[1,0]),-1);
  assert.equal(retrieve('preferred meeting',chunks,[0,1])[0].source_id,'meeting');
  assert.ok(chunkDocuments([{id:'a',title:'Long',body:'long text '.repeat(200)}]).every(v=>v.content.length<=1100));
  assert.throws(()=>chunkDocuments(Array.from({length:121},(_,i)=>({id:i,title:'a',body:'short'}))),/too large/);
  assert.equal(redact('Email me at client@example.com or +60 12-345 6789'),'Email me at [email removed] or [contact number removed]');
});
test('provider adapters validate embeddings, restrict returned IDs and fail safely',async()=>{
  let calls=0;const deps={admin:{rpc:async()=>({data:++calls<8})},env:key=>({GEMINI_API_KEY:'test',GROQ_API_KEY:'test',GROQ_CHAT_MODEL:'fixture-model'})[key]};
  const vector=Array.from({length:768},(_,i)=>i===0?1:0);
  const embeddings=await embedTexts(['approved text'],{...deps,fetcher:async(url,options)=>{assert.match(url,/batchEmbedContents$/);assert.equal(JSON.parse(options.body).requests[0].outputDimensionality,768);return Response.json({embeddings:[{values:vector}]});}});assert.equal(embeddings[0].length,768);
  await assert.rejects(embedTexts(['x'],{...deps,fetcher:async()=>Response.json({embeddings:[{values:[1,2]}]})}),/768/);
  const selected=await chooseSources('question',[{source_id:'allowed',title:'T',content:'text'}],[{value:'goal',label:'Goal'}],{...deps,fetcher:async()=>Response.json({choices:[{message:{content:'{"source_ids":["secret","allowed"],"suggested_options":["fake","goal"]}'}}]})});
  assert.deepEqual(selected,{source_ids:['allowed'],suggested_options:['goal']});
  const hybrid={snapshot:{...snapshot,settings:{...snapshot.settings,retrieval_mode:'hybrid'},providers:{embedding_model:'fixture',embedding_dimensions:768}}};
  const fallback=await answerQuestion('meeting booking',hybrid,[{source_id:'a',title:'Meeting',content:'A preferred date is not a confirmed booking.'}],{...deps,fetcher:async()=>{throw new Error('offline');}});
  assert.equal(fallback.degraded,true);assert.equal(fallback.sources.length,1);
});

test('PostgreSQL chatbot lifecycle, publication isolation, estimates and confirmed enquiries',async t=>{
  const db=await database(),adminId=crypto.randomUUID();
  await db.query('insert into auth.users(id) values($1)',[adminId]);await db.query('insert into admin_users(user_id) values($1)',[adminId]);
  const admin=client(db,adminId),secrets={ALLOWED_ORIGIN:'https://mv-aistudio.vercel.app',SUPABASE_SERVICE_ROLE_KEY:'fixture',RESEND_API_KEY:'fixture',RESEND_FROM_EMAIL:'test@example.test',ENQUIRY_TO_EMAIL:'owner@example.test'};
  const env=key=>secrets[key];let emailCount=0,ip=0,release,run,estimate;
  const deps={createAdmin:()=>admin,env,fetcher:async()=>{emailCount++;return Response.json({id:'mail-test'});}},chat=createChatbotHandler(deps),manage=createChatbotAdminHandler(deps),submit=createSubmitHandler(deps);
  const request=(body,token,address=`chat-test-${++ip}`)=>new Request('https://local.test/functions/v1/chatbot',{method:'POST',headers:{Origin:secrets.ALLOWED_ORIGIN,'Content-Type':'application/json','x-forwarded-for':address,...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
  const call=async(handler,body,token='admin-token')=>{const response=await handler(request(body,token));const data=await response.json();return {status:response.status,...data};};
  const editCatalogue=async(sql,params=[])=>{await db.exec('set role authenticated');try{return await db.query(sql,params);}finally{await db.exec('set role service_role');}};
  try{
    await t.test('migration is repeatable and public roles cannot read drafts or publish',async()=>{
      await db.exec(await readFile('supabase/migrations/20261025_chatbot.sql','utf8'));
      assert.equal((await db.query('select count(*)::int n from chatbot_questions')).rows[0].n,defaultQuestions.length);
      await db.exec('set role anon');await assert.rejects(db.query('select * from chatbot_documents'),e=>e.code==='42501');await assert.rejects(db.query('select * from chatbot_chunks'),e=>e.code==='42501');await assert.rejects(db.query('select consume_chatbot_budget(10)'),e=>e.code==='42501');
      await db.exec('reset role; set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[adminId]);
      assert.ok((await db.query('select * from chatbot_documents')).rows.length);await assert.rejects(db.query("update chatbot_settings set name='Bypassed'"),e=>e.code==='42501');await db.exec('reset role');
      assert.equal((await call(manage,{action:'status'},null)).status,401);assert.equal((await call(manage,{action:'status'},'user-token')).status,403);
      assert.equal((await call(chat,{action:'bootstrap'},null)).available,false);
    });
    // Run the actual workflows with hosted Edge Function privileges, not owner access.
    await db.exec('set role service_role');
    await t.test('draft CRUD validates input and builds an immutable private candidate',async()=>{
      assert.equal((await call(manage,{action:'save',table:'chatbot_documents',values:{title:'x',body:'bad'}})).status,400);
      assert.equal((await call(manage,{action:'save',table:'chatbot_documents',values:{title:'Draft marker',body:'Quokka nebula is a private unpublished marker.',active:true,sort_order:99}})).status,200);
      const built=await call(manage,{action:'build',label:'Initial test candidate'});assert.equal(built.status,200,JSON.stringify(built));release=built.id;
      const preview=await call(manage,{action:'preview',release_id:release,request:{action:'bootstrap'}});assert.equal(preview.available,true);assert.equal(preview.documents,undefined);
      assert.equal((await call(chat,{action:'message',release_id:release,message:'quokka nebula'},null)).status,503);
      const previewQuote=await call(manage,{action:'preview',release_id:release,request:{action:'estimate',confirmed_scope:true,answers:emptyAnswers}});assert.equal(previewQuote.preview,true);assert.equal((await db.query('select count(*)::int n from chatbot_estimates')).rows[0].n,0);
    });
    await t.test('release checks run against actual retrieval and publication needs review',async()=>{
      const tested=await call(manage,{action:'test',release_id:release});assert.equal(tested.status,200);assert.equal(tested.run.passed,true,JSON.stringify(tested.run.results));run=tested.run;
      assert.equal((await call(manage,{action:'publish',release_id:release,run_id:run.id,note:'Reviewed all cases.'})).status,400);
      assert.equal((await call(manage,{action:'rollback',release_id:release,run_id:run.id,reviewed:true,note:'Reviewed all cases.'})).status,400,'Unpublished candidates cannot bypass current draft checks through rollback');
      const published=await call(manage,{action:'publish',release_id:release,run_id:run.id,reviewed:true,note:'Reviewed all cases.'});assert.equal(published.status,200,JSON.stringify(published));
      assert.equal((await call(chat,{action:'bootstrap'},null)).release_id,release);
      const factual=await call(chat,{action:'message',message:'Is my preferred meeting a confirmed booking?'},null);assert.match(factual.answer,/not a confirmed booking/);assert.ok(factual.sources.length);
      const goals=await call(chat,{action:'message',message:'I want an online system for my bakery'},null);assert.equal(goals.action,'guide');assert.ok(goals.suggested_options.includes('online_sales'));
    });
    await t.test('new drafts do not change live retrieval, and old releases cannot be requested publicly',async()=>{
      await call(manage,{action:'save',table:'chatbot_documents',values:{title:'Never published',body:'Zyxwave xenolith is exclusively draft content.',active:true}});
      const built=await call(manage,{action:'build',label:'Unpublished newer candidate'});
      assert.equal((await call(chat,{action:'message',message:'Zyxwave xenolith'},null)).action,'handoff');
      assert.equal((await call(chat,{action:'message',message:'Zyxwave xenolith',release_id:built.id},null)).status,409);
      assert.equal((await call(manage,{action:'publish',release_id:release,run_id:run.id,reviewed:true,note:'Reviewed old draft.'})).status,400);
      const retest=await call(manage,{action:'test',release_id:release});
      assert.equal((await call(manage,{action:'rollback',release_id:release,run_id:retest.run.id,reviewed:true,note:'Restore reviewed published flow.'})).status,200);
    });
    await t.test('question, option and rule CRUD remains a draft with relational validation',async()=>{
      const question={key:'extra_note',title:'Additional details',kind:'single',required:false,allow_unsure:true,active:false,sort_order:110};
      assert.equal((await call(manage,{action:'save',table:'chatbot_questions',values:question})).status,200);
      const id=(await db.query("select id from chatbot_questions where key='extra_note'")).rows[0].id;
      assert.equal((await call(manage,{action:'save',table:'chatbot_questions',id,values:{...question,title:'More information'}})).status,200);
      assert.equal((await call(manage,{action:'save',table:'chatbot_options',values:{question_key:'extra_note',value:'details',label:'More details',keywords:[],active:true}})).status,200);
      assert.equal((await call(manage,{action:'save',table:'chatbot_rules',values:{question_key:'extra_note',source_key:'business_goal',operator:'gte',values:['not numeric']}})).status,400);
      assert.equal((await call(manage,{action:'save',table:'chatbot_rules',values:{question_key:'extra_note',source_key:'business_goal',operator:'includes_any',values:['management'],active:false}})).status,200);
      await db.query("update chatbot_questions set key='renamed_goal' where key='business_goal'");
      assert.equal((await db.query("select source_key from chatbot_rules where question_key='extra_note'")).rows[0].source_key,'renamed_goal');
      assert.ok((await db.query("select id from chatbot_options where question_key='renamed_goal'")).rows.length);
      await db.query("update chatbot_questions set key='business_goal' where key='renamed_goal'");
      assert.equal((await call(manage,{action:'delete',table:'chatbot_questions',id})).status,200);
      assert.equal((await db.query("select count(*)::int n from chatbot_options where question_key='extra_note'")).rows[0].n,0);
      assert.equal((await call(chat,{action:'bootstrap'},null)).questions.some(v=>v.key==='extra_note'),false);
    });
    await t.test('backend uses current catalogue prices and requires token + confirmed scope',async()=>{
      const maintenance=(await db.query("select id from feature_options where name='Website maintenance'")).rows[0].id;
      const landing=(await db.query("select id from feature_options where name='Landing page'")).rows[0].id;
      assert.equal((await call(chat,{action:'estimate',answers:emptyAnswers},null)).status,400);
      estimate=await call(chat,{action:'estimate',confirmed_scope:true,answers:{...emptyAnswers,features:[landing],extras:[maintenance],billing_period:'yearly'},brief:'A bakery project',one_time_estimate:1},null);
      assert.equal(estimate.status,200,JSON.stringify(estimate));assert.equal(estimate.quote.one_time_estimate,449);assert.equal(estimate.quote.annual_estimate,1320);assert.ok(estimate.estimate_token);assert.equal(estimate.quote.manual_review,true);
    });
    const enquiry=()=>({request_id:crypto.randomUUID(),name:'Alex Tan',company_name:'Bakery Shop',phone:'+60 12-345 6789',email:'client@example.test',message:'Please call me.',meeting_requested:true,preferred_meeting_at:'2099-01-01T10:00:00Z',billing_period:'yearly',chatbot_estimate_id:estimate.estimate_id,chatbot_estimate_token:estimate.estimate_token,estimate_confirmed:true,selected_feature_ids:[],one_time_estimate:1});
    await t.test('confirmed enquiry saves scope once, ignores forged totals and sends one notification',async()=>{
      assert.equal((await call(submit,{...enquiry(),chatbot_estimate_token:'forged'},null)).status,403);
      const input=enquiry(),saved=await call(submit,input,null);assert.equal(saved.status,200,JSON.stringify(saved));assert.equal(emailCount,1);
      const row=(await db.query('select * from enquiries where id=$1',[saved.id])).rows[0];assert.equal(+row.one_time_estimate,449);assert.equal(+row.annual_estimate,1320);assert.equal(row.chatbot_answers.brief,'A bakery project');assert.ok(row.chatbot_answers.summary.length);assert.equal(row.chatbot_release_id,release);
      assert.equal((await call(submit,input,null)).duplicate,true);
      assert.equal((await call(submit,{...input,request_id:crypto.randomUUID()},null)).duplicate,true);assert.equal(emailCount,1);
      assert.equal((await call(submit,{...input,request_id:crypto.randomUUID(),name:'Someone Else'},null)).status,409);
      await db.query("update chatbot_estimates set expires_at=now()-interval '10 days' where id=$1",[estimate.estimate_id]);
      assert.equal((await call(submit,input,null)).duplicate,true,'A successful retry remains idempotent after estimate expiry');
    });
    await t.test('expired estimates cannot create new enquiries and failed or stale tests cannot publish',async()=>{
      const expired=await call(chat,{action:'estimate',confirmed_scope:true,answers:emptyAnswers},null);
      await db.query("update chatbot_estimates set expires_at=now()-interval '10 days' where id=$1",[expired.estimate_id]);
      assert.equal((await call(submit,{...enquiry(),billing_period:'monthly',chatbot_estimate_id:expired.estimate_id,chatbot_estimate_token:expired.estimate_token},null)).status,409);
      const success=await call(manage,{action:'test',release_id:release});
      const testValues={name:'Intentionally wrong quote total',kind:'quote',answers:emptyAnswers,expected_one_time:123,active:true};
      assert.equal((await call(manage,{action:'save',table:'chatbot_test_cases',values:testValues})).status,200);
      assert.equal((await call(manage,{action:'rollback',release_id:release,run_id:success.run.id,reviewed:true,note:'Stale tests reviewed.'})).status,400);
      const failed=await call(manage,{action:'test',release_id:release});assert.equal(failed.run.passed,false);
      assert.equal((await call(manage,{action:'rollback',release_id:release,run_id:failed.run.id,reviewed:true,note:'Failed tests reviewed.'})).status,400);
      const testId=(await db.query('select id from chatbot_test_cases where name=$1',[testValues.name])).rows[0].id;
      await call(manage,{action:'delete',table:'chatbot_test_cases',id:testId});
    });
    await t.test('catalogue edits invalidate estimates and test reports; final DB guard checks freshness',async()=>{
      const fresh=await call(chat,{action:'estimate',confirmed_scope:true,answers:emptyAnswers},null);
      await editCatalogue("update feature_options set price=121 where name='Website maintenance'");
      const stale=await call(submit,{...enquiry(),billing_period:'monthly',chatbot_estimate_id:fresh.estimate_id,chatbot_estimate_token:fresh.estimate_token},null);assert.equal(stale.status,409);
      assert.equal((await call(manage,{action:'rollback',release_id:release,run_id:run.id,reviewed:true,note:'Restore old tests.'})).status,400);
      await assert.rejects(db.query("insert into enquiries(name,company_name,phone,email,chatbot_estimate_id,chatbot_release_id) values('Alex Tan','Bakery','123456789','a@b.test',$1,$2)",[fresh.estimate_id,release]),e=>e.code==='P0001');
    });
    await t.test('catalogue edits during quotation are detected before an estimate can be used',async()=>{
      const live=(await db.query('select * from chatbot_releases where id=$1',[release])).rows[0];let changed=false;
      const racing={...admin,from(table){const query=admin.from(table);if(table!=='feature_options')return query;return new Proxy(query,{get(target,key){if(key==='then')return (resolve,reject)=>target.then(async value=>{if(!changed){changed=true;await editCatalogue("update feature_options set price=122 where name='Website maintenance'");}resolve(value);},reject);return Reflect.get(target,key);}});}};
      // Replace the catalogue reader with an awaitable query preserving its chain.
      const original=racing.from;racing.from=table=>{const q=original(table);if(table!=='feature_options')return q;const wrapper={};for(const key of ['select','eq','order'])wrapper[key]=(...args)=>{q[key](...args);return wrapper;};wrapper.then=(resolve,reject)=>q.then(resolve,reject);return wrapper;};
      await assert.rejects(serveChatAction({action:'estimate',confirmed_scope:true,answers:emptyAnswers},racing,live,{env}),/catalogue changed/);
    });
    await t.test('usage budgets, rate limiting and emergency disable leave enquiry handoff available',async()=>{
      assert.equal((await admin.rpc('consume_chatbot_budget',{p_max:1})).data,true);assert.equal((await admin.rpc('consume_chatbot_budget',{p_max:1})).data,false);
      secrets.CHATBOT_HOURLY_REQUESTS='10';let response;for(let i=0;i<11;i++)response=await chat(request({action:'bootstrap'},null,'fixed-ip'));assert.equal(response.status,429);
      await call(manage,{action:'enabled',enabled:false});assert.equal((await call(chat,{action:'bootstrap'},null)).available,false);assert.equal((await call(chat,{action:'estimate',answers:emptyAnswers,confirmed_scope:true},null)).status,503);
    });
    await t.test('redacted logs and retention cleanup protect contact fields and preserve submitted estimates',async()=>{
      await call(manage,{action:'enabled',enabled:true});
      await call(chat,{action:'message',message:'Meeting request from client@example.com, +60 12-345 6789'},null);
      const logs=(await db.query("select message from chatbot_logs where message like '%removed%'")).rows;
      assert.ok(logs.length);assert.ok(logs.every(v=>!v.message.includes('client@example.com')&&!v.message.includes('345 6789')));
      await db.query("update chatbot_logs set created_at=now()-interval '31 days'");
      assert.equal((await call(manage,{action:'purge_logs'})).status,200);
      assert.equal((await db.query('select count(*)::int n from chatbot_logs')).rows[0].n,0);
      assert.ok((await db.query('select id from chatbot_estimates where id=$1',[estimate.estimate_id])).rows.length,'A submitted estimate remains associated with its enquiry');
      assert.equal((await db.query("select count(*)::int n from chatbot_estimates where expires_at<now()-interval '7 days' and id<>$1",[estimate.estimate_id])).rows[0].n,0);
    });
  }finally{await db.close();}
});
