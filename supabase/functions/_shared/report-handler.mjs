// Receives a short problem report from a visitor's browser and emails it to the
// studio, so a broken page is noticed without waiting for a customer to mention it.
//
// It is a public endpoint, so it is deliberately hard to abuse:
//   - only the website's own origin may call it, with a small body
//   - at most 5 reports an hour per visitor, 20 a day in total, and one a day per distinct problem
//   - anything that looks like an email address, token or key is removed before sending
//   - it always answers 202 for a well-formed report, so it reveals nothing about limits
import {originAllowed,headersFor,json,digest} from './http.mjs';

const KINDS=new Set(['error','promise','interface','service']);
const clean=(value,max)=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,' ').slice(0,max).trim();
export const redact=value=>String(value??'')
  .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,'[email removed]')
  .replace(/Bearer\s+\S+/gi,'Bearer [removed]')
  .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g,'[token removed]')
  .replace(/\b(?:sb_secret_|sb_publishable_|re_)[A-Za-z0-9_-]+/g,'[key removed]')
  .replace(/\b[A-Fa-f0-9]{32,}\b/g,'[id removed]')
  .replace(/\+?\d[\d\s-]{8,}\d/g,'[number removed]');
// A page path only: no host, query string or fragment, which can carry personal data.
const pathOnly=value=>{try{return new URL(String(value||'/'),'https://site.invalid').pathname.slice(0,200);}catch{return '/';}};

export function createReportHandler({env,createAdmin,sendMail,now=()=>new Date()}){
  return async request=>{
    const origin=request.headers.get('origin');
    const reply=(body,status)=>json(body,status,origin,env);
    if(request.method==='OPTIONS')return new Response(null,{status:originAllowed(origin,env)?204:403,headers:headersFor(origin,env)});
    if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
    if(!originAllowed(origin,env))return reply({error:'Origin is not allowed.'},403);
    let input;
    try{
      const text=await request.text();
      if(new TextEncoder().encode(text).length>6000)return reply({error:'Report is too large.'},413);
      input=JSON.parse(text);
    }catch{return reply({error:'Invalid report.'},400);}
    const message=redact(clean(input?.message,400)),kind=String(input?.kind||'');
    if(!message||!KINDS.has(kind))return reply({error:'Invalid report.'},400);
    const report={kind,message,area:redact(clean(input.area,120)),detail:redact(clean(input.detail,1500)),path:pathOnly(input.path),browser:clean(request.headers.get('user-agent'),300)};
    try{
      const to=(env('ERROR_REPORT_TO')||env('ENQUIRY_TO_EMAIL')||'').split(',').map(value=>value.trim()).filter(Boolean);
      if(!to.length||typeof sendMail!=='function')return reply({ok:true},202);
      const admin=createAdmin(),allow=async(key,max,seconds)=>{const result=await admin.rpc('consume_enquiry_rate_limit',{p_key:key,p_max:max,p_window_seconds:seconds});if(result.error)throw result.error;return result.data===true;};
      const visitor=await digest(`error-report:${request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')||'unknown'}`);
      // Order matters: the cheap per-visitor check first, so one noisy browser cannot use up the shared budget.
      if(!await allow(visitor,5,3600))return reply({ok:true},202);
      if(!await allow(await digest(`error-report:same:${report.kind}:${report.message}`),1,86400))return reply({ok:true},202);
      if(!await allow('error-report:all',20,86400))return reply({ok:true},202);
      const lines=[`What happened: ${report.message}`,report.area&&`Where on the site: ${report.area}`,`Page: ${report.path}`,`Type: ${{error:'Script error',promise:'Failed background task',interface:'Part of the page failed to display',service:'A request to the server failed'}[report.kind]}`,`When: ${now().toISOString()}`,`Browser: ${report.browser||'not given'}`,report.detail&&`\nTechnical detail:\n${report.detail}`,'\nThis is an automatic message from the MV Studio website. The same problem is reported at most once a day, and no more than 20 reports are sent in a day.'].filter(Boolean);
      await sendMail({to,subject:`Website problem · ${report.message.slice(0,90)}`.replace(/[\r\n]/g,' '),text:lines.join('\n')});
    }catch(error){
      // Reporting must never become a second failure for the visitor.
      console.error('Problem report could not be sent',error?.code||error?.name||'');
    }
    return reply({ok:true},202);
  };
}
