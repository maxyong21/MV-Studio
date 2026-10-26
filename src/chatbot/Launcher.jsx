import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {MessageCircle} from 'lucide-react';
import './launcher.css';
import Availability,{PublicBoundary} from '../components/Availability.jsx';
import {trackEvent} from '../lib/analytics.mjs';
const ChatDialog=lazy(()=>import('./ChatDialog.jsx'));
export default function Launcher(){
  const [open,setOpen]=useState(false);
  const trigger=useRef(null);
  const returnFocus=useRef(null);
  const openAssistant=useCallback(event=>{returnFocus.current=event?.detail?.trigger||trigger.current;trackEvent('chatbot_open');setOpen(true);},[]);
  useEffect(()=>{window.addEventListener('mv:open-project-assistant',openAssistant);return()=>window.removeEventListener('mv:open-project-assistant',openAssistant);},[openAssistant]);
  const close=()=>{setOpen(false);requestAnimationFrame(()=>{const target=returnFocus.current;((target?.isConnected&&target.getClientRects().length)?target:trigger.current)?.focus();});};
  return <><button ref={trigger} className="chat-launcher" type="button" aria-label="Open project assistant" aria-haspopup="dialog" onClick={openAssistant}><MessageCircle size={22}/><span>Plan your project</span></button>{open&&<PublicBoundary target="Chatbot interface" fallback={<div className="chat-fallback"><section role="dialog" aria-modal="true" aria-label="Project assistant availability"><button className="chat-fallback-close" type="button" aria-label="Close project assistant" onClick={close}>×</button><Availability compact onContact={close} onRetry={()=>window.location.reload()}/></section></div>}><Suspense fallback={<div className="chat-loading" role="status">Opening project assistant…</div>}><ChatDialog onClose={close}/></Suspense></PublicBoundary>}</>;
}
