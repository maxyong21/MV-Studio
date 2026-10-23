const base=import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/,'');
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured=Boolean(base&&key&&!base.includes('your-project-id'));
const headers=()=>({apikey:key,...(key?.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{})});

export async function loadPublicContent(){
  const tables=['site_content','services','projects','team_members','promotions','feature_options','testimonials'];
  const pairs=await Promise.all(tables.map(async table=>{
    const filter=table==='site_content'?'id=eq.1':`active=eq.true&order=sort_order.asc${table==='testimonials'?'&permission_confirmed=eq.true':''}`;
    const response=await fetch(`${base}/rest/v1/${table}?select=*&${filter}`,{headers:headers(),signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error('Live content could not be refreshed.');
    const rows=await response.json();return [table,table==='site_content'?rows[0]:rows];
  }));
  return Object.fromEntries(pairs);
}
export async function submitEnquiry(body){
  const response=await fetch(`${base}/functions/v1/submit-enquiry`,{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok){const error=new Error(result.error||'We could not confirm your submission. Please try again.');error.fields=result.errors;throw error;}
  return result;
}
export async function chatbotRequest(body){
  if(!isSupabaseConfigured)throw new Error('The assistant is not connected yet. Please use the enquiry form.');
  const response=await fetch(`${base}/functions/v1/chatbot`,{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(result.error||'The assistant is unavailable. Please use the enquiry form.');error.fields=result.errors;error.status=response.status;throw error;}
  return result;
}
