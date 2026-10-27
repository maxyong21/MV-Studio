import {useCallback,useEffect,useRef,useState} from 'react';
import {claimAssistantIntro,rememberAssistantIntro} from '../lib/assistant-intro.mjs';

export default function useAssistantIntro({open,quiet,pathname,trigger}){
  const [visible,setVisible]=useState(false),[blocked,setBlocked]=useState(true);
  const finished=useRef(false),card=useRef(null);
  const dismiss=useCallback(({restoreFocus=true}={})=>{
    const restore=restoreFocus&&card.current?.contains(document.activeElement);
    finished.current=true;setVisible(false);
    try{rememberAssistantIntro(window.localStorage);}catch{}
    if(restore)requestAnimationFrame(()=>trigger.current?.focus());
  },[trigger]);
  useEffect(()=>{
    const update=()=>setBlocked(document.visibilityState!=='visible'||Boolean(document.querySelector('[role="dialog"],#mv-analytics-choice:not([hidden]),.mobile-menu[aria-expanded="true"]'))||Boolean(document.activeElement?.closest('input,textarea,select,[contenteditable="true"]')));
    const observer=new MutationObserver(update);
    observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-analytics-panel','hidden','aria-expanded']});
    const focus=()=>queueMicrotask(update);
    document.addEventListener('visibilitychange',update);document.addEventListener('focusin',focus);document.addEventListener('focusout',focus);update();
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);document.removeEventListener('focusin',focus);document.removeEventListener('focusout',focus);};
  },[]);
  useEffect(()=>{
    if(open){dismiss({restoreFocus:false});return;}
    if(blocked||quiet||pathname!=='/'){setVisible(false);return;}
    if(finished.current)return;
    // Give visitors time to read, and restart the delay after an interruption.
    const timer=setTimeout(()=>{
      try{if(claimAssistantIntro(window.localStorage)){finished.current=true;setVisible(true);}}catch{}
    },8000);
    return()=>clearTimeout(timer);
  },[blocked,open,quiet,pathname,dismiss]);
  useEffect(()=>{
    if(!visible)return;
    let timer;
    const hide=()=>{
      if(card.current?.contains(document.activeElement)||card.current?.matches(':hover')){timer=setTimeout(hide,1000);return;}
      setVisible(false);
    };
    timer=setTimeout(hide,20000);
    return()=>clearTimeout(timer);
  },[visible]);
  return {visible:visible&&!blocked&&!open&&!quiet,card,dismiss};
}
