import {useEffect,useState} from 'react';
import {ChevronDown,HelpCircle,MapPin} from 'lucide-react';
import {guides} from './guide.js';
import './guide.css';

// Each section remembers whether its guide was closed, so regular users are not
// shown the same help every visit while a new admin sees it first time.
const KEY='mv-admin-guides-closed';
// null means the admin has never opened or closed a guide on this device.
const readClosed=()=>{try{const raw=localStorage.getItem(KEY);if(raw===null)return null;const saved=JSON.parse(raw);return Array.isArray(saved)?saved:[];}catch{return null;}};

export default function AdminGuide({section}){
  const guide=guides[section],[saved,setSaved]=useState(null),[narrow,setNarrow]=useState(false);
  // Until the admin opens or closes a guide, the default follows the screen: open on a
  // large screen for a new admin, closed on a phone where it would push the page content away.
  useEffect(()=>{
    setSaved(readClosed());
    const query=window.matchMedia('(max-width: 760px)'),update=()=>setNarrow(query.matches);
    update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);
  },[]);
  if(!guide)return null;
  const closed=saved||(narrow?Object.keys(guides):[]);
  const open=!closed.includes(section);
  const toggle=()=>{const next=open?[...closed,section]:closed.filter(key=>key!==section);setSaved(next);try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}};
  return <section className={`admin-guide ${open?'is-open':''}`} aria-label="How this page works">
    <button type="button" className="admin-guide-toggle" aria-expanded={open} aria-controls="admin-guide-body" onClick={toggle}><HelpCircle size={18} aria-hidden="true"/><span><strong>What this page is for</strong>{!open&&<small>{guide.purpose}</small>}</span><span className="admin-guide-hint">{open?'Hide guide':'Show guide'}<ChevronDown size={16} aria-hidden="true"/></span></button>
    {open&&<div className="admin-guide-body" id="admin-guide-body">
      <p className="admin-guide-purpose">{guide.purpose}</p>
      <p className="admin-guide-where"><MapPin size={15} aria-hidden="true"/><span><b>Where it shows:</b> {guide.where}</span></p>
      <div className="admin-guide-columns"><div><h3>How to use it</h3><ol>{guide.steps.map(step=><li key={step}>{step}</li>)}</ol></div>
        {guide.notes?.length>0&&<div><h3>Good to know</h3><ul>{guide.notes.map(note=><li key={note}>{note}</li>)}</ul></div>}</div>
    </div>}
  </section>;
}
