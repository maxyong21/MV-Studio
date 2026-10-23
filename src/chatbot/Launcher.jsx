import {lazy,Suspense,useRef,useState} from 'react';
import {MessageCircle} from 'lucide-react';
import './launcher.css';
import Availability,{PublicBoundary} from '../components/Availability.jsx';
const ChatDialog=lazy(()=>import('./ChatDialog.jsx'));
export default function Launcher(){
  const [open,setOpen]=useState(false);
  const trigger=useRef(null);
  const close=()=>{setOpen(false);requestAnimationFrame(()=>trigger.current?.focus());};
  return <><button ref={trigger} className="chat-launcher" type="button" aria-label="Open project assistant" aria-haspopup="dialog" onClick={()=>setOpen(true)}><MessageCircle size={22}/><span>Plan your project</span></button>{open&&<PublicBoundary target="Chatbot interface" fallback={<div className="chat-fallback"><section role="dialog" aria-modal="true" aria-label="Project assistant availability"><button className="chat-fallback-close" type="button" aria-label="Close project assistant" onClick={close}>×</button><Availability compact onContact={close} onRetry={()=>window.location.reload()}/></section></div>}><Suspense fallback={<div className="chat-loading" role="status">Opening project assistant…</div>}><ChatDialog onClose={close}/></Suspense></PublicBoundary>}</>;
}
