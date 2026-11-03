import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft,ArrowUpRight,Check,Mail,Moon,ShieldCheck,Sun} from 'lucide-react';
import {legalDocuments,legalUpdated,privacyMalay} from './content.mjs';
import {normalizeContactList} from '../lib/site.js';
import './legal.css';

export default function LegalPage({path,data}){
  const [language,setLanguage]=useState('en'),[dark,setDark]=useState(false),[preferencesNotice,setPreferencesNotice]=useState('');
  const isMalay=path==='/privacy'&&language==='ms';
  const documentContent=path==='/privacy'&&language==='ms'?privacyMalay:legalDocuments[path];
  const emails=normalizeContactList(data?.site_content?.content?.contact_emails).filter(v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
  useEffect(()=>{try{const enabled=localStorage.getItem('mv-theme')==='dark';setDark(enabled);document.documentElement.dataset.theme=enabled?'dark':'light';}catch{}},[]);
  useEffect(()=>{
    document.title=`${documentContent.title} | MV Studio`;
    const base=(import.meta.env.VITE_SITE_URL||window.location.origin).replace(/\/$/,''),url=base+path;
    const meta=(name,content,attribute='name')=>{let node=document.head.querySelector(`meta[${attribute}="${name}"]`);if(!node){node=document.createElement('meta');node.setAttribute(attribute,name);document.head.appendChild(node);}node.content=content;};
    meta('description',documentContent.description);meta('robots','index,follow');
    for(const [name,value] of [['og:title',document.title],['og:description',documentContent.description],['og:url',url]])meta(name,value,'property');
    meta('twitter:title',document.title);meta('twitter:description',documentContent.description);
    let canonical=document.head.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}canonical.href=url;
    let structured=document.getElementById('mv-studio-jsonld');if(!structured){structured=document.createElement('script');structured.id='mv-studio-jsonld';structured.type='application/ld+json';document.head.appendChild(structured);}structured.textContent=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:document.title,description:documentContent.description,url});
  },[documentContent,path]);
  const toggleTheme=()=>{const next=!dark;setDark(next);document.documentElement.dataset.theme=next?'dark':'light';try{localStorage.setItem('mv-theme',next?'dark':'light');}catch{}};
  const preferences=()=>{if(window.mvAnalytics?.openPreferences)window.mvAnalytics.openPreferences();else setPreferencesNotice(isMalay?'Analitik tidak aktif pada laman web ini.':'Analytics are not active on this website.');};
  return <div className="legal-page"><a className="legal-skip" href="#legal-content">Skip to policy content</a>
    <header className="legal-header"><div className="legal-header-inner"><Link className="brand" to="/" aria-label="MV Studio home"><span className="brand-symbol">m<span>v</span></span><span>MV<span className="brand-light">Studio</span></span></Link><div><Link className="legal-home-link" to="/"><ArrowLeft size={16}/> Back to website</Link><button type="button" className="icon-button theme-button" aria-label="Toggle colour theme" onClick={toggleTheme}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button></div></div></header>
    <main id="legal-content" className="legal-main" lang={isMalay?'ms':'en'}>
      <div className="legal-hero"><span className="legal-eyebrow"><ShieldCheck size={17}/>{documentContent.eyebrow}</span><h1>{documentContent.title}</h1><p>{documentContent.intro}</p><div className="legal-meta"><span>{isMalay?'Dikemas kini':'Last updated'}: <time dateTime={legalUpdated}>3 November 2026</time></span>{path==='/privacy'&&<div className="legal-language" role="group" aria-label="Policy language"><button type="button" lang="en" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>English</button><button type="button" lang="ms" aria-pressed={language==='ms'} onClick={()=>setLanguage('ms')}>Bahasa Melayu</button></div>}</div><ul className="legal-highlights">{documentContent.highlights.map(v=><li key={v}><Check size={16}/>{v}</li>)}</ul></div>
      <nav className="legal-documents" aria-label="Legal documents">{Object.entries(legalDocuments).map(([url,doc])=><Link key={url} to={url} aria-current={path===url?'page':undefined}>{doc.title}</Link>)}</nav>
      <div className="legal-layout"><aside className="legal-contents"><span>{isMalay?'KANDUNGAN':'ON THIS PAGE'}</span><nav aria-label="Page contents">{documentContent.sections.map(section=><a key={section.id} href={`#${section.id}`}>{section.title}</a>)}<a href="#legal-contact">{isMalay?'Hubungi kami':'Contact the studio'}</a></nav></aside>
        <article className="legal-article">{documentContent.sections.map(section=><section id={section.id} key={section.id}><h2>{section.title}</h2>{section.paragraphs?.map(p=><p key={p}>{p}</p>)}{section.bullets&&<ul>{section.bullets.map(p=><li key={p}>{p}</li>)}</ul>}{section.links&&<ul className="legal-provider-links">{section.links.map(([label,url])=><li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={14}/></a></li>)}</ul>}{section.id==='analytics'&&<button type="button" className="button button-dark legal-preferences" onClick={preferences}>{isMalay?'Urus pilihan analitik':'Manage analytics choices'}</button>}{path==='/privacy'&&section.id==='rights'&&<Link className="legal-text-link" to="/data-deletion">{isMalay?'Arahan permintaan pemadaman':'Read the data-deletion instructions'} <ArrowUpRight size={15}/></Link>}</section>)}
        {preferencesNotice&&<p role="status">{preferencesNotice}</p>}<section id="legal-contact" className="legal-contact"><span className="legal-eyebrow">{isMalay?'KAMI SEDIA MEMBANTU':'A PERSON, WHEN YOU NEED ONE'}</span><h2>{isMalay?'Soalan tentang maklumat anda?':'Questions about your information?'}</h2><p>{isMalay?'Hubungi pasukan MV Studio melalui saluran hubungan yang diterbitkan. Gunakan subjek Permintaan privasi atau Permintaan pemadaman data.':'Contact the MV Studio team through our published channels. Use the subject Privacy request or Data deletion request so we can direct your message.'}</p><div className="legal-contact-actions">{emails.map(email=><a className="legal-email" key={email} href={`mailto:${email}?subject=${encodeURIComponent(path==='/data-deletion'?'Data deletion request':'Privacy request')}`}><Mail size={17}/>{email}</a>)}<Link className="button button-dark" to="/#contact">{isMalay?'Hubungi pasukan':'Contact the team'} <ArrowUpRight size={16}/></Link></div></section>
        </article></div>
    </main><footer className="legal-footer"><span>© {new Date().getFullYear()} MV Studio</span><nav aria-label="Legal footer">{Object.entries(legalDocuments).map(([url,doc])=><Link key={url} to={url}>{doc.title}</Link>)}</nav><Link to="/">Made with care in Malaysia.</Link></footer>
  </div>;
}
