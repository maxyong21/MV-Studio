// Second-step sign-in with an authenticator app (time-based codes).
// SecondStepChallenge is the screen shown after the password; the default export
// is the settings page where an administrator turns it on or off.
import {useCallback,useEffect,useState} from 'react';
import {KeyRound,ShieldCheck,ShieldOff} from 'lucide-react';
import {supabase} from '../supabase.js';
import './second-step.css';

const digits=value=>value.replace(/\D/g,'').slice(0,6);
const explain=error=>/invalid totp|invalid code|verification_failed|challenge.*expired/i.test(`${error?.message||''} ${error?.code||''}`)
  ?'That code is not right. Codes change every 30 seconds, so enter the one showing now.'
  :/aal2|insufficient/i.test(`${error?.message||''} ${error?.code||''}`)?'Enter a current authenticator code first, then try again.'
  :error?.message||'Something went wrong. Please try again.';

function CodeField({id,value,onChange,error,disabled}){
  return <label htmlFor={id}>6-digit code<input id={id} className="second-step-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} placeholder="000000" value={value} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={error?`${id}-error`:undefined} onChange={event=>onChange(digits(event.target.value))} autoFocus/>{error&&<span id={`${id}-error`} className="second-step-error" role="alert">{error}</span>}</label>;
}

export function SecondStepChallenge({onVerified,onSignOut}){
  const [factor,setFactor]=useState(null),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loadFailed,setLoadFailed]=useState(false);
  const load=useCallback(async()=>{
    setLoadFailed(false);setError('');
    try{const {data,error:failure}=await supabase.auth.mfa.listFactors();if(failure)throw failure;const verified=(data?.totp||[]).find(item=>item.status==='verified');if(!verified){onVerified();return;}setFactor(verified.id);}
    catch{setLoadFailed(true);}
  },[onVerified]);
  useEffect(()=>{load();},[load]);
  const submit=async event=>{
    event.preventDefault();if(code.length!==6){setError('Enter all six digits.');return;}
    setBusy(true);setError('');
    try{const {error:failure}=await supabase.auth.mfa.challengeAndVerify({factorId:factor,code});if(failure)throw failure;onVerified();}
    catch(failure){setError(explain(failure));setCode('');}finally{setBusy(false);}
  };
  return <div className="login-page"><div className="login-card second-step-card"><span className="section-overline">ONE MORE STEP</span><h1>Enter your code.</h1>
    {loadFailed?<><p className="form-error" role="alert">Your sign-in security could not be checked. Nothing is shown until it can be.</p><button type="button" className="button button-dark full-button" onClick={load}>Try again</button></>
      :<><p>Open your authenticator app and type the 6-digit code for MV Studio.</p><form onSubmit={submit} noValidate><CodeField id="second-step-code" value={code} onChange={setCode} error={error} disabled={busy||!factor}/><button className="button button-dark full-button" disabled={busy||!factor}>{busy?'Checking…':'Continue'}</button></form>
        <p className="second-step-help">Lost your phone? Ask whoever manages the Supabase project to remove the authenticator from your user, then sign in with your password.</p></>}
    <button type="button" className="back-home second-step-out" onClick={onSignOut}>Sign out</button></div></div>;
}

