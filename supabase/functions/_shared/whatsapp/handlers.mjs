import {headersFor,originAllowed,json,readInput,digest} from '../http.mjs';
import {requireAdmin,must,ChatError} from '../chatbot/data.mjs';
import {uuidPattern} from '../enquiry.mjs';
import {equal,signature} from './security.mjs';
import {runWorker,serviceWindow} from './worker.mjs';
const plain=(body,status=200)=>new Response(body,{status,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
const safeError=error=>error instanceof ChatError?error.message:'WhatsApp service is unavailable. Check function logs and database setup.';

export function createWebhook({createAdmin,env,fetcher=fetch,background=promise=>promise.catch(()=>{})}){
  return async request=>{
    const url=new URL(request.url);
    if(request.method==='GET')return env('WHATSAPP_VERIFY_TOKEN')&&url.searchParams.get('hub.mode')==='subscribe'&&equal(url.searchParams.get('hub.verify_token'),env('WHATSAPP_VERIFY_TOKEN'))?plain(url.searchParams.get('hub.challenge')||''):plain('Forbidden',403);
    if(request.method!=='POST')return plain('Method not allowed',405);
    if(!env('WHATSAPP_APP_SECRET'))return plain('Webhook is not configured',503);
    if(Number(request.headers.get('content-length')||0)>262144)return plain('Payload too large',413);
    const raw=await request.text();if(new TextEncoder().encode(raw).length>262144)return plain('Payload too large',413);
    if(!equal(request.headers.get('x-hub-signature-256'),`sha256=${await signature(env('WHATSAPP_APP_SECRET'),raw)}`))return plain('Forbidden',403);
    let payload;try{payload=JSON.parse(raw);}catch{return plain('Invalid JSON',400);}
    if(payload.object!=='whatsapp_business_account')return plain('Ignored');
    try{
      const admin=createAdmin();
      for(const entry of payload.entry||[])for(const change of entry.changes||[]){
        const value=change.value;
        if(value?.metadata?.phone_number_id!==env('WHATSAPP_PHONE_NUMBER_ID'))continue;
        for(const status of value.statuses||[])if(typeof status.id==='string')must(await admin.rpc('whatsapp_receipt',{p_provider:status.id,p_status:String(status.status||'unknown'),p_code:String(status.errors?.[0]?.code||'unknown')}));
        for(const message of value.messages||[]){
          if(!/^[0-9]{7,15}$/.test(message.from)||typeof message.id!=='string'||message.id.length>300)continue;
          if(must(await admin.from('whatsapp_events').select('id').eq('external_id',message.id).maybeSingle()))continue;
          // Rate limit before creating private conversation records; opt-out still gets through.
          const text=message.type==='text'?message.text?.body:message.type==='interactive'?message.interactive?.button_reply?.id||message.interactive?.list_reply?.id:message.type==='button'?message.button?.payload:'';
          const allowed=must(await admin.rpc('consume_enquiry_rate_limit',{p_key:await digest(`wa:${env('RATE_LIMIT_SALT')||env('SUPABASE_SERVICE_ROLE_KEY')}:${message.from}`),p_max:120,p_window_seconds:3600}));
          if(!allowed&&!/^(stop|quit|unsubscribe)$/i.test(text||''))continue;
          const timestamp=Number(message.timestamp);if(!Number.isFinite(timestamp))continue;
          must(await admin.rpc('whatsapp_enqueue',{p_phone:message.from,p_external:message.id,p_payload:{text:typeof text==='string'?text.slice(0,8000):'',timestamp,unsupported:!text}}));
        }
      }
      // Acknowledge only after durable storage; Meta can safely retry the same event.
      background(runWorker(admin,{env,fetcher}));return plain('EVENT_RECEIVED');
    }catch(error){console.error('WhatsApp webhook failed',error.code||error.name);return plain('Temporary processing failure',503);}
  };
}

export function createWorkerHandler({createAdmin,env,fetcher=fetch}){return async request=>{
  if(request.method!=='POST')return plain('Method not allowed',405);
  if(!env('WHATSAPP_WORKER_SECRET')||!equal(request.headers.get('authorization'),`Bearer ${env('WHATSAPP_WORKER_SECRET')}`))return plain('Forbidden',403);
  try{await runWorker(createAdmin(),{env,fetcher},{limit:16});return plain('OK');}catch(error){console.error('WhatsApp recovery worker failed',error.code||error.name);return plain('Worker failed',503);}
};}

export function createWhatsAppAdmin({createAdmin,env,fetcher=fetch}){return async request=>{
  const origin=request.headers.get('origin'),respond=(body,status=200)=>json(body,status,origin,env);
  if(!originAllowed(origin,env))return respond({error:'Origin is not allowed.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headersFor(origin,env)});
  if(request.method!=='POST')return respond({error:'Method not allowed.'},405);
  try{
    const admin=createAdmin(),actor=await requireAdmin(request,admin),input=await readInput(request);
    if(input.action==='status')return respond({ok:true,actor_id:actor,settings:must(await admin.from('whatsapp_settings').select('*').eq('id',1).single()),configured:Object.fromEntries(['WHATSAPP_ENABLED','WHATSAPP_APP_SECRET','WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_VERIFY_TOKEN','WHATSAPP_WORKER_SECRET','WHATSAPP_LINK_SECRET','WHATSAPP_API_VERSION'].map(k=>[k,k==='WHATSAPP_ENABLED'?env(k)==='true':Boolean(env(k))])),conversations:must(await admin.from('whatsapp_conversations').select('*').order('updated_at',{ascending:false}).limit(100))});
    if(input.action==='settings'){
      const s=input.settings;if(typeof s?.enabled!=='boolean'||typeof s.greeting!=='string'||s.greeting.trim().length<10||s.greeting.length>1000||typeof s.handoff_message!=='string'||s.handoff_message.trim().length<10||s.handoff_message.length>1000)throw new ChatError('Use 10–1,000 characters for both messages and choose whether guided planning is enabled.');
      must(await admin.from('whatsapp_settings').update({enabled:s.enabled,greeting:s.greeting.trim(),handoff_message:s.handoff_message.trim(),updated_at:new Date().toISOString()}).eq('id',1));return respond({ok:true});
    }
    if(input.action==='run'){await runWorker(admin,{env,fetcher});return respond({ok:true});}
    if(!uuidPattern.test(input.id||''))throw new ChatError('Choose a valid conversation.');
    const c=must(await admin.from('whatsapp_conversations').select('*').eq('id',input.id).maybeSingle());if(!c)throw new ChatError('Conversation not found.',404);
    if(input.action==='conversation')return respond({ok:true,conversation:c,events:must(await admin.from('whatsapp_events').select('*').eq('conversation_id',c.id).order('id',{ascending:false}).limit(150)),outbox:must(await admin.from('whatsapp_outbox').select('*').eq('conversation_id',c.id).order('id',{ascending:false}).limit(150)),alerts:must(await admin.from('whatsapp_team_alerts').select('*').eq('conversation_id',c.id).order('event_id',{ascending:false}).limit(20))});
    if(input.action==='retry_alert'){
      const alert=must(await admin.from('whatsapp_team_alerts').select('*').eq('event_id',input.event_id).eq('conversation_id',c.id).maybeSingle());
      if(!alert||alert.status!=='failed'||Date.now()-new Date(alert.created_at).getTime()>23*3600000)throw new ChatError('Only failed notifications within 23 hours can be retried safely. Review older requests in the inbox.');
      must(await admin.from('whatsapp_team_alerts').update({status:'pending',error:''}).eq('event_id',alert.event_id));await runWorker(admin,{env,fetcher});return respond({ok:true});
    }
    if(input.action==='retry_event'){
      must(await admin.from('whatsapp_events').update({status:'pending',attempts:0,error:''}).eq('conversation_id',c.id).eq('id',input.event_id).eq('status','failed'));await runWorker(admin,{env,fetcher});return respond({ok:true});
    }
    if(!['claim','reply','release','close','retry_send','resolve_send'].includes(input.action))throw new ChatError('Choose a supported action.');
    if(input.action!=='claim'&&c.assigned_to!==actor)throw new ChatError('Claim this conversation first.',409);
    if(input.action==='claim'&&c.assigned_to&&c.assigned_to!==actor)throw new ChatError('Another teammate owns this conversation.',409);
    if(input.action==='reply'&&(!serviceWindow(c.last_customer_at)||c.state.mode!=='human'))throw new ChatError('Replying requires an active human conversation within the 24-hour service window.',409);
    if(input.action==='reply'&&(typeof input.text!=='string'||!input.text.trim()||input.text.length>3500))throw new ChatError('Enter a reply within 3,500 characters.');
    if(!/^[0-9a-f-]{36}$/i.test(input.request_id||''))throw new ChatError('A request reference is required.');
    const duplicate=must(await admin.from('whatsapp_events').select('id').eq('external_id',`admin:${actor}:${input.request_id}`).maybeSingle());
    if(!duplicate)must(await admin.from('whatsapp_events').insert({external_id:`admin:${actor}:${input.request_id}`,conversation_id:c.id,kind:input.action,actor_id:actor,payload:{text:input.text?.trim(),id:input.message_id}}));
    await runWorker(admin,{env,fetcher});return respond({ok:true});
  }catch(error){if(!(error instanceof ChatError))console.error('WhatsApp admin failed',error.code||error.name);return respond({error:safeError(error)},error.status||500);}
};}
