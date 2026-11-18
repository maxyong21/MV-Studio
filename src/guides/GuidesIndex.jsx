import {useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {fallbackContent} from '../content.js';
import {whatsappHref} from '../lib/site.js';
import {alternatesFor,canonicalFor,htmlLang,ogLocale,parseLocale} from '../lib/locale.mjs';
import {DocumentLanguage,useLanguage} from '../i18n/index.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import {guidesIndexMeta,sortedGuides} from './registry.mjs';
import {GuideCard,GuideCta,formatGuideDate} from './GuideParts.jsx';
import './guides.css';

const setMeta=(name,value,attribute='name')=>{let node=document.head.querySelector(`meta[${attribute}="${name}"]`);if(!node){node=document.createElement('meta');node.setAttribute(attribute,name);document.head.appendChild(node);}node.content=value;};

// The list of all guides at /guides (and /ms/guides, /zh/guides). Newest first, with a topic filter.
export default function GuidesIndex({data={},footer}){
  const {t,lp}=useLanguage(),{pathname}=useLocation(),pageLang=parseLocale(pathname).lang,meta=guidesIndexMeta[pageLang]||guidesIndexMeta.en;
  const [topic,setTopic]=useState('');
  const all=sortedGuides(),topics=[...new Set(all.map(guide=>guide.topic))];
  const shown=topic?all.filter(guide=>guide.topic===topic):all;
  const latest=all.map(guide=>guide.modified).sort().at(-1);
  const whatsapp=whatsappHref(data.site_content?.content?.whatsapp_number??fallbackContent.site_content.content.whatsapp_number);
  useEffect(()=>{
    const base=(import.meta.env.VITE_SITE_URL||window.location.origin).replace(/\/$/,''),url=canonicalFor('/guides',pageLang,base);
    document.title=`${meta.seoTitle} | MV Studio`;
    setMeta('description',meta.description);setMeta('robots','index,follow,max-image-preview:large');
    for(const [name,value] of [['og:title',document.title],['og:description',meta.description],['og:url',url],['og:type','website'],['og:image',`${base}/aphome.png`],['og:locale',ogLocale[pageLang]]])setMeta(name,value,'property');
    setMeta('twitter:title',document.title);setMeta('twitter:description',meta.description);
    let canonical=document.head.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}canonical.href=url;
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach(node=>node.remove());
    for(const [code,href] of alternatesFor('/guides',base)){const link=document.createElement('link');link.rel='alternate';link.hreflang=code;link.href=href;document.head.appendChild(link);}
    let structured=document.getElementById('mv-studio-jsonld');if(!structured){structured=document.createElement('script');structured.id='mv-studio-jsonld';structured.type='application/ld+json';document.head.appendChild(structured);}
    structured.textContent=JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage',name:meta.title,description:meta.description,url,inLanguage:htmlLang[pageLang],isPartOf:{'@id':`${base}/#website`}});
  },[pageLang,meta]);
  return <><DocumentLanguage/><a className="skip-link" href="#guides-content">{t('Skip to main content')}</a>
    <SiteHeader current="/guides"/>
    <main className="guide-shell guides-index" id="guides-content" tabIndex={-1}>
      <header className="guide-hero"><div className="guide-wrap">
        <nav className="guide-crumbs" aria-label="Breadcrumb"><Link to={lp('/')}>{t('Home')}</Link><span aria-hidden="true">/</span><span aria-current="page">{t('Guides')}</span></nav>
        <span className="guide-pill">{t('Guides')}</span>
        <h1>{meta.title}</h1>
        <p className="guide-hero-intro">{meta.intro}</p>
        <p className="guide-hero-facts"><span>{t('{count} guides',{count:all.length})}</span><span>{t('Updated')} <time dateTime={latest}>{formatGuideDate(latest,pageLang)}</time></span><span>EN · BM · 中文</span></p>
      </div></header>
      <div className="guide-wrap">
        <div className="guide-filter" role="group" aria-label={t('Filter by topic')}>
          <button type="button" aria-pressed={!topic} onClick={()=>setTopic('')}>{t('All topics')}</button>
          {topics.map(name=><button type="button" key={name} aria-pressed={topic===name} onClick={()=>setTopic(name)}>{t(name)}</button>)}
        </div>
        <p className="guide-count" role="status">{t('{count} guides',{count:shown.length})}</p>
        <div className="guide-grid guide-grid-index">{shown.map((guide,index)=><GuideCard key={guide.slug} slug={guide.slug} lang={pageLang} heading="h2" featured={!topic&&index===0}/>)}</div>
        <GuideCta whatsapp={whatsapp}/>
      </div>
    </main>
    {footer}
  </>;
}
