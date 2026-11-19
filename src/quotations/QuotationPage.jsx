import {useCallback,useEffect,useState} from 'react';
import {Download,FileText,RefreshCw} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle.jsx';
import QuotationDocument from './QuotationDocument.jsx';
import {STATUS_LABEL,displayStatus,formatDate,tokenFromHash} from './quotation.mjs';
import './quotation.css';

// /quotation#<secret>            the client's view of a shared quotation.
// /quotation?preview=<id>        an administrator's preview of any quotation, including a draft.
// The secret is after "#", so it is never sent to the web host and never reaches analytics.
const base=import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/,''),key=import.meta.env.VITE_SUPABASE_ANON_KEY;
const configured=Boolean(base&&key&&!base.includes('your-project-id'));

async function loadShared(token){
  const response=await fetch(`${base}/rest/v1/rpc/shared_quotation`,{method:'POST',headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{}),'Content-Type':'application/json'},body:JSON.stringify({p_token:token}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const result=await response.json();
  if(!result||!['active','expired','not_found'].includes(result.state))throw new Error('Unexpected reply');
  return result;
}
// The admin preview reads the row directly; the database only returns it to a signed-in administrator.
async function loadPreview(id){
  const {supabase}=await import('../supabase.js');
  if(!supabase)return {state:'signin'};
  const {data:session}=await supabase.auth.getSession();
  if(!session?.session)return {state:'signin'};
  const {data,error}=await supabase.from('quotations').select('*').eq('id',id).maybeSingle();
  if(error)throw error;
  return data?{state:'active',quotation:data,preview:true}:{state:'signin'};
}

const Shell=({children,tools})=><div className="qd-page">
  <div className="qd-bar"><a className="qd-bar-brand" href="/">MV Studio</a><div className="qd-bar-tools">{tools}<ThemeToggle className="qd-theme" size={18}/></div></div>
  <main className="qd-main">{children}</main>
</div>;
const Notice=({title,children,action})=><section className="qd-notice" role="status"><FileText size={30} aria-hidden="true"/><h1>{title}</h1>{children}{action}</section>;
const Contact=({studio})=>{const emails=(studio?.emails||[]).filter(Boolean),phones=(studio?.phones||[]).filter(Boolean);return emails.length||phones.length?<p className="qd-contact">{[...emails,...phones].join(' · ')}</p>:null;};

export default function QuotationPage(){
  const [result,setResult]=useState({state:'loading'}),[attempt,setAttempt]=useState(0);
  const load=useCallback(async()=>{
    const preview=new URLSearchParams(window.location.search).get('preview')||'',token=tokenFromHash(window.location.hash);
    setResult({state:'loading'});
    try{
      if(/^[0-9a-f-]{36}$/i.test(preview))setResult(await loadPreview(preview));
      else if(!token)setResult({state:'not_found'});
      else if(!configured)setResult({state:'failed'});
      else setResult(await loadShared(token));
    }catch{setResult({state:'failed'});}
  },[]);
  useEffect(()=>{load();},[load,attempt]);
  // A different link pasted into the same tab only changes the part after "#".
  useEffect(()=>{const changed=()=>setAttempt(value=>value+1);window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed);},[]);
  // The page title becomes the suggested file name when the client saves the PDF.
  useEffect(()=>{
    const number=result.quotation?.quote_number||result.quote_number;
    document.title=number?`Quotation ${number} | MV Studio`:'Quotation | MV Studio';
    let robots=document.head.querySelector('meta[name="robots"]');
    if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.appendChild(robots);}
    robots.content='noindex,nofollow';
  },[result]);

  if(result.state==='loading')return <Shell><p className="qd-loading" role="status">Opening the quotation…</p></Shell>;
  if(result.state==='failed')return <Shell><Notice title="The quotation could not be loaded" action={<button type="button" className="qd-button" onClick={()=>setAttempt(value=>value+1)}><RefreshCw size={16} aria-hidden="true"/> Try again</button>}><p>This is a connection problem on our side or yours, not a problem with your link. Please try again in a moment.</p></Notice></Shell>;
  if(result.state==='signin')return <Shell><Notice title="Sign in to preview" action={<a className="qd-button" href="/admin">Open the admin</a>}><p>Previews are for MV Studio administrators. Sign in to the admin in this browser, then open the preview again.</p></Notice></Shell>;
  if(result.state==='expired')return <Shell><Notice title="This quotation has expired"><p>Quotation <b>{result.quote_number}</b> was valid until <b>{formatDate(result.valid_until)}</b>. Its prices and terms no longer apply.</p><p>Contact MV Studio and we will prepare an updated quotation for you.</p><Contact studio={result.studio}/></Notice></Shell>;
  if(result.state!=='active')return <Shell><Notice title="This quotation link is not available"><p>The link may be incomplete, or the quotation may have been withdrawn. Check that you copied the whole link, or ask MV Studio to send it again.</p></Notice></Shell>;

  const status=displayStatus(result.quotation);
  return <Shell tools={<button type="button" className="qd-button" onClick={()=>window.print()}><Download size={16} aria-hidden="true"/> Save as PDF</button>}>
    {result.preview&&<p className="qd-preview-note" role="status"><b>Admin preview · {STATUS_LABEL[status]}.</b> {status==='draft'?'The client cannot see this yet. Create a share link in the admin when it is ready.':status==='expired'?'The client now sees an expired notice instead of this page.':'This is what the client sees.'}</p>}
    <p className="qd-hint">To keep a copy, press “Save as PDF” and choose “Save as PDF” as the printer.</p>
    <QuotationDocument quotation={result.quotation}/>
  </Shell>;
}
