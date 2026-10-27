import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {MessageCircle} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import './launcher.css';
import Availability,{PublicBoundary} from '../components/Availability.jsx';
import {trackEvent} from '../lib/analytics.mjs';
const ChatDialog=lazy(()=>import('./ChatDialog.jsx'));
export default function Launcher(){
  const {pathname}=useLocation();
  const [open,setOpen]=useState(false);
  const [quiet,setQuiet]=useState(false);
  const trigger=useRef(null);
  const returnFocus=useRef(null);
  const openAssistant=useCallback(event=>{returnFocus.current=event?.detail?.trigger||trigger.current;trackEvent('chatbot_open');setOpen(true);},[]);
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
  return <><button ref={trigger} className={`chat-launcher${quiet?' is-quiet':''}`} type="button" aria-label="Open project assistant" aria-haspopup="dialog" onClick={openAssistant}><MessageCircle size={22}/><span>Plan your project</span></button>{open&&<PublicBoundary target="Chatbot interface" fallback={<div className="chat-fallback"><section role="dialog" aria-modal="true" aria-label="Project assistant availability"><button className="chat-fallback-close" type="button" aria-label="Close project assistant" onClick={close}>×</button><Availability compact onContact={close} onRetry={()=>window.location.reload()}/></section></div>}><Suspense fallback={<div className="chat-loading" role="status">Opening project assistant…</div>}><ChatDialog onClose={close}/></Suspense></PublicBoundary>}</>;
}
