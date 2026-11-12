import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,client} from './helpers/database.mjs';
import {parseRecipients,buildEnvelope} from '../supabase/functions/_shared/email-recipients.mjs';
import {renderMarketing,validateCampaign} from '../supabase/functions/_shared/marketing.mjs';
import {processEnvelope} from '../supabase/functions/_shared/marketing-envelope.mjs';
test('To/Cc/Bcc parsing validates addresses and prevents duplicates and header injection',()=>{
 const parsed=parseRecipients({to:'Client <client@example.com>; second@example.com',cc:'team@example.com',bcc:'private@example.com'});
 assert.deepEqual(parsed.errors,{});assert.equal(parsed.count,4);assert.deepEqual(parsed.recipients.to,['client@example.com','second@example.com']);
 assert.ok(parseRecipients({to:'bad'}).errors.to);assert.ok(parseRecipients({to:'a@example.com',bcc:'A@example.com'}).errors.bcc);assert.ok(parseRecipients({to:'a@example.com\rBcc:evil@example.com'}).errors.to);assert.ok(parseRecipients({cc:'a@example.com'}).errors.to);
});
test('separate envelopes keep business names, refuse Cc/Bcc and strip unsafe characters',()=>{
 const built=buildEnvelope({to:'Kopi Lane <Hello@KopiLane.example>\nplain@example.com',separate:true});
 assert.deepEqual(built.errors,{});assert.equal(built.count,2);assert.deepEqual(built.envelope,{to:['hello@kopilane.example','plain@example.com'],cc:[],bcc:[],separate:true,names:{'hello@kopilane.example':'Kopi Lane'}});
 const mixed=buildEnvelope({to:'a@example.com',cc:'b@example.com',bcc:'c@example.com',separate:true});assert.match(mixed.errors.cc,/Separate emails/);assert.match(mixed.errors.bcc,/Separate emails/);assert.ok(buildEnvelope({to:'Nested <Name> <x@example.com>',separate:true}).errors.to,'Angle brackets inside a name are rejected');
 const shared=buildEnvelope({to:'Team <a@example.com>',cc:'b@example.com'});assert.deepEqual(shared.errors,{});assert.equal(shared.envelope.separate,undefined);assert.equal(shared.envelope.names,undefined);
 assert.equal(parseRecipients({to:'Evil\u0000Name <a@example.com>'}).names['a@example.com'],'Evil Name');
});
test('plain layout is a personal note: optional heading and link, no banner, button, images or tables',()=>{
 const signature={company:'MV Studio',logo_url:'https://studio.example/logo.png',portfolio:'https://studio.example',members:[{enabled:true,name:'Vincent Teo',email:'vincent@studio.example',phone:'+60 12-345 6789',portfolio:'https://vincent.example'}]};
 const note={name:'Note',subject:'An idea for {{company_name}}',body:'Hello {{first_name}},\n<b>Your</b> site asks for IE8.',layout:'plain',signature,purpose:'introduction'};
 assert.deepEqual(validateCampaign(note),{});
 assert.ok(validateCampaign({...note,layout:'designed'}).headline);assert.ok(validateCampaign({...note,layout:'designed'}).cta_url);
 assert.ok(validateCampaign({...note,cta_url:'javascript:alert(1)'}).cta_url);assert.ok(validateCampaign({...note,layout:'fancy'}).layout);
 const sent=renderMarketing(note,{company_name:'Kopi Lane'},'https://project.supabase.co/functions/v1/marketing/unsubscribe?token=abc');
 assert.equal(sent.subject,'An idea for Kopi Lane');
 assert.doesNotMatch(sent.html,/<h1|<img|<table|WEB DESIGN/);assert.match(sent.html,/&lt;b&gt;Your&lt;\/b&gt;/);assert.match(sent.html,/Hello there,<br>/);
 assert.match(sent.html,/href="mailto:vincent@studio\.example"/);assert.match(sent.html,/unsubscribe\?token=abc/);
 assert.doesNotMatch(sent.html,/display:none/,'No hidden preview block unless preview text is set');
 assert.doesNotMatch(sent.text,/Discuss your project/);assert.match(sent.text,/Request no further outreach: https:/);assert.ok(!sent.text.startsWith('\n'));
 const linked=renderMarketing({...note,headline:'Quick idea',cta_url:'https://studio.example/#contact',cta_label:'See our work',preview_text:'One small fix'},{},'https://x.example/u');
 assert.match(linked.html,/<strong>Quick idea<\/strong>/);assert.match(linked.html,/href="https:\/\/studio\.example\/#contact"[^>]*>See our work</);assert.match(linked.html,/display:none[^>]*>One small fix</);assert.match(linked.text,/See our work: https:\/\/studio\.example\/#contact/);
 // The designed layout keeps working and its signature email link is no longer percent-encoded.
 const designed=renderMarketing({...note,layout:'designed',headline:'Hello',cta_url:'https://studio.example'},{},'https://x.example/u');assert.match(designed.html,/<h1/);assert.match(designed.html,/href="mailto:vincent@studio\.example"/);
});
test('separate queue sends one personalised message per address with a one-click opt-out',async()=>{
 const db=await database();
 try{
 for(const file of ['20261111_email_composer.sql','20261112_separate_send.sql']){const sql=await readFile('supabase/migrations/'+file,'utf8');await db.exec(sql);await db.exec(sql);}
 const content={name:'Intro',subject:'Idea for {{company_name}}',body:'Hello',layout:'plain',purpose:'introduction'};
 const {envelope}=buildEnvelope({to:'Kopi Lane <a@example.com>\nb@example.com',separate:true});
 const c=(await db.query('insert into email_campaigns(name,content,tested_hash) values ($1,$2,$3) returning *',['Intro',JSON.stringify(content),'tested'])).rows[0];
 await db.query('select queue_marketing_email($1,$2,$3,$4)',[c.id,JSON.stringify(content),JSON.stringify(envelope),null]);
 const claim=async()=>{await db.exec("update marketing_send_slots set created_at=now()-interval '1 minute'");return (await db.query('select * from claim_marketing_send(50)')).rows;};
 // One recipient per claim, unlike a shared envelope which claims the whole group.
 assert.equal((await claim()).length,1);assert.equal((await db.query("select count(*)::int n from email_campaign_recipients where status='sending'")).rows[0].n,1);
 assert.equal((await db.query("select count(*)::int n from email_campaign_recipients where status='queued'")).rows[0].n,1);
 await db.exec("update email_campaign_recipients set status='accepted' where status='sending'");
 assert.equal((await claim()).length,1);assert.equal((await db.query("select count(*)::int n from marketing_send_slots")).rows[0].n,2,'Each separate email uses one slot of the daily budget');
 // A shared envelope still claims its whole group at once.
 const shared=(await db.query('insert into email_campaigns(name,content,tested_hash) values ($1,$2,$3) returning *',['Group',JSON.stringify(content),'tested'])).rows[0];
 await db.exec("update email_campaign_recipients set status='accepted'");
 await db.query('select queue_marketing_email($1,$2,$3,$4)',[shared.id,JSON.stringify(content),JSON.stringify({to:['c@example.com'],cc:[],bcc:['d@example.com']}),null]);
 assert.equal((await claim()).length,1);assert.equal((await db.query("select count(*)::int n from email_campaign_recipients where campaign_id=$1 and status='sending'",[shared.id])).rows[0].n,2);
 }finally{await db.close();}
});
test('group queue sends one envelope, tracks each recipient, permits recurring CC and blocks unsafe retries',async()=>{
 const db=await database();const sends=[];const admin=client(db);let failure=null,partial=false;
 const env=k=>({SUPABASE_URL:'https://project.supabase.co',GMAIL_SMTP_USER:'owner@gmail.com'})[k];
 const send=async message=>{if(failure)throw failure;sends.push(message);return {accepted:partial?message.to:[...message.to,...message.cc,...message.bcc],messageId:'group-reference'};};
 try{
 const migration=await readFile('supabase/migrations/20261111_email_composer.sql','utf8');await db.exec(migration);await db.exec(migration);
 const queue=async(to,bcc=[],cc=['team@example.com'])=>{
  const content={name:'Introduction',subject:'Website idea',headline:'Hello',body:'Our services',purpose:'introduction'};
  const c=(await db.query('insert into email_campaigns(name,content,tested_hash) values ($1,$2,$3) returning *',['Introduction',JSON.stringify(content),'tested'])).rows[0];
  await db.query('select queue_marketing_email($1,$2,$3,$4)',[c.id,JSON.stringify(content),JSON.stringify({to,cc,bcc}),null]);return (await db.query('select * from email_campaigns where id=$1',[c.id])).rows[0];
 };
 const claim=async()=>{await db.exec("update marketing_send_slots set created_at=now()-interval '1 minute'");return (await db.query('select * from claim_marketing_send(50)')).rows;};
 const first=await queue(['client@example.com'],['hidden@example.com']);assert.equal((await claim()).length,1);
 assert.equal((await db.query("select count(*)::int n from email_campaign_recipients where status='sending'")).rows[0].n,3);
 await processEnvelope({admin,campaign:first,env,send});assert.equal(sends.length,1);assert.deepEqual(sends[0].to,['client@example.com']);assert.deepEqual(sends[0].cc,['team@example.com']);assert.deepEqual(sends[0].bcc,['hidden@example.com']);assert.equal(sends[0].headers?.Bcc,undefined);assert.equal(sends[0].keepBcc,undefined);assert.doesNotMatch(sends[0].html,/hidden@example.com/);assert.match(sends[0].html,/preferences\?token=/);
 assert.equal((await claim()).length,0);assert.equal((await db.query("select count(*)::int n from email_campaign_recipients where status='accepted'")).rows[0].n,3);
 const repeat=(await db.query("insert into email_campaigns(name,content,tested_hash) values ('Repeat','{}','tested') returning id")).rows[0];await assert.rejects(db.query('select queue_marketing_email($1,$2,$3)',[repeat.id,'{}',JSON.stringify({to:['client@example.com'],cc:[],bcc:[]})]));
 const second=await queue(['new-client@example.com']);await claim();failure=Object.assign(new Error('Network disconnected'),{code:'ECONNECTION'});await processEnvelope({admin,campaign:second,env,send});
 assert.equal((await db.query('select status from email_campaign_recipients where campaign_id=$1',[second.id])).rows[0].status,'uncertain');assert.equal((await claim()).length,0);
 failure=null;const third=await queue(['third-client@example.com'],['another-hidden@example.com']);await claim();partial=true;await processEnvelope({admin,campaign:third,env,send});assert.equal((await claim()).length,0);const states=(await db.query('select status from email_campaign_recipients where campaign_id=$1',[third.id])).rows.map(r=>r.status);assert.ok(states.includes('accepted'));assert.ok(states.includes('failed'));
 const fourth=await queue(['fourth-client@example.com']);await claim();await db.query("update marketing_contacts set suppressed=true where email='fourth-client@example.com'");const before=sends.length;await processEnvelope({admin,campaign:fourth,env,send});assert.equal(sends.length,before);
 await db.exec('set role anon');await assert.rejects(db.query('select queue_marketing_email(null,null,null)'));
 }finally{await db.close();}
});
