import {useEffect,useRef,useState} from 'react';
import {useDemo,clamp,Btn} from './kit.jsx';

const NAV=[['🏠','Overview'],['🛒','Orders'],['👥','Customers'],['📈','Reports'],['⚙️','Settings']];
function Sidebar(){
  const [at,setAt]=useState(1),[small,setSmall]=useState(false);
  return <div className={`wg-frame ${small?'is-small':''}`}><nav className="wg-side" aria-label="Example sidebar"><button type="button" className="wg-side-toggle" aria-expanded={!small} onClick={()=>setSmall(!small)} aria-label={small?'Expand menu':'Collapse menu'}>{small?'»':'«'}</button>
    {NAV.map(([icon,name],i)=><button type="button" key={name} aria-current={at===i?'page':undefined} title={name} onClick={()=>setAt(i)}><span aria-hidden="true">{icon}</span><span className="wg-side-label">{name}</span></button>)}</nav>
    <div className="wg-frame-main"><b>{NAV[at][1]}</b><p className="wg-muted">Choose a section on the left. Collapse the menu to icons to give the content more room.</p></div></div>;
}

function TopBar(){
  const {toast}=useDemo(),[open,setOpen]=useState(false),[query,setQuery]=useState('');
  return <div className="wg-frame wg-frame-col"><header className="wg-top"><b>Kopi Lane</b><input className="wg-input wg-grow" type="search" placeholder="Search orders…" aria-label="Search orders" value={query} onChange={event=>setQuery(event.target.value)}/>
    <div className="wg-anchor"><button type="button" className="wg-avatar" aria-expanded={open} aria-label="Account menu" onClick={()=>setOpen(!open)}>A</button>{open&&<div className="wg-pop wg-enter wg-right wg-menu">{['My profile','Billing','Sign out'].map(item=><button type="button" key={item} className="wg-notice" onClick={()=>{setOpen(false);toast(`${item} opened`);}}>{item}</button>)}</div>}</div></header>
    <div className="wg-frame-main"><p className="wg-muted">{query?`Searching orders for “${query}”…`:'The bar stays at the top of every page: brand, search and account. Try the search and the avatar menu.'}</p></div></div>;
}

function WidgetGrid(){
  const [tiles,setTiles]=useState([['Sales',true],['Visitors',false],['Orders',false],['Top products',true],['Stock alerts',false]]),drag=useRef(null);
  const move=(from,to)=>setTiles(list=>{if(to<0||to>=list.length||from===to)return list;const next=[...list],[item]=next.splice(from,1);next.splice(to,0,item);return next;});
  return <div className="wg-stack"><div className="wg-tiles">{tiles.map(([name,wide],i)=><div key={name} className={`wg-tile-box ${wide?'is-wide':''}`} draggable onDragStart={()=>{drag.current=i;}} onDragOver={event=>event.preventDefault()} onDrop={()=>{if(drag.current!==null)move(drag.current,i);drag.current=null;}}>
    <b>{name}</b><div className="wg-row"><button type="button" aria-label={`Move ${name} earlier`} disabled={i===0} onClick={()=>move(i,i-1)}>←</button><button type="button" aria-label={`Move ${name} later`} disabled={i===tiles.length-1} onClick={()=>move(i,i+1)}>→</button><button type="button" aria-label={`Make ${name} ${wide?'narrow':'wide'}`} aria-pressed={wide} onClick={()=>setTiles(list=>list.map((tile,k)=>k===i?[tile[0],!tile[1]]:tile))}>↔</button></div></div>)}</div>
    <span className="wg-muted">Drag a tile onto another to reorder, or use the arrows. ↔ switches between half and full width.</span></div>;
}

function SplitPane(){
  const [split,setSplit]=useState(42),box=useRef(null),dragging=useRef(false);
  const move=event=>{if(!dragging.current)return;const rect=box.current.getBoundingClientRect();setSplit(clamp(Math.round((event.clientX-rect.left)/rect.width*100),20,80));};
  return <div className="wg-stack"><div className="wg-split-pane" ref={node=>{box.current=node;node?.style.setProperty('--split',`${split}%`);}} onPointerMove={move} onPointerUp={()=>{dragging.current=false;}} onPointerLeave={()=>{dragging.current=false;}}>
    <div className="wg-pane"><b>Orders</b><p className="wg-muted">#2391 Kopi Lane<br/>#2390 Batik House<br/>#2389 Rumah Kek</p></div>
    <div className="wg-divider" role="separator" aria-orientation="vertical" aria-label="Resize panels" aria-valuemin="20" aria-valuemax="80" aria-valuenow={split} tabIndex={0} onPointerDown={event=>{event.preventDefault();dragging.current=true;}} onKeyDown={event=>{if(event.key==='ArrowLeft')setSplit(v=>clamp(v-4,20,80));if(event.key==='ArrowRight')setSplit(v=>clamp(v+4,20,80));}}/>
    <div className="wg-pane"><b>Order #2391</b><p className="wg-muted">Kopi Lane · RM 420 · Paid. Details stay beside the list.</p></div></div><span className="wg-muted">Drag the divider, or focus it and use the arrow keys. Split: {split} / {100-split}</span></div>;
}

