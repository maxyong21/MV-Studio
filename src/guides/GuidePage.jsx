import {useEffect} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,Github,Globe2,Linkedin,Plus} from 'lucide-react';
import {fallbackContent} from '../content.js';
import {normalizeSiteContent,sortRows,whatsappHref} from '../lib/site.js';
import {articleGraph} from '../lib/structured-data.mjs';
import {alternatesFor,canonicalFor,htmlLang,ogLocale,parseLocale} from '../lib/locale.mjs';
import {DocumentLanguage,LanguageSwitch,useLanguage} from '../i18n/index.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import {guideBySlug,guideText,hasLanguage} from './registry.mjs';
import {Blocks,GuideCard,Inline,ServiceLinks,formatGuideDate,guideHref,useGuideContent} from './GuideParts.jsx';
import '../components/faq.css';
import '../services/service.css';
import './guides.css';

const setMeta=(name,value,attribute='name')=>{let node=document.head.querySelector(`meta[${attribute}="${name}"]`);if(!node){node=document.createElement('meta');node.setAttribute(attribute,name);document.head.appendChild(node);}node.content=value;};

// An article at /guides/<slug>, or /ms/guides/<slug> and /zh/guides/<slug> where it has been translated.
// The language of the text follows the address, so each language is its own page for search engines.
export default function GuidePage({slug,data,footer}){
  const {t,lp}=useLanguage(),{pathname}=useLocation();
  const meta=guideBySlug(slug),pageLang=parseLocale(pathname).lang,contentLang=hasLanguage(slug,pageLang)?pageLang:'en';
  const text=guideText(meta,contentLang),content=useGuideContent(),body=content?(content[slug]?.[contentLang]||content[slug]?.en):null;
  const site=normalizeSiteContent(data.site_content?.content||fallbackContent.site_content.content);
  const team=sortRows(data.team_members).length?sortRows(data.team_members):fallbackContent.team_members;
  const whatsapp=whatsappHref(site.whatsapp_number??fallbackContent.site_content.content.whatsapp_number);
  const ctx={services:data.services||[],features:data.feature_options||[],lang:contentLang,lp,t};
  useEffect(()=>{
    const base=(import.meta.env.VITE_SITE_URL||window.location.origin).replace(/\/$/,''),route=`/guides/${slug}`,url=canonicalFor(route,contentLang,base);
    document.title=`${text.seoTitle} | MV Studio`;
    setMeta('description',text.description);setMeta('robots','index,follow,max-image-preview:large');
    for(const [name,value] of [['og:title',document.title],['og:description',text.description],['og:url',url],['og:type','article'],['og:image',`${base}/aphome.png`],['og:locale',ogLocale[contentLang]],['article:published_time',meta.published],['article:modified_time',meta.modified],['article:section',meta.topic]])setMeta(name,value,'property');
    setMeta('twitter:title',document.title);setMeta('twitter:description',text.description);
    let canonical=document.head.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}canonical.href=url;
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach(node=>node.remove());
    for(const [code,href] of alternatesFor(route,base)){const link=document.createElement('link');link.rel='alternate';link.hreflang=code;link.href=href;document.head.appendChild(link);}
    let structured=document.getElementById('mv-studio-jsonld');if(!structured){structured=document.createElement('script');structured.id='mv-studio-jsonld';structured.type='application/ld+json';document.head.appendChild(structured);}
    structured.textContent=JSON.stringify(articleGraph({base,guide:meta,text,lang:contentLang,team,content:site,services:data.services||[],faqs:body?.faqs||[]}));
  },[slug,contentLang,text,body,data.services,site,team,meta]);
  const people=team.map(member=>member.name).filter(Boolean);
  const byline=people.length>1?`${people.slice(0,-1).join(', ')} ${t('and')} ${people.at(-1)}`:people[0]||'MV Studio';
  return <><DocumentLanguage/><a className="skip-link" href="#guide-content">{t('Skip to main content')}</a>
    <header className="site-nav"><div className="nav-inner"><Link className="brand" to={lp('/')}><span className="brand-symbol">m<span>v</span></span><span>MV<span className="brand-light">Studio</span></span></Link><Link className="admin-link" to={lp('/guides')}>{t('← All guides')}</Link><div className="nav-end"><LanguageSwitch className="nav-language"/><ThemeToggle/><Link className="button button-dark nav-cta" to={lp('/#enquiry')}>{t('Start a project')} <ArrowUpRight size={15}/></Link></div></div></header>
    <main className="project-detail guide-page" id="guide-content" tabIndex={-1}>
      <nav className="project-breadcrumb" aria-label="Breadcrumb"><Link to={lp('/')}>{t('Home')}</Link><span aria-hidden="true">/</span><Link to={lp('/guides')}>{t('Guides')}</Link><span aria-hidden="true">/</span><span aria-current="page">{text.title}</span></nav>
      <article lang={htmlLang[contentLang]}>
        <header className="guide-head">
          <span className="section-overline">{t(meta.topic)}</span>
          <h1>{text.title}</h1>
          <p className="guide-meta"><span>{t('By')} {byline}</span><span aria-hidden="true">·</span><span>{t('Published')} <time dateTime={meta.published}>{formatGuideDate(meta.published,contentLang)}</time></span>{meta.modified!==meta.published&&<><span aria-hidden="true">·</span><span>{t('Updated')} <time dateTime={meta.modified}>{formatGuideDate(meta.modified,contentLang)}</time></span></>}<span aria-hidden="true">·</span><span>{text.minutes} {t('min read')}</span></p>
          {body&&body.lead.map((paragraph,index)=><p className="guide-lead" key={index}><Inline text={paragraph} ctx={ctx}/></p>)}
        </header>
        {!body&&<p className="guide-loading" role="status">{content===false?t('This guide could not be loaded. Please refresh the page.'):t('Loading the guide…')}</p>}
        {body&&<>
          <aside className="guide-answer" aria-labelledby="guide-answer-title"><strong id="guide-answer-title">{t('Quick answer')}</strong><p><Inline text={body.answer} ctx={ctx}/></p></aside>
          <nav className="guide-toc" aria-labelledby="guide-toc-title"><h2 id="guide-toc-title">{t('In this guide')}</h2><ol>{body.sections.map(section=><li key={section.id}><a href={`#${section.id}`}>{section.heading}</a></li>)}<li><a href="#guide-faq">{t('Common questions')}</a></li></ol></nav>
          <div className="guide-body">
            {body.sections.map(section=><section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}><h2 id={`${section.id}-heading`}>{section.heading}</h2><Blocks blocks={section.blocks} ctx={ctx}/></section>)}
            {body.note&&<aside className="guide-note"><Inline text={body.note} ctx={ctx}/></aside>}
            <section id="guide-faq" aria-labelledby="guide-faq-heading"><h2 id="guide-faq-heading">{t('Common questions')}</h2><div className="faq-list">{body.faqs.map(([question,answer])=><details className="faq-item" key={question}><summary><span>{question}</span><Plus size={20} aria-hidden="true"/></summary><div className="faq-answer"><p><Inline text={answer} ctx={ctx}/></p></div></details>)}</div></section>
          </div>
          <aside className="guide-author" aria-labelledby="guide-author-title"><h2 id="guide-author-title">{t('Written by')}</h2><p>{t('We are the two developers behind MV Studio. We write these guides from what we know about building websites, and we update them when prices, tools or rules change.')}</p><ul>{team.map(member=><li key={member.id||member.name}><b>{member.name}</b>{member.role&&<span>{member.role}</span>}<span className="guide-author-links">{member.linkedin_url&&<a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} LinkedIn`}><Linkedin size={15}/></a>}{member.github_url&&<a href={member.github_url} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} GitHub`}><Github size={15}/></a>}{member.website_url&&<a href={member.website_url} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} ${t('website')}`}><Globe2 size={15}/></a>}</span></li>)}</ul></aside>
        </>}
      </article>
      <section className="service-block guide-more" aria-labelledby="guide-more-title"><h2 id="guide-more-title">{t('Keep reading')}</h2><div className="guide-grid">{meta.related.map(related=><GuideCard key={related} slug={related} lang={contentLang} compact/>)}</div></section>
      {meta.services?.length>0&&<nav className="service-block service-others" aria-labelledby="guide-services"><h2 id="guide-services">{t('Related services')}</h2><ul><ServiceLinks slugs={meta.services} lang={contentLang} lp={lp}/></ul></nav>}
      <div className="service-cta"><div><h2>{t('Ready when you are.')}</h2><p>{t('Tell us a little about what you have in mind. We’ll take it from there, together.')}</p></div><div className="service-offer-actions"><Link className="button button-dark" to={lp('/#enquiry')}>{t('Start a project')} <ArrowUpRight size={15}/></Link>{whatsapp&&<a className="button button-light" href={whatsapp} target="_blank" rel="noreferrer">{t('Chat on WhatsApp')} <ArrowUpRight size={15}/></a>}</div></div>
      <p className="guides-all"><Link to={lp('/guides')}>{t('See all guides')} <ArrowRight size={14} aria-hidden="true"/></Link></p>
    </main>
    {footer}
  </>;
}
