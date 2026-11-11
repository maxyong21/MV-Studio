import {useEffect,useState} from 'react';
import {parseRecipients} from '../../supabase/functions/_shared/email-recipients.mjs';
export default function EmailRecipients({value,onChange,disabled,errors={}}){
 const [expanded,setExpanded]=useState(false),[touched,setTouched]=useState({});
 useEffect(()=>{if(value.cc||value.bcc)setExpanded(true);},[value.cc,value.bcc]);
 const parsed=parseRecipients(value);
 return <section className="email-recipient-editor"><div className="marketing-actions"><h3>Recipients</h3><button type="button" disabled={disabled} onClick={()=>setExpanded(v=>!v)}>{expanded?'Hide Cc / Bcc':'Add Cc / Bcc'}</button></div>{['to',...(expanded?['cc','bcc']:[])].map(field=>{
  const error=errors[`recipients.${field}`]||(touched[field]?parsed.errors[field]:'');
  return <label key={field} htmlFor={`email-recipient-${field}`}>{field==='to'?'To':field==='cc'?'Cc':'Bcc'}<textarea id={`email-recipient-${field}`} disabled={disabled} rows={2} maxLength={8000} placeholder={field==='to'?'customer@example.com, Another Customer <hello@example.com>':'Optional email addresses, separated by commas'} value={value[field]} onChange={e=>onChange({...value,[field]:e.target.value})} onBlur={()=>setTouched(t=>({...t,[field]:true}))} aria-invalid={!!error} aria-describedby={error?`email-recipient-${field}-error`:undefined}/>{error&&<span id={`email-recipient-${field}-error`} className="marketing-field-error">{error}</span>}</label>;
 })}<p className="marketing-help">Separate addresses with commas, semicolons or new lines. To and Cc are visible to all recipients. Bcc addresses are hidden.</p><p className="marketing-help">One shared email is sent to this group. Personalize the message for the business yourself; template placeholders use a general greeting.</p><p><strong>{parsed.count}</strong> recipient{parsed.count===1?'':'s'}</p></section>;
}
