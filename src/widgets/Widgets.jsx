// Unlisted widget library at /widgets. Not linked from the public site, kept
// out of the sitemap and marked noindex. See docs/WIDGETS.md.
import {Component,memo,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle.jsx';
import {DemoContext,Btn} from './kit.jsx';
import trend from './charts-trend.jsx';
import compare from './charts-compare.jsx';
import part from './charts-part.jsx';
import dist from './charts-dist.jsx';
import single from './values.jsx';
import lists from './lists.jsx';
import mapsTime from './maps-time.jsx';
import {feedback,overlays} from './feedback.jsx';
import controls from './controls.jsx';
import {layout,people} from './layout-people.jsx';
import './widgets.css';

const slug=text=>text.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
let number=0;
export const GROUPS=[['Trends over time',trend],['Comparison',compare],['Parts of a whole',part],['Distribution and relationships',dist],['Single values and progress',single],['Tables and lists',lists],['Maps and location',mapsTime.slice(0,5)],['Time and scheduling',mapsTime.slice(5)],['Feedback and messages',feedback],['Overlays',overlays],['Filters and controls',controls],['Layout and navigation',layout],['People and content',people]]
  .map(([title,items])=>({title,id:slug(title),items:items.map(item=>({...item,id:slug(item.name),number:++number}))}));
const TOTAL=number,KEY='mv-widget-shortlist';

// One broken demo must not take the other 114 down with it.
class DemoBoundary extends Component{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<p className="wg-muted" role="alert">This demo could not be shown. The other widgets are unaffected.</p>:this.props.children;}
}

const Card=memo(function Card({widget,starred,onStar,toast}){
  const [seed,setSeed]=useState(widget.number),[note,setNote]=useState('');
  const context=useMemo(()=>({seed,say:setNote,toast}),[seed,toast]);
  return <article className={`wg-card ${widget.wide?'is-wide':''}`} id={widget.id}>
    <header><span className="wg-no">{String(widget.number).padStart(3,'0')}</span><h3>{widget.name}</h3><button type="button" className="wg-star" aria-pressed={starred} aria-label={`${starred?'Remove':'Add'} ${widget.name} ${starred?'from':'to'} shortlist`} onClick={()=>onStar(widget.id)}>{starred?'★ Shortlisted':'☆ Shortlist'}</button></header>
    <div className="wg-demo"><DemoBoundary><DemoContext.Provider value={context}><widget.Demo/></DemoContext.Provider></DemoBoundary></div>
    {(widget.data||note)&&<div className="wg-readout"><p>{note||'Hover or tap for exact values. Shuffle to try other numbers.'}</p>{widget.data&&<Btn onClick={()=>{setSeed(value=>value+1);setNote('');}}>Shuffle data</Btn>}</div>}
    <p className="wg-use"><b>Use it when</b> {widget.use}</p>
  </article>;
});

