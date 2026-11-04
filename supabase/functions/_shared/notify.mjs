import {renderEnquiryEmail} from './email-template.mjs';
import {hasPricedSelection} from './enquiry.mjs';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const cleanHeader=value=>String(value||'').replace(/[\r\n\u0000-\u001f\u007f]/g,' ').trim();
const addressPattern=/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const retryableSmtpResponse=error=>[421,450,451,452].includes(Number(error?.responseCode));

export function createGmailSendMail(nodemailer,env){
  return async message=>{
    const username=String(env('GMAIL_SMTP_USER')||'').trim();
    const password=String(env('GMAIL_SMTP_APP_PASSWORD')||'').replace(/\s/g,'');
    if(!username||!password)throw Object.assign(new Error('Gmail SMTP is not configured. Add GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD to Supabase Edge Function secrets.'),{code:'EMAIL_CONFIG'});
    if(!addressPattern.test(username))throw Object.assign(new Error('GMAIL_SMTP_USER must be a valid Gmail address.'),{code:'EMAIL_CONFIG'});
    const transport=nodemailer.createTransport({
      host:'smtp.gmail.com',port:465,secure:true,
      auth:{user:username,pass:password},
      connectionTimeout:8000,greetingTimeout:8000,socketTimeout:15000,
      tls:{minVersion:'TLSv1.2'},
    });
    try{
      return await transport.sendMail({...message,from:{name:cleanHeader(env('GMAIL_FROM_NAME')||'MV Studio'),address:username}});
    }finally{transport.close();}
  };
}

export async function notifyEnquiry({admin,enquiry,env,sendMail}){
  let status='failed',error='',providerId='';
  try{
    const to=(env('ENQUIRY_TO_EMAIL')||'').split(',').map(value=>value.trim()).filter(Boolean);
    if(!to.length||to.some(value=>!addressPattern.test(value)))throw Object.assign(new Error('Email configuration is incomplete. Check ENQUIRY_TO_EMAIL and Gmail SMTP secrets.'),{code:'EMAIL_CONFIG'});
    if(!env('GMAIL_SMTP_USER')||!env('GMAIL_SMTP_APP_PASSWORD'))throw Object.assign(new Error('Email configuration is incomplete. Set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD in Supabase Edge Function secrets.'),{code:'EMAIL_CONFIG'});
    if(typeof sendMail!=='function')throw Object.assign(new Error('Gmail SMTP transport is unavailable. Deploy the updated submit-enquiry and retry-enquiry functions.'),{code:'EMAIL_TRANSPORT'});
    const features=(enquiry.selected_features||[]).map(item=>`${item.name} (${item.billing_type==='quote'?'quote required':`RM ${item.unit_price} / ${item.billing_type}`})`).join('\n')||'No feature selected';
    const lines=[`Name: ${enquiry.name}`,`Company: ${enquiry.company_name}`,`Phone: ${enquiry.phone}`,`Email: ${enquiry.email}`,'',`Features:\n${features}`,'',`One-time estimate: RM ${enquiry.one_time_estimate}`,`Monthly estimate: RM ${enquiry.monthly_estimate}`,`Annual estimate: RM ${enquiry.annual_estimate}`,`Billing preference: ${enquiry.billing_period}`,`Meeting requested: ${enquiry.meeting_requested?'Yes':'No'}`,`Preferred time (UTC): ${enquiry.preferred_meeting_at||'To be agreed'}`,'',enquiry.message||'No additional message','',`Reference: ${enquiry.id}`];
    if(!hasPricedSelection(enquiry.selected_features||[])){const index=lines.findIndex(line=>line.startsWith('One-time estimate:'));if(index>=0)lines.splice(index,3,'Manual quotation required. Scope and pricing are to be discussed.');}
    if(enquiry.chatbot_answers){lines.push('',`Confirmed chatbot brief: ${enquiry.chatbot_answers.brief||''}`,...(enquiry.chatbot_answers.summary||[]).map(item=>`${item.label}: ${item.value}`),'Preliminary estimate; the complete scope needs manual review.');}
    const message={
      to,replyTo:enquiry.email,
      subject:`Website enquiry · ${cleanHeader(enquiry.company_name)}`,
      text:lines.join('\n'),html:renderEnquiryEmail(enquiry),
      // A stable Message-ID helps diagnosis and client threading. Gmail SMTP does not
      // promise exactly-once delivery, so ambiguous failures remain manually retryable.
      messageId:`<mv-studio-enquiry-${enquiry.id}@${String(env('GMAIL_SMTP_USER')).split('@')[1]}>`,
    };
    let result;
    for(let attempt=1;attempt<=2;attempt++){
      try{result=await sendMail(message);break;}
      catch(cause){
        if(attempt===1&&retryableSmtpResponse(cause)){await sleep(500);continue;}
        throw cause;
      }
    }
    if(!result?.messageId)throw new Error('Gmail SMTP did not return a message reference.');
    status='sent';providerId=String(result.messageId).slice(0,500);
  }catch(cause){
    const code=String(cause?.code||'SMTP_ERROR').replace(/[^A-Z0-9_-]/gi,'').slice(0,40);
    const response=String(cause?.response||cause?.message||'Gmail SMTP delivery failed.').replace(/[\r\n\u0000-\u001f\u007f]/g,' ').slice(0,400);
    error=`${code}: ${response}`;
    console.error('Gmail SMTP notification failed',code,Number(cause?.responseCode)||'');
  }
  const {error:saveError}=await admin.from('enquiries').update({notification_status:status,notification_error:error,email_message_id:providerId,updated_at:new Date().toISOString()}).eq('id',enquiry.id);
  if(saveError){console.error('Could not record enquiry email state',saveError.code);throw Object.assign(new Error('The enquiry is saved, but its email status could not be recorded. Refresh later; a stale notification can be retried.'),{code:'EMAIL_STATE_SAVE'});}
  return status;
}
