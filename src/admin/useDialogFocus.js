import {useEffect} from 'react';
export function useDialogFocus(ref){
  useEffect(()=>{
    const previous=document.activeElement,dialog=ref.current;
    if(!dialog)return;
    const controls=()=>[...dialog.querySelectorAll('button,input,textarea,select,a[href],[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
    (dialog.querySelector('input:not([type=checkbox]),textarea')||controls()[0])?.focus();
    const keydown=event=>{
      if(event.key!=='Tab')return;
      const items=controls(),first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    dialog.addEventListener('keydown',keydown);
    return()=>{dialog.removeEventListener('keydown',keydown);if(previous?.isConnected)previous.focus();};
  },[ref]);
}
