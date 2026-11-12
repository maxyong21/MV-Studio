import {useEffect,useRef,useState} from 'react';
import {useDemo,random,money,sum,Btn,useTick} from './kit.jsx';

const CLIENTS=['Kopi Lane','Batik House','Tuition Hub','Pasar Fresh','Green Clinic','Rumah Kek','Borneo Tours','Pixel Print','Satay Bros','Lotus Spa','Kedai Buku','Auto Care','Ria Florist','Mamak Go','Teh Tarik Co','Urban Gym'];
const SERVICE=['Landing page','Company site','Online store','Web app'],STAGE=['Paid','Pending','Overdue'];
const ROWS=CLIENTS.map((client,i)=>{const r=random(i+3);return {client,service:SERVICE[Math.floor(r()*4)],value:Math.round(4+r()*46)*100,status:STAGE[Math.floor(r()*3)]};});
const TONE={Paid:'wg-s-good',Pending:'wg-s-warning',Overdue:'wg-s-critical'},ICON={Paid:'✓',Pending:'!',Overdue:'✕'};

function DataTable(){
  const [sort,setSort]=useState(['value',-1]),[page,setPage]=useState(0),size=5;
  const sorted=[...ROWS].sort((a,b)=>(a[sort[0]]>b[sort[0]]?1:a[sort[0]]<b[sort[0]]?-1:0)*sort[1]),pages=Math.ceil(sorted.length/size);
  const head=(key,label)=><th scope="col" aria-sort={sort[0]===key?(sort[1]>0?'ascending':'descending'):'none'}><button type="button" className="wg-sort" onClick={()=>{setSort([key,sort[0]===key?-sort[1]:1]);setPage(0);}}>{label}<span aria-hidden="true">{sort[0]===key?(sort[1]>0?' ▲':' ▼'):' ↕'}</span></button></th>;
  return <div className="wg-stack"><div className="wg-scroll-x"><table className="wg-table"><thead><tr>{head('client','Client')}{head('service','Service')}{head('value','Invoice')}{head('status','Status')}</tr></thead>
    <tbody>{sorted.slice(page*size,page*size+size).map(row=><tr key={row.client}><th scope="row">{row.client}</th><td>{row.service}</td><td className="wg-num">{money(row.value)}</td><td><span className={`wg-status ${TONE[row.status]}`}><i aria-hidden="true">{ICON[row.status]}</i>{row.status}</span></td></tr>)}</tbody></table></div>
    <div className="wg-row wg-between"><span className="wg-muted">Rows {page*size+1}–{Math.min(sorted.length,page*size+size)} of {sorted.length}. Click a heading to sort.</span><div className="wg-row"><Btn disabled={!page} onClick={()=>setPage(page-1)}>Previous</Btn><Btn disabled={page>=pages-1} onClick={()=>setPage(page+1)}>Next</Btn></div></div></div>;
}

function Pivot(){
  const [metric,setMetric]=useState('revenue'),quarters=['Q1','Q2','Q3','Q4'],r=random(77);
  const cells=SERVICE.map(()=>quarters.map(()=>({count:Math.round(1+r()*6),revenue:Math.round(4+r()*30)*1000}))),show=v=>metric==='revenue'?money(v):v;
  return <div className="wg-stack"><div className="wg-seg" role="group" aria-label="Value shown">{[['revenue','Revenue'],['count','Number of projects']].map(([key,label])=><button type="button" key={key} aria-pressed={metric===key} onClick={()=>setMetric(key)}>{label}</button>)}</div>
    <div className="wg-scroll-x"><table className="wg-table wg-pivot"><thead><tr><th scope="col">Service</th>{quarters.map(q=><th scope="col" key={q}>{q}</th>)}<th scope="col">Total</th></tr></thead>
      <tbody>{SERVICE.map((name,i)=><tr key={name}><th scope="row">{name}</th>{cells[i].map((cell,q)=><td className="wg-num" key={q}>{show(cell[metric])}</td>)}<td className="wg-num wg-strong">{show(sum(cells[i].map(cell=>cell[metric])))}</td></tr>)}</tbody>
      <tfoot><tr><th scope="row">Total</th>{quarters.map((q,k)=><td className="wg-num wg-strong" key={q}>{show(sum(cells.map(row=>row[k][metric])))}</td>)}<td className="wg-num wg-strong">{show(sum(cells.flat().map(cell=>cell[metric])))}</td></tr></tfoot></table></div></div>;
}