export default function Security({notify}){
  const [state,setState]=useState('loading'),[active,setActive]=useState(null),[setup,setSetup]=useState(null),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmOff,setConfirmOff]=useState(false);
  const load=useCallback(async()=>{
    setState('loading');
    try{const {data,error:failure}=await supabase.auth.mfa.listFactors();if(failure)throw failure;setActive((data?.totp||[]).find(item=>item.status==='verified')||null);setState('ready');}
    catch{setState('failed');}
  },[]);
  useEffect(()=>{load();},[load]);
  const start=async()=>{
    setBusy(true);setError('');
    try{
      // A setup that was started and abandoned leaves a half-made entry behind; clear those first.
      const existing=await supabase.auth.mfa.listFactors();
      for(const item of existing.data?.all||[])if(item.factor_type==='totp'&&item.status!=='verified')await supabase.auth.mfa.unenroll({factorId:item.id});
      const {data,error:failure}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:`MV Studio admin ${new Date().toISOString().slice(0,19)}`});
      if(failure)throw failure;
      setSetup({id:data.id,qr:data.totp?.qr_code||'',secret:data.totp?.secret||''});setCode('');
    }catch(failure){setError(explain(failure));}finally{setBusy(false);}
  };
  const cancel=async()=>{const pending=setup;setSetup(null);setCode('');setError('');try{if(pending)await supabase.auth.mfa.unenroll({factorId:pending.id});}catch{}};
  const confirm=async event=>{
    event.preventDefault();if(code.length!==6){setError('Enter all six digits.');return;}
    setBusy(true);setError('');
    try{const {error:failure}=await supabase.auth.mfa.challengeAndVerify({factorId:setup.id,code});if(failure)throw failure;setSetup(null);setCode('');notify('The second step is on. You will be asked for a code each time you sign in.');await load();}
    catch(failure){setError(explain(failure));setCode('');}finally{setBusy(false);}
  };
  const turnOff=async()=>{
    setBusy(true);setError('');
    try{const {error:failure}=await supabase.auth.mfa.unenroll({factorId:active.id});if(failure)throw failure;setConfirmOff(false);notify('The second step is off. Your password alone now signs you in.','info');await load();}
    catch(failure){setError(explain(failure));}finally{setBusy(false);}
  };
  if(state==='loading')return <p className="entity-loading" role="status">Checking your sign-in security…</p>;
  if(state==='failed')return <div className="enquiry-db-error" role="alert"><b>Sign-in security could not be loaded.</b><span>Your current setting has not changed.</span><button type="button" className="button button-light" onClick={load}>Retry</button></div>;
  return <section className="second-step-page">
    <div className={`second-step-status ${active?'is-on':''}`}>{active?<ShieldCheck aria-hidden="true"/>:<ShieldOff aria-hidden="true"/>}<div><h2>{active?'The second step is on':'The second step is off'}</h2><p>{active?'Signing in needs your password and a code from your authenticator app.':'Signing in needs only your password. Anyone who learns it can reach your enquiries, your website content and your email sending.'}</p></div></div>
    {error&&!setup&&<p className="form-error" role="alert">{error}</p>}
    {!active&&!setup&&<div className="second-step-panel"><h3>Turn it on</h3><ol><li>Install an authenticator app on your phone, such as Google Authenticator or Microsoft Authenticator.</li><li>Press the button below and scan the square code with the app.</li><li>Type the 6-digit code the app shows to confirm it works.</li></ol><button type="button" className="button button-dark" disabled={busy} onClick={start}><KeyRound size={16}/> {busy?'Preparing…':'Set up authenticator app'}</button><p className="second-step-help">This applies to your account only. Other administrators choose for themselves.</p></div>}
    {setup&&<form className="second-step-panel" onSubmit={confirm} noValidate><h3>Scan, then confirm</h3><div className="second-step-setup">{setup.qr?<img className="second-step-qr" src={setup.qr} alt="Square code to scan with your authenticator app" width="180" height="180"/>:<p className="form-error" role="alert">The square code could not be shown. Type the key below into your app instead.</p>}<div><p>Cannot scan? Choose “enter a setup key” in the app and type this:</p><code className="second-step-secret">{setup.secret}</code><p className="second-step-help">Keep this key private. Anyone who has it can generate your codes.</p></div></div>
      <CodeField id="second-step-setup-code" value={code} onChange={setCode} error={error} disabled={busy}/><div className="second-step-actions"><button className="button button-dark" disabled={busy}>{busy?'Checking…':'Confirm and turn on'}</button><button type="button" className="button button-light" disabled={busy} onClick={cancel}>Cancel</button></div><p className="second-step-help">Nothing changes until you confirm a code. If you close this page first, the second step stays off.</p></form>}
    {active&&<div className="second-step-panel"><h3>Before you rely on it</h3><ul><li>If you lose your phone you cannot sign in. Recovery is done in the Supabase dashboard: Authentication, Users, your user, remove the authenticator.</li><li>Make sure at least one other person can reach that dashboard.</li></ul>
      {confirmOff?<div className="inline-confirm" role="alertdialog" aria-label="Confirm turning off"><span><b>Turn the second step off?</b> Your password alone will sign you in again.</span><button type="button" className="button button-dark" autoFocus disabled={busy} onClick={()=>setConfirmOff(false)}>Keep it on</button><button type="button" className="button button-light second-step-off-confirm" disabled={busy} onClick={turnOff}>{busy?'Turning off…':'Turn it off'}</button></div>
        :<button type="button" className="button button-light second-step-off" onClick={()=>{setError('');setConfirmOff(true);}}>Turn the second step off</button>}</div>}
  </section>;
}
