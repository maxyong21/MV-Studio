import {originAllowed,headersFor,json,readInput,digest} from '../http.mjs';
import {uuidPattern} from '../enquiry.mjs';
import {buildQuote,validateAnswers} from './flow.mjs';
import {answerQuestion} from './answer.mjs';
import {redact} from './retrieval.mjs';
import {providerConfig,providerHash} from './providers.mjs';
import {ChatError,must,stateFor,catalogueFor,releaseFor,chunksFor,publicFlow,requireAdmin,buildRelease,validateDraftRow} from './data.mjs';
import {evaluateRelease} from './evaluate.mjs';

async function limitPublic(request,admin,env){
  const address=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const key=await digest(`chat:${env('RATE_LIMIT_SALT')||env('SUPABASE_SERVICE_ROLE_KEY')}:${address}`);
  const result=await admin.rpc('consume_enquiry_rate_limit',{p_key:key,p_max:Math.min(120,Math.max(10,Math.floor(Number(env('CHATBOT_HOURLY_REQUESTS'))||60))),p_window_seconds:3600});
  if(result.error)throw result.error;if(!result.data)throw new ChatError('The chat request limit was reached. Please use the enquiry form or try again later.',429);
}
export async function serveChatAction(input,admin,release,deps,{preview=false}={}){
  const initialState=await stateFor(admin);
  const catalogue=await catalogueFor(admin);
  if(input.action==='bootstrap')return publicFlow(release,catalogue);
  const checked=validateAnswers(release.snapshot,input.answers||{},catalogue,false);
  if(Object.keys(checked.errors).length)throw new ChatError('Review your selected answers.',400,checked.errors);
  if(input.action==='message'){
    if(typeof input.message!=='string'||input.message.trim().length<2||input.message.length>2000)throw new ChatError('Enter a message between 2 and 2,000 characters.');
    const started=Date.now(),reply=await answerQuestion(input.message,release,await chunksFor(admin,release.id),{...deps,admin});
    if(!preview){
      const saved=await admin.from('chatbot_logs').insert({release_id:release.id,message:redact(input.message),answer:reply.answer,action:reply.action,sources:reply.sources.map(v=>v.id),mode:reply.mode+(reply.degraded?' (provider fallback)':''),latency_ms:Date.now()-started});
      if(saved.error)console.error('Chat log could not be recorded',saved.error.code);
    }
    return {ok:true,...reply};
  }
  if(input.action==='estimate'){
    if(input.confirmed_scope!==true)throw new ChatError('Review and confirm your scope first.');
    if(input.brief!==undefined&&(typeof input.brief!=='string'||input.brief.length>2000))throw new ChatError('Keep the project brief within 2,000 characters.');
    const quote=buildQuote(release.snapshot,input.answers||{},catalogue);
    if(quote.errors)throw new ChatError('Complete the highlighted cards before reviewing your estimate.',400,quote.errors);
    if(preview)return {ok:true,preview:true,quote};
    const state=initialState,token=crypto.randomUUID()+crypto.randomUUID();
    const current=await stateFor(admin);
    if(!current.enabled||current.active_release_id!==release.id||current.catalog_revision!==state.catalog_revision)throw new ChatError('The assistant or catalogue changed. Please generate the estimate again.',409);
    if(!state.enabled||state.active_release_id!==release.id)throw new ChatError('The assistant was updated. Restart the guide to use its latest version.',409);
    const row=must(await admin.from('chatbot_estimates').insert({token_hash:await digest(token),release_id:release.id,catalog_revision:state.catalog_revision,answers:quote.answers,brief:input.brief||'',selected_feature_ids:quote.selected_feature_ids,billing_period:quote.billing_period,quote}).select('id,expires_at').single());
    // A catalogue edit during calculation must never yield a usable stale estimate.
    const after=await stateFor(admin);
    if(!after.enabled||after.active_release_id!==release.id||after.catalog_revision!==state.catalog_revision)throw new ChatError('The assistant or catalogue changed. Please generate the estimate again.',409);
    return {ok:true,quote,estimate_id:row.id,estimate_token:token,expires_at:row.expires_at};
  }
  throw new ChatError('Unknown chatbot action.');
}
export function createChatbotHandler({createAdmin,env,fetcher=fetch}){
  return async request=>{
    const origin=request.headers.get('origin'),respond=(body,status=200)=>json(body,status,origin,env);
    if(!originAllowed(origin,env))return respond({error:'Origin is not allowed.'},403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headersFor(origin,env)});
    if(request.method!=='POST')return respond({error:'Method not allowed.'},405);
    try{
      let input;try{input=await readInput(request);}catch{throw new ChatError('Send a valid chat request under 32 KB.');}
      if(!input||typeof input!=='object'||Array.isArray(input))throw new ChatError('Send a valid chat request.');
      const admin=createAdmin();await limitPublic(request,admin,env);
      const state=await stateFor(admin);
      if(!state.enabled||!state.active_release_id){if(input.action==='bootstrap')return respond({available:false,status:state.enabled?'coming-soon':'maintenance'});throw new ChatError('The assistant is unavailable. Please use the project enquiry form.',503);}
      if(input.release_id&&input.release_id!==state.active_release_id)throw new ChatError('The assistant was updated. Restart the guide to use its latest version.',409);
      const release=await releaseFor(admin,state.active_release_id);
      return respond(await serveChatAction(input,admin,release,{env,fetcher}));
    }catch(error){if(!(error instanceof ChatError))console.error('chatbot request failed',error.code||error.name);return respond({error:error instanceof ChatError?error.message:'The assistant is temporarily unavailable. Please use the enquiry form.',errors:error.fields},error.status||503);}
  };
}

