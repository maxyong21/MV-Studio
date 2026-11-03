import {must,stateFor,catalogueFor,releaseFor,chunksFor} from '../chatbot/data.mjs';
import {answerQuestion} from '../chatbot/answer.mjs';
import {transition} from './flow.mjs';
import {phoneKey,verifyReference} from './security.mjs';
import {createSubmitHandler} from '../submit-handler.mjs';
import {digest} from '../http.mjs';

export const serviceWindow=(date,now=Date.now())=>Boolean(date&&now-new Date(date).getTime()<24*3600_000&&new Date(date).getTime()<=now+60_000);
export function messageContent(out){
  const buttons=(out.buttons||[]).slice(0,3);
  if(buttons.length&&out.body.length<=1024)return {type:'interactive',interactive:{type:'button',body:{text:out.body},action:{buttons:buttons.map(b=>({type:'reply',reply:{id:b.id,title:b.title.slice(0,20)}}))}}};
  return {type:'text',text:{body:out.body+(buttons.length?'\n\nReply with: '+buttons.map(b=>`${b.id.toUpperCase()} (${b.title})`).join(' / '):''),preview_url:false}};
}
const update=async(admin,table,id,values)=>must(await admin.from(table).update(values).eq('id',id));
export async function processEvent(admin,job,{env,fetcher=fetch}){
  const {event,conversation,token}=job;
  let customerAt=conversation.last_customer_at;
  try{
    if(event.kind==='customer'){
      const timestamp=new Date(Number(event.payload.timestamp)*1000);
      if(Number.isFinite(timestamp.getTime())&&timestamp.getTime()<=Date.now()+60_000&&(!customerAt||timestamp>new Date(customerAt)))customerAt=timestamp.toISOString();
    }
    if(['retry_send','resolve_send'].includes(event.kind)){
      if(conversation.assigned_to!==event.actor_id)throw new Error('Claim the conversation first.');
      const out=must(await admin.from('whatsapp_outbox').select('*').eq('id',event.payload.id).eq('conversation_id',conversation.id).single());
      if(!out||!['failed','uncertain'].includes(out.status))throw new Error('This message is not waiting for delivery review.');
      if(event.kind==='retry_send'&&!serviceWindow(customerAt))throw new Error('The 24-hour service window expired. The customer must message again.');
      if(event.kind==='retry_send'&&out.status==='uncertain')throw new Error('Resolve uncertain delivery before sending another message.');
      await update(admin,'whatsapp_outbox',out.id,{status:event.kind==='retry_send'?'queued':'cancelled',error:event.kind==='resolve_send'?'Resolved by administrator; not resent.':''});
      must(await admin.rpc('whatsapp_finish',{p_event:event.id,p_token:token,p_state:conversation.state,p_assigned:conversation.assigned_to,p_enquiry:conversation.enquiry_id,p_customer_at:customerAt,p_reply:null}));return;
    }
    const settings=must(await admin.from('whatsapp_settings').select('*').eq('id',1).single());
    // Recover a saved submission if the previous execution ended before committing its session.
    if(event.kind==='customer'&&/^submit$/i.test(event.payload.text||'')&&conversation.state.mode==='review'&&conversation.state.submission_id){
      const saved=must(await admin.from('enquiries').select('id').eq('request_id',conversation.state.submission_id).maybeSingle());
      if(saved){must(await admin.rpc('whatsapp_finish',{p_event:event.id,p_token:token,p_state:{...conversation.state,mode:'queued',submitted:true},p_assigned:conversation.assigned_to,p_enquiry:saved.id,p_customer_at:customerAt,p_reply:serviceWindow(customerAt)?{text:settings.handoff_message,buttons:[]}:null}));return;}
    }
    const state=await stateFor(admin);
    const release=settings.enabled&&state.enabled&&state.active_release_id?await releaseFor(admin,state.active_release_id):null;
    const catalogue=release?await catalogueFor(admin):[];
    const next=await transition(conversation,event,{
      settings,release,catalogue,
      link:async(reference,phone)=>{
        const id=await verifyReference(reference,env);if(!id)return null;
        const row=must(await admin.from('enquiries').select('id,phone').eq('id',id).maybeSingle());
        return row&&phoneKey(row.phone)===phoneKey(phone)?row.id:null;
      },
      answer:async text=>{
        // First release is deliberately deterministic: published excerpts + BM25.
        const approved={...release,snapshot:{...release.snapshot,settings:{...release.snapshot.settings,answer_mode:'extractive',retrieval_mode:'keyword'}}};
        return answerQuestion(text,approved,await chunksFor(admin,release.id),{admin,env,fetcher});
      },
      submit:async(s,quote)=>{
        // Reuse the same catalogue-revision guarded estimate and enquiry submission path.
        const previous=must(await admin.from('enquiries').select('id').eq('request_id',s.submission_id).maybeSingle());
        if(previous)return {ok:true,id:previous.id};
        const estimateToken=await digest(`wa:${s.submission_id}:${env('WHATSAPP_LINK_SECRET')}`);
        let estimate=must(await admin.from('chatbot_estimates').select('id').eq('token_hash',await digest(estimateToken)).maybeSingle());
        if(!estimate){estimate=must(await admin.from('chatbot_estimates').insert({token_hash:await digest(estimateToken),release_id:release.id,catalog_revision:state.catalog_revision,answers:quote.answers,brief:'WhatsApp guided enquiry',selected_feature_ids:quote.selected_feature_ids,billing_period:quote.billing_period,quote}).select('id').single());}
        const handler=createSubmitHandler({createAdmin:()=>admin,env,fetcher});
        const response=await handler(new Request('https://internal.invalid/submit-enquiry',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':`whatsapp:${conversation.phone}`},body:JSON.stringify({...s.contact,message:quote.summary.map(v=>`${v.label}: ${v.value}`).join('\n').slice(0,3000),request_id:s.submission_id,chatbot_estimate_id:estimate.id,chatbot_estimate_token:estimateToken,estimate_confirmed:true,billing_period:quote.billing_period,website:''})}));
        return {...await response.json(),status:response.status};
      }
    });
    // Delayed webhook delivery does not extend WhatsApp's actual service window.
    if(next.reply&&!serviceWindow(customerAt))next.reply=null;
    if(event.kind==='reply'&&!serviceWindow(customerAt))throw new Error('The 24-hour service window expired. The customer must message again.');
    const committed=must(await admin.rpc('whatsapp_finish',{p_event:event.id,p_token:token,p_state:next.state,p_assigned:next.assigned,p_enquiry:next.enquiry,p_customer_at:customerAt,p_reply:next.reply}));
    if(!committed)throw new Error('Conversation lease expired before completion.');
  }catch(error){
    const message=String(error.message||error.code||'WhatsApp processing failed').slice(0,500);
    if(event.kind!=='customer'){
      must(await admin.rpc('whatsapp_finish',{p_event:event.id,p_token:token,p_state:{...conversation.state,last_admin_error:message},p_assigned:conversation.assigned_to,p_enquiry:conversation.enquiry_id,p_customer_at:customerAt,p_reply:null}));
    }else{
      console.error('WhatsApp event processing failed',event.id,error.code||error.name);
      must(await admin.rpc('whatsapp_finish',{p_event:event.id,p_token:token,p_state:conversation.state,p_assigned:conversation.assigned_to,p_enquiry:conversation.enquiry_id,p_customer_at:customerAt,p_reply:null,p_error:message}));
    }
  }
}

export async function deliver(admin,out,{env,fetcher=fetch}){
  const conversation=must(await admin.from('whatsapp_conversations').select('*').eq('id',out.conversation_id).single());
  if(!serviceWindow(conversation.last_customer_at)){await update(admin,'whatsapp_outbox',out.id,{status:'failed',error:'24-hour service window expired. Ask the customer to message again; approved-template follow-up is not sent automatically.'});return;}
  const content=messageContent(out);
  try{
    const response=await fetcher(`https://graph.facebook.com/${env('WHATSAPP_API_VERSION')}/${env('WHATSAPP_PHONE_NUMBER_ID')}/messages`,{method:'POST',headers:{Authorization:`Bearer ${env('WHATSAPP_ACCESS_TOKEN')}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:conversation.phone,...content}),signal:AbortSignal.timeout(20_000)});
    const data=await response.json();
    if(!response.ok){await update(admin,'whatsapp_outbox',out.id,{status:'failed',error:`Meta rejected message (${data.error?.code||response.status}). Check credentials, permissions, number and messaging window.`});return;}
    if(!data.messages?.[0]?.id)throw new Error('Meta returned no message reference.');
    await update(admin,'whatsapp_outbox',out.id,{status:'sent',provider_id:data.messages[0].id,provider_status:'accepted',error:''});
    must(await admin.rpc('whatsapp_receipt',{p_provider:data.messages[0].id,p_status:'accepted',p_code:''}));
  }catch(error){
    // Network timeout or DB failure after send: delivery may have occurred.
    await update(admin,'whatsapp_outbox',out.id,{status:'uncertain',error:'Delivery could not be confirmed. Review the chat before composing another message.'});
  }
}

export async function runWorker(admin,deps,{limit=8}={}){
  if(deps.env('WHATSAPP_ENABLED')!=='true')return;
  for(let i=0;i<limit;i++){const job=must(await admin.rpc('whatsapp_claim',{}));if(!job)break;await processEvent(admin,job,deps);}
  for(let i=0;i<limit;i++){const out=must(await admin.rpc('whatsapp_claim_outbox',{}));if(!out)break;await deliver(admin,out,deps);}
  for(let i=0;i<limit;i++){
    const alert=must(await admin.rpc('whatsapp_claim_alert',{}));if(!alert)break;
    const c=must(await admin.from('whatsapp_conversations').select('phone,state').eq('id',alert.conversation_id).single());
    if(['stopped','closed'].includes(c.state.mode)){must(await admin.from('whatsapp_team_alerts').update({status:'cancelled',error:'Conversation ended before this notification was sent.'}).eq('event_id',alert.event_id));continue;}
    let status='failed',error='',provider_id=null;
    try{
      const env=deps.env,to=(env('ENQUIRY_TO_EMAIL')||'').split(',').map(v=>v.trim()).filter(Boolean);
      if(!env('RESEND_API_KEY')||!env('RESEND_FROM_EMAIL')||!to.length)throw new Error('Resend notification secrets are missing. The request is available in the admin WhatsApp inbox.');
      const text=`A WhatsApp customer requested human assistance.\nPhone: +${c.phone}\nConversation: ${alert.conversation_id}\nOpen Admin > WhatsApp inbox to review the context and claim the request.`;
      const response=await (deps.fetcher||fetch)('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env('RESEND_API_KEY')}`,'Content-Type':'application/json','Idempotency-Key':`whatsapp-handoff/${alert.event_id}`},body:JSON.stringify({from:env('RESEND_FROM_EMAIL'),to,subject:'MV Studio: WhatsApp assistance requested',text,html:`<div style="font-family:Arial,sans-serif;line-height:1.7;background:#f2f5ef;padding:28px;color:#173d28"><h2>New WhatsApp assistance request</h2><p>A customer at <strong>+${c.phone}</strong> would like to speak with your team.</p><p>Open <strong>Admin → WhatsApp inbox</strong> to review their requirements and claim the conversation.</p><small>Conversation: ${alert.conversation_id}</small></div>`}),signal:AbortSignal.timeout(10_000)});
      const body=await response.json();if(!response.ok||!body.id)throw new Error(`Resend rejected the notification (${response.status}). Check sender and recipient restrictions.`);
      status='sent';provider_id=body.id;
    }catch(cause){error=String(cause.message||'Team notification failed').slice(0,500);}
    must(await admin.from('whatsapp_team_alerts').update({status,error,provider_id}).eq('event_id',alert.event_id));
  }
}
