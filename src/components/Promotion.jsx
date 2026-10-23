import {useEffect,useRef,useState} from 'react';
import {X,ArrowUpRight} from 'lucide-react';
import SmartImage from './SmartImage.jsx';
import {useDialogFocus} from '../admin/useDialogFocus.js';
import {eligiblePromotion,canShowPromotion,claimPromotion} from '../lib/promotions.mjs';
import {publicHref} from '../lib/site.js';
import './promotion.css';

function PromotionDialog({promotion,onClose}) {
  const dialog=useRef(null);
  useDialogFocus(dialog);
  useEffect(()=>{
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const keydown=e=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',keydown);
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',keydown);};
  },[onClose]);
  return <div className="promotion-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section ref={dialog} className="promotion-dialog" role="dialog" aria-modal="true" aria-labelledby="promotion-title">
      <header><span>A little something for you</span><button type="button" onClick={onClose} aria-label="Close advertisement"><X size={22}/></button></header>
      <div className="promotion-body">
        {promotion.image_url&&<SmartImage record={promotion} alt={`${promotion.title} — promotional poster`} sizes="(max-width:600px) 90vw, 520px" priority/>}
        <h2 id="promotion-title">{promotion.title}</h2>
        {promotion.message&&<p>{promotion.message}</p>}
        <div className="promotion-actions"><a className="button button-dark" href={publicHref(promotion.button_url||'#services')} onClick={onClose}>{promotion.button_label||'Explore the offer'}<ArrowUpRight size={16}/></a><button type="button" className="button button-light" onClick={onClose}>Continue browsing</button></div>
        <small>We won’t show another offer in this browser today.</small>
      </div>
    </section>
  </div>;
}

export default function Promotion({items,menuOpen=false}) {
  const [shown,setShown]=useState(null);
  const close=useRef(()=>setShown(null)).current;
  useEffect(()=>{
    if(menuOpen||shown)return;
    let storage;
    try{storage=window.localStorage;}catch{return;}
    if(!canShowPromotion(storage))return;
    const started=Date.now();let lastActivity=started,engaged=false,working=false;
    const activity=()=>{lastActivity=Date.now();if(window.scrollY>=Math.min(240,window.innerHeight*.3))engaged=true;};
    const focus=e=>{if(e.target.matches('input,textarea,select,[contenteditable="true"]'))working=true;};
    window.addEventListener('scroll',activity,{passive:true});
    document.addEventListener('pointerdown',activity);
    document.addEventListener('keydown',activity);
    document.addEventListener('focusin',focus);
    const timer=setInterval(()=>{
      if(working||!engaged||document.visibilityState!=='visible'||Date.now()-started<15000||Date.now()-lastActivity<4000)return;
      if(document.querySelector('[role="dialog"],#mv-analytics-choice:not([hidden])'))return;
      if(document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))return;
      const next=eligiblePromotion(items);
      if(!next||!claimPromotion(storage))return;
      clearInterval(timer);setShown(next);
    },1000);
    return()=>{clearInterval(timer);window.removeEventListener('scroll',activity);document.removeEventListener('pointerdown',activity);document.removeEventListener('keydown',activity);document.removeEventListener('focusin',focus);};
  },[items,menuOpen,shown]);
  // Removing or disabling an offer also removes an already open dialog on refresh.
  const current=shown&&(items||[]).find(item=>item.id===shown.id);
  return current&&eligiblePromotion([current])?<PromotionDialog promotion={current} onClose={close}/>:null;
}