const editable=['chatbot_documents','chatbot_questions','chatbot_options','chatbot_rules','chatbot_test_cases'];
export function createChatbotAdminHandler({createAdmin,env,fetcher=fetch}){
  return async request=>{
    const origin=request.headers.get('origin'),reply=(body,status=200)=>json(body,status,origin,env);
    if(!originAllowed(origin,env))return reply({error:'Origin is not allowed.'},403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headersFor(origin,env)});
    if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
    try{
      const admin=createAdmin(),userId=await requireAdmin(request,admin);let input;
      try{input=await readInput(request);}catch{throw new ChatError('Send a valid admin request under 32 KB.');}
      if(!input||typeof input!=='object'||Array.isArray(input))throw new ChatError('Send a valid admin request.');
      if(input.action==='status'){
        const names=['chatbot_settings',...editable],results=await Promise.all(names.map(name=>admin.from(name).select('*')));
        const content=Object.fromEntries(names.map((name,index)=>[name,must(results[index])]));
        const releases=must(await admin.from('chatbot_releases').select('id,label,draft_revision,provider_hash,created_at').order('created_at',{ascending:false}).limit(20));
        const runs=must(await admin.from('chatbot_test_runs').select('*').order('created_at',{ascending:false}).limit(20));
        const logs=must(await admin.from('chatbot_logs').select('*').order('created_at',{ascending:false}).limit(30));
        return reply({ok:true,state:await stateFor(admin),content,releases,runs,logs,providers:{...providerConfig(env),hash:await providerHash(env),gemini_configured:!!env('GEMINI_API_KEY'),groq_configured:!!env('GROQ_API_KEY')}});
      }
      if(input.action==='save'){
        if(!editable.includes(input.table))throw new ChatError('Choose an editable draft section.');
        const row=validateDraftRow(input.table,input.values);
        if(input.id){if(!uuidPattern.test(input.id))throw new ChatError('Invalid item reference.');must(await admin.from(input.table).update(row).eq('id',input.id));}
        else must(await admin.from(input.table).insert(row));
        return reply({ok:true});
      }
      if(input.action==='delete'){
        if(!editable.includes(input.table)||!uuidPattern.test(input.id||''))throw new ChatError('Choose a valid draft item.');
        must(await admin.from(input.table).delete().eq('id',input.id));return reply({ok:true});
      }
      if(input.action==='settings'){
        const values=input.values||{};
        if(typeof values.name!=='string'||values.name.trim().length<2||values.name.length>80||typeof values.greeting!=='string'||!values.greeting.trim()||values.greeting.length>600||typeof values.handoff_message!=='string'||!values.handoff_message.trim()||values.handoff_message.length>600||!['extractive','groq'].includes(values.answer_mode)||!['keyword','hybrid'].includes(values.retrieval_mode))throw new ChatError('Set a name, greeting, handoff message and supported AI/search modes.');
        must(await admin.from('chatbot_settings').update({name:values.name.trim(),greeting:values.greeting.trim(),handoff_message:values.handoff_message.trim(),answer_mode:values.answer_mode,retrieval_mode:values.retrieval_mode,updated_at:new Date().toISOString()}).eq('id',1));return reply({ok:true});
      }
      if(input.action==='enabled'){
        if(typeof input.enabled!=='boolean')throw new ChatError('Choose whether the assistant is enabled.');
        must(await admin.from('chatbot_state').update({enabled:input.enabled,updated_at:new Date().toISOString()}).eq('id',1));return reply({ok:true});
      }
      if(input.action==='build'){
        if(typeof input.label!=='string'||input.label.trim().length<2||input.label.length>100)throw new ChatError('Name the candidate release using 2–100 characters.');
        return reply({ok:true,...await buildRelease(admin,userId,input.label.trim(),{env,fetcher})});
      }
      if(['preview','test','publish','rollback'].includes(input.action)){
        const release=await releaseFor(admin,input.release_id);
        if(input.action==='preview')return reply(await serveChatAction({...input.request,release_id:release.id},admin,release,{env,fetcher},{preview:true}));
        if(input.action==='test')return reply({ok:true,run:await evaluateRelease(admin,release,userId,{env,fetcher})});
        if(input.reviewed!==true)throw new ChatError('Review the candidate answers and confirm approval before publishing.');
        if(!uuidPattern.test(input.run_id||''))throw new ChatError('Select a passing test run.');
        must(await admin.rpc('chatbot_publish_release',{p_release:release.id,p_run:input.run_id,p_hash:await providerHash(env),p_admin:userId,p_note:typeof input.note==='string'?input.note.slice(0,1000):'',p_rollback:input.action==='rollback'}));
        return reply({ok:true});
      }
      if(input.action==='purge_logs'){
        must(await admin.rpc('chatbot_purge_old_data',{}));return reply({ok:true});
      }
      throw new ChatError('Unknown administration action.');
    }catch(error){console.error('chatbot-admin failed',error.code||error.name);return reply({error:error.message||'The chatbot action failed.',errors:error.fields},error.status||400);}
  };
}
