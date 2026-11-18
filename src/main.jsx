import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './fonts.css';
import './app.css';
import './footer.css';
import './responsive.css';
import './studio.css';
import './refinements.css';
import './motion.css';
import './trust.css';
import './a11y.css';
import './footer-refresh.css';
import './glance.css';
import App from './App.jsx';
import {emptyPublicContent,recordDiagnostic} from './lib/availability.mjs';
import {installErrorReporting} from './lib/error-report.mjs';
import {loaders} from './i18n/index.jsx';
import {parseLocale} from './lib/locale.mjs';
import {getGuideContent,loadGuideContent} from './guides/store.mjs';
const getGuideContentLoaded=()=>Boolean(getGuideContent());

installErrorReporting();
const container=document.getElementById('root');
const snapshot=document.getElementById('mv-initial-data');
let initialData;
try{initialData=snapshot?JSON.parse(snapshot.textContent):undefined;}catch(error){recordDiagnostic('Initial website content',error);initialData={...emptyPublicContent(),__availability:'maintenance'};delete container.dataset.route;}
// A translated address (/ms, /zh) hydrates in its own language, so it matches the prerendered page.
const {lang,route:currentRoute}=parseLocale(window.location.pathname);
const trimSlash=path=>path.length>1?path.replace(/\/+$/,''):path;
async function start(){
  let initialLanguage;
  // An article hydrates against the text it was prerendered with, so load that text first.
  if(/^\/guides\/[a-z0-9-]+\/?$/.test(currentRoute)){try{await loadGuideContent();}catch{/* the page then renders without hydrating */}}
  if(lang!=='en'){try{initialLanguage={lang,table:(await loaders[lang]()).default};}catch{initialLanguage=undefined;}}
  const tree=(
    <React.StrictMode>
      <BrowserRouter><App initialData={initialData} initialLanguage={initialLanguage}/></BrowserRouter>
    </React.StrictMode>
  );
  if(trimSlash(container.dataset.route||'')===trimSlash(window.location.pathname)&&container.hasChildNodes()&&(lang==='en'||initialLanguage)&&(!/^\/guides\/[a-z0-9-]+\/?$/.test(currentRoute)||getGuideContentLoaded()))hydrateRoot(container,tree);
  else createRoot(container).render(tree);
}
start();
