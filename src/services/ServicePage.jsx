import {useEffect} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,Check,Linkedin,Plus} from 'lucide-react';
import {fallbackContent} from '../content.js';
import {money,normalizeSiteContent,sortRows,whatsappHref} from '../lib/site.js';
import {serviceGraph,servicePrice} from '../lib/structured-data.mjs';
import {DocumentLanguage,LanguageSwitch,useLanguage} from '../i18n/index.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import {servicePages,serviceForPage} from './content.mjs';
import '../components/faq.css';
import './service.css';

const steps=[['01','Listen first','We get to know your business, the people you serve, and what success looks like.'],['02','Shape the idea','We map the right scope and share a clear proposal before development begins.'],['03','Build with you','You see progress along the way and help guide the details that matter.'],['04','Launch & support','We launch together, then stay available for the next improvements.']];

// The page text is English. Menus, headings and buttons follow the visitor's language.
export default function ServicePage({page,data,footer}){
  const {t}=useLanguage();
  const content=normalizeSiteContent(data.site_content?.content||fallbackContent.site_content.content);
  const services=sortRows(data.services),team=sortRows(data.team_members);
  const service=serviceForPage(page,services);
  const price=service?servicePrice(service):null;
  const included=service?.features?.length?service.features:page.includes;
  const whatsapp=whatsappHref(content.whatsapp_number??fallbackContent.site_content.content.whatsapp_number);
  useEffect(()=>{
    const base=(import.meta.env.VITE_SITE_URL||window.location.origin).replace(/\/$/,''),url=`${base}/services/${page.slug}`;
    const meta=(name,value,attribute='name')=>{let node=document.head.querySelector(`meta[${attribute}="${name}"]`);if(!node){node=document.createElement('meta');node.setAttribute(attribute,name);document.head.appendChild(node);}node.content=value;};
    document.title=page.title;
    meta('description',page.description);meta('robots','index,follow,max-image-preview:large');
    for(const [name,value] of [['og:title',page.title],['og:description',page.description],['og:url',url],['og:image',`${base}/aphome.png`]])meta(name,value,'property');
    meta('twitter:title',page.title);meta('twitter:description',page.description);
    let canonical=document.head.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}canonical.href=url;
    let structured=document.getElementById('mv-studio-jsonld');if(!structured){structured=document.createElement('script');structured.id='mv-studio-jsonld';structured.type='application/ld+json';document.head.appendChild(structured);}
    structured.textContent=JSON.stringify(serviceGraph({base,page,service,content,services,team}));
  },[page,service,content,services,team]);
  return <><DocumentLanguage/><a className="skip-link" href="#service-content">{t('Skip to main content')}</a>
    <header className="site-nav"><div className="nav-inner"><Link className="brand" to="/" aria-label="MV Studio home"><span className="brand-symbol">m<span>v</span></span><span>MV<span className="brand-light">Studio</span></span></Link><Link className="admin-link" to="/#services">{t('← All services')}</Link><div className="nav-end"><LanguageSwitch className="nav-language"/><ThemeToggle/><Link className="button button-dark nav-cta" to="/#enquiry">{t('Start a project')} <ArrowUpRight size={15}/></Link></div></div></header>
    <main className="project-detail service-page" id="service-content" tabIndex={-1}>
      <nav className="project-breadcrumb" aria-label="Breadcrumb"><Link to="/">{t('Home')}</Link><span aria-hidden="true">/</span><Link to="/#services">{t('Services')}</Link><span aria-hidden="true">/</span><span aria-current="page">{page.name}</span></nav>
      <div className="project-detail-head service-head"><span className="section-overline">{service?.category||t('SERVICE')}</span><h1>{page.heading}</h1><p>{page.intro}</p>
        <div className="service-offer"><div className="service-offer-price"><strong>{price===null?t('Let’s talk'):money(price,service.currency)}</strong><small>{t(price===null?'tailored to you':'starting price')}</small>{service?.timeline&&<span>{service.timeline}</span>}</div><div className="service-offer-actions"><Link className="button button-dark" to="/#enquiry">{t('Start a project')} <ArrowUpRight size={15}/></Link>{whatsapp&&<a className="button button-light" href={whatsapp} target="_blank" rel="noreferrer">{t('Chat on WhatsApp')} <ArrowUpRight size={15}/></a>}</div></div>
      </div>
      <div className="service-columns">
        <section aria-labelledby="service-included"><h2 id="service-included">{t('What’s included')}</h2><ul className="service-list">{included.map(item=><li key={item}><Check size={16} aria-hidden="true"/>{item}</li>)}</ul></section>
        <section aria-labelledby="service-fit"><h2 id="service-fit">{t('A good fit if')}</h2><ul className="service-list">{page.suits.map(item=><li key={item}><Check size={16} aria-hidden="true"/>{item}</li>)}</ul></section>
      </div>
      <section className="service-block" aria-labelledby="service-steps"><h2 id="service-steps">{t('How we work')}</h2><ol className="service-steps">{steps.map(([number,title,detail])=><li key={number}><span>{number}</span><h3>{t(title)}</h3><p>{t(detail)}</p></li>)}</ol></section>
      <section className="service-block service-note" aria-labelledby="service-costs"><h2 id="service-costs">{t('Clear about costs')}</h2><p>{t('Starting prices cover the listed scope. We confirm delivery dates, revision limits, hosting, domain, maintenance, and payment terms in your proposal before work begins.')}</p></section>
      {team.length>0&&<section className="service-block" aria-labelledby="service-team"><h2 id="service-team">{t('Who builds it')}</h2><p className="service-lead">{t('Work directly with the developers on your project.')}</p><ul className="service-team">{team.map(member=><li key={member.id}><div><b>{member.name}</b><span>{member.role}</span></div>{member.linkedin_url&&<a href={member.linkedin_url} target="_blank" rel="noreferrer" aria-label={`${member.name} LinkedIn`}><Linkedin size={15}/></a>}</li>)}</ul></section>}
      <section className="service-block" aria-labelledby="service-faq"><h2 id="service-faq">{t('Common questions')}</h2><div className="faq-list">{page.faqs.map(([question,answer])=><details className="faq-item" key={question}><summary><span>{question}</span><Plus size={20} aria-hidden="true"/></summary><div className="faq-answer"><p>{answer}</p></div></details>)}</div></section>
      <section className="service-block service-languages" aria-label="Bahasa Malaysia · 中文"><p lang="ms">{page.ms}</p><p lang="zh-Hans">{page.zh}</p></section>
      <nav className="service-block service-others" aria-labelledby="service-others"><h2 id="service-others">{t('Other services')}</h2><ul>{servicePages.filter(other=>other!==page).map(other=><li key={other.slug}><Link to={`/services/${other.slug}`}>{other.name} <ArrowRight size={14} aria-hidden="true"/></Link></li>)}</ul></nav>
      <div className="service-cta"><div><h2>{t('Ready when you are.')}</h2><p>{t('Tell us a little about what you have in mind. We’ll take it from there, together.')}</p></div><Link className="button button-dark" to="/#enquiry">{t('Start a project')} <ArrowUpRight size={15}/></Link></div>
    </main>
    {footer}
  </>;
}
