import {useEffect,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {ArrowRight,ChevronDown,Github,Globe2,Linkedin,Plus} from 'lucide-react';
import {fallbackContent} from '../content.js';
import {normalizeSiteContent,sortRows,whatsappHref} from '../lib/site.js';
import {articleGraph} from '../lib/structured-data.mjs';
import {alternatesFor,canonicalFor,htmlLang,ogLocale,parseLocale} from '../lib/locale.mjs';
import {useScrollProgress} from '../lib/motion.js';
import {DocumentLanguage,useLanguage} from '../i18n/index.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import {guideBySlug,guideText,hasLanguage} from './registry.mjs';
import {Blocks,GuideCard,GuideCta,Inline,ServiceLinks,formatGuideDate,useGuideContent} from './GuideParts.jsx';
import '../components/faq.css';
import './guides.css';

const setMeta=(name,value,attribute='name')=>{let node=document.head.querySelector(`meta[${attribute}="${name}"]`);if(!node){node=document.createElement('meta');node.setAttribute(attribute,name);document.head.appendChild(node);}node.content=value;};
const initials=name=>String(name||'').split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase();

// Which section the reader is in, to highlight it in the contents list on wide screens.
function useActiveSection(ids){
  const [active,setActive]=useState('');
  const key=ids.join('|');
  useEffect(()=>{
    if(!ids.length||!('IntersectionObserver' in window))return;
    const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)setActive(entry.target.id);},{rootMargin:'-20% 0px -65% 0px'});
    ids.map(id=>document.getElementById(id)).filter(Boolean).forEach(node=>observer.observe(node));
    return()=>observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[key]);
  return active;
}