function Collapsible(){
  const [open,setOpen]=useState([true,false]);
  return <div className="wg-stack">{[['Sales summary','Today RM 3,610 · This week RM 18,240 · This month RM 61,900'],['Advanced filters','Branch, staff member, payment method and discount code.']].map(([title,body],i)=><section className="wg-collapse" key={title}><button type="button" aria-expanded={open[i]} onClick={()=>setOpen(list=>list.map((v,k)=>k===i?!v:v))}><span aria-hidden="true">{open[i]?'▾':'▸'}</span>{title}<small className="wg-muted">{open[i]?'Hide':'Show'}</small></button>{open[i]&&<p className="wg-enter">{body}</p>}</section>)}</div>;
}

function Sticky(){
  const groups=[['Today',['#2391 Kopi Lane','#2390 Batik House','#2389 Rumah Kek','#2388 Lotus Spa']],['Yesterday',['#2387 Auto Care','#2386 Ria Florist','#2385 Mamak Go','#2384 Urban Gym']],['Last week',['#2383 Pixel Print','#2382 Satay Bros','#2381 Kedai Buku','#2380 Green Clinic']]];
  return <div className="wg-stack"><div className="wg-scroll-y wg-sticky" tabIndex={0} aria-label="Orders grouped by day, scrollable">{groups.map(([title,rows])=><section key={title}><h4>{title}</h4><ul className="wg-list">{rows.map(row=><li key={row} className="wg-line-row">{row}</li>)}</ul></section>)}</div><span className="wg-muted">Scroll the list: each day’s heading stays pinned until the next one pushes it away.</span></div>;
}

function Profile(){
  const {toast}=useDemo(),[following,setFollowing]=useState(false);
  return <div className="wg-row wg-profile"><span className="wg-avatar wg-large" aria-hidden="true">NA</span><div className="wg-stack wg-grow wg-tight"><b>Nur Aisyah</b><span className="wg-muted">Operations manager · Kopi Lane</span><small className="wg-muted">{following?129:128} orders handled · joined March 2025</small>
    <div className="wg-row"><Btn className={following?'':'wg-primary'} aria-pressed={following} onClick={()=>setFollowing(!following)}>{following?'✓ Following':'Follow'}</Btn><Btn onClick={()=>toast('Message window opened')}>Message</Btn></div></div></div>;
}

function Avatars(){
  const all=['Aisyah','Wei Jie','Kumar','Mei Ling','Daniel','Farah','Jason'],[count,setCount]=useState(5),shown=all.slice(0,Math.min(count,4));
  return <div className="wg-stack"><div className="wg-row"><div className="wg-avatars" role="img" aria-label={`${count} people: ${all.slice(0,count).join(', ')}`}>{shown.map((name,i)=><span key={name} className={`wg-avatar b${i+1}`} title={name}>{name[0]}</span>)}{count>4&&<span className="wg-avatar wg-more">+{count-4}</span>}</div><span className="wg-muted">{count} people on this project</span></div>
    <div className="wg-row"><Btn disabled={count>=all.length} onClick={()=>setCount(count+1)}>Add a person</Btn><Btn disabled={count<=1} onClick={()=>setCount(count-1)}>Remove one</Btn></div><span className="wg-muted">Shows up to four faces, then a count for the rest.</span></div>;
}

function Comments(){
  const [items,setItems]=useState([['Wei Jie','Homepage banner looks great. Can we try the darker green?',2,false],['Aisyah','Agreed. Also the phone number should be clickable.',0,false]]),[text,setText]=useState('');
  const post=event=>{event.preventDefault();if(!text.trim())return;setItems([...items,['You',text.trim(),0,false]]);setText('');};
  return <div className="wg-stack"><ul className="wg-list wg-comments">{items.map(([who,body,likes,liked],i)=><li key={i} className="wg-row"><span className="wg-avatar" aria-hidden="true">{who[0]}</span><div className="wg-stack wg-grow wg-tight"><b>{who}</b><span>{body}</span><button type="button" className="wg-linkish" aria-pressed={liked} onClick={()=>setItems(list=>list.map((item,k)=>k===i?[item[0],item[1],item[2]+(item[3]?-1:1),!item[3]]:item))}>{liked?'♥':'♡'} {likes} like{likes===1?'':'s'}</button></div></li>)}</ul>
    <form className="wg-row" onSubmit={post}><input className="wg-input wg-grow" value={text} onChange={event=>setText(event.target.value)} placeholder="Write a comment" aria-label="Write a comment"/><Btn type="submit" className="wg-primary">Post</Btn></form></div>;
}

