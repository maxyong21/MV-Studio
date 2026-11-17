import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,Check,MessageCircle,RotateCcw} from 'lucide-react';
import {fallbackContent} from '../content.js';
import {isSupabaseConfigured,submitProfileRequest} from '../public-api.js';
import {whatsappHref} from '../lib/site.js';
import {publicFailure} from '../lib/availability.mjs';
import {emptyProfileRequest,validateProfileRequest,profileRequestSummary,PROFILE_LIMITS,PROFILE_TEXT_FIELDS} from '../../supabase/functions/_shared/profile-request.mjs';
import InlineFieldError from '../components/InlineFieldError.jsx';
import Turnstile,{turnstileRequired} from '../components/Turnstile.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import {DocumentLanguage,LanguageSwitch,useLanguage} from '../i18n/index.jsx';
import './profile-form.css';

// Answers are kept in this browser until they are sent, so a refresh, a closed tab or a
// failed save never costs the customer their typing.
const DRAFT_KEY='mv-profile-form-draft';
const readDraft=()=>{try{const saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(!saved||typeof saved!=='object')return null;const clean=emptyProfileRequest();for(const key of PROFILE_TEXT_FIELDS)if(typeof saved[key]==='string')clean[key]=saved[key].slice(0,PROFILE_LIMITS[key]);if(saved.location_type==='service_area')clean.location_type='service_area';return clean;}catch{return null;}};
const writeDraft=values=>{try{const {authorised,...rest}=values;if(PROFILE_TEXT_FIELDS.some(key=>rest[key]))localStorage.setItem(DRAFT_KEY,JSON.stringify(rest));else localStorage.removeItem(DRAFT_KEY);}catch{}};
const clearDraft=()=>{try{localStorage.removeItem(DRAFT_KEY);}catch{}};
const whatsappDraft=(number,text)=>{const base=whatsappHref(number);if(!base)return '';const url=new URL(base);url.searchParams.set('text',text);return url.href;};

