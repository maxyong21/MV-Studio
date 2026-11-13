// Interface translations for the customer site. English is the source text and
// the key: t('Start a project') returns the chosen language, or the English text
// itself when a translation is missing, so nothing can render blank.
// Content typed in the admin (services, projects, FAQs, the headline) is not
// translated here. See docs/LANGUAGES.md.
import {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import './language.css';

export const LANGUAGES=[['en','EN','English'],['ms','BM','Bahasa Malaysia'],['zh','中文','中文 (Chinese)']];
const HTML_LANG={en:'en-MY',ms:'ms-MY',zh:'zh-Hans-MY'};
// Loaded only when chosen, so English visitors download no translation files.
const loaders={ms:()=>import('./ms.js'),zh:()=>import('./zh.js')};
const KEY='mv-lang';
const LanguageContext=createContext({lang:'en',t:text=>text,setLang(){}});
export const useLanguage=()=>useContext(LanguageContext);

export function LanguageProvider({children}){
  const [lang,setLangState]=useState('en'),[table,setTable]=useState(null);
  const setLang=useCallback(async next=>{
    if(next!=='en'&&!loaders[next])return;
    try{localStorage.setItem(KEY,next);}catch{}
    if(next==='en'){setTable(null);setLangState('en');return;}
    // If the translation file cannot be fetched the page simply stays in English.
    try{const loaded=await loaders[next]();setTable(loaded.default);setLangState(next);}catch{setTable(null);setLangState('en');}
  },[]);
  // The server and the first paint are always English, so hydration matches; a saved choice applies just after.
  useEffect(()=>{let saved='en';try{saved=localStorage.getItem(KEY)||'en';}catch{}if(saved!=='en'&&loaders[saved])setLang(saved);},[setLang]);
  const t=useCallback((text,values)=>{let out=table?.[text]??text;if(values)for(const [name,value] of Object.entries(values))out=out.replaceAll(`{${name}}`,String(value));return out;},[table]);
  const value=useMemo(()=>({lang,t,setLang}),[lang,t,setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// Tells browsers and screen readers which language the page is in. Rendered by
// public pages only: the admin and legal pages keep their own language.
export function DocumentLanguage(){
  const {lang}=useLanguage();
  useEffect(()=>{const root=document.documentElement,before=root.lang;root.lang=HTML_LANG[lang]||'en-MY';return()=>{root.lang=before||'en-MY';};},[lang]);
  return null;
}

export function LanguageSwitch({className=''}){
  const {lang,setLang}=useLanguage();
  return <div className={`language-switch ${className}`} role="group" aria-label="Language">{LANGUAGES.map(([code,short,name])=><button type="button" key={code} lang={HTML_LANG[code]} aria-pressed={lang===code} aria-label={name} title={name} onClick={()=>setLang(code)}>{short}</button>)}</div>;
}
