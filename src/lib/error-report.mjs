// Tells the studio when the site breaks for a visitor. Sends a short, anonymous
// report to the report-error function, which emails the team (see
// docs/ERROR_REPORTING.md). It never throws, never blocks the page, and gives up
// quietly: a failed report must not become a second problem for the visitor.
const env=(typeof import.meta!=='undefined'&&import.meta.env)||{};
const LIMIT=3,KEY='mv-error-reports';
const sent=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'[]');}catch{return [];}};
// Noise that is not a fault in this site: browser extensions, cancelled requests, and
// the opaque "Script error." that browsers give for other origins' scripts.
const ignorable=/^(Script error\.?|ResizeObserver loop|Non-Error promise rejection|AbortError|The user aborted|Load failed$|NetworkError when attempting|Failed to fetch$)|chrome-extension:|moz-extension:|safari-extension:/i;

// A page that stays open across a new release asks for script files that the release replaced, and the
// browser reports "Importing a module script failed". It is not a fault in the site: loading the page again
// fetches the new files. So reload once (never twice within a minute, so a real outage cannot loop) instead
// of emailing the studio.
export const staleVersionError=/Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Unable to preload CSS|Loading (CSS )?chunk \d+ failed/i;
const RELOAD_KEY='mv-reloaded-for-update';
export function reloadForNewVersion({now=Date.now,storage,reload}={}){
  try{
    const store=storage||sessionStorage,last=Number(store.getItem(RELOAD_KEY)||0);
    if(last&&now()-last<60000)return false;
    store.setItem(RELOAD_KEY,String(now()));
    (reload||(()=>window.location.reload()))();
    return true;
  }catch{return false;}
}

export function reportProblem(kind,message,{area='',detail=''}={}){
  try{
    if(typeof window!=='undefined'&&staleVersionError.test(String(message||''))&&reloadForNewVersion())return false;
    if(typeof window==='undefined'||!env.VITE_SUPABASE_URL||!env.VITE_SUPABASE_ANON_KEY)return false;
    const text=String(message||'').slice(0,400).trim();
    if(!text||ignorable.test(text)||ignorable.test(String(detail)))return false;
    const already=sent();
    // Three per visit, and never the same message twice: the server limits again.
    if(already.length>=LIMIT||already.includes(text))return false;
    try{sessionStorage.setItem(KEY,JSON.stringify([...already,text]));}catch{return false;}
    fetch(`${String(env.VITE_SUPABASE_URL).replace(/\/$/,'')}/functions/v1/report-error`,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',apikey:env.VITE_SUPABASE_ANON_KEY,Authorization:`Bearer ${env.VITE_SUPABASE_ANON_KEY}`},body:JSON.stringify({kind,message:text,area:String(area).slice(0,120),detail:String(detail).slice(0,1500),path:window.location.pathname})}).catch(()=>{});
    return true;
  }catch{return false;}
}

export function installErrorReporting(){
  if(typeof window==='undefined'||window.__mvErrorReporting)return;
  window.__mvErrorReporting=true;
  // Vite raises this when a lazily loaded file is gone after a release. Reload to get the new files.
  window.addEventListener('vite:preloadError',event=>{if(reloadForNewVersion())event.preventDefault();});
  window.addEventListener('error',event=>{
    // Resource load failures (an image, a font) arrive here too, with no message: skip them.
    if(!event.message)return;
    reportProblem('error',event.message,{detail:`${event.filename||''}:${event.lineno||0}:${event.colno||0}\n${event.error?.stack||''}`});
  });
  window.addEventListener('unhandledrejection',event=>{
    const reason=event.reason;
    reportProblem('promise',reason?.message||String(reason||'Unhandled rejection'),{detail:reason?.stack||''});
  });
}