function Leaderboard(){
  const [board,setBoard]=useState(()=>['Aisyah','Wei Jie','Kumar','Mei Ling','Daniel'].map((name,i)=>({name,points:480-i*55,was:i+1})));
  const play=()=>setBoard(list=>{const ranked=list.map((row,i)=>({...row,was:i+1,points:row.points+Math.round(Math.random()*140)}));return ranked.sort((a,b)=>b.points-a.points);});
  return <div className="wg-stack"><ol className="wg-list wg-board">{board.map((row,i)=>{const moved=row.was-(i+1);return <li key={row.name} className="wg-row"><span className="wg-rank">{i+1}</span><span className="wg-avatar" aria-hidden="true">{row.name[0]}</span><b className="wg-grow">{row.name}</b>
    <span className={moved>0?'wg-up':moved<0?'wg-down':'wg-muted'}>{moved>0?`▲ ${moved}`:moved<0?`▼ ${-moved}`:'–'}</span><span className="wg-num">{row.points} pts</span></li>;})}</ol><Btn className="wg-primary" onClick={play}>Play another week</Btn></div>;
}

const EVENTS=[['New enquiry from','📨'],['Payment received from','💳'],['Quote accepted by','✅'],['Support ticket from','🛟'],['Site published for','🚀']];
function Feed(){
  const [live,setLive]=useState(true),[items,setItems]=useState(()=>[0,1,2].map(i=>({id:i,text:`${EVENTS[i][0]} ${CLIENTS[i]}`,icon:EVENTS[i][1],at:Date.now()-i*90000}))),tick=useTick(2600,live);
  useEffect(()=>{if(!tick)return;const kind=EVENTS[Math.floor(Math.random()*5)];setItems(list=>[{id:Date.now(),text:`${kind[0]} ${CLIENTS[Math.floor(Math.random()*CLIENTS.length)]}`,icon:kind[1],at:Date.now()},...list].slice(0,30));},[tick]);
  const ago=at=>{const s=Math.round((Date.now()-at)/1000);return s<5?'just now':s<60?`${s}s ago`:`${Math.round(s/60)}m ago`;};
  return <div className="wg-stack"><div className="wg-row wg-between"><span className={`wg-status ${live?'wg-s-good':'wg-s-warning'}`}><i aria-hidden="true">{live?'●':'❚❚'}</i>{live?'Live':'Paused'}</span><Btn onClick={()=>setLive(!live)}>{live?'Pause updates':'Resume updates'}</Btn></div>
    <ul className="wg-list wg-scroll-y" role="log" aria-label="Recent activity" tabIndex={0}>{items.map(item=><li key={item.id} className="wg-row wg-enter"><span aria-hidden="true">{item.icon}</span><span className="wg-grow">{item.text}</span><small className="wg-muted">{ago(item.at)}</small></li>)}</ul></div>;
}

const MILESTONES=[['3 Nov','Kick-off call','Goals, pages and deadline agreed with the client.'],['10 Nov','Design approved','Homepage and two inner pages signed off after one round of changes.'],['24 Nov','Build complete','All pages built, forms connected, content loaded.'],['1 Dec','Client review','Client tests on their own phone and laptop.'],['8 Dec','Launch','Domain pointed, analytics on, handover done.']];
function Timeline(){
  const [open,setOpen]=useState(2);
  return <ol className="wg-timeline">{MILESTONES.map(([date,title,detail],i)=><li key={title} className={i<2?'is-done':i===2?'is-now':''}><button type="button" aria-expanded={open===i} onClick={()=>setOpen(open===i?-1:i)}><small>{date}{i===2?' · Today':''}</small><b>{title}</b></button>{open===i&&<p className="wg-enter">{detail}</p>}</li>)}</ol>;
}

function Kanban(){
  const columns=['To do','In progress','Done'],[cards,setCards]=useState([['Write homepage copy',0],['Set up payment gateway',0],['Design product page',1],['Connect enquiry form',1],['Register domain',2]]);
  const shift=(index,by)=>setCards(list=>list.map((card,i)=>i===index?[card[0],card[1]+by]:card));
  return <div className="wg-kanban">{columns.map((title,c)=><section key={title} aria-label={title}><h4>{title} <span className="wg-count">{cards.filter(card=>card[1]===c).length}</span></h4>
    {cards.map(([text,column],i)=>column===c&&<div className="wg-task wg-enter" key={text}><span>{text}</span><div className="wg-row"><button type="button" disabled={c===0} aria-label={`Move “${text}” back to ${columns[c-1]||''}`} onClick={()=>shift(i,-1)}>←</button><button type="button" disabled={c===2} aria-label={`Move “${text}” forward to ${columns[c+1]||''}`} onClick={()=>shift(i,1)}>→</button></div></div>)}</section>)}</div>;
}

