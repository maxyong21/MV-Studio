import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database,client} from './helpers/database.mjs';
import {createReportHandler,redact} from '../supabase/functions/_shared/report-handler.mjs';

const origin='https://studio.example';
const env=overrides=>name=>({ALLOWED_ORIGIN:origin,ENQUIRY_TO_EMAIL:'owner@example.test',...overrides})[name];
const post=(handler,body,{from=origin,ip='203.0.113.5',raw}={})=>handler(new Request('https://project.supabase.co/functions/v1/report-error',{method:'POST',headers:{origin:from,'content-type':'application/json','cf-connecting-ip':ip,'user-agent':'TestBrowser/1.0'},body:raw??JSON.stringify(body)}));

test('redaction removes addresses, tokens, keys and phone numbers',()=>{
  const cleaned=redact('mail jane@example.com Bearer abc.def token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature key sb_secret_AbC123 id 0123456789abcdef0123456789abcdef call +60 12-345 6789');
  for(const secret of ['jane@example.com','abc.def','eyJhbGciOi','sb_secret_AbC123','0123456789abcdef0123456789abcdef','345 6789'])assert.ok(!cleaned.includes(secret),`${secret} must be removed`);
});

test('problem reports are emailed once, limited, redacted, and never fail the visitor',async()=>{
  const db=await database();const mails=[];let failMail=false;
  try{
    const deps={env:env(),createAdmin:()=>client(db),sendMail:async message=>{if(failMail)throw new Error('SMTP down');mails.push(message);return {messageId:'x'};},now:()=>new Date('2026-11-13T02:00:00Z')};
    const handler=createReportHandler(deps);
    const report={kind:'error',message:'Cannot read properties of undefined for jane@example.com',area:'Enquiry form',detail:'at submit (index.js:1:2) Bearer secret-token-value',path:'https://studio.example/projects/abc?email=jane@example.com#top'};

    // Only this website may call it, with a sane method and body.
    assert.equal((await post(handler,report,{from:'https://evil.example'})).status,403);
    assert.equal((await handler(new Request('https://project.supabase.co/functions/v1/report-error',{method:'GET',headers:{origin}}))).status,405);
    assert.equal((await handler(new Request('https://project.supabase.co/functions/v1/report-error',{method:'OPTIONS',headers:{origin}}))).status,204);
    assert.equal((await post(handler,null,{raw:'not json'})).status,400);
    assert.equal((await post(handler,{kind:'error',message:''})).status,400);
    assert.equal((await post(handler,{kind:'made-up',message:'x'})).status,400);
    assert.equal((await post(handler,null,{raw:JSON.stringify({kind:'error',message:'x',detail:'y'.repeat(7000)})})).status,413);
    assert.equal(mails.length,0);

    // A real report: one email, with personal details and the query string removed.
    assert.equal((await post(handler,report)).status,202);assert.equal(mails.length,1);
    assert.deepEqual(mails[0].to,['owner@example.test']);
    assert.equal(mails[0].subject,'Website problem · Cannot read properties of undefined for [email removed]');
    assert.match(mails[0].text,/Where on the site: Enquiry form/);assert.match(mails[0].text,/Page: \/projects\/abc\n/);assert.match(mails[0].text,/Browser: TestBrowser\/1\.0/);assert.match(mails[0].text,/When: 2026-11-13T02:00:00\.000Z/);
    assert.doesNotMatch(mails[0].text,/jane@example\.com|secret-token-value|email=/);assert.equal(mails[0].html,undefined);

    // The same problem is not sent twice in a day, even from another visitor.
    assert.equal((await post(handler,report,{ip:'203.0.113.99'})).status,202);assert.equal(mails.length,1);

    // One visitor can send at most five an hour; further ones are accepted and dropped.
    for(let i=0;i<8;i++)assert.equal((await post(handler,{kind:'error',message:`Different problem ${i}`},{ip:'198.51.100.7'})).status,202);
    assert.equal(mails.length,6,'Five from the second visitor, plus the first report');

    // The whole site sends at most twenty a day.
    for(let i=0;i<30;i++)await post(handler,{kind:'service',message:`Flood ${i}`},{ip:`192.0.2.${i}`});
    assert.equal(mails.length,20);

    // If email is down or not configured, the visitor still gets a normal answer.
    failMail=true;assert.equal((await post(createReportHandler({...deps,createAdmin:()=>client(db)}),{kind:'error',message:'While mail is down'},{ip:'192.0.2.200'})).status,202);
    assert.equal((await post(createReportHandler({...deps,env:env({ENQUIRY_TO_EMAIL:''})}),{kind:'error',message:'No recipient configured'},{ip:'192.0.2.201'})).status,202);
    assert.equal(mails.length,20);
  }finally{await db.close();}
});
