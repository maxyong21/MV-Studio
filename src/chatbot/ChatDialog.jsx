import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
import {useDialogFocus} from '../admin/useDialogFocus.js';
import {chatbotRequest} from '../public-api.js';
import ChatPanel from './ChatPanel.jsx';
export default function ChatDialog({onClose}){
  const ref=useRef(null);
  useDialogFocus(ref);
  useEffect(()=>{const old=document.body.style.overflow;document.body.style.overflow='hidden';const key=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',key);return()=>{document.body.style.overflow=old;window.removeEventListener('keydown',key);};},[onClose]);
  return <div className="chat-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={ref} className="chat-dialog" role="dialog" aria-modal="true" aria-labelledby="chat-title"><button className="chat-close" type="button" aria-label="Close project assistant" onClick={onClose}><X size={22}/></button><ChatPanel transport={chatbotRequest} onHandoff={onClose}/></section></div>;
}
