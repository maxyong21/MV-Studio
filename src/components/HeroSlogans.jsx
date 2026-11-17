import {useEffect,useRef,useState} from 'react';
import {Pause,Play} from 'lucide-react';
import './hero-slogans.css';

export default function HeroSlogans({first='',second='',third=''}) {
  const slogans=[...new Set([first,second,third].map(text=>String(text||'').trim()).filter(Boolean))];
  const signature=slogans.join('\n');
  const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[visible,setVisible]=useState(true),[engaged,setEngaged]=useState(false);
  const root=useRef(null);
  useEffect(()=>setIndex(0),[signature]);
  // Rotation waits for the first touch, click, key press or scroll. Browsers measure "largest content" until
  // then, and a slogan that swaps in on its own would count as a late largest paint on a page nobody touched.
  useEffect(()=>{
    const events=['pointerdown','keydown','scroll','touchstart'],start=()=>setEngaged(true);
    events.forEach(name=>window.addEventListener(name,start,{once:true,passive:true}));
    return()=>events.forEach(name=>window.removeEventListener(name,start));
  },[]);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const preference=()=>setPaused(media.matches);
    preference();media.addEventListener('change',preference);
    return()=>media.removeEventListener('change',preference);
  },[]);
  useEffect(()=>{
    let inView=true;
    const update=()=>setVisible(inView&&document.visibilityState==='visible');
    const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;update();}):null;
    if(root.current)observer?.observe(root.current);
    document.addEventListener('visibilitychange',update);update();
    return()=>{observer?.disconnect();document.removeEventListener('visibilitychange',update);};
  },[]);
  useEffect(()=>{
    if(slogans.length<2||!engaged||paused||hovered||focused||!visible)return;
    const timer=window.setInterval(()=>setIndex(value=>(value+1)%slogans.length),5000);
    return()=>window.clearInterval(timer);
  },[signature,engaged,paused,hovered,focused,visible,slogans.length]);
  if(!slogans.length)return null;
  const current=index%slogans.length;
  return <div ref={root} className="hero-slogans" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}>
    <p className="hero-lead hero-slogan-stack" aria-live="off">{slogans.map((text,position)=><span className={position===current?'hero-slogan is-current':'hero-slogan'} aria-hidden={position!==current} key={text}>{text}</span>)}</p>
    {slogans.length>1&&<button className="hero-slogan-toggle" type="button" onClick={()=>setPaused(value=>!value)}>{paused?<Play size={14} aria-hidden="true"/>:<Pause size={14} aria-hidden="true"/>}{paused?'Play slogans':'Pause slogans'}</button>}
  </div>;
}