function Tasks(){
  const [items,setItems]=useState([['Confirm domain name',true],['Send logo files',true],['Approve homepage design',false],['Provide product photos',false]]),[text,setText]=useState(''),done=items.filter(item=>item[1]).length;
  const add=event=>{event.preventDefault();if(!text.trim())return;setItems([...items,[text.trim(),false]]);setText('');};
  return <div className="wg-stack"><div className="wg-row wg-between"><b>Before we launch</b><span className="wg-muted">{done} of {items.length} done</span></div>
    <ul className="wg-list">{items.map(([label,checked],i)=><li key={`${label}-${i}`}><label className={`wg-check ${checked?'is-done':''}`}><input type="checkbox" checked={checked} onChange={()=>setItems(list=>list.map((item,k)=>k===i?[item[0],!item[1]]:item))}/>{label}</label></li>)}</ul>
    <form className="wg-row" onSubmit={add}><input className="wg-input wg-grow" value={text} onChange={event=>setText(event.target.value)} placeholder="Add a task" aria-label="New task"/><Btn type="submit" className="wg-primary">Add</Btn></form></div>;
}

const TREE=[['Website',[['Home',[]],['Services',[['Landing pages',[]],['Online stores',[]]]],['Contact',[]]]],['Media library',[['Logos',[]],['Product photos',[['2026',[]],['2025',[]]]]]],['Legal',[['Privacy policy',[]],['Terms',[]]]]];
function Branch({nodes,level,open,toggle,picked,pick,trail=''}){
  return <ul className="wg-tree">{nodes.map(([name,kids])=>{const id=`${trail}/${name}`,expanded=open.includes(id);
    return <li key={id}><button type="button" aria-expanded={kids.length?expanded:undefined} aria-current={picked===id?'true':undefined} className={picked===id?'is-picked':''} onClick={()=>{pick(id);if(kids.length)toggle(id);}}><span aria-hidden="true">{kids.length?(expanded?'▾':'▸'):'·'}</span>{kids.length?'📁':'📄'} {name}</button>
      {expanded&&kids.length>0&&<Branch nodes={kids} level={level+1} open={open} toggle={toggle} picked={picked} pick={pick} trail={id}/>}</li>;})}</ul>;
}
function Tree(){
  const {say}=useDemo(),[open,setOpen]=useState(['/Website']),[picked,setPicked]=useState('');
  return <Branch nodes={TREE} level={0} open={open} toggle={id=>setOpen(list=>list.includes(id)?list.filter(item=>item!==id):[...list,id])} picked={picked} pick={id=>{setPicked(id);say(`Selected: ${id.slice(1).replaceAll('/',' › ')}`);}}/>;
}

function Cards(){
  const [picked,setPicked]=useState([1]),items=[['Starter','RM 449','One page'],['Business','RM 989','Five pages'],['Store','RM 1,709','Catalogue and cart'],['Custom','Let’s talk','Built around you']];
  return <div className="wg-stack"><div className="wg-cards">{items.map(([name,price,note],i)=><button type="button" key={name} className="wg-tile" aria-pressed={picked.includes(i)} onClick={()=>setPicked(list=>list.includes(i)?list.filter(v=>v!==i):[...list,i])}><small>{note}</small><b>{name}</b><span>{price}</span></button>)}</div><span className="wg-muted">{picked.length?`${picked.length} selected to compare: ${picked.map(i=>items[i][0]).join(', ')}`:'Tap cards to select them.'}</span></div>;
}

function ScrollList(){
  const {say}=useDemo(),box=useRef(null),[top,setTop]=useState(1);
  return <div className="wg-stack"><ul className="wg-list wg-scroll-y" ref={box} tabIndex={0} aria-label="All sixteen clients, scrollable" onScroll={event=>{const first=Math.min(CLIENTS.length,1+Math.round(event.currentTarget.scrollTop/44));setTop(first);say(`Showing from row ${first} of ${CLIENTS.length}`);}}>
    {ROWS.map((row,i)=><li key={row.client} className="wg-row wg-line-row"><span className="wg-rank">{i+1}</span><span className="wg-grow">{row.client}</span><small className="wg-muted">{row.service}</small></li>)}</ul>
    <div className="wg-row wg-between"><span className="wg-muted">Scroll inside the box. The rest of the page stays put. Top row: {top}</span><Btn onClick={()=>box.current.scrollTo({top:0,behavior:'smooth'})}>Back to top</Btn></div></div>;
}

