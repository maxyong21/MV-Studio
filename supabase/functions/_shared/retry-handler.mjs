import {originAllowed,headersFor,json,readInput} from './http.mjs';
import {uuidPattern} from './enquiry.mjs';
import {notifyEnquiry} from './notify.mjs';
export function createRetryHandler({env,createAdmin,fetcher=fetch}){
  return async request=>{
    const origin=request.headers.get('origin');const reply=(body,status=200)=>json(body,status,origin,env);
    if(!originAllowed(origin,env))return reply({error:'Origin is not allowed.'},403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headersFor(origin,env)});
    if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
    try{
      const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
      if(!token)return reply({error:'Sign in as an administrator.'},401);
      const admin=createAdmin();const {data:auth,error:authError}=await admin.auth.getUser(token);
      if(authError||!auth.user)return reply({error:'Your session has expired. Sign in again.'},401);
      const membership=await admin.from('admin_users').select('user_id').eq('user_id',auth.user.id).maybeSingle();
      if(membership.error||!membership.data)return reply({error:'Administrator access required.'},403);
      let input;try{input=await readInput(request);}catch{return reply({error:'Send a valid enquiry reference.'},400);}
      if(!uuidPattern.test(input?.id||''))return reply({error:'Invalid enquiry reference.'},400);
      const claim=await admin.from('enquiries').update({notification_status:'pending',notification_error:'',updated_at:new Date().toISOString()}).eq('id',input.id).eq('notification_status','failed').select('*').maybeSingle();
      if(claim.error)throw claim.error;
      if(!claim.data)return reply({error:'Only failed notifications can be retried. Refresh the inbox.'},409);
      const notification=await notifyEnquiry({admin,enquiry:claim.data,env,fetcher});
      return reply({ok:true,notification});
    }catch(cause){console.error('retry-enquiry failed',cause.code||cause.name);return reply({error:'Notification could not be retried. Refresh the inbox.'},500);}
  };
}
