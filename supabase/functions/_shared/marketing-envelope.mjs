import {renderMarketing} from './marketing.mjs';
import {contactReady} from './outreach.mjs';
const checked=r=>{if(r.error)throw r.error;return r.data;};
export async function processEnvelope({admin,campaign,env,send}){
 const rows=checked(await admin.from('email_campaign_recipients').select('*').eq('campaign_id',campaign.id).eq('status','sending'));
 const contacts=checked(await admin.from('marketing_contacts').select('*').in('id',rows.map(r=>r.contact_id)));
 const ids=rows.map(r=>r.id),now=()=>new Date().toISOString();
 const update=async values=>checked(await admin.from('email_campaign_recipients').update({...values,updated_at:now()}).in('id',ids));
 const copyIds=new Set(rows.filter(r=>r.recipient_kind==='cc').map(r=>r.contact_id));
 let valid=rows.length>0&&contacts.length===rows.length&&['sending','scheduled'].includes(campaign.status)&&contacts.every(c=>contactReady(c)&&(copyIds.has(c.id)||campaign.content.purpose!=='customer_update'||c.relationship==='customer'));
 const all=[...campaign.envelope.to,...campaign.envelope.cc,...campaign.envelope.bcc];
 valid=valid&&all.length===contacts.length&&contacts.every(c=>all.includes(c.email));
 if(campaign.content.purpose!=='customer_update')for(const c of contacts)if(!copyIds.has(c.id)&&checked(await admin.rpc('marketing_introduction_used',{p_contact:c.id,p_exclude_campaign:campaign.id})))valid=false;
 if(!valid){await update({status:'failed',error:'Recipient group changed, was paused, or includes a do-not-contact address. Review before creating another email.'});checked(await admin.from('email_campaigns').update({status:'completed'}).eq('id',campaign.id).in('status',['sending','scheduled']));return {processed:rows.length,status:'failed'};}
 let result;
 try{
  const preferences=`${env('SUPABASE_URL')}/functions/v1/marketing/preferences?token=${campaign.preference_token}`;
  const message=renderMarketing(campaign.content,{},preferences);
  // One MIME message and SMTP envelope for the entire explicitly chosen group.
  // Nodemailer removes Bcc from MIME headers; never add keepBcc or Bcc headers.
  result=await send({...message,to:campaign.envelope.to,cc:campaign.envelope.cc,bcc:campaign.envelope.bcc,messageId:`<marketing-group-${campaign.id}@${String(env('GMAIL_SMTP_USER')).split('@')[1]}>`});
 }catch(error){
  const temporary=[421,450,451,452].includes(Number(error.responseCode));const permanent=Number(error.responseCode)>=500||['EAUTH','EMAIL_CONFIG'].includes(error.code);
  const retry=temporary&&Math.max(...rows.map(r=>r.attempts))<3;
  const status=retry?'queued':temporary||permanent?'failed':'uncertain';
  await update({status,error:`${error.code||'SMTP'}: ${String(error.response||error.message).slice(0,350)}`,next_attempt_at:new Date(Date.now()+60000*2**Math.max(...rows.map(r=>r.attempts))).toISOString()});
  if(!retry)checked(await admin.from('email_campaigns').update({status:'completed'}).eq('id',campaign.id).in('status',['sending','scheduled']));
  return {processed:rows.length,status};
 }
 const accepted=new Set((result?.accepted||[]).map(v=>String(v.address||v).toLowerCase()));
 for(const c of contacts){const status=accepted.has(c.email)?'accepted':'failed';checked(await admin.from('email_campaign_recipients').update({status,message_id:result?.messageId||'',error:status==='accepted'?'':'SMTP did not accept this recipient. Accepted recipients will not be resent.',updated_at:now()}).eq('campaign_id',campaign.id).eq('contact_id',c.id));}
 checked(await admin.from('email_campaigns').update({status:'completed'}).eq('id',campaign.id).in('status',['sending','scheduled']));
 return {processed:rows.length,status:accepted.size===contacts.length?'accepted':'partial'};
}