function Infinite(){
  const [count,setCount]=useState(12),[loading,setLoading]=useState(false),timer=useRef(0),max=72;
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  const more=event=>{const box=event.currentTarget;if(loading||count>=max||box.scrollHeight-box.scrollTop-box.clientHeight>60)return;setLoading(true);timer.current=setTimeout(()=>{setCount(v=>Math.min(max,v+12));setLoading(false);},650);};
  return <div className="wg-stack"><ul className="wg-list wg-scroll-y" tabIndex={0} aria-label="Order history that loads more as you scroll" onScroll={more}>{Array.from({length:count},(_,i)=><li key={i} className="wg-row wg-line-row"><span className="wg-grow">Order #{2400-i}</span><small className="wg-muted">{CLIENTS[i%CLIENTS.length]}</small><span className="wg-num">{money(120+(i*37)%900)}</span></li>)}
    <li className="wg-muted wg-center" role="status">{loading?'Loading more orders…':count>=max?'You have reached the first order.':'Keep scrolling for more'}</li></ul>
    <div className="wg-row wg-between"><span className="wg-muted">{count} of {max} orders loaded</span><Btn onClick={()=>setCount(12)}>Reset</Btn></div></div>;
}

function Carousel(){
  const box=useRef(null),[at,setAt]=useState(0),slides=[['aphome.png','Learning platform'],['booking.png','Booking system'],['apstudash.png','Student dashboard'],['feedback.png','Feedback tool']];
  const go=index=>{const el=box.current,target=Math.max(0,Math.min(slides.length-1,index));el.scrollTo({left:el.clientWidth*target,behavior:'smooth'});};
  return <div className="wg-stack"><div className="wg-carousel" ref={box} tabIndex={0} aria-label="Project screenshots. Swipe or use the buttons." onScroll={event=>setAt(Math.round(event.currentTarget.scrollLeft/event.currentTarget.clientWidth))}>
    {slides.map(([file,caption],i)=><figure key={file}><img src={`/${file}`} alt={`${caption} screenshot`} loading="lazy" width="640" height="360"/><figcaption>{i+1} / {slides.length} · {caption}</figcaption></figure>)}</div>
    <div className="wg-row wg-between"><Btn disabled={at===0} onClick={()=>go(at-1)}>← Previous</Btn><div className="wg-dots">{slides.map((slide,i)=><button type="button" key={slide[0]} aria-label={`Go to slide ${i+1}`} aria-current={at===i?'true':undefined} onClick={()=>go(i)}/>)}</div><Btn disabled={at===slides.length-1} onClick={()=>go(at+1)}>Next →</Btn></div></div>;
}

function Ticker(){
  const [paused,setPaused]=useState(false),tick=useTick(1800,!paused),r=random(tick+5);
  const items=[['USD/MYR',4.42],['SGD/MYR',3.31],['Gold (g)',412.6],['Orders today',128],['Visitors now',43],['Avg order',86.4]].map(([name,base])=>{const change=(r()-.5)*2;return [name,(base*(1+change/100)).toFixed(base>100?1:2),change];});
  const strip=hidden=><div className="wg-ticker-set" aria-hidden={hidden||undefined}>{items.map(([name,value,change])=><span key={name}><b>{name}</b> {value} <i className={change<0?'wg-down':'wg-up'}>{change<0?'▼':'▲'} {Math.abs(change).toFixed(2)}%</i></span>)}</div>;
  return <div className="wg-stack"><div className={`wg-ticker ${paused?'is-paused':''}`}><div className="wg-ticker-run">{strip(false)}{strip(true)}</div></div><div className="wg-row wg-between"><span className="wg-muted">Values refresh every couple of seconds. Hover also pauses the strip.</span><Btn onClick={()=>setPaused(!paused)}>{paused?'Resume':'Pause'}</Btn></div></div>;
}

export default [
  {name:'Data table',use:'people need to look up, sort and compare individual records, such as invoices, orders or customers.',wide:true,Demo:DataTable},
  {name:'Pivot table',use:'you want totals cross-tabulated by two things at once, such as service by quarter.',wide:true,Demo:Pivot},
  {name:'Leaderboard',use:'a ranking motivates or informs, such as top salespeople, branches or products.',Demo:Leaderboard},
  {name:'Activity feed',use:'the team wants to see what just happened without refreshing, such as new orders and enquiries.',Demo:Feed},
  {name:'Timeline',use:'the order of events matters, such as project milestones, order tracking or a customer’s history.',Demo:Timeline},
  {name:'Kanban board',use:'work moves through stages and you want to see what is stuck where.',wide:true,Demo:Kanban},
  {name:'Task list (checklist)',use:'there is a short set of things to complete, such as onboarding steps or a launch checklist.',Demo:Tasks},
  {name:'Tree view',use:'items are nested inside each other, such as folders, categories or an organisation chart.',Demo:Tree},
  {name:'Card grid',use:'each record is better recognised by a picture or summary than by a table row, such as products or packages.',Demo:Cards},
  {name:'Scrollable list (scrollable panel)',use:'a long list has to fit in a fixed space on the dashboard without pushing everything else down.',Demo:ScrollList},
  {name:'Infinite scroll list',use:'the list is very long and people browse rather than jump to a page, such as order history or a feed.',Demo:Infinite},
  {name:'Carousel',use:'you want to feature a few items in turn in a small space, such as highlights or screenshots.',Demo:Carousel},
  {name:'Ticker (marquee)',use:'several fast-changing figures should stay in view in a thin strip, such as prices or live counts.',wide:true,Demo:Ticker},
];
