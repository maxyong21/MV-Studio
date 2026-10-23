import {lazy,Suspense,useRef,useState} from 'react';
import {MessageCircle} from 'lucide-react';
import './launcher.css';
const ChatDialog=lazy(()=>import('./ChatDialog.jsx'));
export default function Launcher(){
  const [open,setOpen]=useState(false);
  const trigger=useRef(null);
  const close=()=>{setOpen(false);requestAnimationFrame(()=>trigger.current?.focus());};
  return <><button ref={trigger} className="chat-launcher" type="button" aria-label="Open project assistant" aria-haspopup="dialog" onClick={()=>setOpen(true)}><MessageCircle size={22}/><span>Plan your project</span></button>{open&&<Suspense fallback={<div className="chat-loading" role="status">Opening project assistant…</div>}><ChatDialog onClose={close}/></Suspense>}</>;
}
