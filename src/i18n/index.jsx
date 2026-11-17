// Interface translations for the customer site. English is the source text and
// the key: t('Start a project') returns the chosen language, or the English text
// itself when a translation is missing, so nothing can render blank.
// Content typed in the admin (services, projects, FAQs, the headline) is not
// translated here. See docs/LANGUAGES.md.
//
// On the home page and the service pages the language is part of the address (/ms, /zh), so each
// language has its own page for search engines. Everywhere else it is a browser-side choice.
import {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {htmlLang,isLocalizable,localizePath,parseLocale} from '../lib/locale.mjs';
import './language.css';

export const LANGUAGES=[['en','EN','English'],['ms','BM','Bahasa Malaysia'],['zh','中文','中文 (Chinese)']];
// Loaded only when chosen, so English visitors download no translation files.
export const loaders={ms:()=>import('./ms.js'),zh:()=>import('./zh.js')};
const KEY='mv-lang';
const LanguageContext=createContext({lang:'en',t:text=>text,setLang(){},lp:path=>path});
export const useLanguage=()=>useContext(LanguageContext);

// initial: {lang, table}. The server and the first browser paint use the language in the address,
// so the page that was prerendered is the page that is hydrated.
export function LanguageProvider({children,initial}){
  const {pathname,search,hash}=useLocation(),navigate=useNavigate();
  const {lang:routeLang,route}=parseLocale(pathname),localizable=isLocalizable(route);
  const [lang,setLangState]=useState(initial?.lang||'en'),[table,setTable]=useState(initial?.table||null);
  // If the translation file cannot be fetched the page simply stays in English.
  const apply=useCallback(async next=>{
    if(next==='en'){setTable(null);setLangState('en');return;}
    try{const loaded=await loaders[next]();setTable(loaded.default);setLangState(next);}catch{setTable(null);setLangState('en');}
  },[]);
  const setLang=useCallback(async next=>{
    if(next!=='en'&&!loaders[next])return;
    try{localStorage.setItem(KEY,next);}catch{}
    // A translated page has its own address; the effect below then loads the text.
    if(localizable)navigate(localizePath(`${route}${search}${hash}`,next),{replace:true,state:{keepScroll:true}});
    else await apply(next);
  },[apply,localizable,navigate,route,search,hash]);
  useEffect(()=>{
    if(!localizable){
      // Other pages keep one address and follow the saved choice.
      let saved='en';try{saved=localStorage.getItem(KEY)||'en';}catch{}
      if(saved!=='en'&&loaders[saved]&&lang==='en')apply(saved);
      return;
    }
    if(routeLang==='en'){
      // Someone who chose another language earlier is taken to that language's page.
      let saved='en';try{saved=localStorage.getItem(KEY)||'en';}catch{}
      if(saved!=='en'&&loaders[saved])navigate(localizePath(`${route}${search}${hash}`,saved),{replace:true,state:{keepScroll:true}});
      else if(lang!=='en')apply('en');
    }else if(routeLang!==lang)apply(routeLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[routeLang,localizable,route]);
  const t=useCallback((text,values)=>{let out=table?.[text]??text;if(values)for(const [name,value] of Object.entries(values))out=out.replaceAll(`{${name}}`,String(value));return out;},[table]);
  // Links inside the site keep the visitor in their language where a translated page exists.
  const lp=useCallback(path=>localizePath(path,lang),[lang]);
  const value=useMemo(()=>({lang,t,setLang,lp}),[lang,t,setLang,lp]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// Tells browsers and screen readers which language the page is in. Rendered by
// public pages only: the admin and legal pages keep their own language.
export function DocumentLanguage(){
  const {lang}=useLanguage();
  useEffect(()=>{const root=document.documentElement,before=root.lang;root.lang=htmlLang[lang]||'en-MY';return()=>{root.lang=before||'en-MY';};},[lang]);
  return null;
}

export function LanguageSwitch({className=''}){
  const {lang,setLang}=useLanguage();
  return <div className={`language-switch ${className}`} role="group" aria-label="Language">{LANGUAGES.map(([code,short,name])=><button type="button" key={code} lang={htmlLang[code]} aria-pressed={lang===code} aria-label={`${short}, ${name}`} title={name} onClick={()=>setLang(code)}>{short}</button>)}</div>;
}
