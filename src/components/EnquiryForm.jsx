import {useRef,useState} from 'react';
import {ArrowUpRight,MessageCircle,Plus} from 'lucide-react';
import {isSupabaseConfigured,submitEnquiry} from '../public-api.js';
import {money,whatsappHref} from '../lib/site.js';
import {publicFailure} from '../lib/availability.mjs';
import {trackEvent} from '../lib/analytics.mjs';
import {estimateFeatures,validateContact} from '../../supabase/functions/_shared/enquiry.mjs';
import InlineFieldError from './InlineFieldError.jsx';
import './enquiry.css';

const emptyValues={name:'',company_name:'',phone:'',email:'',message:'',billing_period:'monthly',meeting_requested:false,preferred_meeting_at:'',website:''};
export default function EnquiryForm({options=[],whatsappNumber=''}){
  const submissionRef=useRef(null);
  const [values,setValues]=useState(emptyValues),[selected,setSelected]=useState([]),[sending,setSending]=useState(false),[feedback,setFeedback]=useState(''),[feedbackError,setFeedbackError]=useState(false),[errors,setErrors]=useState({}),[touched,setTouched]=useState({}),[attempted,setAttempted]=useState(false),[detailsOpen,setDetailsOpen]=useState(false);
  const active=options.filter(item=>item.active).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const chosen=active.filter(item=>selected.includes(item.id)),recurring=chosen.filter(item=>item.billing_type==='monthly');
  const estimate=estimateFeatures(chosen),whatsapp=whatsappHref(whatsappNumber);
  const visibleError=key=>(attempted||touched[key])?errors[key]:'';
  const change=(key,value)=>{const next={...values,[key]:value};if(key==='meeting_requested'&&!value)next.preferred_meeting_at='';setValues(next);if(attempted||touched[key]||(key==='meeting_requested'&&touched.preferred_meeting_at))setErrors(validateContact(next));};
  const blur=key=>{setTouched(current=>({...current,[key]:true}));setErrors(current=>({...current,...validateContact(values)}));};
  const submit=async event=>{
    event.preventDefault();setAttempted(true);setTouched({name:true,company_name:true,phone:true,email:true,message:true,preferred_meeting_at:true});
    const nextErrors=validateContact(values);setErrors(nextErrors);
    if(Object.keys(nextErrors).length){document.getElementById('enquiry-'+Object.keys(nextErrors)[0])?.focus();return;}
    setFeedback('');setFeedbackError(false);
    if(!isSupabaseConfigured){setFeedback('Coming soon. Please contact the team directly.');setFeedbackError(true);return;}
    setSending(true);
    try{
      const body={...values,name:values.name.trim(),company_name:values.company_name.trim(),phone:values.phone.trim(),email:values.email.trim(),preferred_meeting_at:values.preferred_meeting_at?new Date(values.preferred_meeting_at).toISOString():null,selected_feature_ids:[...selected].sort()};
      const signature=JSON.stringify(body);
      if(submissionRef.current?.signature!==signature)submissionRef.current={signature,id:crypto.randomUUID()};
      const result=await submitEnquiry({...body,request_id:submissionRef.current.id});
      if(!result?.ok)throw new Error('Enquiry confirmation was unavailable.');
      trackEvent('generate_lead',{method:'enquiry_form'});
      setFeedback('Thanks — your enquiry has been saved. We will contact you to discuss your idea and confirm the next steps.'+(result.id?' Reference: '+result.id:''));
      submissionRef.current=null;setValues(emptyValues);setSelected([]);setErrors({});setTouched({});setAttempted(false);setDetailsOpen(false);
    }catch(error){if(error.fields){setErrors(error.fields);document.getElementById('enquiry-'+Object.keys(error.fields)[0])?.focus();}setFeedback(publicFailure(error).message);setFeedbackError(true);}
    finally{setSending(false);}
  };
  const fieldError=key=>visibleError(key)&&<InlineFieldError id={`enquiry-${key}-error`} message={visibleError(key)}/>;
  const fieldProps=key=>({id:`enquiry-${key}`,name:key,'aria-required':['name','company_name','phone','email'].includes(key),'aria-invalid':Boolean(visibleError(key)),'aria-describedby':visibleError(key)?`enquiry-${key}-error`:undefined,onBlur:()=>blur(key)});
  return <section className="enquiry-section section-pad" id="enquiry" aria-labelledby="enquiry-title">
    <div className="enquiry-intro"><div className="section-overline"><span>06</span> START A CONVERSATION</div><h2 id="enquiry-title">Tell us<br/><em>your idea.</em></h2><p>Leave your details and a few words about your idea. We’ll help you work out the next step.</p>
      {whatsapp&&<div className="enquiry-contact-options"><a className="button button-light enquiry-whatsapp" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18}/> Chat on WhatsApp <ArrowUpRight size={16}/></a><small>Prefer to chat? Message us directly.</small></div>}
      <div className="enquiry-guidance"><strong>Need help choosing features?</strong><button type="button" className="button button-light" aria-haspopup="dialog" onClick={event=>{event.currentTarget.focus();window.dispatchEvent(new CustomEvent('mv:open-project-assistant',{detail:{trigger:event.currentTarget}}));}}><MessageCircle size={17}/> Get guided help</button></div>
    </div>
    <form className="enquiry-form" onSubmit={submit} noValidate>
      <div className="form-heading"><div><span className="section-overline">LET’S TALK</span><h3>Project enquiry</h3></div><span className="required-note">* Required</span></div>
      <div className="enquiry-fields">
        <label>Your name *<input {...fieldProps('name')} autoComplete="name" maxLength="120" value={values.name} onChange={e=>change('name',e.target.value)}/>{fieldError('name')}</label>
        <label>Company name *<input {...fieldProps('company_name')} autoComplete="organization" maxLength="160" value={values.company_name} onChange={e=>change('company_name',e.target.value)}/>{fieldError('company_name')}</label>
        <label>Contact number *<input {...fieldProps('phone')} type="tel" inputMode="tel" autoComplete="tel" maxLength="40" value={values.phone} onChange={e=>change('phone',e.target.value)}/>{fieldError('phone')}</label>
        <label>Email address *<input {...fieldProps('email')} type="email" inputMode="email" autoComplete="email" maxLength="254" value={values.email} onChange={e=>change('email',e.target.value)}/>{fieldError('email')}</label>
      </div>
      <label className="message-field">What would you like help with? <span className="enquiry-optional">Optional</span><textarea id="enquiry-message" rows="3" maxLength="3000" placeholder="For example: I run a bakery and would like to discuss a website." value={values.message} aria-invalid={Boolean(visibleError('message'))} aria-describedby={visibleError('message')?'enquiry-message-error':undefined} onBlur={()=>blur('message')} onChange={e=>change('message',e.target.value)}/>{fieldError('message')}</label>
      <details className="enquiry-details" open={detailsOpen} onToggle={event=>setDetailsOpen(event.currentTarget.open)}><summary><span><strong>Add project details</strong><small>Optional · {chosen.length?`${chosen.length} service${chosen.length===1?'':'s'} selected`:'Select features for a preliminary estimate'}</small></span><Plus size={20} aria-hidden="true"/></summary><div className="enquiry-details-body">
        <p className="enquiry-details-help">You can send the enquiry without choosing anything here. Any selections you make will be included even if you close this section.</p>
        <fieldset className="feature-picker"><legend>What should we help with?</legend>{active.length?active.map(item=><label className="feature-option" key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,item.id]:current.filter(id=>id!==item.id))}/><span><b>{item.name}</b><small>{item.description}</small></span><em>{item.billing_type==='monthly'?`${money(item.price)}/mo`:item.billing_type==='one_time'?money(item.price):'Let’s scope it'}</em></label>):<p className="feature-empty">Feature options are being prepared. You can still send an enquiry.</p>}</fieldset>
        {recurring.length>0&&<><div className="billing-choice"><span>Recurring services</span><label><input type="radio" name="billing_period" checked={values.billing_period==='monthly'} onChange={()=>change('billing_period','monthly')}/> Monthly</label><label><input type="radio" name="billing_period" checked={values.billing_period==='yearly'} onChange={()=>change('billing_period','yearly')}/> Annual</label></div>{values.billing_period==='yearly'&&recurring.filter(item=>Number(item.annual_free_months)>0).map(item=><p className="annual-savings" key={item.id}>{item.name}: pay {12-Number(item.annual_free_months)} months for a year ({item.annual_free_months} free).</p>)}</>}
        {chosen.length>0&&<div className="estimate-card"><span>PRELIMINARY ESTIMATE</span><dl className="estimate-lines">{chosen.some(item=>item.billing_type==='one_time')&&<div><dt>One-time work</dt><dd>{money(estimate.one_time_estimate)}</dd></div>}{recurring.length>0&&<div><dt>{values.billing_period==='yearly'?'Annual services':'Monthly services'}</dt><dd>{money(values.billing_period==='yearly'?estimate.annual_estimate:estimate.monthly_estimate)} / {values.billing_period==='yearly'?'year':'month'}</dd></div>}</dl>{estimate.quoted.length>0&&<small>Quoted separately: {estimate.quoted.join(', ')}.</small>}<small>Final scope, pricing and third-party costs are confirmed with you.</small></div>}
      </div></details>
      <label className="meeting-toggle"><input type="checkbox" checked={values.meeting_requested} onChange={e=>change('meeting_requested',e.target.checked)}/><span><b>Request a short meeting</b><small>Optional. We’ll contact you to agree a time.</small></span></label>
      {values.meeting_requested&&<label className="meeting-time">Preferred time (optional)<input {...fieldProps('preferred_meeting_at')} type="datetime-local" min={new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)} value={values.preferred_meeting_at} onChange={e=>change('preferred_meeting_at',e.target.value)}/>{fieldError('preferred_meeting_at')}</label>}
      <input className="honeypot" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" value={values.website} onChange={e=>change('website',e.target.value)}/>
      <button type="submit" className="button button-dark" disabled={sending}>{sending?'Sending enquiry…':'Send project enquiry'} <ArrowUpRight size={15}/></button>
      <small className="privacy-note">Your details are used to respond to this enquiry and are visible only to our administrators.</small>
      {feedback&&<div className={`enquiry-feedback ${feedbackError?'public-service-notice':''}`} role="status">{feedback}{feedbackError&&<><br/><a href="#contact">Contact the team directly</a></>}</div>}
    </form>
  </section>;
}
