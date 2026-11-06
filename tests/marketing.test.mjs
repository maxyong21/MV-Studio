import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,client} from './helpers/database.mjs';
import {transform} from 'esbuild';
import {pathToFileURL} from 'node:url';
import {renderMarketing,validateCampaign} from '../supabase/functions/_shared/marketing.mjs';
import {outreachEligible} from '../supabase/functions/_shared/outreach.mjs';
import {signatureFromTeam} from '../src/admin/signature-data.mjs';
import {validateEntity} from '../src/admin/validation.js';
import {entityConfig} from '../src/admin/config.js';
const signature={company:'MV Studio',logo_url:'https://studio.example/logo.png',portfolio:'https://studio.example',members:[{enabled:true,name:'Developer',email:'developer@example.com',phone:'+60123456789',portfolio:'https://portfolio.example'}]};
test('signature uses saved team contacts, preserves choices and excludes inactive profiles',()=>{
 const team=[{id:'one',name:'Saved Name',email:'database@example.com',phone:'+60123456789',website_url:'https://saved.example',active:true},{id:'hidden',active:false}];
 const result=signatureFromTeam(team,{company:'MV Studio',members:[{team_member_id:'one',name:'Old Name',email:'old@example.com',enabled:false}]});
 assert.equal(result.members.length,1);assert.equal(result.members[0].email,'database@example.com');assert.equal(result.members[0].phone,'+60123456789');assert.equal(result.members[0].enabled,false);assert.equal(result.members[0].portfolio,'https://saved.example');
 assert.equal(signatureFromTeam(team).members[0].enabled,true);assert.deepEqual(signatureFromTeam([]).members,[]);
 const errors=validateEntity({name:'Saved Name',email:'bad-email',phone:'123'},entityConfig.team_members);assert.ok(errors.email);assert.ok(errors.phone);
});
test('team work contacts migration is repeatable and validates stored addresses and numbers',async()=>{
 const db=await database();try{
 const sql=await readFile('supabase/migrations/20261108_team_contacts.sql','utf8');await db.exec(sql);await db.exec(sql);
 const team=(await db.query("select id from team_members limit 1")).rows[0];
 await db.query('update team_members set email=$1,phone=$2 where id=$3',['team@example.com','+60123456789',team.id]);
 const saved=(await db.query('select email,phone from team_members where id=$1',[team.id])).rows[0];assert.equal(saved.email,'team@example.com');assert.equal(saved.phone,'+60123456789');
 await assert.rejects(db.query("update team_members set email='not-an-email' where id=$1",[team.id]));await assert.rejects(db.query("update team_members set phone='123' where id=$1",[team.id]));
 }finally{await db.close();}
});
test('email escapes untrusted text, restricts URLs, and provides personalized text fallback',()=>{
 const c={name:'Pilot',subject:'Hello {{first_name}}',headline:'<script>x</script>',body:'For {{company_name}}',sender_identity:'Studio',cta_url:'javascript:alert(1)',images:[{url:'javascript:alert(1)',alt:'x'}]};
 assert.ok(validateCampaign(c).cta_url);assert.ok(validateCampaign(c).images);
 const result=renderMarketing(c,{first_name:'Alex',company_name:'A & B'},'https://example.com/unsubscribe');
 assert.equal(result.subject,'Hello Alex');assert.ok(result.text.includes('For A & B'));assert.ok(result.html.includes('&lt;script&gt;'));assert.ok(!result.html.includes('javascript:'));
 assert.ok(renderMarketing({...c,body:'Hello {{first_name}} for {{company_name}}'}).text.includes('Hello there for your business'));
});
test('outreach eligibility distinguishes first introductions, customer updates and do-not-contact',()=>{
 const contact={contact_source:'Direct correspondence',outreach_note:'Business needs a website',relationship:'prospect'};
 assert.equal(outreachEligible(contact),true);assert.equal(outreachEligible({...contact,intro_blocked:true}),false);
 assert.equal(outreachEligible(contact,{purpose:'customer_update'}),false);
 assert.equal(outreachEligible({...contact,relationship:'customer',intro_blocked:true},{purpose:'customer_update'}),true);
 assert.equal(outreachEligible({...contact,suppressed:true}),false);
 const rendered=renderMarketing({signature:{...signature,members:[...signature.members,{enabled:false,name:'Hidden person'}]},body:'Hello',headline:'Introduction',cta_url:'https://studio.example'});
 assert.match(rendered.html,/logo.png/);assert.match(rendered.html,/developer@example.com/);assert.doesNotMatch(rendered.html,/Hidden person|agreed to receive/);assert.match(rendered.text,/MV Studio/);
 assert.ok(validateCampaign({signature:{...signature,members:[]}}).signature);
});
test('outreach migration prevents cross-campaign repeat introductions and requires a reason for customer updates',async()=>{
 const db=await database();try{
 const migration=await readFile('supabase/migrations/20261107_outreach.sql','utf8');await db.exec(migration);await db.exec(migration);
 const c=(await db.query("insert into marketing_contacts(email,contact_source,outreach_note) values ('prospect@example.com','Direct correspondence','Relevant website discussion') returning id")).rows[0];
 const first=(await db.query("insert into email_campaigns(name,content,tested_hash) values ('First','{}','tested') returning id")).rows[0];
 const second=(await db.query("insert into email_campaigns(name,content,tested_hash) values ('Second','{}','tested') returning id")).rows[0];
 await db.query('select start_marketing_campaign($1,$2,$3)',[first.id,'{}',[c.id]]);
 await assert.rejects(db.query('select start_marketing_campaign($1,$2,$3)',[second.id,'{}',[c.id]]));
 await db.exec("update email_campaign_recipients set status='accepted'; update email_campaigns set status='completed' where status='sending'");
 await assert.rejects(db.query('select start_marketing_campaign($1,$2,$3)',[second.id,'{}',[c.id]]));
 const content={purpose:'customer_update',followup_reason:'Discuss the requested project change'};
 await db.query('update email_campaigns set content=$1 where id=$2',[JSON.stringify(content),second.id]);
 await assert.rejects(db.query('select start_marketing_campaign($1,$2,$3)',[second.id,JSON.stringify(content),[c.id]]));
 await db.exec("update marketing_contacts set relationship='customer'");
 await db.query('select start_marketing_campaign($1,$2,$3)',[second.id,JSON.stringify(content),[c.id]]);
 }finally{await db.close();}
});
test('admin send flow requires auth and current test; worker honors opt-out and one-recipient envelopes',async()=>{
 const db=await database();const sent=[];let smtpError=null;const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 try{
 await db.query('insert into auth.users(id) values ($1)',[user]);await db.query('insert into admin_users(user_id) values ($1)',[user]);
 const admin=client(db,user),originalRpc=admin.rpc;admin.auth.getUser=async token=>({data:{user:token==='admin-token'?{id:user,email:'owner@example.com'}:null},error:null});
 admin.rpc=async(name,args)=>name==='claim_marketing_send'?{data:(await db.query('select * from claim_marketing_send($1)',[args.p_limit])).rows,error:null}:name==='start_marketing_campaign'?{data:(await db.query('select start_marketing_campaign($1,$2,$3,$4)',[args.p_id,JSON.stringify(args.p_content),args.p_contacts,args.p_schedule])).rows,error:null}:originalRpc(name,args);
 const config={SUPABASE_URL:'https://project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test',ALLOWED_ORIGIN:'https://studio.example',GMAIL_SMTP_USER:'owner@gmail.com',GMAIL_SMTP_APP_PASSWORD:'test-only',MARKETING_WORKER_SECRET:'worker-secret'};
 const marketingRpc=admin.rpc;admin.rpc=async(name,args)=>name==='marketing_introduction_history'?{data:(await db.query('select * from marketing_introduction_history()')).rows,error:null}:marketingRpc(name,args);
 let handler;globalThis.__marketingTest={createClient:()=>admin,nodemailer:{createTransport:()=>({sendMail:async message=>{if(smtpError)throw smtpError;sent.push(message);return {accepted:[message.to],messageId:'test-message'};},close(){}})},Deno:{env:{get:key=>config[key]},serve:fn=>{handler=fn;}}};
 let source=await readFile('supabase/functions/marketing/index.ts','utf8');source=source.replace(/import \{createClient\}[^;]+;/,'const {createClient,nodemailer,Deno}=globalThis.__marketingTest;').replace(/import nodemailer[^;]+;/,'').replace(/from '(\.\.\/[^']+)'/g,(_,path)=>`from '${new URL(path,pathToFileURL(process.cwd()+'/supabase/functions/marketing/index.ts')).href}'`);
 const {code}=await transform(source,{loader:'ts',format:'esm'});await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const call=(body,token='admin-token')=>handler(new Request('https://project.supabase.co/functions/v1/marketing',{method:'POST',headers:{origin:'https://studio.example',authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body)}));
 assert.equal((await call({action:'list'},'bad-token')).status,401);
 await db.query("update team_members set email='saved-team@example.com',phone='+60123456789'");
 const loaded=await (await call({action:'list'})).json();assert.ok(loaded.team_members.length);assert.equal(loaded.team_members[0].email,'saved-team@example.com');assert.equal(loaded.team_members[0].phone,'+60123456789');
 const content={name:'Campaign',subject:'Hello {{first_name}}',headline:'A useful website',body:'For {{company_name}}',cta_url:'https://studio.example',signature,purpose:'introduction',images:[]};
 const campaign=(await (await call({action:'save',content})).json()).campaign;assert.ok(campaign.id);
 await call({action:'contact',contact:{email:'customer@example.com',relationship:'prospect',contact_source:'Direct business contact',outreach_note:'Requested information about a new website'}});
 const contact=(await db.query('select * from marketing_contacts')).rows[0];
 assert.equal((await call({action:'start',id:campaign.id,contact_ids:[contact.id]})).status,400);
 assert.equal((await call({action:'test',id:campaign.id})).status,200);assert.equal(sent.length,1);assert.equal(sent[0].to,'owner@example.com');
 assert.equal((await call({action:'start',id:campaign.id,contact_ids:[contact.id]})).status,200);
 assert.equal((await call({action:'process'})).status,200);assert.equal(sent.length,2);assert.equal(sent[1].to,'customer@example.com');assert.equal(sent[1].cc,undefined);assert.ok(sent[1].headers['List-Unsubscribe-Post']);
 await db.exec("update email_campaigns set status='sending'; update email_campaign_recipients set status='queued'; update marketing_send_slots set created_at=now()-interval '1 minute'");
 smtpError=Object.assign(new Error('Temporary SMTP deferral'),{responseCode:450,code:'EENVELOPE'});await call({action:'process'});assert.equal((await db.query('select status from email_campaign_recipients')).rows[0].status,'queued');
 await db.exec("update email_campaign_recipients set next_attempt_at=now(); update marketing_send_slots set created_at=now()-interval '1 minute'");
 smtpError=Object.assign(new Error('Connection lost after DATA'),{code:'ECONNECTION'});await call({action:'process'});assert.equal((await db.query('select status from email_campaign_recipients')).rows[0].status,'uncertain');
 const unsub=await handler(new Request(`https://project.supabase.co/functions/v1/marketing/unsubscribe?token=${contact.unsubscribe_token}`,{method:'GET'}));assert.equal(unsub.status,200);assert.equal((await db.query('select suppressed from marketing_contacts')).rows[0].suppressed,false);
 const post=()=>handler(new Request(`https://project.supabase.co/functions/v1/marketing/unsubscribe?token=${contact.unsubscribe_token}`,{method:'POST'}));assert.equal((await post()).status,200);assert.equal((await post()).status,200);assert.equal((await db.query('select suppressed from marketing_contacts')).rows[0].suppressed,true);
 }finally{delete globalThis.__marketingTest;await db.close();}
});
test('marketing migration is repeatable, guards consent, freezes campaign, throttles queue and recovers stale claims',async()=>{
 const db=await database();try{
  const sql=await readFile('supabase/migrations/20261106_marketing.sql','utf8');await db.exec(sql);await db.exec(sql);
  const contact=(await db.query("insert into marketing_contacts(email) values ('contact@example.com') returning id")).rows[0];
  const campaign=(await db.query("insert into email_campaigns(name,content,tested_hash) values ('Pilot','{}','tested') returning id")).rows[0];
  await assert.rejects(db.query('select start_marketing_campaign($1,$2,$3)',[campaign.id,'{}',[contact.id]]));
  await db.query("update marketing_contacts set consent_at=now(),consent_source='Signup',consent_notice='Receive marketing updates'");
  await db.query('select start_marketing_campaign($1,$2,$3)',[campaign.id,'{}',[contact.id]]);
  await assert.rejects(db.query('select start_marketing_campaign($1,$2,$3)',[campaign.id,'{}',[contact.id]]));
  const first=await db.query('select * from claim_marketing_send(50)');assert.equal(first.rows.length,1);assert.equal(first.rows[0].attempts,1);
  assert.equal((await db.query('select * from claim_marketing_send(50)')).rows.length,0);
  await db.query("update email_campaign_recipients set updated_at=now()-interval '6 minutes'");await db.query('select * from claim_marketing_send(50)');
  assert.equal((await db.query('select status from email_campaign_recipients')).rows[0].status,'uncertain');
  await db.query('set role anon');await assert.rejects(db.query('select * from marketing_contacts'));await assert.rejects(db.query('select * from claim_marketing_send(50)'));
 }finally{await db.close();}
});
