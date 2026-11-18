import {Fragment,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight} from 'lucide-react';
import {parseInline,isExternal} from './inline.mjs';
import {fillTokens} from './tokens.mjs';
import {getGuideContent,loadGuideContent} from './store.mjs';
import {guideBySlug,guideText,hasLanguage,shortLabel,sortedGuides} from './registry.mjs';
import {localizePath} from '../lib/locale.mjs';
import {servicePages} from '../services/content.mjs';
import {localizedPage} from '../services/localized.mjs';
import {useLanguage} from '../i18n/index.jsx';

// The address of a guide in one language. A guide that has no such translation keeps its English address.
export const guideHref=(slug,lang)=>localizePath(`/guides/${slug}`,lang);
// The language a guide is shown in: the visitor's, if the guide has been written in it, otherwise English.
export const guideLangFor=(slug,lang)=>hasLanguage(slug,lang)?lang:'en';

export function Inline({text,ctx}){
  const filled=fillTokens(text,ctx);
  return <>{parseInline(filled).map((part,index)=>{
    if(part.type==='bold')return <strong key={index}>{part.text}</strong>;
    if(part.type==='link')return isExternal(part.href)?<a key={index} href={part.href} target="_blank" rel="noopener noreferrer">{part.text}</a>:<Link key={index} to={ctx.lp(part.href)}>{part.text}</Link>;
    return <Fragment key={index}>{part.text}</Fragment>;
  })}</>;
}

export function Blocks({blocks=[],ctx}){
  return <>{blocks.map((block,index)=>{
    if(typeof block==='string')return <p key={index}><Inline text={block} ctx={ctx}/></p>;
    if(block.h3)return <h3 key={index}><Inline text={block.h3} ctx={ctx}/></h3>;
    if(block.ul)return <ul key={index}>{block.ul.map((item,i)=><li key={i}><Inline text={item} ctx={ctx}/></li>)}</ul>;
    if(block.ol)return <ol key={index}>{block.ol.map((item,i)=><li key={i}><Inline text={item} ctx={ctx}/></li>)}</ol>;
    if(block.note)return <aside key={index} className="guide-note"><Inline text={block.note} ctx={ctx}/></aside>;
    if(block.table)return <div key={index} className="guide-table" role="region" tabIndex={0} aria-label={ctx.t('Comparison table')}><table><thead><tr>{block.table.head.map((cell,i)=><th key={i} scope="col">{cell||<span className="guide-sr">{ctx.t('Topic')}</span>}</th>)}</tr></thead><tbody>{block.table.rows.map((row,r)=><tr key={r}>{row.map((cell,c)=>c===0?<th key={c} scope="row"><Inline text={cell} ctx={ctx}/></th>:<td key={c}><Inline text={cell} ctx={ctx}/></td>)}</tr>)}</tbody></table></div>;
    return null;
  })}</>;
}

// The article text is loaded on demand in the browser and is already present when prerendering.
export function useGuideContent(){
  const [content,setContent]=useState(()=>getGuideContent());
  useEffect(()=>{
    if(content)return;
    let active=true;
    loadGuideContent().then(value=>{if(active)setContent(value);}).catch(()=>{if(active)setContent(false);});
    return()=>{active=false;};
  },[content]);
  return content;
}

export function formatGuideDate(iso,lang){
  const date=new Date(`${iso}T00:00:00Z`);
  const locale={en:'en-US',ms:'ms-MY',zh:'zh-CN'}[lang]||'en-US';
  return new Intl.DateTimeFormat(locale,{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date);
}

// A card for a guide, used on the index, the home page and under a service page.
// heading: the level of the card's title, so it never skips a level (h2 under the page title, h3 under a section heading).
export function GuideCard({slug,lang,compact=false,heading='h3'}){
  const Heading=heading;
  const {t,lp}=useLanguage();
  const guide=guideBySlug(slug);
  if(!guide)return null;
  const shownLang=guideLangFor(slug,lang),text=guideText(guide,shownLang);
  return <article className={`guide-card${compact?' guide-card-compact':''}`}>
    <span className="guide-card-topic">{t(guide.topic)}</span>
    <Heading><Link to={guideHref(slug,lang)} lang={shownLang==='en'?'en':undefined}>{text.title}</Link></Heading>
    {!compact&&<p>{text.description}</p>}
    <div className="guide-card-foot"><span>{text.minutes} {t('min read')}{lang!=='en'&&shownLang==='en'?` · ${t('English only')}`:''}</span><Link className="guide-card-link" to={guideHref(slug,lang)} aria-label={`${t('Read the guide')}: ${text.title}`}>{t('Read the guide')} <ArrowRight size={14} aria-hidden="true"/></Link></div>
  </article>;
}

// The three newest guides, on the home page.
export function LatestGuides(){
  const {t,lang,lp}=useLanguage();
  const latest=sortedGuides().slice(0,3);
  return <section className="guides-section section-pad" id="guides" aria-labelledby="guides-title">
    <div className="section-heading"><div><div className="section-overline">{t('GUIDES')}</div><h2 id="guides-title">{t('Plain answers,')}<br/><em>{t('before you build.')}</em></h2></div><p>{t('Short, honest guides on website costs, timelines and getting found online.')}</p></div>
    <div className="guide-grid">{latest.map(guide=><GuideCard key={guide.slug} slug={guide.slug} lang={lang}/>)}</div>
    <p className="guides-all"><Link to={lp('/guides')}>{t('See all guides')} <ArrowRight size={14} aria-hidden="true"/></Link></p>
  </section>;
}

// Guides that relate to one service, under that service's page.
export function RelatedGuides({serviceSlug,lang}){
  const {t}=useLanguage();
  const related=sortedGuides().filter(guide=>guide.services?.includes(serviceSlug)).slice(0,3);
  if(!related.length)return null;
  return <section className="service-block" aria-labelledby="related-guides"><h2 id="related-guides">{t('Helpful guides')}</h2><div className="guide-grid">{related.map(guide=><GuideCard key={guide.slug} slug={guide.slug} lang={lang} compact/>)}</div></section>;
}

// Links to the services a guide leads to.
export function ServiceLinks({slugs=[],lang,lp}){
  return <>{slugs.map(slug=>servicePages.find(page=>page.slug===slug)).filter(Boolean).map(page=><li key={page.slug}><Link to={lp(`/services/${page.slug}`)}>{localizedPage(page,lang).name} <ArrowRight size={14} aria-hidden="true"/></Link></li>)}</>;
}

export {shortLabel};
