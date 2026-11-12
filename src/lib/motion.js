import {useEffect} from 'react';

// Pointer effects are for mouse users who have not asked for reduced motion.
// Touch devices never attach a listener.
const pointerMotion=()=>window.matchMedia('(hover: hover) and (pointer: fine)').matches
  &&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const GLOW='.client-paths > a, .client-paths > button, .service-card, .testimonial-card';

// Writes the progress on the bar itself, at most once per frame. Setting it on
// <html> restyled the whole page on every scroll event.
export function useScrollProgress(ref){
  useEffect(()=>{
    const bar=ref.current;if(!bar)return;
    let frame=0;
    const paint=()=>{frame=0;const max=document.documentElement.scrollHeight-window.innerHeight;bar.style.setProperty('--scroll-progress',max>0?`${Math.min(1,window.scrollY/max)}`:'0');};
    const queue=()=>{if(!frame)frame=requestAnimationFrame(paint);};
    paint();
    window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',queue);window.removeEventListener('resize',queue);};
  },[ref]);
}

// One delegated listener for the whole page: the hero artwork leans toward the
// cursor and cards get a soft light under it. Only custom properties change,
// on the element being hovered, and CSS turns them into transforms.
export function usePointerMotion(ref){
  useEffect(()=>{
    const root=ref.current;if(!root||!pointerMotion())return;
    let frame=0,x=0,y=0,card=null,hero=null,art=null;
    const paint=()=>{
      frame=0;
      if(card){const box=card.getBoundingClientRect();card.style.setProperty('--glow-x',`${Math.round(x-box.left)}px`);card.style.setProperty('--glow-y',`${Math.round(y-box.top)}px`);}
      if(art){const box=hero.getBoundingClientRect();art.style.setProperty('--tilt-x',((x-box.left)/box.width*2-1).toFixed(3));art.style.setProperty('--tilt-y',((y-box.top)/box.height*2-1).toFixed(3));}
    };
    const settle=()=>{if(art){art.style.setProperty('--tilt-x','0');art.style.setProperty('--tilt-y','0');}hero=art=null;};
    const move=event=>{
      if(event.pointerType&&event.pointerType!=='mouse')return;
      const target=event.target instanceof Element?event.target:null;
      card=target?.closest(GLOW)||null;
      const nextHero=target?.closest('.hero')||null;
      if(nextHero!==hero){settle();hero=nextHero;art=hero?.querySelector('.hero-art')||null;}
      x=event.clientX;y=event.clientY;
      if((card||art)&&!frame)frame=requestAnimationFrame(paint);
    };
    const leave=()=>{card=null;settle();};
    root.addEventListener('pointermove',move,{passive:true});root.addEventListener('pointerleave',leave);
    return()=>{cancelAnimationFrame(frame);settle();root.removeEventListener('pointermove',move);root.removeEventListener('pointerleave',leave);};
  },[ref]);
}