// An article at /guides/<slug>, or /ms/guides/<slug> and /zh/guides/<slug> where it has been translated.
// The language of the text follows the address, so each language is its own page for search engines.
export default function GuidePage({slug,data,footer}){
  const {t,lp}=useLanguage(),{pathname}=useLocation(),progress=useRef(null);
  const meta=guideBySlug(slug),pageLang=parseLocale(pathname).lang,contentLang=hasLanguage(slug,pageLang)?pageLang:'en';
  const text=guideText(meta,contentLang),content=useGuideContent(),body=content?(content[slug]?.[contentLang]||content[slug]?.en):null;
  const site=normalizeSiteContent(data.site_content?.content||fallbackContent.site_content.content);
  const team=sortRows(data.team_members).length?sortRows(data.team_members):fallbackContent.team_members;
  const whatsapp=whatsappHref(site.whatsapp_number??fallbackContent.site_content.content.whatsapp_number);
  const ctx={services:data.services||[],features:data.feature_options||[],lang:contentLang,lp,t};
  const sectionIds=body?[...body.sections.map(section=>section.id),'guide-faq']:[];
  const active=useActiveSection(sectionIds);
  useScrollProgress(progress);
  useEffect(()=>{
    const base=(import.meta.env.VITE_SITE_URL||window.location.origin).replace(/\/$/,''),route=`/guides/${slug}`,url=canonicalFor(route,contentLang,base);
    document.title=`${text.seoTitle} | MV Studio`;
    setMeta('description',text.description);setMeta('robots','index,follow,max-image-preview:large');
    for(const [name,value] of [['og:title',document.title],['og:description',text.description],['og:url',url],['og:type','article'],['og:image',`${base}/og-image.png`],['og:locale',ogLocale[contentLang]],['article:published_time',meta.published],['article:modified_time',meta.modified],['article:section',meta.topic]])setMeta(name,value,'property');
    setMeta('twitter:title',document.title);setMeta('twitter:description',text.description);
    let canonical=document.head.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}canonical.href=url;
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach(node=>node.remove());
    for(const [code,href] of alternatesFor(route,base)){const link=document.createElement('link');link.rel='alternate';link.hreflang=code;link.href=href;document.head.appendChild(link);}
    let structured=document.getElementById('mv-studio-jsonld');if(!structured){structured=document.createElement('script');structured.id='mv-studio-jsonld';structured.type='application/ld+json';document.head.appendChild(structured);}
    structured.textContent=JSON.stringify(articleGraph({base,guide:meta,text,lang:contentLang,team,content:site,services:data.services||[],faqs:body?.faqs||[]}));
  },[slug,contentLang,text,body,data.services,site,team,meta]);
  const people=team.map(member=>member.name).filter(Boolean);
  const byline=people.length>1?`${people.slice(0,-1).join(', ')} ${t('and')} ${people.at(-1)}`:people[0]||'MV Studio';
  const tocItems=body?[...body.sections.map(section=>[section.id,section.heading]),['guide-faq',t('Common questions')]]:[];
  return <><DocumentLanguage/><a className="skip-link" href="#guide-content">{t('Skip to main content')}</a>
    <div className="scroll-progress" ref={progress} aria-hidden="true"/>
    <SiteHeader current="/guides"/>
    <main className="guide-shell guide-page" id="guide-content" tabIndex={-1}>
      <header className="guide-hero"><div className="guide-wrap">
        <nav className="guide-crumbs" aria-label="Breadcrumb"><Link to={lp('/')}>{t('Home')}</Link><span aria-hidden="true">/</span><Link to={lp('/guides')}>{t('Guides')}</Link><span aria-hidden="true">/</span><span className="guide-crumb-current" aria-current="page">{text.title}</span></nav>
        <span className="guide-pill">{t(meta.topic)}</span>
        <h1 lang={htmlLang[contentLang]}>{text.title}</h1>
        <div className="guide-byline"><span className="guide-avatars" aria-hidden="true">{team.slice(0,3).map(member=><i key={member.id||member.name}>{initials(member.name)}</i>)}</span><p><b>{t('By')} {byline}</b><span>{t('Published')} <time dateTime={meta.published}>{formatGuideDate(meta.published,contentLang)}</time>{meta.modified!==meta.published&&<> · {t('Updated')} <time dateTime={meta.modified}>{formatGuideDate(meta.modified,contentLang)}</time></>} · {text.minutes} {t('min read')}</span></p></div>
      </div></header>
      <div className="guide-wrap guide-layout">
        <article lang={htmlLang[contentLang]}>
          {!body&&<p className="guide-loading" role="status">{content===false?t('This guide could not be loaded. Please refresh the page.'):t('Loading the guide…')}</p>}
          {body&&<>
            {body.lead.map((paragraph,index)=><p className="guide-lead" key={index}><Inline text={paragraph} ctx={ctx}/></p>)}
            <aside className="guide-answer" aria-labelledby="guide-answer-title"><strong id="guide-answer-title">{t('Quick answer')}</strong><p><Inline text={body.answer} ctx={ctx}/></p></aside>
            <details className="guide-toc-fold"><summary>{t('In this guide')}<ChevronDown size={18} aria-hidden="true"/></summary><ol>{tocItems.map(([id,heading])=><li key={id}><a href={`#${id}`}>{heading}</a></li>)}</ol></details>
            <div className="guide-body">
              {body.sections.map(section=><section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}><h2 id={`${section.id}-heading`}>{section.heading}</h2><Blocks blocks={section.blocks} ctx={ctx}/></section>)}
              {body.note&&<aside className="guide-note"><Inline text={body.note} ctx={ctx}/></aside>}
              <section id="guide-faq" aria-labelledby="guide-faq-heading"><h2 id="guide-faq-heading">{t('Common questions')}</h2><div className="faq-list">{body.faqs.map(([question,answer])=><details className="faq-item" key={question}><summary><span>{question}</span><Plus size={20} aria-hidden="true"/></summary><div className="faq-answer"><p><Inline text={answer} ctx={ctx}/></p></div></details>)}</div></section>
            </div>
            <aside className="guide-author" aria-labelledby="guide-author-title"><h2 id="guide-author-title">{t('Written by')}</h2><p>{t('We are the two developers behind MV Studio. We write these guides from what we know about building websites, and we update them when prices, tools or rules change.')}</p><ul>{team.map(member=><li key={member.id||member.name}><i aria-hidden="true">{initials(member.name)}</i><span><b>{member.name}</b>{member.role&&<small>{member.role}</small>}</span><span className="guide-author-links">{member.linkedin_url&&<a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} LinkedIn`}><Linkedin size={16}/></a>}{member.github_url&&<a href={member.github_url} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} GitHub`}><Github size={16}/></a>}{member.website_url&&<a href={member.website_url} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} ${t('website')}`}><Globe2 size={16}/></a>}</span></li>)}</ul></aside>
          </>}
        </article>
        {body&&<aside className="guide-aside" aria-label={t('In this guide')}>
          <nav className="guide-toc" aria-labelledby="guide-toc-title"><h2 id="guide-toc-title">{t('In this guide')}</h2><ol>{tocItems.map(([id,heading])=><li key={id}><a href={`#${id}`} aria-current={active===id?'true':undefined}>{heading}</a></li>)}</ol></nav>
          <div className="guide-aside-cta"><b>{t('Have a project in mind?')}</b><p>{t('The first call and the written quote are free.')}</p><Link className="guide-btn" to={lp('/#enquiry')}>{t('Start a project')} <ArrowRight size={15} aria-hidden="true"/></Link></div>
        </aside>}
      </div>
      <div className="guide-wrap">
        <section className="guide-more" aria-labelledby="guide-more-title"><h2 id="guide-more-title">{t('Keep reading')}</h2><div className="guide-grid">{meta.related.map(related=><GuideCard key={related} slug={related} lang={contentLang} compact/>)}</div></section>
        {meta.services?.length>0&&<nav className="guide-services" aria-labelledby="guide-services"><h2 id="guide-services">{t('Related services')}</h2><ul><ServiceLinks slugs={meta.services} lang={contentLang} lp={lp}/></ul></nav>}
        <GuideCta whatsapp={whatsapp}/>
        <p className="guides-all"><Link to={lp('/guides')}>{t('See all guides')} <ArrowRight size={14} aria-hidden="true"/></Link></p>
      </div>
    </main>
    {footer}
  </>;
}
