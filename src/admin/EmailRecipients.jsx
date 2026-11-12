import {useEffect,useState} from 'react';
import {buildEnvelope} from '../../supabase/functions/_shared/email-recipients.mjs';
export default function EmailRecipients({value,onChange,disabled,errors={}}){
 const [expanded,setExpanded]=useState(false),[touched,setTouched]=useState({});
 useEffect(()=>{if(value.cc||value.bcc)setExpanded(true);},[value.cc,value.bcc]);
 const parsed=buildEnvelope(value),separate=!!value.separate;
 // Cc and Bcc stay visible while they hold text, so nothing is hidden and then sent by surprise.
 const fields=['to',...((!separate&&expanded)||value.cc||value.bcc?['cc','bcc']:[])];
 return <section className="email-recipient-editor"><div className="marketing-actions"><h3>Recipients</h3>{!separate&&<button type="button" disabled={disabled} onClick={()=>setExpanded(v=>!v)}>{expanded?'Hide Cc / Bcc':'Add Cc / Bcc'}</button>}</div>
  <label className="email-separate"><input type="checkbox" id="email-recipient-separate" checked={separate} disabled={disabled} onChange={e=>onChange({...value,separate:e.target.checked})}/><span><strong>Send a separate email to each address</strong> (recommended for first contact)<small>Each business gets its own personal copy, sees no other address, and gets a one-click opt-out. Shared group emails are much more likely to be treated as spam.</small></span></label>
  {fields.map(field=>{
  const error=errors[`recipients.${field}`]||(touched[field]||(separate&&field!=='to')?parsed.errors[field]:'');
  return <label key={field} htmlFor={`email-recipient-${field}`}>{field==='to'?'To':field==='cc'?'Cc':'Bcc'}<textarea id={`email-recipient-${field}`} disabled={disabled} rows={field==='to'&&separate?3:2} maxLength={8000} placeholder={field==='to'?(separate?'Kopi Lane <hello@kopilane.example>\nBatik House <info@batikhouse.example>':'customer@example.com, Another Customer <hello@example.com>'):'Optional email addresses, separated by commas'} value={value[field]} onChange={e=>onChange({...value,[field]:e.target.value})} onBlur={()=>setTouched(t=>({...t,[field]:true}))} aria-invalid={!!error} aria-describedby={error?`email-recipient-${field}-error`:undefined}/>{error&&<span id={`email-recipient-${field}-error`} className="marketing-field-error">{error}</span>}</label>;
 })}{separate
  ?<p className="marketing-help">One address per line. Write <code>Business Name &lt;email&gt;</code> and the name fills {'{{company_name}}'} in that business’s email. Without a name it reads “your business”.</p>
  :<><p className="marketing-help">Separate addresses with commas, semicolons or new lines. To and Cc are visible to all recipients. Bcc addresses are hidden.</p><p className="marketing-help">One shared email is sent to this group. Personalize the message for the business yourself; template placeholders use a general greeting.</p></>}
  <p><strong>{parsed.count}</strong> recipient{parsed.count===1?'':'s'}{separate&&parsed.count>1?` · ${parsed.count} separate emails`:''}</p></section>;
}
