import {contactReady} from '../_shared/outreach.mjs';
import {parseRecipients} from '../_shared/email-recipients.mjs';
import {processEnvelope} from '../_shared/marketing-envelope.mjs';
import {createClient} from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@10.3.1';
import {createGmailSendMail} from '../_shared/notify.mjs';
import {renderMarketing,validateCampaign,emailPattern} from '../_shared/marketing.mjs';
import {originAllowed,headersFor,json,readInput,digest} from '../_shared/http.mjs';
const env=(key:string)=>Deno.env.get(key),send=createGmailSendMail(nodemailer,env);
const db=()=>createClient(env('SUPABASE_URL')!,env('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const checked=(r:any,stage='')=>{if(r.error)throw Object.assign(new Error(r.error.message),{code:r.error.code,stage});return r.data;};
const fail=(message:string)=>{throw new Error(message);};
const unsubscribeUrl=(token:string)=>`${env('SUPABASE_URL')}/functions/v1/marketing/unsubscribe?token=${encodeURIComponent(token)}`;
async function processOne(admin:any){
 const rows=checked(await admin.rpc('claim_marketing_send',{p_limit:Number(env('MARKETING_DAILY_LIMIT')||50)}));
 if(!rows?.length)return {idle:true};const item=rows[0];
 const campaign=checked(await admin.from('email_campaigns').select('*').eq('id',item.campaign_id).single());
 if(campaign.envelope)return processEnvelope({admin,campaign,env,send});
 const contact=checked(await admin.from('marketing_contacts').select('*').eq('id',item.contact_id).single());
 let state:any={status:'suppressed',error:'Contact is no longer eligible, or campaign was paused.'};
 const used=campaign.content.purpose!=='customer_update'&&checked(await admin.rpc('marketing_introduction_used',{p_contact:contact.id,p_exclude_campaign:campaign.id}));
 if(['sending','scheduled'].includes(campaign.status)&&contactReady(contact)&&!used&&(campaign.content.purpose!=='customer_update'||contact.relationship==='customer')){
  try{
   const url=unsubscribeUrl(contact.unsubscribe_token),message=renderMarketing(campaign.content,contact,url);
   const result=await send({...message,to:contact.email,headers:{'List-Unsubscribe':`<${url}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'},messageId:`<marketing-${item.id}@${String(env('GMAIL_SMTP_USER')).split('@')[1]}>`});
   state=result.accepted?.length?{status:'accepted',message_id:result.messageId,error:''}:{status:'failed',error:'SMTP did not accept the recipient.'};
  }catch(error:any){const temporary=[421,450,451,452].includes(Number(error.responseCode));const permanent=Number(error.responseCode)>=500||['EAUTH','EMAIL_CONFIG'].includes(error.code);state={status:temporary&&item.attempts<3?'queued':permanent||temporary?'failed':'uncertain',error:`${error.code||'SMTP'}: ${String(error.response||error.message).slice(0,350)}`,next_attempt_at:new Date(Date.now()+60000*2**item.attempts).toISOString()};
   if([550,551,553].includes(Number(error.responseCode)))checked(await admin.from('marketing_contacts').update({suppressed:true,suppression_reason:'SMTP permanent recipient rejection; review before re-enabling.'}).eq('id',contact.id));
  }
 }
 checked(await admin.from('email_campaign_recipients').update({...state,updated_at:new Date().toISOString()}).eq('id',item.id));
 const pending=checked(await admin.from('email_campaign_recipients').select('id').eq('campaign_id',campaign.id).in('status',['queued','sending']).limit(1));
 if(!pending.length)checked(await admin.from('email_campaigns').update({status:'completed'}).eq('id',campaign.id).in('status',['sending','scheduled']));
 return {processed:1,status:state.status};
}
Deno.serve(async request=>{
 const origin=request.headers.get('origin'),reply=(body:any,status=200)=>json(body,status,origin,env);
 let adminVerified=false;
 try{
 const admin=db(),url=new URL(request.url);
 if(url.pathname.endsWith('/preferences')){
  const token=url.searchParams.get('token')||'';
  const html=(content:string,status=200)=>new Response(`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email preferences | MV Studio</title><body style="font:18px Arial;background:#f3f4ef;padding:8%;color:#254d3e"><main style="max-width:560px">${content}</main></body></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"}});
  if(!/^[a-f0-9-]{36}$/i.test(token))return html('<h1>Invalid preference link</h1>',400);
  if(request.method==='GET')return html('<h1>Prefer no further outreach?</h1><p>Enter the address that received this email. We will record your request without showing any other recipients.</p><form method="post"><label>Email address <input name="email" type="email" required maxlength="254" style="padding:12px;width:100%;box-sizing:border-box;margin:12px 0"></label><button style="padding:12px">Do not contact me</button></form>');
  if(request.method!=='POST')return html('Method not allowed.',405);
  const body=await request.text();if(new TextEncoder().encode(body).length>4096)return html('Request too large.',413);
  const email=String(new URLSearchParams(body).get('email')||'').trim().toLowerCase();if(!emailPattern.test(email)||email.length>254)return html('Enter a valid email address and try again.',400);
  const budget=checked(await admin.rpc('consume_enquiry_rate_limit',{p_key:await digest(`preferences:${token}:${request.headers.get('cf-connecting-ip')||'unknown'}`),p_max:20,p_window_seconds:3600}));if(!budget)return html('Too many attempts. Please try again later.',429);
  const campaign=checked(await admin.from('email_campaigns').select('envelope').eq('preference_token',token).maybeSingle());
  if(campaign?.envelope&&['to','cc','bcc'].some(k=>campaign.envelope[k]?.includes(email)))checked(await admin.from('marketing_contacts').update({suppressed:true,suppression_reason:'Requested no further outreach'}).eq('email',email));
  return html('<h1>Request recorded</h1><p>If this address belongs to this email, it has been marked for no further outreach.</p>');
 }
 if(url.pathname.endsWith('/unsubscribe')){
  const token=url.searchParams.get('token')||'';if(!/^[a-f0-9-]{36}$/i.test(token))return new Response('Invalid unsubscribe link.',{status:400});
  const html=(content:string)=>new Response(`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email preferences | MV Studio</title><body style="font:18px Arial;background:#f3f4ef;padding:10%;color:#254d3e"><main>${content}</main></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",'Referrer-Policy':'no-referrer'}});
  if(request.method==='GET')return html(`<h1>Email preferences</h1><p>Ask MV Studio not to send further outreach emails. Replies to your enquiries are unaffected.</p><form method="post"><button style="padding:14px">Do not contact me</button></form>`);
  if(request.method!=='POST')return new Response('Method not allowed',{status:405});
  checked(await admin.from('marketing_contacts').update({suppressed:true,suppression_reason:'Unsubscribed'}).eq('unsubscribe_token',token));
  return html('<h1>Your do-not-contact request is recorded.</h1><p>Your request has been recorded.</p>');
 }
 if(request.method==='OPTIONS')return new Response(null,{status:originAllowed(origin,env)?204:403,headers:headersFor(origin,env)});
 if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
 const token=request.headers.get('authorization')?.replace(/^Bearer /i,'')||'';
 const worker=!!env('MARKETING_WORKER_SECRET')&&token===env('MARKETING_WORKER_SECRET');
 if(worker)return reply(await processOne(admin));
 if(!originAllowed(origin,env))return reply({error:'Origin is not allowed.'},403);
 const auth=await admin.auth.getUser(token);if(auth.error||!auth.data.user)return reply({error:'Sign in again.'},401);
 const member=checked(await admin.from('admin_users').select('user_id').eq('user_id',auth.data.user.id).maybeSingle());if(!member)return reply({error:'Administrator access required.'},403);
 adminVerified=true;
 const input=await readInput(request),action=input.action;
 if(action==='list'){
  const result:any={};
  for(const table of ['marketing_contacts','email_templates','email_campaigns','email_campaign_recipients'])result[table]=checked(await admin.from(table).select('*').order(table==='email_campaign_recipients'?'updated_at':'created_at',{ascending:false}).limit(1000),table);
  result.team_members=checked(await admin.from('team_members').select('id,name,email,phone,website_url,active,sort_order').order('sort_order',{ascending:true}),'team_members');
  const history=checked(await admin.rpc('marketing_introduction_history',{}),'marketing_introduction_history');
  const blocked=new Set((history||[]).map((r:any)=>r.contact_id));result.marketing_contacts=result.marketing_contacts.map((c:any)=>({...c,intro_blocked:blocked.has(c.id)}));return reply(result);
 }
 if(action==='process')return reply(await processOne(admin));
 if(action==='contact'){
  const c=input.contact,email=String(c.email||'').trim().toLowerCase();if(!emailPattern.test(email)||email.length>254)fail('Enter a valid email address.');
  const consent=!!c.consent_at;if(!c.contact_source?.trim()||!c.outreach_note?.trim()) {if(!consent||!c.consent_source?.trim()||!c.consent_notice?.trim())fail('Record the address source and reason for contacting this business.');}
  const value={relationship:c.relationship==='customer'?'customer':'prospect',contact_source:String(c.contact_source||'').slice(0,1000),outreach_note:String(c.outreach_note||'').slice(0,2000),email,first_name:String(c.first_name||'').slice(0,100),company_name:String(c.company_name||'').slice(0,200),industry:String(c.industry||'general').slice(0,80),language:String(c.language||'en').slice(0,10),consent_at:consent?new Date(c.consent_at).toISOString():null,consent_source:String(c.consent_source||'').slice(0,1000),consent_notice:String(c.consent_notice||'').slice(0,2000)};
  if(c.id){const previous=checked(await admin.from('marketing_contacts').select('email').eq('id',c.id).single());if(previous.email!==email)fail('Add a new contact for a different email address and record its source and relevance separately.');checked(await admin.from('marketing_contacts').update(value).eq('id',c.id));}else checked(await admin.from('marketing_contacts').insert(value));return reply({ok:true});
 }
 if(action==='suppress'){checked(await admin.from('marketing_contacts').update({suppressed:true,suppression_reason:'Suppressed by administrator'}).eq('id',input.id));return reply({ok:true});}
 if(action==='template'){
  const t=input.template;if(!t.name?.trim())fail('Give the template a name.');
  const value={name:t.name.slice(0,120),industry:t.industry,language:t.language,content:t.content,archived:!!t.archived,version:(Number(t.version)||0)+1};
  if(t.id)checked(await admin.from('email_templates').update(value).eq('id',t.id));else checked(await admin.from('email_templates').insert(value));return reply({ok:true});
 }
 if(action==='save'){
  const errors=validateCampaign(input.content);if(Object.keys(errors).length)return reply({error:'Review the highlighted campaign and signature fields.',errors},400);
  const parsed=input.envelope===undefined?null:parseRecipients(input.envelope);
  if(parsed){const errors={...parsed.errors};if(!parsed.count&&!String(input.envelope.to||'').trim())delete errors.to;if(Object.keys(errors).length)return reply({error:'Review the recipient addresses.',errors:Object.fromEntries(Object.entries(errors).map(([k,v])=>[`recipients.${k}`,v]))},400);}
  const value={name:input.content.name,content:input.content,tested_hash:null,...(parsed?{envelope:parsed.recipients}:{})};
  const result=input.id?checked(await admin.from('email_campaigns').update(value).eq('id',input.id).eq('status','draft').select().single()):checked(await admin.from('email_campaigns').insert(value).select().single());return reply({campaign:result});
 }
 const campaign=input.id?checked(await admin.from('email_campaigns').select('*').eq('id',input.id).single()):null;
 if(action==='send_email'){
  if(campaign?.status!=='draft'||campaign.tested_hash!==await digest(JSON.stringify(campaign.content)))fail('Save and test the current draft first.');
  const parsed=parseRecipients(input.envelope);if(Object.keys(parsed.errors).length)return reply({error:'Review the recipient addresses.',errors:Object.fromEntries(Object.entries(parsed.errors).map(([k,v])=>[`recipients.${k}`,v]))},400);
  if(parsed.count>Math.min(200,Math.max(1,Number(env('MARKETING_DAILY_LIMIT')||50))))fail('This recipient group exceeds the configured daily marketing limit. Use a smaller group.');
  if(['to','cc','bcc'].some(k=>JSON.stringify(parsed.recipients[k])!==JSON.stringify(campaign.envelope?.[k]||[])))fail('Recipients changed. Save and test the draft again.');
  const errors=validateCampaign(campaign.content);if(Object.keys(errors).length)return reply({error:'Review the highlighted email fields.',errors},400);
  const scheduled=input.scheduled_at?new Date(input.scheduled_at).toISOString():null;
  checked(await admin.rpc('queue_marketing_email',{p_id:campaign.id,p_content:campaign.content,p_envelope:parsed.recipients,p_schedule:scheduled}),'queue_marketing_email');return reply({ok:true});
 }
 if(action==='test'){
  if(!campaign||campaign.status!=='draft')fail('Save a draft first.');
  const errors=validateCampaign(campaign.content);if(Object.keys(errors).length)return reply({error:'Complete the highlighted fields, save the draft, and test again.',errors},400);
  const rate=checked(await admin.rpc('consume_enquiry_rate_limit',{p_key:await digest(`marketing-test:${auth.data.user.id}`),p_max:5,p_window_seconds:3600}));if(!rate)fail('Test email limit reached. Try again in an hour.');
  const message=renderMarketing(campaign.content,campaign.envelope?{}:{first_name:'Team',company_name:'Preview company'},`${env('SUPABASE_URL')}/functions/v1/marketing/unsubscribe?token=00000000-0000-0000-0000-000000000000`);
  const result=await send({...message,subject:`[TEST] ${message.subject}`,to:auth.data.user.email});if(!result.accepted?.length)fail('SMTP did not accept the test email.');
  checked(await admin.from('email_campaigns').update({tested_hash:await digest(JSON.stringify(campaign.content))}).eq('id',campaign.id).eq('status','draft'));return reply({ok:true,message:'Gmail accepted the test. Check your inbox and Spam before sending.'});
 }
 if(action==='start'){
  if(campaign?.status!=='draft'||campaign.tested_hash!==await digest(JSON.stringify(campaign.content)))fail('Save and test the current draft first.');
  const ids=[...new Set(input.contact_ids||[])];if(!ids.length||ids.length>200)fail('Choose between 1 and 200 recipients for this pilot.');
  const contacts=checked(await admin.from('marketing_contacts').select('*').in('id',ids));if(contacts.length!==ids.length||contacts.some((c:any)=>!contactReady(c)||(campaign.content.purpose==='customer_update'&&c.relationship!=='customer')))fail('Some contacts are not eligible. Refresh and review recipient eligibility.');
  const scheduled=input.scheduled_at?new Date(input.scheduled_at).toISOString():null;if(scheduled&&new Date(scheduled)<=new Date())fail('Choose a future schedule.');
  checked(await admin.rpc('start_marketing_campaign',{p_id:campaign.id,p_content:campaign.content,p_contacts:ids,p_schedule:scheduled}));return reply({ok:true});
 }
 if(action==='status'){
  const allowed:any={sending:['paused','cancelled'],scheduled:['paused','cancelled'],paused:['sending','cancelled']};if(!allowed[campaign?.status]?.includes(input.status))fail('This campaign cannot make that transition.');
  checked(await admin.from('email_campaigns').update({status:input.status}).eq('id',campaign.id).eq('status',campaign.status).select().single());return reply({ok:true});
 }
 return reply({error:'Unknown action.'},400);
 }catch(error:any){
  console.error('Marketing request failed',{code:error.code||error.name,stage:error.stage||'request'});
  let message=error.code==='23505'?'This address already exists. Edit its contact record instead.':error.code==='P0001'?'The audience or draft changed. Refresh and check previous introductions, do-not-contact status, and the customer update reason.':error.code?'Marketing data is unavailable. Apply the marketing migrations and check function logs.':String(error.message||'Request failed. Your saved draft is safe.').slice(0,400);
  if(adminVerified&&error.code==='42501')message=error.stage==='team_members'?'The marketing function cannot read Team. Run: GRANT SELECT ON public.team_members TO service_role;':'The marketing function lacks database privileges. Check the service_role grants in the marketing migrations.';
  if(adminVerified&&['PGRST202','42883'].includes(error.code))message='An email database function is missing. Apply the outreach and 20261111_email_composer.sql migrations, then retry.';
  if(adminVerified&&['42P01','42703','PGRST204','PGRST205'].includes(error.code))message='A required email table or column is missing. Apply the marketing, outreach, team contacts and 20261111_email_composer.sql migrations, then retry.';
  return reply({error:message,...(adminVerified&&error.code?{code:error.code,stage:error.stage||'request'}:{})},400);
 }
});
