import {useEffect,useRef,useState} from 'react';

const siteKey=import.meta.env.VITE_TURNSTILE_SITE_KEY||'';
const required=import.meta.env.VITE_TURNSTILE_REQUIRED==='true'||(!import.meta.env.DEV&&import.meta.env.VITE_TURNSTILE_REQUIRED!=='false');
let loader;
function loadTurnstile(){
  if(window.turnstile)return Promise.resolve(window.turnstile);
  if(loader)return loader;
  loader=new Promise((resolve,reject)=>{
    const script=document.querySelector('script[data-turnstile]')||document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;script.dataset.turnstile='true';
    script.onload=()=>window.turnstile?resolve(window.turnstile):reject(new Error('Verification could not start.'));
    script.onerror=()=>reject(new Error('Verification could not load.'));
    if(!script.isConnected)document.head.appendChild(script);
  });
  return loader;
}

export const turnstileRequired=required;
export default function Turnstile({onToken,resetKey=0}){
  const mount=useRef(null);const [message,setMessage]=useState(''),[near,setNear]=useState(false);
  // The widget pulls in about 2.7 MB of Cloudflare code, so it waits until the form is close to the
  // screen. Most visitors never get there, and the first screen stays fast.
  useEffect(()=>{
    if(!siteKey||near)return;
    if(!('IntersectionObserver' in window)){setNear(true);return;}
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setNear(true);observer.disconnect();}},{rootMargin:'700px 0px'});
    if(mount.current)observer.observe(mount.current);
    return()=>observer.disconnect();
  },[near]);
  useEffect(()=>{
    if(!siteKey||!near)return;
    let active=true,widget;
    loadTurnstile().then(api=>{
      if(!active||!mount.current)return;
      widget=api.render(mount.current,{sitekey:siteKey,action:'enquiry',theme:'light',callback:token=>{setMessage('');onToken(token);},'expired-callback':()=>{onToken('');setMessage('Verification expired. Please complete it again.');window.turnstile?.reset(widget);},'error-callback':()=>{onToken('');setMessage('Verification could not load. Check your connection and try again.');return true;}});
    }).catch(()=>{if(active){onToken('');setMessage('Human verification could not load. Please refresh and try again.');}});
    return()=>{active=false;if(widget!==undefined)window.turnstile?.remove(widget);};
  },[resetKey,onToken,near]);
  if(!siteKey)return required?<p className="turnstile-error" role="alert">Human verification is not configured. Please contact us directly.</p>:null;
  return <div className="turnstile-wrap"><div ref={mount}/>{message&&<p className="turnstile-error" role="alert">{message}</p>}</div>;
}
