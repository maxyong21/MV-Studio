import {useEffect} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import {alternatesFor,canonicalFor,htmlLang,ogLocale,parseLocale} from '../lib/locale.mjs';
import {DocumentLanguage,LanguageSwitch,useLanguage} from '../i18n/index.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import {guidesIndexMeta,sortedGuides} from './registry.mjs';
import {GuideCard} from './GuideParts.jsx';
import '../services/service.css';
import './guides.css';

const setMeta=(name,value,attribute='name')=>{let node=document.head.querySelector(`meta[${attribute}="${name}"]`);if(!node){node=document.createElement('meta');node.setAttribute(attribute,name);document.head.appendChild(node);}node.content=value;};

// The list of all guides at /guides (and /ms/guides, /zh/guides). Newest first.
export default function GuidesIndex({footer}){
  const {t,lp}=useLanguage(),{pathname}=useLocation(),pageLang=parseLocale(pathname).lang,meta=guidesIndexMeta[pageLang]||guidesIndexMeta.en;
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
    <header className="site-nav"><div className="nav-inner"><Link className="brand" to={lp('/')}><span className="brand-symbol">m<span>v</span></span><span>MV<span className="brand-light">Studio</span></span></Link><Link className="admin-link" to={lp('/')}>{t('← Home')}</Link><div className="nav-end"><LanguageSwitch className="nav-language"/><ThemeToggle/><Link className="button button-dark nav-cta" to={lp('/#enquiry')}>{t('Start a project')} <ArrowUpRight size={15}/></Link></div></div></header>
    <main className="project-detail guide-page guides-index" id="guides-content" tabIndex={-1}>
      <nav className="project-breadcrumb" aria-label="Breadcrumb"><Link to={lp('/')}>{t('Home')}</Link><span aria-hidden="true">/</span><span aria-current="page">{t('Guides')}</span></nav>
      <header className="guide-head"><span className="section-overline">{t('GUIDES')}</span><h1>{meta.title}</h1><p className="guide-lead">{meta.intro}</p></header>
      <div className="guide-grid guide-grid-index">{sortedGuides().map(guide=><GuideCard key={guide.slug} slug={guide.slug} lang={pageLang} heading="h2"/>)}</div>
    </main>
    {footer}
  </>;
}
