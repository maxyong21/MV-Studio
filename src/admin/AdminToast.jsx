import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {CheckCircle2,AlertCircle,Info,X} from 'lucide-react';
import './toast.css';
export default function AdminToast({message,kind='success',onClose,notificationId=message}){
 const [paused,setPaused]=useState(false);
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{if(!message||paused||kind==='error')return;const timer=setTimeout(()=>close.current(),8000);return()=>clearTimeout(timer);},[notificationId,message,kind,paused]);
 if(!message)return null;
 const Icon=kind==='error'?AlertCircle:kind==='info'?Info:CheckCircle2;
 return createPortal(<div className={`admin-toast admin-notification admin-notification-${kind}`} role={kind==='error'?'alert':'status'} aria-atomic="true" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocusCapture={()=>setPaused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setPaused(false);}}><div className="admin-notification-icon" aria-hidden="true"><Icon size={24}/></div><div className="admin-notification-copy"><strong>{kind==='error'?'Action needs attention':kind==='info'?'Update':'Done'}</strong><p className="admin-toast-message">{message}</p>{kind==='error'&&<small>This message stays open until you dismiss it.</small>}</div><button type="button" className="admin-notification-close" onClick={onClose} aria-label="Dismiss notification"><X size={20}/></button></div>,document.body);
}