export default function Widgets(){
  const [query,setQuery]=useState(''),[starred,setStarred]=useState([]),[onlyStarred,setOnlyStarred]=useState(false),[toasts,setToasts]=useState([]),timers=useRef(new Map());
  useEffect(()=>{
    document.title='Widget Library | MV Studio';
    let robots=document.head.querySelector('meta[name="robots"]');if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.appendChild(robots);}robots.content='noindex,nofollow';
    try{const saved=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(saved))setStarred(saved.filter(id=>typeof id==='string'));}catch{}
    const pending=timers.current;return()=>{pending.forEach(clearTimeout);pending.clear();};
  },[]);
  const dismiss=useCallback(id=>{clearTimeout(timers.current.get(id));timers.current.delete(id);setToasts(list=>list.filter(item=>item.id!==id));},[]);
  const toast=useCallback((text,tone='info',action)=>{const id=Date.now()+Math.random();setToasts(list=>[...list.slice(-2),{id,text,tone,action}]);timers.current.set(id,setTimeout(()=>dismiss(id),action?6000:3200));},[dismiss]);
  const onStar=useCallback(id=>setStarred(list=>{const next=list.includes(id)?list.filter(item=>item!==id):[...list,id];try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}return next;}),[]);
  const all=useMemo(()=>GROUPS.flatMap(group=>group.items),[]);
  const wanted=query.trim().toLowerCase();
  const visible=GROUPS.map(group=>({...group,items:group.items.filter(item=>(!onlyStarred||starred.includes(item.id))&&(!wanted||item.name.toLowerCase().includes(wanted)||item.use.toLowerCase().includes(wanted)||group.title.toLowerCase().includes(wanted)))})).filter(group=>group.items.length);
  const shown=visible.reduce((total,group)=>total+group.items.length,0);
  const copy=async()=>{
    const picked=all.filter(item=>starred.includes(item.id));
    const text=`MV Studio widget shortlist (${picked.length})\n${picked.map(item=>`${String(item.number).padStart(3,'0')} ${item.name}`).join('\n')}`;
    try{await navigator.clipboard.writeText(text);toast(`${picked.length} widget name${picked.length===1?'':'s'} copied. Paste them into a message to us.`);}catch{toast('Copying is blocked in this browser. Use “Shortlist only” and take a screenshot instead.','error');}
  };
  return <div className="wg-page">
    <header className="wg-header"><div className="wg-header-row"><Link className="brand" to="/" aria-label="MV Studio home"><span className="brand-symbol">m<span>v</span></span><span>MV<span className="brand-light">Studio</span></span></Link><b className="wg-header-title">Widget library</b>
      <div className="wg-search"><span aria-hidden="true">🔍</span><input className="wg-input" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={`Search ${TOTAL} widgets, e.g. map, progress, filter`} aria-label="Search widgets"/></div><ThemeToggle/></div>
      <nav className="wg-nav" aria-label="Widget categories">{visible.map(group=><a key={group.id} href={`#${group.id}`}>{group.title} · {group.items.length}</a>)}</nav></header>
    <main className="wg-main" id="widgets-top">
      <div className="wg-intro"><span className="wg-eyebrow">MV Studio · Dashboard widget library</span><h1>{TOTAL} widgets you can try before we build.</h1><p>Every widget below works: hover it, drag it, type in it. Each one says when it is the right choice. Shortlist the ones that suit your project and send us the list.</p>
        <div className="wg-toolbar"><Btn aria-pressed={onlyStarred} className={onlyStarred?'wg-primary':''} onClick={()=>setOnlyStarred(!onlyStarred)}>{onlyStarred?'Show all widgets':`Shortlist only (${starred.length})`}</Btn><Btn disabled={!starred.length} onClick={copy}>Copy shortlist</Btn>{starred.length>0&&<Btn onClick={()=>{setStarred([]);setOnlyStarred(false);try{localStorage.removeItem(KEY);}catch{}}}>Clear shortlist</Btn>}<span className="wg-muted" role="status">Showing {shown} of {TOTAL}</span></div></div>
      {visible.map(group=><section className="wg-group" id={group.id} key={group.id} aria-labelledby={`${group.id}-title`}><h2 id={`${group.id}-title`}>{group.title}<small>{group.items.length} widget{group.items.length===1?'':'s'}</small></h2>
        <div className="wg-cards-grid">{group.items.map(widget=><Card key={widget.id} widget={widget} starred={starred.includes(widget.id)} onStar={onStar} toast={toast}/>)}</div></section>)}
      {!shown&&<p className="wg-none" role="status">{onlyStarred&&!starred.length?'Your shortlist is empty. Press “☆ Shortlist” on any widget to add it.':`No widget matches “${query}”. Try a simpler word such as chart, list or filter.`}</p>}
    </main>
    <div className="wg-toasts" role="status" aria-live="polite">{toasts.map(item=><div className={`wg-toast ${item.tone==='error'?'is-error':''}`} key={item.id}><span>{item.text}</span>{item.action&&<button type="button" onClick={()=>{item.action.run();dismiss(item.id);}}>{item.action.label}</button>}<button type="button" aria-label="Dismiss message" onClick={()=>dismiss(item.id)}>✕</button></div>)}</div>
  </div>;
}
