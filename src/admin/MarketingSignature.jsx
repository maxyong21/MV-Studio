export const defaultSignature={company:'MV Studio',portfolio:'https://mv-aistudio.vercel.app/',logo_url:'https://mv-aistudio.vercel.app/email-logo.png',members:[]};
export default function MarketingSignature({value=defaultSignature,onChange,onReload,disabled,errors={}}){
 const update=(key,next)=>onChange({...value,[key]:next});
 const field=(key,label,text,change,type='text')=>{
  const error=errors[`signature.${key}`],id=`marketing-signature-${key.replaceAll('.','-')}`;
  return <label key={key} htmlFor={id}>{label}<input id={id} disabled={disabled} type={type} maxLength={key.endsWith('portfolio')||key==='logo_url'?500:254} value={text||''} onChange={e=>change(e.target.value)} aria-invalid={!!error} aria-describedby={error?`${id}-error`:undefined}/>{error&&<span id={`${id}-error`} className="marketing-field-error">{error}</span>}</label>;
 };
 return <section className="marketing-signature-editor"><h3>Your team signature</h3><p>Names, emails, phone numbers and portfolios load from Admin → Team. Changes below apply to this draft.</p><button type="button" disabled={disabled} onClick={onReload}>Reload from Team</button>{!value.members.length&&<p role="status">No team members loaded. Add active profiles in Admin → Team, save their contact details, then reload here.</p>}{errors.signature&&<p className="marketing-field-error" role="alert">{errors.signature}</p>}
 {field('company','Company name',value.company,next=>update('company',next))}
 {field('portfolio','MV Studio portfolio URL',value.portfolio,next=>update('portfolio',next),'url')}
 {field('logo_url','Logo URL (public HTTPS PNG or JPEG)',value.logo_url,next=>update('logo_url',next),'url')}
 {value.members.map((m,index)=><fieldset key={m.team_member_id||index}><legend><label className="marketing-check"><input type="checkbox" disabled={disabled} checked={m.enabled} onChange={e=>update('members',value.members.map((item,i)=>i===index?{...item,enabled:e.target.checked}:item))}/>Include {m.name||`team member ${index+1}`}</label></legend>{m.enabled&&<div className="marketing-pair">{[['name','Name','text'],['email','Email','email'],['phone','Phone','tel'],['portfolio','Personal portfolio URL','url']].map(([key,label,type])=>field(`members.${index}.${key}`,label,m[key],next=>update('members',value.members.map((item,i)=>i===index?{...item,[key]:next}:item)),type))}</div>}</fieldset>)}</section>;
}
