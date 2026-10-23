import {PublicServiceError,recordDiagnostic,clearDiagnostics} from './lib/availability.mjs';
const base=import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/,'');
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured=Boolean(base&&key&&!base.includes('your-project-id'));
const headers=()=>({apikey:key,...(key?.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{})});
const safeFields=values=>values&&typeof values==='object'&&!Array.isArray(values)?Object.fromEntries(Object.keys(values).filter(key=>/^[a-z][a-z0-9_]{0,79}$/i.test(key)).slice(0,30).map(key=>[key,'Please review this answer.'])):undefined;
async function publicJSON(path,{method='GET',body,timeout=12000,target=path,service=false}={}){
  try{
    const response=await fetch(`${base}${path}`,{method,headers:{...headers(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(timeout)});
    let result;try{result=await response.json();}catch{throw new PublicServiceError('maintenance',response.status,'The service returned a non-JSON response.');}
    if(!response.ok||result?.error){
      const kind=service&&response.status===429?'limit':service&&response.status===409?'refresh':service&&response.status===400&&result?.errors?'review':'maintenance';
      throw new PublicServiceError(kind,response.status,JSON.stringify({message:result?.error||result?.message,code:result?.code,details:result?.details,hint:result?.hint}),safeFields(result?.errors));
    }
    clearDiagnostics(target);return result;
  }catch(error){
    recordDiagnostic(target,error);
    throw error instanceof PublicServiceError?error:new PublicServiceError('maintenance',error?.status||0,'A network request failed or timed out.');
  }
}

export async function loadPublicContent(){
  const tables=['site_content','services','projects','team_members','promotions','feature_options','testimonials'];
  const pairs=await Promise.all(tables.map(async table=>{
    const filter=table==='site_content'?'id=eq.1':`active=eq.true&order=sort_order.asc${table==='testimonials'?'&permission_confirmed=eq.true':''}`;
    const rows=await publicJSON(`/rest/v1/${table}?select=*&${filter}`,{target:`Database: ${table}`});
    if(!Array.isArray(rows)){const error=new PublicServiceError('maintenance',200,`${table} returned an invalid row collection.`);recordDiagnostic(`Database: ${table}`,error);throw error;}
    return [table,table==='site_content'?rows[0]||null:rows];
  }));
  return Object.fromEntries(pairs);
}
export async function submitEnquiry(body){
  const result=await publicJSON('/functions/v1/submit-enquiry',{method:'POST',body,timeout:25000,target:'Enquiry submission',service:true});
  if(result?.ok!==true){const error=new PublicServiceError('maintenance',200,'Enquiry endpoint returned an invalid confirmation.');recordDiagnostic('Enquiry submission',error);throw error;}
  return result;
}
export async function chatbotRequest(body){
  if(!isSupabaseConfigured)throw new PublicServiceError('coming-soon',0,'Supabase frontend environment variables are not configured.');
  const result=await publicJSON('/functions/v1/chatbot',{method:'POST',body,timeout:45000,target:'Project assistant',service:true});
  if(body.action==='bootstrap'){
    if(result?.available===false)return result;
    if(!result?.settings||!['questions','options','rules','catalogue'].every(key=>Array.isArray(result[key]))){const error=new PublicServiceError('maintenance',200,'Chatbot bootstrap response has an invalid structure.');recordDiagnostic('Project assistant',error);throw error;}
    if(!result.questions.length)return {available:false,status:'coming-soon'};
  }else if(result?.ok!==true||(body.action==='message'&&(typeof result.answer!=='string'||!Array.isArray(result.sources)||!Array.isArray(result.suggested_options)))||(body.action==='estimate'&&(!result.quote||!Array.isArray(result.quote.lines)||!['one_time_estimate','monthly_estimate','annual_estimate'].every(key=>typeof result.quote[key]==='number'&&Number.isFinite(result.quote[key]))))){const error=new PublicServiceError('maintenance',200,'Chatbot endpoint returned an invalid response.');recordDiagnostic('Project assistant',error);throw error;}
  return result;
}
