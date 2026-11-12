import {useRef,useState} from 'react';
import {useDemo,walk,scale,line,money,clamp,Btn} from './kit.jsx';

const PRODUCTS=[['Kopi O beans 250g','Drinks',18],['Teh tarik sachets','Drinks',12],['Kaya jar','Spreads',9],['Peanut butter','Spreads',14],['Pandan cake','Bakery',22],['Curry puff (6)','Bakery',11],['Sambal bottle','Sauces',13],['Chilli sauce','Sauces',8]];
const TYPES=['Drinks','Spreads','Bakery','Sauces'];
function Results({rows}){return <ul className="wg-list wg-results">{rows.map(([name,type,price])=><li key={name} className="wg-row wg-line-row"><span className="wg-grow">{name}</span><small className="wg-muted">{type}</small><span className="wg-num">{money(price)}</span></li>)}{!rows.length&&<li className="wg-muted">Nothing matches. Try a different filter.</li>}</ul>;}

function Search(){
  const [query,setQuery]=useState(''),rows=PRODUCTS.filter(row=>row[0].toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="wg-stack"><div className="wg-search"><span aria-hidden="true">🔍</span><input className="wg-input" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search products, e.g. sauce" aria-label="Search products"/></div><span className="wg-muted" role="status">{rows.length} of {PRODUCTS.length} products</span><Results rows={rows}/></div>;
}

function Dropdown(){
  const [type,setType]=useState('All'),[order,setOrder]=useState('name'),rows=PRODUCTS.filter(row=>type==='All'||row[1]===type).sort((a,b)=>order==='name'?a[0].localeCompare(b[0]):order==='low'?a[2]-b[2]:b[2]-a[2]);
  return <div className="wg-stack"><div className="wg-row"><label className="wg-field wg-grow">Category<select className="wg-input" value={type} onChange={event=>setType(event.target.value)}><option>All</option>{TYPES.map(name=><option key={name}>{name}</option>)}</select></label>
    <label className="wg-field wg-grow">Sort by<select className="wg-input" value={order} onChange={event=>setOrder(event.target.value)}><option value="name">Name</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div><Results rows={rows}/></div>;
}

function MultiSelect(){
  const [open,setOpen]=useState(false),[picked,setPicked]=useState(['Drinks','Bakery']),rows=PRODUCTS.filter(row=>picked.includes(row[1]));
  return <div className="wg-stack wg-anchor"><button type="button" className="wg-input wg-select" aria-expanded={open} onClick={()=>setOpen(!open)}><span>{picked.length?picked.join(', '):'Choose categories'}</span><span aria-hidden="true">{open?'▴':'▾'}</span></button>
    {open&&<fieldset className="wg-pop wg-enter wg-menu"><legend className="wg-hide">Categories</legend>{TYPES.map(name=><label className="wg-check" key={name}><input type="checkbox" checked={picked.includes(name)} onChange={()=>setPicked(list=>list.includes(name)?list.filter(item=>item!==name):TYPES.filter(item=>item===name||list.includes(item)))}/>{name}</label>)}
      <div className="wg-row"><button type="button" className="wg-linkish" onClick={()=>setPicked(TYPES)}>Select all</button><button type="button" className="wg-linkish" onClick={()=>setPicked([])}>Clear</button><Btn onClick={()=>setOpen(false)}>Done</Btn></div></fieldset>}
    <span className="wg-muted" role="status">{rows.length} products in {picked.length} categories</span><Results rows={rows}/></div>;
}

function Chips(){
  const all=['Drinks','Under RM 15','In stock','Bakery'],[active,setActive]=useState(['Drinks','Under RM 15']);
  const rows=PRODUCTS.filter(row=>(!active.includes('Drinks')&&!active.includes('Bakery')||active.includes(row[1]))&&(!active.includes('Under RM 15')||row[2]<15)&&(!active.includes('In stock')||row[2]!==22));
  return <div className="wg-stack"><div className="wg-row wg-chips">{active.map(name=><span className="wg-chip is-on" key={name}>{name}<button type="button" aria-label={`Remove filter ${name}`} onClick={()=>setActive(list=>list.filter(item=>item!==name))}>✕</button></span>)}
    {all.filter(name=>!active.includes(name)).map(name=><button type="button" className="wg-chip" key={name} onClick={()=>setActive(list=>[...list,name])}>+ {name}</button>)}{active.length>0&&<button type="button" className="wg-linkish" onClick={()=>setActive([])}>Clear all</button>}</div><Results rows={rows}/></div>;
}

function Toggle(){
  const {toast}=useDemo(),[settings,setSettings]=useState([['Email me about new enquiries',true],['Weekly sales summary',false],['Show prices on the website',true]]);
  return <ul className="wg-list">{settings.map(([label,on],i)=><li key={label} className="wg-row wg-between wg-line-row"><span id={`wg-switch-${i}`}>{label}</span><button type="button" role="switch" aria-checked={on} aria-labelledby={`wg-switch-${i}`} className="wg-switch" onClick={()=>{setSettings(list=>list.map((item,k)=>k===i?[item[0],!item[1]]:item));toast(`${label}: ${on?'off':'on'}`);}}><i/><span>{on?'On':'Off'}</span></button></li>)}</ul>;
}

function SegmentedControl(){
  const [view,setView]=useState('week'),sizes={day:12,week:7,month:10},units={day:'hours',week:'days',month:'weeks'},data=walk(view.length*7,sizes[view]),sx=scale(0,data.length-1,4,296),sy=scale(Math.min(...data),Math.max(...data),62,8);
  return <div className="wg-stack"><div className="wg-seg" role="group" aria-label="Time range">{['day','week','month'].map(key=><button type="button" key={key} aria-pressed={view===key} onClick={()=>setView(key)}>{key[0].toUpperCase()+key.slice(1)}</button>)}</div>
    <svg className="wg-svg" viewBox="0 0 300 70" role="img" aria-label={`Sales for the ${view}`}><path className="f1 wg-area" d={`${line(data.map((v,i)=>[sx(i),sy(v)]))}V70H4Z`}/><path className="s1 wg-line" d={line(data.map((v,i)=>[sx(i),sy(v)]))}/></svg>
    <span className="wg-muted">Sales over the last {data.length} {units[view]}: {money(data.reduce((total,v)=>total+v,0)*40)}</span></div>;
}

function Sliders(){
  const [budget,setBudget]=useState(2500),[low,setLow]=useState(8),[high,setHigh]=useState(18),rows=PRODUCTS.filter(row=>row[2]>=low&&row[2]<=high);
  return <div className="wg-stack"><label className="wg-field">Project budget: <b>{money(budget)}</b><input type="range" min="500" max="10000" step="250" value={budget} onChange={event=>setBudget(+event.target.value)}/></label><span className="wg-muted">{budget<1000?'Fits a landing page.':budget<2000?'Fits a company website.':budget<5000?'Fits an online store.':'Room for a custom web app.'}</span>
    <div className="wg-row"><label className="wg-field wg-grow">Price from: <b>{money(low)}</b><input type="range" min="5" max="25" value={low} onChange={event=>setLow(Math.min(+event.target.value,high))}/></label><label className="wg-field wg-grow">to: <b>{money(high)}</b><input type="range" min="5" max="25" value={high} onChange={event=>setHigh(Math.max(+event.target.value,low))}/></label></div>
    <span className="wg-muted" role="status">{rows.length} products between {money(low)} and {money(high)}</span></div>;
}

function Tabs(){
  const tabs=[['Overview','Revenue is up 12% on last month, led by online store projects.'],['Customers','14 active clients. 3 joined this month and none left.'],['Invoices','2 invoices are overdue, totalling RM 1,600.']],[at,setAt]=useState(0),refs=useRef([]);
  const key=event=>{const next=event.key==='ArrowRight'?(at+1)%3:event.key==='ArrowLeft'?(at+2)%3:null;if(next===null)return;event.preventDefault();setAt(next);refs.current[next]?.focus();};
  return <div className="wg-stack"><div className="wg-tabs" role="tablist" aria-label="Report sections" onKeyDown={key}>{tabs.map(([name],i)=><button type="button" key={name} role="tab" id={`wg-tab-${i}`} aria-selected={at===i} aria-controls="wg-tabpanel" tabIndex={at===i?0:-1} ref={node=>{refs.current[i]=node;}} onClick={()=>setAt(i)}>{name}</button>)}</div>
    <div className="wg-panel wg-enter" key={at} role="tabpanel" id="wg-tabpanel" aria-labelledby={`wg-tab-${at}`} tabIndex={0}><b>{tabs[at][0]}</b><p>{tabs[at][1]}</p></div><span className="wg-muted">Arrow keys also move between tabs.</span></div>;
}

function Accordion(){
  const [open,setOpen]=useState(0),items=[['What is included in the price?','Design, build, mobile layout, one round of changes and launch.'],['How long does it take?','A landing page takes about a week. An online store takes three to five.'],['Who owns the website?','You do. We hand over all files and logins on final payment.']];
  return <div className="wg-accordion">{items.map(([question,answer],i)=><section key={question}><h4><button type="button" aria-expanded={open===i} aria-controls={`wg-acc-${i}`} onClick={()=>setOpen(open===i?-1:i)}>{question}<span aria-hidden="true">{open===i?'−':'+'}</span></button></h4>{open===i&&<p id={`wg-acc-${i}`} className="wg-enter">{answer}</p>}</section>)}</div>;
}

function Pagination(){
  const total=12,[page,setPage]=useState(1),near=[...new Set([1,page-1,page,page+1,total])].filter(n=>n>=1&&n<=total).sort((a,b)=>a-b);
  return <div className="wg-stack"><span className="wg-muted" role="status">Showing orders {(page-1)*10+1}–{page*10} of {total*10}</span>
    <nav className="wg-row wg-pages" aria-label="Pages"><Btn disabled={page===1} onClick={()=>setPage(page-1)} aria-label="Previous page">←</Btn>{near.map((n,i)=><span key={n} className="wg-row">{i>0&&n-near[i-1]>1&&<span className="wg-muted" aria-hidden="true">…</span>}<Btn className={n===page?'wg-primary':''} aria-current={n===page?'page':undefined} aria-label={`Page ${n}`} onClick={()=>setPage(n)}>{n}</Btn></span>)}<Btn disabled={page===total} onClick={()=>setPage(page+1)} aria-label="Next page">→</Btn></nav></div>;
}

function Stepper(){
  const steps=[['Your details','Name, business and contact number.'],['Choose a package','Starter, Business, Store or Custom.'],['Add extras','Booking, blog, multi-language.'],['Review and send','Check everything, then submit.']],[at,setAt]=useState(1),done=at>=steps.length;
  return <div className="wg-stack"><ol className="wg-steps">{steps.map(([name],i)=><li key={name} className={i<at?'is-done':i===at?'is-now':''} aria-current={i===at?'step':undefined}><span>{i<at?'✓':i+1}</span><small>{name}</small></li>)}</ol>
    <div className="wg-panel wg-enter" key={at}><b>{done?'Enquiry sent':`Step ${at+1} of ${steps.length}: ${steps[at][0]}`}</b><p>{done?'Thank you. We will reply within one working day.':steps[at][1]}</p></div>
    <div className="wg-row wg-between"><Btn disabled={at===0} onClick={()=>setAt(clamp(at-1,0,4))}>Back</Btn>{done?<Btn onClick={()=>setAt(0)}>Start again</Btn>:<Btn className="wg-primary" onClick={()=>setAt(at+1)}>{at===steps.length-1?'Send enquiry':'Continue'}</Btn>}</div></div>;
}

function Breadcrumb(){
  const full=['Dashboard','Clients','Kopi Lane','Invoices','#2391'],[depth,setDepth]=useState(5),trail=full.slice(0,depth);
  return <div className="wg-stack"><nav aria-label="Breadcrumb"><ol className="wg-crumbs">{trail.map((name,i)=><li key={name}>{i<trail.length-1?<button type="button" className="wg-linkish" onClick={()=>setDepth(i+1)}>{name}</button>:<span aria-current="page">{name}</span>}</li>)}</ol></nav>
    <div className="wg-panel"><b>{trail[trail.length-1]}</b><p>You are {depth-1} level{depth===2?'':'s'} deep. Click any earlier step to jump back up.</p></div>{depth<5&&<Btn onClick={()=>setDepth(depth+1)}>Go deeper: {full[depth]}</Btn>}</div>;
}

export default [
  {name:'Search bar',use:'there are more records than fit on a screen and people usually know what they are looking for.',Demo:Search},
  {name:'Dropdown filter',use:'people narrow the view by one choice from a short, fixed list, such as category or branch.',Demo:Dropdown},
  {name:'Multi-select filter',use:'people need to combine several choices, such as two branches and three product types.',Demo:MultiSelect},
  {name:'Filter chips',use:'active filters should stay visible and be removable in one tap.',Demo:Chips},
  {name:'Toggle switch',use:'a setting is simply on or off and takes effect immediately.',Demo:Toggle},
  {name:'Segmented control',use:'the same chart or list has two to four views, such as Day, Week and Month.',Demo:SegmentedControl},
  {name:'Slider (range slider)',use:'people pick an approximate number or a from–to range, such as budget or price.',Demo:Sliders},
  {name:'Tabs',use:'related content is too much for one panel but belongs in the same place.',Demo:Tabs},
  {name:'Accordion',use:'people scan headings and open only what they need, such as FAQs or settings groups.',Demo:Accordion},
  {name:'Pagination',use:'a long table should load in pages so people can jump to and return to a specific spot.',Demo:Pagination},
  {name:'Stepper',use:'a process has a fixed order and people should always know which step they are on.',Demo:Stepper},
  {name:'Breadcrumb',use:'the system is several levels deep and people need to see where they are and climb back up.',Demo:Breadcrumb},
];
