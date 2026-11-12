import {useCallback,useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';

const KEY='mv-theme';
const CHROME={light:'#f8f7f4',dark:'#181a17'};
let latestRun=0;

function paint(dark){
  const name=dark?'dark':'light';
  document.documentElement.dataset.theme=name;
  document.head.querySelector('meta[name="theme-color"]')?.setAttribute('content',CHROME[name]);
}
function store(dark){try{localStorage.setItem(KEY,dark?'dark':'light');}catch{}}

// The reveal is an enhancement only. Without View Transitions, with reduced
// motion, or in a hidden tab the theme changes instantly, as it always did.
function canReveal(){
  return typeof document.startViewTransition==='function'
    &&document.visibilityState==='visible'
    &&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useTheme(){
  const [dark,setDark]=useState(false),[switched,setSwitched]=useState(false);
  const current=useRef(false);
  useEffect(()=>{
    let stored=document.documentElement.dataset.theme==='dark';
    try{const saved=localStorage.getItem(KEY);if(saved)stored=saved==='dark';}catch{}
    current.current=stored;setDark(stored);paint(stored);
  },[]);
  const toggle=useCallback(event=>{
    const next=!current.current,origin=event?.currentTarget,root=document.documentElement;
    current.current=next;
    const apply=()=>{paint(next);store(next);setDark(next);setSwitched(true);};
    if(!origin||!canReveal()){apply();return;}
    // Measured from the button, not the pointer, so keyboard use reveals from the same place.
    const box=origin.getBoundingClientRect(),x=box.left+box.width/2,y=box.top+box.height/2;
    const radius=Math.hypot(Math.max(x,window.innerWidth-x),Math.max(y,window.innerHeight-y));
    const run=++latestRun;
    root.style.setProperty('--theme-x',`${x}px`);
    root.style.setProperty('--theme-y',`${y}px`);
    root.style.setProperty('--theme-radius',`${Math.ceil(radius)}px`);
    root.classList.add('theme-reveal');
    const finish=()=>{if(run===latestRun)root.classList.remove('theme-reveal');};
    try{document.startViewTransition(()=>flushSync(apply)).finished.then(finish,finish);}
    catch{apply();finish();}
  },[]);
  return [dark,toggle,switched];
}