export default function ProfileForm({data,footer}){
  const {t}=useLanguage();
  const [values,setValues]=useState(emptyProfileRequest),[errors,setErrors]=useState({}),[touched,setTouched]=useState({}),[attempted,setAttempted]=useState(false);
  const [sending,setSending]=useState(false),[problem,setProblem]=useState(''),[done,setDone]=useState(null),[restored,setRestored]=useState(false);
  const [captchaToken,setCaptchaToken]=useState(''),[captchaReset,setCaptchaReset]=useState(0),[trap,setTrap]=useState('');
  const submission=useRef(null),loaded=useRef(false),heading=useRef(null);
  const content=data?.site_content?.content||fallbackContent.site_content.content;
  const whatsappNumber=content.whatsapp_number??fallbackContent.site_content.content.whatsapp_number;
  const hasWhatsapp=Boolean(whatsappHref(whatsappNumber));
  useEffect(()=>{
    document.title='Google Business Profile details | MV Studio';
    let robots=document.head.querySelector('meta[name="robots"]');if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.appendChild(robots);}robots.content='noindex,follow';
    const draft=readDraft();if(draft){setValues(draft);setRestored(true);}
    loaded.current=true;
  },[]);
  useEffect(()=>{if(loaded.current&&!done)writeDraft(values);},[values,done]);
  useEffect(()=>{if(done)heading.current?.focus();},[done]);
  const shown=key=>(attempted||touched[key])?errors[key]||'':'';
  const change=(key,value)=>{const next={...values,[key]:value};setValues(next);if(attempted||touched[key]||key==='location_type')setErrors(validateProfileRequest(next));};
  const blur=key=>{setTouched(current=>({...current,[key]:true}));setErrors(validateProfileRequest(values));};
  const field=(key,hint=false)=>({id:`profile-${key}`,name:key,value:values[key],maxLength:PROFILE_LIMITS[key],'aria-invalid':Boolean(shown(key)),'aria-describedby':[shown(key)&&`profile-${key}-error`,hint&&`profile-${key}-hint`].filter(Boolean).join(' ')||undefined,onBlur:()=>blur(key),onChange:event=>change(key,event.target.value)});
  const error=key=>shown(key)&&<InlineFieldError id={`profile-${key}-error`} message={shown(key)}/>;
  const openWhatsapp=text=>{const href=whatsappDraft(whatsappNumber,text);if(href)window.open(href,'_blank','noopener,noreferrer');};
  const sendDetailsOnWhatsapp=()=>openWhatsapp(`Hi MV Studio, here are my details for the Google Business Profile setup.\n\n${profileRequestSummary(values)}`);
  const reset=()=>{clearDraft();submission.current=null;setValues(emptyProfileRequest());setErrors({});setTouched({});setAttempted(false);setProblem('');setRestored(false);setDone(null);setCaptchaToken('');setCaptchaReset(value=>value+1);};
  const submit=async event=>{
    event.preventDefault();setAttempted(true);
    const nextErrors=validateProfileRequest(values);setErrors(nextErrors);
    const first=Object.keys(nextErrors)[0];
    if(first){setProblem('');(document.getElementById(first==='location_type'?'profile-location-address':`profile-${first}`)||document.getElementById('profile-form'))?.focus();return;}
    if(turnstileRequired&&!captchaToken){setProblem(t('Complete the human verification before sending.'));return;}
    if(!isSupabaseConfigured){setProblem(t('The form is not connected yet. Please send your details on WhatsApp.'));return;}
    if(typeof navigator!=='undefined'&&navigator.onLine===false){setProblem(t('You appear to be offline. Your answers are kept here. Reconnect and send again.'));return;}
    setProblem('');setSending(true);
    try{
      const body={...values,fax:trap};
      // The same answers always carry the same reference, so a retry after a slow connection cannot save twice.
      const signature=JSON.stringify(body);
      if(submission.current?.signature!==signature)submission.current={signature,id:crypto.randomUUID()};
      const result=await submitProfileRequest({...body,request_id:submission.current.id,turnstile_token:captchaToken||undefined});
      clearDraft();submission.current=null;
      setDone({saved:result.saved!==false,id:result.id||'',business:values.business_name.trim()});
    }catch(failure){
      setCaptchaToken('');setCaptchaReset(value=>value+1);
      if(failure.fields){const merged={...validateProfileRequest(values),...failure.fields};setErrors(merged);document.getElementById(`profile-${Object.keys(failure.fields)[0]}`)?.focus();}
      const kind=publicFailure(failure).kind;
      setProblem(kind==='limit'?t('Too many attempts from this connection. Please wait a while, or send your details on WhatsApp.'):kind==='review'?t('Please review the highlighted answers and send again.'):t('We could not save your details just now. Your answers are still here. Try again, or send them on WhatsApp.'));
    }finally{setSending(false);}
  };
  const errorCount=attempted?Object.keys(errors).length:0;
  const optional=<span className="pf-optional">{t('Optional')}</span>;
  return <><DocumentLanguage/><a className="skip-link" href="#profile-content">{t('Skip to main content')}</a>
    <header className="site-nav"><div className="nav-inner"><Link className="brand" to="/"><span className="brand-symbol">m<span>v</span></span><span>MV<span className="brand-light">Studio</span></span></Link><Link className="admin-link" to="/services/google-business-profile">{t('← About this service')}</Link><div className="nav-end"><LanguageSwitch className="nav-language"/><ThemeToggle/></div></div></header>
    <main className="project-detail pf-page" id="profile-content" tabIndex={-1}>
      {done?<section className="pf-done" aria-labelledby="profile-done-title">
        <span className="pf-done-icon" aria-hidden="true"><Check size={26}/></span>
        <h1 id="profile-done-title" ref={heading} tabIndex={-1}>{t('Thank you. We have your details.')}</h1>
        <p>{done.saved?t('Your business details are saved and our team has been told.'):t('Your details reached our team by email. We will confirm with you shortly.')}</p>
        {done.id&&<p className="pf-reference">{t('Reference')}: <code>{done.id}</code></p>}
        <h2>{t('What happens next')}</h2>
        <ol className="pf-next"><li>{t('Send us your logo and photos of your shopfront and interior on WhatsApp.')}</li><li>{t('We set up the profile and tell you when it is ready.')}</li><li>{t('Google asks you to verify the business, usually with a short video. We guide you through it.')}</li></ol>
        <div className="pf-actions">{hasWhatsapp&&<button type="button" className="button button-dark" onClick={()=>openWhatsapp(`Hi MV Studio, I have sent my Google Business Profile details for ${done.business}. Here are my photos.`)}><MessageCircle size={17}/> {t('Send photos on WhatsApp')} <ArrowUpRight size={15}/></button>}<button type="button" className="button button-light" onClick={reset}>{t('Send details for another business')}</button></div>
      </section>:<>
        <div className="project-detail-head pf-head"><span className="section-overline">{t('GOOGLE BUSINESS PROFILE')}</span><h1>{t('Tell us about your business')}</h1><p>{t('We use these details to set up your Google Business Profile. It takes about five minutes.')}</p><p className="pf-safety">{t('Please do not send your Google password. You stay the owner and add us as a manager.')}</p></div>
        {restored&&<div className="pf-notice" role="status"><span>{t('We restored the answers you typed earlier on this device.')}</span><button type="button" className="button button-light" onClick={reset}><RotateCcw size={15}/> {t('Start again')}</button></div>}
        <form className="pf-form" id="profile-form" tabIndex={-1} onSubmit={submit} noValidate aria-describedby="profile-required-note">
          <p className="pf-required" id="profile-required-note">{t('* Required')}</p>
          {errorCount>0&&<div className="pf-summary" role="alert">{errorCount===1?t('1 answer needs your attention.'):t('{count} answers need your attention.',{count:errorCount})}</div>}
          <div className="pf-group" role="group" aria-labelledby="profile-group-contact"><h2 id="profile-group-contact">{t('1. Who should we contact?')}</h2><div className="pf-grid">
            <label>{t('Your name *')}<input {...field('contact_name')} autoComplete="name" aria-required="true"/>{error('contact_name')}</label>
            <label>{t('Your WhatsApp number *')}<input {...field('contact_phone')} type="tel" inputMode="tel" autoComplete="tel" aria-required="true"/>{error('contact_phone')}</label>
          </div></div>
          <div className="pf-group" role="group" aria-labelledby="profile-group-business"><h2 id="profile-group-business">{t('2. Your business')}</h2><div className="pf-grid">
            <label>{t('Business name *')}<input {...field('business_name',true)} autoComplete="organization" aria-required="true"/><small id="profile-business_name-hint">{t('Exactly as shown on your signboard.')}</small>{error('business_name')}</label>
            <label>{t('Type of business *')}<input {...field('business_category',true)} aria-required="true"/><small id="profile-business_category-hint">{t('For example: tuition centre, pharmacy, clinic.')}</small>{error('business_category')}</label>
          </div>
            <div className="pf-choice" role="radiogroup" aria-labelledby="profile-location-label"><span id="profile-location-label">{t('Where do you serve customers? *')}</span>
              <label><input id="profile-location-address" type="radio" name="location_type" checked={values.location_type==='address'} onChange={()=>change('location_type','address')}/> {t('Customers visit my shop or office')}</label>
              <label><input type="radio" name="location_type" checked={values.location_type==='service_area'} onChange={()=>change('location_type','service_area')}/> {t('I travel to my customers')}</label>
            </div>
            {values.location_type==='address'
              ?<label>{t('Full address with postcode *')}<textarea {...field('address')} rows="3" autoComplete="street-address" aria-required="true"/>{error('address')}</label>
              :<label>{t('Towns or areas you serve *')}<textarea {...field('service_areas',true)} rows="2" aria-required="true"/><small id="profile-service_areas-hint">{t('Your own address stays hidden on Google.')}</small>{error('service_areas')}</label>}
            <div className="pf-grid">
              <label>{t('Business phone number *')}<input {...field('business_phone',true)} type="tel" inputMode="tel" aria-required="true"/><small id="profile-business_phone-hint">{t('This number is shown publicly on Google.')}</small>{error('business_phone')}</label>
              <label>{t('Google account email *')}<input {...field('owner_email',true)} type="email" inputMode="email" autoComplete="email" aria-required="true"/><small id="profile-owner_email-hint">{t('The Google account that will own the profile.')}</small>{error('owner_email')}</label>
            </div>
            <label>{t('Opening hours *')}<textarea {...field('opening_hours',true)} rows="4" aria-required="true" placeholder={t('Mon–Fri 9am–6pm, Sat 9am–1pm, Sun closed')}/><small id="profile-opening_hours-hint">{t('Include public holidays if they differ.')}</small>{error('opening_hours')}</label>
          </div>
          <div className="pf-group" role="group" aria-labelledby="profile-group-more"><h2 id="profile-group-more">{t('3. More about your business')} {optional}</h2>
            <label>{t('Short description')}<textarea {...field('description',true)} rows="4"/><small id="profile-description-hint">{t('{count} of 750 characters',{count:values.description.length})}</small>{error('description')}</label>
            <label>{t('Services or products, with prices if you want them shown')}<textarea {...field('services')} rows="4"/>{error('services')}</label>
            <div className="pf-grid">
              <label>{t('Website')}<input {...field('website_url')} inputMode="url" autoComplete="url" placeholder="example.com.my"/>{error('website_url')}</label>
              <label>{t('Facebook or Instagram links')}<input {...field('social_links')}/>{error('social_links')}</label>
            </div>
            <label>{t('Anything else we should know?')}<textarea {...field('notes')} rows="3"/>{error('notes')}</label>
          </div>
          <p className="pf-photos">{t('Photos are sent on WhatsApp after this form: your logo, your shopfront with the signboard, and the interior.')}</p>
          <label className="pf-check"><input id="profile-authorised" type="checkbox" checked={values.authorised} aria-required="true" aria-invalid={Boolean(shown('authorised'))} aria-describedby={shown('authorised')?'profile-authorised-error':undefined} onChange={event=>{setTouched(current=>({...current,authorised:true}));change('authorised',event.target.checked);}}/><span>{t('I own this business or have permission to share these details. *')}</span></label>{error('authorised')}
          <input className="honeypot" name="fax" tabIndex="-1" autoComplete="off" aria-hidden="true" value={trap} onChange={event=>setTrap(event.target.value)}/>
          <Turnstile onToken={setCaptchaToken} resetKey={captchaReset}/>
          {problem&&<div className="pf-problem" role="alert"><p>{problem}</p>{hasWhatsapp&&<button type="button" className="button button-light" onClick={sendDetailsOnWhatsapp}><MessageCircle size={17}/> {t('Send these details on WhatsApp')} <ArrowUpRight size={15}/></button>}</div>}
          <div className="pf-actions"><button type="submit" className="button button-dark" disabled={sending}>{sending?t('Saving your details…'):t('Send business details')} <ArrowUpRight size={15}/></button></div>
          <small className="pf-privacy">{t('We use these details only to set up and manage your Google Business Profile. They are stored by our service providers. Read our')} <a href="/privacy" target="_blank" rel="noopener noreferrer">{t('privacy policy')}</a>.</small>
        </form>
      </>}
    </main>
    {footer}
  </>;
}
