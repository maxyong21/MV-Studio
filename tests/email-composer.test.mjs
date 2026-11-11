import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,client} from './helpers/database.mjs';
import {parseRecipients} from '../supabase/functions/_shared/email-recipients.mjs';
import {processEnvelope} from '../supabase/functions/_shared/marketing-envelope.mjs';
test('To/Cc/Bcc parsing validates addresses and prevents duplicates and header injection',()=>{
 const parsed=parseRecipients({to:'Client <client@example.com>; second@example.com',cc:'team@example.com',bcc:'private@example.com'});
 assert.deepEqual(parsed.errors,{});assert.equal(parsed.count,4);assert.deepEqual(parsed.recipients.to,['client@example.com','second@example.com']);
 assert.ok(parseRecipients({to:'bad'}).errors.to);assert.ok(parseRecipients({to:'a@example.com',bcc:'A@example.com'}).errors.bcc);assert.ok(parseRecipients({to:'a@example.com\rBcc:evil@example.com'}).errors.to);assert.ok(parseRecipients({cc:'a@example.com'}).errors.to);
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
