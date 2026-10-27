import {renderEnquiryEmail} from './email-template.mjs';
import {hasPricedSelection} from './enquiry.mjs';
export async function notifyEnquiry({admin,enquiry,env,fetcher=fetch}){
  let status='failed',error='',providerId='';
  try{
    const to=(env('ENQUIRY_TO_EMAIL')||'').split(',').map(v=>v.trim()).filter(Boolean);
    const key=env('RESEND_API_KEY'),from=env('RESEND_FROM_EMAIL');
    if(!to.length||!key||!from)throw new Error('Email environment secrets are not configured.');
    const features=(enquiry.selected_features||[]).map(v=>`${v.name} (${v.billing_type==='quote'?'quote required':`RM ${v.unit_price} / ${v.billing_type}`})`).join('\n')||'No feature selected';
    const lines=[`Name: ${enquiry.name}`,`Company: ${enquiry.company_name}`,`Phone: ${enquiry.phone}`,`Email: ${enquiry.email}`,'',`Features:\n${features}`,'',`One-time estimate: RM ${enquiry.one_time_estimate}`,`Monthly estimate: RM ${enquiry.monthly_estimate}`,`Annual estimate: RM ${enquiry.annual_estimate}`,`Billing preference: ${enquiry.billing_period}`,`Meeting requested: ${enquiry.meeting_requested?'Yes':'No'}`,`Preferred time (UTC): ${enquiry.preferred_meeting_at||'To be agreed'}`,'',enquiry.message||'No additional message','',`Reference: ${enquiry.id}`];
    if(!hasPricedSelection(enquiry.selected_features||[])){const index=lines.findIndex(line=>line.startsWith('One-time estimate:'));if(index>=0)lines.splice(index,3,'Manual quotation required. Scope and pricing are to be discussed.');}
    if(enquiry.chatbot_answers){lines.push('',`Confirmed chatbot brief: ${enquiry.chatbot_answers.brief||''}`,...(enquiry.chatbot_answers.summary||[]).map(v=>`${v.label}: ${v.value}`),'Preliminary estimate; the complete scope needs manual review.');}
    const response=await fetcher('https://api.resend.com/emails',{
      method:'POST',signal:AbortSignal.timeout(10000),
      headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`enquiry/${enquiry.id}`},
      body:JSON.stringify({from,to,reply_to:enquiry.email,subject:`Website enquiry · ${enquiry.company_name.replace(/[\r\n]/g,' ')}`,text:lines.join('\n'),html:renderEnquiryEmail(enquiry)}),
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(`Resend ${response.status}: ${String(result.message||result.name||'Notification rejected').slice(0,500)}`);
    if(!result.id)throw new Error('Email provider did not return a message reference.');
    status='sent';providerId=result.id;
  }catch(cause){error=String(cause.message||'Email notification failed.').slice(0,1000);}
  const {error:saveError}=await admin.from('enquiries').update({notification_status:status,notification_error:error,resend_email_id:providerId,updated_at:new Date().toISOString()}).eq('id',enquiry.id);
  if(saveError)console.error('Could not record enquiry email state',saveError.code);
  return status;
}
