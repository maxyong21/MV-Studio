import {validateEnquiryInput,estimateFeatures} from './enquiry.mjs';
import {originAllowed,headersFor,json,digest,readInput} from './http.mjs';
import {notifyEnquiry} from './notify.mjs';
import {estimateRecord} from './chatbot/estimates.mjs';
import {ChatError} from './chatbot/data.mjs';

export function createSubmitHandler({createAdmin,env,fetcher=fetch}){
  return async request=>{
    const origin=request.headers.get('origin');
    const respond=(body,status=200)=>json(body,status,origin,env);
    if(!originAllowed(origin,env))return respond({error:'Origin is not allowed.'},403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headersFor(origin,env)});
    if(request.method!=='POST')return respond({error:'Method not allowed.'},405);
    let input;
    try{input=await readInput(request);}catch{return respond({error:'Send a valid enquiry under 32 KB.'},400);}
    if(typeof input?.website==='string'&&input.website.trim())return respond({ok:true});
    const errors=validateEnquiryInput(input);
    if(Object.keys(errors).length)return respond({error:'Please review the highlighted fields.',errors},400);
    try{
      const admin=createAdmin();
      const chat=input.chatbot_estimate_id?await estimateRecord(admin,input,false):null;
      const ids=[...new Set(chat?chat.selected_feature_ids:input.selected_feature_ids||[])].sort();
      const normalized={name:input.name.trim(),company_name:input.company_name.trim(),phone:input.phone.trim(),email:input.email.trim().toLowerCase(),message:(input.message||'').trim(),billing_period:input.billing_period||'monthly',meeting_requested:!!input.meeting_requested,preferred_meeting_at:input.preferred_meeting_at?new Date(input.preferred_meeting_at).toISOString():null};
      const requestId=input.request_id||crypto.randomUUID();
      if(chat)normalized.billing_period=chat.billing_period;
      const fingerprint=await digest(JSON.stringify({...normalized,ids,...(chat?{chatbot_estimate_id:chat.id}:{})}));
      const existing=await admin.from('enquiries').select('id,request_hash,notification_status').eq('request_id',requestId).maybeSingle();
      if(existing.error)throw existing.error;
      if(existing.data){
        if(existing.data.request_hash!==fingerprint)return respond({error:'This submission reference was already used. Refresh the form and try again.'},409);
        return respond({ok:true,id:existing.data.id,notification:existing.data.notification_status,duplicate:true});
      }
      if(chat){
        const previous=await admin.from('enquiries').select('id,request_hash,notification_status').eq('chatbot_estimate_id',chat.id).maybeSingle();
        if(previous.error)throw previous.error;
        if(previous.data){if(previous.data.request_hash!==fingerprint)return respond({error:'This estimate has already been submitted. Start a new enquiry for another request.'},409);return respond({ok:true,id:previous.data.id,notification:previous.data.notification_status,duplicate:true});}
        await estimateRecord(admin,input,true);
      }
      const address=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
      const key=await digest(`${env('RATE_LIMIT_SALT')||env('SUPABASE_SERVICE_ROLE_KEY')}:${address}`);
      const limit=await admin.rpc('consume_enquiry_rate_limit',{p_key:key,p_max:5,p_window_seconds:3600});
      if(limit.error)throw limit.error;
      if(!limit.data)return respond({error:'Too many enquiries from this connection. Please try again later.'},429);
      let options=[];
      if(ids.length){
        const result=await admin.from('feature_options').select('id,name,category,billing_type,price,annual_free_months').in('id',ids).eq('active',true);
        if(result.error)throw result.error;
        options=result.data||[];
        if(options.length!==ids.length)return respond({error:'Some selected features are no longer available. Refresh the page and choose again.'},400);
      }
      const {quoted,...totals}=estimateFeatures(options);
      const selected_features=options.map(v=>({id:v.id,name:v.name,category:v.category,billing_type:v.billing_type,unit_price:v.price===null?null:Number(v.price),annual_free_months:v.annual_free_months}));
      const chatbotFields=chat?{chatbot_estimate_id:chat.id,chatbot_release_id:chat.release_id,chatbot_answers:{answers:chat.answers,summary:chat.quote.summary,brief:chat.brief,quote:chat.quote}}:{};
      const saved=await admin.from('enquiries').insert({...normalized,...totals,selected_features,...chatbotFields,request_id:requestId,request_hash:fingerprint}).select('*').single();
      if(saved.error){
        if(saved.error.code==='23505'){
          const repeat=await admin.from('enquiries').select('id,request_hash,notification_status').eq(chat?'chatbot_estimate_id':'request_id',chat?chat.id:requestId).single();
          if(repeat.data?.request_hash===fingerprint)return respond({ok:true,id:repeat.data.id,notification:repeat.data.notification_status,duplicate:true});
          return respond({error:'This submission reference was already used.'},409);
        }
        throw saved.error;
      }
      let notification='failed';
      try{notification=await notifyEnquiry({admin,enquiry:saved.data,env,fetcher});}catch(cause){console.error('Enquiry saved; notification state failed',cause.code||cause.name);}
      return respond({ok:true,id:saved.data.id,notification});
    }catch(cause){console.error('submit-enquiry failed',cause.code||cause.name);return respond({error:cause instanceof ChatError?cause.message:cause.code==='P0001'?'The estimate changed or expired. Please generate it again.':'We could not save your enquiry. Please try again shortly.'},cause instanceof ChatError?cause.status:cause.code==='P0001'?409:500);}
  };
}
