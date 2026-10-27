import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database} from './helpers/database.mjs';
import {defaultDocuments,defaultQuestions,defaultOptions,defaultRules} from '../supabase/functions/_shared/chatbot/defaults.mjs';
import {industryTests,industryCatalogue} from '../supabase/functions/_shared/chatbot/industry-content.mjs';
import {visibleQuestions,pruneAnswers,validateSnapshot,buildQuote,UNSURE} from '../supabase/functions/_shared/chatbot/flow.mjs';
import {chunkDocuments} from '../supabase/functions/_shared/chatbot/retrieval.mjs';
import {answerQuestion} from '../supabase/functions/_shared/chatbot/answer.mjs';
import {renderEnquiryEmail} from '../supabase/functions/_shared/email-template.mjs';
const snapshot={questions:defaultQuestions,options:defaultOptions,rules:defaultRules,documents:defaultDocuments,settings:{name:'Assistant',greeting:'Tell us about your project',handoff_message:'Our team can review this request.',answer_mode:'extractive',retrieval_mode:'keyword'}};
const release={snapshot};
test('an unpriced custom enquiry is a manual quote in its email, not a free project',()=>{
 const html=renderEnquiryEmail({name:'Client',company_name:'Education Centre',email:'client@example.test',selected_features:[{name:'Learning management system',billing_type:'quote',unit_price:null}],one_time_estimate:0,monthly_estimate:0,annual_estimate:0});
 assert.match(html,/Manual quotation required/);assert.doesNotMatch(html,/RM 0\.00/);
});
test('education, parts, bookings and other goals get relevant discovery without retail questions',()=>{
 assert.deepEqual(validateSnapshot(snapshot),[]);
 for(const [goal,expected] of [['education','education_scope'],['parts_catalogue','parts_requirements'],['bookings','booking_scope'],['business_website','website_content'],['management','management_scope'],['other_project','other_scope']]){
  const answers={business_goal:[goal],budget:UNSURE,features:[],extras:[]};
  const keys=visibleQuestions(snapshot,answers,[]).map(q=>q.key);
  assert.ok(keys.includes(expected),goal);for(const key of ['ordering','payments','delivery'])assert.ok(!keys.includes(key),`${goal} should not force ${key}`);
  const quote=buildQuote(snapshot,answers,[]);assert.equal(quote.one_time_estimate,0);assert.equal(quote.manual_review,true);
 }
 const pruned=pruneAnswers(snapshot,{business_goal:['management'],education_scope:['quizzes'],education_users:50,parts_requirements:['fitment'],ordering:'checkout'},[]);
 assert.deepEqual(pruned,{business_goal:['management']});
 const mixed=visibleQuestions(snapshot,{business_goal:['education','online_sales']},[]).map(q=>q.key);assert.ok(mixed.includes('education_scope'));assert.ok(mixed.includes('ordering'));
 const item={...industryCatalogue[0],id:crypto.randomUUID()};
 for(const count of [200,5000]){const quote=buildQuote(snapshot,{business_goal:['education'],education_users:count,features:[item.id],extras:[],budget:UNSURE},[item]);assert.equal(quote.one_time_estimate,0);assert.deepEqual(quote.quoted,['Learning management system']);assert.equal(quote.lines[0].unit_price,null);}
});
test('industry prompts and factual FAQs meet the seeded expected answer checks without AI keys',async()=>{
 const chunks=chunkDocuments(defaultDocuments.map((d,index)=>({...d,id:`article-${index}`})));
 for(const check of industryTests){
  const reply=await answerQuestion(check.prompt,release,chunks,{env:()=>undefined});
  assert.equal(reply.action,check.expected_action,`${check.name}: ${reply.answer}`);
  for(const term of check.expected_terms)assert.ok(reply.answer.toLowerCase().includes(term.toLowerCase()),`${check.name}: missing ${term}: ${reply.answer}`);
  for(const term of check.forbidden_terms)assert.ok(!reply.answer.toLowerCase().includes(term.toLowerCase()),check.name);
 }
 const school=await answerQuestion('I need an online system for my school',release,chunks,{env:()=>undefined});assert.ok(school.suggested_options.includes('education'));assert.ok(!school.suggested_options.includes('online_sales'));
});
test('industry migration is repeatable, editable and does not publish or invent testimonials',async()=>{
 const db=await database();
 try{
  const migration=await readFile('supabase/migrations/20261027_chatbot_industries.sql','utf8');
  const before=(await db.query('select count(*)::int as n from chatbot_documents')).rows[0].n;
  await db.query("update chatbot_documents set body='Our reviewed education information remains editable.' where title='Education websites and learning systems'");
  await db.exec(migration);await db.exec(migration);
  assert.equal((await db.query('select count(*)::int as n from chatbot_documents')).rows[0].n,before);
  assert.equal((await db.query("select body from chatbot_documents where title='Education websites and learning systems'")).rows[0].body,'Our reviewed education information remains editable.');
  assert.equal((await db.query('select count(*)::int as n from chatbot_questions')).rows[0].n,defaultQuestions.length);
  assert.equal((await db.query('select active_release_id from chatbot_state')).rows[0].active_release_id,null);
  assert.equal((await db.query('select count(*)::int as n from testimonials')).rows[0].n,0);
  await db.exec('set role anon');await assert.rejects(db.query('select * from chatbot_documents'),e=>e.code==='42501');
 }finally{await db.close();}
});