const REPLIES=['Thanks! A team member will reply shortly.','Our landing pages start at RM 449.','We are open Monday to Friday, 9 am to 6 pm.','Sure. Could you share your business name?'];
function Chat(){
  const [messages,setMessages]=useState([['them','Hi! How can we help with your website?']]),[text,setText]=useState(''),[typing,setTyping]=useState(false),box=useRef(null),timer=useRef(0);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  useEffect(()=>{box.current?.scrollTo({top:box.current.scrollHeight});},[messages,typing]);
  const send=event=>{event.preventDefault();if(!text.trim()||typing)return;setMessages(list=>[...list,['me',text.trim()]]);setText('');setTyping(true);timer.current=setTimeout(()=>{setTyping(false);setMessages(list=>[...list,['them',REPLIES[list.length%REPLIES.length]]]);},1100);};
  return <div className="wg-stack"><div className="wg-chat wg-scroll-y" ref={box} role="log" aria-label="Chat messages" tabIndex={0}>{messages.map(([who,body],i)=><p key={i} className={`wg-bubble wg-enter ${who==='me'?'is-me':''}`}>{body}</p>)}{typing&&<p className="wg-bubble wg-typing" aria-label="Typing"><i/><i/><i/></p>}</div>
    <form className="wg-row" onSubmit={send}><input className="wg-input wg-grow" value={text} onChange={event=>setText(event.target.value)} placeholder="Type a message and press Enter" aria-label="Message"/><Btn type="submit" className="wg-primary" disabled={typing}>Send</Btn></form></div>;
}

function Media(){
  const [fit,setFit]=useState(true);
  return <div className="wg-stack"><figure className={`wg-media ${fit?'':'is-contain'}`}><img src="/aphome.png" alt="Learning platform home screen" loading="lazy" width="640" height="360"/><figcaption>APMoodle learning platform · home screen</figcaption></figure>
    <div className="wg-row wg-between"><span className="wg-muted">Images, videos or an embedded page sit in a tile like any other widget.</span><Btn aria-pressed={!fit} onClick={()=>setFit(!fit)}>{fit?'Show whole image':'Fill the tile'}</Btn></div></div>;
}

function Notes(){
  const [text,setText]=useState('Sales dipped on 14 Nov because the payment gateway was down for two hours. Ignore that day when comparing weeks.'),[saved,setSaved]=useState(true),timer=useRef(0),max=240;
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  return <div className="wg-stack"><label className="wg-field">Note shown beside the sales chart<textarea className="wg-input" rows="4" maxLength={max} value={text} onChange={event=>{setText(event.target.value);setSaved(false);clearTimeout(timer.current);timer.current=setTimeout(()=>setSaved(true),900);}}/></label>
    <div className="wg-row wg-between"><span className="wg-muted" role="status">{saved?'✓ Saved':'Saving…'}</span><span className="wg-muted">{text.length} / {max}</span></div></div>;
}

function QuickActions(){
  const {toast}=useDemo(),[used,setUsed]=useState({});
  return <div className="wg-stack"><div className="wg-actions">{[['🧾','New invoice'],['👤','Add client'],['📦','Add product'],['📤','Export report'],['📣','Send promo'],['🗓️','Book a slot']].map(([icon,name])=><button type="button" key={name} onClick={()=>{setUsed(map=>({...map,[name]:(map[name]||0)+1}));toast(`${name} started`);}}><span aria-hidden="true">{icon}</span>{name}{used[name]>0&&<small>Used {used[name]}×</small>}</button>)}</div></div>;
}

export const layout=[
  {name:'Sidebar navigation',use:'the system has five or more sections and people switch between them all day.',wide:true,Demo:Sidebar},
  {name:'Top bar',use:'every page needs the same anchors: brand, global search and the account menu.',wide:true,Demo:TopBar},
  {name:'Widget grid',use:'different people care about different numbers and want to arrange their own dashboard.',wide:true,Demo:WidgetGrid},
  {name:'Split pane',use:'people work through a list while reading the details of each item beside it.',wide:true,Demo:SplitPane},
  {name:'Collapsible panel',use:'a section is useful to some people some of the time and should not take space otherwise.',Demo:Collapsible},
  {name:'Sticky header',use:'a long list is grouped and people should always know which group they are scrolling through.',Demo:Sticky},
];
export const people=[
  {name:'User profile card',use:'people need to know who is behind a record or who to contact.',Demo:Profile},
  {name:'Avatar stack',use:'you want to show who is involved in something without listing every name.',Demo:Avatars},
  {name:'Comment thread',use:'the team discusses a specific order, design or record and the talk should stay attached to it.',Demo:Comments},
  {name:'Chat widget',use:'customers or staff need quick back-and-forth help without leaving the page.',Demo:Chat},
  {name:'Media or embed tile',use:'a picture, video or outside page explains something better than a chart does.',Demo:Media},
  {name:'Text (notes) block',use:'a number needs explaining and you want the explanation to sit right beside it.',Demo:Notes},
  {name:'Quick action buttons',use:'a few tasks make up most of the daily work and should be one tap from the dashboard.',Demo:QuickActions},
];
