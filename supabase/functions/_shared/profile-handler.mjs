// Saves the business details a customer sends for a Google Business Profile setup.
//
// Public endpoint, protected the same way as the enquiry form: own origin only, a small
// body, human verification, and five submissions an hour per connection.
//
// Fallbacks, in order:
//   1. The details are saved to the database and the studio is emailed.
//   2. Saved, but the email fails: still a success. The request is in the admin.
//   3. The database cannot be reached: the details are emailed to the studio instead,
//      so nothing the customer typed is lost. The reply says saved:false.
//   4. Neither works: an error. The form keeps the answers and offers WhatsApp.
import {originAllowed,headersFor,json,digest,readInput,verifyTurnstile} from './http.mjs';
import {validateProfileRequest,normalizeProfileRequest,profileRequestSummary,uuidPattern} from './profile-request.mjs';

const addressPattern=/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const header=value=>String(value||'').replace(/[\r\n\u0000-\u001f\u007f]/g,' ').trim().slice(0,150);
// When the database is down the usual rate limit is unavailable too, so emails sent
// in its place are capped here. Human verification has already passed by then.
const FALLBACK_MAX=5,FALLBACK_WINDOW=3600000;

export function createProfileHandler({createAdmin,env,fetcher=fetch,sendMail,now=()=>Date.now()}){
  const fallbackTimes=[];
  const email=async({subject,text,replyTo})=>{
    const to=(env('ENQUIRY_TO_EMAIL')||'').split(',').map(value=>value.trim()).filter(Boolean);
    if(!to.length||to.some(value=>!addressPattern.test(value))||typeof sendMail!=='function')return false;
    try{const result=await sendMail({to,replyTo,subject:header(subject),text});return Boolean(result?.messageId);}
    catch(cause){console.error('Profile request email failed',cause?.code||cause?.name||'');return false;}
  };
  return async request=>{
    const origin=request.headers.get('origin');
    const respond=(body,status=200)=>json(body,status,origin,env);
    if(!originAllowed(origin,env))return respond({error:'Origin is not allowed.'},403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headersFor(origin,env)});
    if(request.method!=='POST')return respond({error:'Method not allowed.'},405);
    let input;
    try{input=await readInput(request);}catch{return respond({error:'Send valid business details under 32 KB.'},400);}
    // Hidden field that only automated senders fill in.
    if(typeof input?.fax==='string'&&input.fax.trim())return respond({ok:true,saved:true});
    const errors=validateProfileRequest(input);
    if(input&&typeof input==='object'&&input.request_id!==undefined&&!uuidPattern.test(String(input.request_id)))errors.form='Refresh the form and try again.';
    if(Object.keys(errors).length)return respond({error:'Please review the highlighted fields.',errors},400);
    try{await verifyTurnstile(request,input,env,fetcher);}
    catch(cause){return respond({error:cause.message},cause.status||503);}
    const record=normalizeProfileRequest(input),requestId=input.request_id||crypto.randomUUID();
    const summary=profileRequestSummary(record);
    try{
      const admin=createAdmin();
      const address=request.headers.get('cf-connecting-ip')||'unknown';
      const key=await digest(`profile:${env('RATE_LIMIT_SALT')||env('SUPABASE_SERVICE_ROLE_KEY')}:${address}`);
      const limit=await admin.rpc('consume_enquiry_rate_limit',{p_key:key,p_max:5,p_window_seconds:3600});
      if(limit.error)throw limit.error;
      if(!limit.data)return respond({error:'Too many submissions from this connection. Please try again later.'},429);
      const fingerprint=await digest(JSON.stringify(record));
      const same=row=>row.request_hash===fingerprint?respond({ok:true,saved:true,id:row.id,notification:row.notification_status,duplicate:true}):respond({error:'This form was already sent with different details. Refresh the page and try again.'},409);
      const existing=await admin.from('profile_requests').select('id,request_hash,notification_status').eq('request_id',requestId).maybeSingle();
      if(existing.error)throw existing.error;
      if(existing.data)return same(existing.data);
      const saved=await admin.from('profile_requests').insert({...record,request_id:requestId,request_hash:fingerprint}).select('id').single();
      if(saved.error){
        // Two copies of the same submission arrived together; the other one won.
        if(saved.error.code==='23505'){const repeat=await admin.from('profile_requests').select('id,request_hash,notification_status').eq('request_id',requestId).maybeSingle();if(repeat.data)return same(repeat.data);}
        throw saved.error;
      }
      if(!saved.data?.id)throw new Error('The saved request was not confirmed.');
      const sent=await email({subject:`Google Business Profile details · ${record.business_name}`,replyTo:record.owner_email,text:`${summary}\n\nReference: ${saved.data.id}\nOpen the admin, then “Profile setups”, to track this request.`});
      const notification=sent?'sent':'failed';
      const marked=await admin.from('profile_requests').update({notification_status:notification}).eq('id',saved.data.id);
      if(marked.error)console.error('Profile request saved; email state not recorded',marked.error.code||'');
      return respond({ok:true,saved:true,id:saved.data.id,notification});
    }catch(cause){
      console.error('Profile request could not be saved',cause?.code||cause?.name||'');
      const time=now();
      while(fallbackTimes.length&&time-fallbackTimes[0]>FALLBACK_WINDOW)fallbackTimes.shift();
      if(fallbackTimes.length<FALLBACK_MAX){
        fallbackTimes.push(time);
        const sent=await email({subject:`NOT SAVED · Google Business Profile details · ${record.business_name}`,replyTo:record.owner_email,text:`The website could not save this request to the database, so it was emailed instead. It does NOT appear in the admin. Please keep this email.\n\n${summary}`});
        if(sent)return respond({ok:true,saved:false,notification:'sent'},202);
      }
      return respond({error:'We could not save your details just now. Your answers are still in the form. Please try again shortly, or send them to us on WhatsApp.'},503);
    }
  };
}
