import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {ArrowUpRight,MessageCircle,X} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import './launcher.css';
import Availability,{PublicBoundary} from '../components/Availability.jsx';
import {trackEvent} from '../lib/analytics.mjs';
import useAssistantIntro from './useAssistantIntro.js';
const ChatDialog=lazy(()=>import('./ChatDialog.jsx'));
export default function Launcher(){
  const {pathname}=useLocation();
  const [open,setOpen]=useState(false);
  const [quiet,setQuiet]=useState(false);
  const trigger=useRef(null);
  const returnFocus=useRef(null);
  const intro=useAssistantIntro({open,quiet,pathname,trigger});
  const dismissIntro=intro.dismiss;
  const openAssistant=useCallback(event=>{dismissIntro({restoreFocus:false});returnFocus.current=event?.detail?.trigger||trigger.current;trackEvent('chatbot_open');setOpen(true);},[dismissIntro]);
  useEffect(()=>{window.addEventListener('mv:open-project-assistant',openAssistant);return()=>window.removeEventListener('mv:open-project-assistant',openAssistant);},[openAssistant]);
  useEffect(()=>{
    const visible=new Set();
    const update=()=>setQuiet(visible.size>0||Boolean(document.activeElement?.closest('input,textarea,select,[contenteditable=true]')));
    const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>entry.isIntersecting?visible.add(entry.target):visible.delete(entry.target));update();});
    document.querySelectorAll('#enquiry,#contact,.site-footer').forEach(node=>observer.observe(node));
    const focus=()=>queueMicrotask(update);
    document.addEventListener('focusin',focus);document.addEventListener('focusout',focus);
    return()=>{observer.disconnect();document.removeEventListener('focusin',focus);document.removeEventListener('focusout',focus);};
  },[pathname]);
  const close=()=>{setOpen(false);requestAnimationFrame(()=>{const target=returnFocus.current;((target?.isConnected&&target.getClientRects().length)?target:trigger.current)?.focus();});};
  return <>{intro.visible&&<aside ref={intro.card} className="assistant-intro" aria-labelledby="assistant-intro-title" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();dismissIntro();}}}>
    <button type="button" className="assistant-intro-close" aria-label="Dismiss project assistant introduction" onClick={dismissIntro}><X size={18}/></button>
    <h2 id="assistant-intro-title">Not sure where to start?</h2>
    <p id="assistant-intro-description">Answer a few questions to outline your website or system and see a preliminary estimate. Custom work is reviewed by our team.</p>
    <button type="button" className="button button-dark assistant-intro-start" aria-haspopup="dialog" onClick={openAssistant}>Plan my project <ArrowUpRight size={16}/></button>
  </aside>}<button ref={trigger} className={`chat-launcher${quiet?' is-quiet':''}`} type="button" aria-label="Open project assistant" title="Plan your project with guided questions and preliminary pricing" aria-describedby={intro.visible?'assistant-intro-description':undefined} aria-haspopup="dialog" onClick={openAssistant}><MessageCircle size={22}/><span>Plan your project</span></button>{open&&<PublicBoundary target="Chatbot interface" fallback={<div className="chat-fallback"><section role="dialog" aria-modal="true" aria-label="Project assistant availability"><button className="chat-fallback-close" type="button" aria-label="Close project assistant" onClick={close}>×</button><Availability compact onContact={close} onRetry={()=>window.location.reload()}/></section></div>}><Suspense fallback={<div className="chat-loading" role="status">Opening project assistant…</div>}><ChatDialog onClose={close}/></Suspense></PublicBoundary>}</>;
}
