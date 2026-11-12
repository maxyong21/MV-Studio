import {useEffect,useRef,useState} from 'react';
import {useDemo,Btn} from './kit.jsx';

function Toast(){
  const {toast}=useDemo();
  return <div className="wg-stack"><div className="wg-row"><Btn className="wg-primary" onClick={()=>toast('Changes saved')}>Save changes</Btn><Btn onClick={()=>toast('Link copied to clipboard')}>Copy link</Btn><Btn onClick={()=>toast('Could not reach the server. Try again.','error')}>Trigger an error</Btn></div><span className="wg-muted">The message appears at the bottom of the screen and leaves by itself after a few seconds.</span></div>;
}

function Snackbar(){
  const {toast}=useDemo(),[items,setItems]=useState(['Draft: Raya promotion','Draft: New menu page','Draft: Hiring post']);
  const remove=index=>{const removed=items[index];setItems(list=>list.filter((_,i)=>i!==index));toast(`“${removed}” deleted`,'info',{label:'Undo',run:()=>setItems(list=>[...list.slice(0,index),removed,...list.slice(index)])});};
  return <div className="wg-stack"><ul className="wg-list">{items.map((item,i)=><li key={item} className="wg-row wg-between wg-line-row"><span>{item}</span><Btn onClick={()=>remove(i)} aria-label={`Delete ${item}`}>Delete</Btn></li>)}{!items.length&&<li className="wg-muted">All drafts deleted.</li>}</ul>
    {items.length<3&&<Btn onClick={()=>setItems(['Draft: Raya promotion','Draft: New menu page','Draft: Hiring post'])}>Restore the list</Btn>}<span className="wg-muted">Delete a draft, then use Undo in the message.</span></div>;
}

const BANNERS={info:['ℹ','Scheduled maintenance this Sunday, 2–4 am. The site stays online.','wg-s-info'],warning:['!','Your plan renews in 3 days. Check your payment card.','wg-s-warning'],critical:['✕','Payments are failing at checkout. We are looking into it.','wg-s-critical'],good:['✓','Your website went live at 10:42 am.','wg-s-good']};
function Banner(){
  const [kind,setKind]=useState('warning'),[shown,setShown]=useState(true),[icon,text,tone]=BANNERS[kind];
  return <div className="wg-stack"><div className="wg-seg" role="group" aria-label="Banner type">{Object.keys(BANNERS).map(key=><button type="button" key={key} aria-pressed={kind===key} onClick={()=>{setKind(key);setShown(true);}}>{key==='good'?'Success':key[0].toUpperCase()+key.slice(1)}</button>)}</div>
    {shown?<div className={`wg-banner wg-enter ${tone}`} role={kind==='critical'?'alert':'status'}><i aria-hidden="true">{icon}</i><span className="wg-grow">{text}</span><button type="button" aria-label="Dismiss message" onClick={()=>setShown(false)}>✕</button></div>:<Btn onClick={()=>setShown(true)}>Show the banner again</Btn>}</div>;
}

function Bell(){
  const [open,setOpen]=useState(false),[items,setItems]=useState([['New enquiry from Kopi Lane','2 min ago',false],['Invoice #2391 was paid','1 hour ago',false],['Backup completed','Yesterday',true]]),unread=items.filter(item=>!item[2]).length;
  return <div className="wg-stack wg-anchor"><div className="wg-row"><button type="button" className="wg-icon-btn" aria-expanded={open} aria-label={`Notifications, ${unread} unread`} onClick={()=>setOpen(!open)}>🔔{unread>0&&<span className="wg-badge">{unread}</span>}</button><Btn onClick={()=>setItems(list=>[[`New order #${2400+list.length}`,'just now',false],...list])}>Simulate a new alert</Btn></div>
    {open&&<div className="wg-pop wg-enter"><div className="wg-row wg-between"><b>Notifications</b><button type="button" className="wg-linkish" onClick={()=>setItems(list=>list.map(item=>[item[0],item[1],true]))}>Mark all read</button></div>
      <ul className="wg-list wg-scroll-y wg-short">{items.map(([text,when,read],i)=><li key={`${text}-${i}`}><button type="button" className={`wg-notice ${read?'':'is-unread'}`} onClick={()=>setItems(list=>list.map((item,k)=>k===i?[item[0],item[1],true]:item))}><span>{text}</span><small>{when}{read?'':' · unread'}</small></button></li>)}</ul></div>}</div>;
}

function Badge(){
  const [counts,setCounts]=useState([3,128,0]);
  return <div className="wg-stack"><div className="wg-row wg-badges">{[['📥','Inbox'],['🛒','Orders'],['💬','Chat']].map(([icon,name],i)=><span className="wg-icon-btn" key={name} role="img" aria-label={`${name}: ${counts[i]||'no'} new`}>{icon}{counts[i]>0&&<span className="wg-badge">{counts[i]>99?'99+':counts[i]}</span>}<small>{name}</small></span>)}<span className="wg-icon-btn" role="img" aria-label="Updates available">⚙️<span className="wg-badge wg-dot"/><small>Settings</small></span></div>
    <div className="wg-row"><Btn onClick={()=>setCounts(list=>list.map(v=>v+1))}>New item arrives</Btn><Btn onClick={()=>setCounts([0,0,0])}>Mark all seen</Btn></div><span className="wg-muted">Counts cap at 99+. A plain dot means “something new” without a number.</span></div>;
}

function Tooltip(){
  return <div className="wg-stack"><div className="wg-row">{[['Bounce rate','Share of visitors who leave after one page.'],['CTR','Click-through rate: clicks divided by times shown.'],['AOV','Average order value: revenue divided by orders.']].map(([term,tip],i)=><button type="button" key={term} className="wg-tip" aria-describedby={`wg-tip-${i}`}>{term} <span aria-hidden="true">ⓘ</span><span role="tooltip" id={`wg-tip-${i}`}>{tip}</span></button>)}</div><span className="wg-muted">Hover, or tab to a term. The explanation shows without a click and hides when you move on.</span></div>;
}

function Popover(){
  const [open,setOpen]=useState(false),[note,setNote]=useState('Follow up on Friday'),box=useRef(null);
  useEffect(()=>{if(!open)return;const close=event=>{if(event.key==='Escape'||(event.type==='pointerdown'&&!box.current?.contains(event.target)))setOpen(false);};document.addEventListener('keydown',close);document.addEventListener('pointerdown',close);return()=>{document.removeEventListener('keydown',close);document.removeEventListener('pointerdown',close);};},[open]);
  return <div className="wg-stack wg-anchor" ref={box}><div className="wg-row wg-between"><span><b>Kopi Lane</b> <small className="wg-muted">{note||'No note'}</small></span><Btn aria-expanded={open} onClick={()=>setOpen(!open)}>Edit note</Btn></div>
    {open&&<div className="wg-pop wg-enter wg-right"><label className="wg-field">Note for this client<input className="wg-input" value={note} onChange={event=>setNote(event.target.value)} autoFocus/></label><div className="wg-row"><Btn className="wg-primary" onClick={()=>setOpen(false)}>Done</Btn><Btn onClick={()=>setNote('')}>Clear</Btn></div></div>}
    <span className="wg-muted">Unlike a tooltip it holds controls. Click outside or press Esc to close it.</span></div>;
}

function useFakeLoad(ms=1400){
  const [state,setState]=useState('idle'),timer=useRef(0);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  return [state,(result='done')=>{setState('loading');clearTimeout(timer.current);timer.current=setTimeout(()=>setState(result),ms);},setState];
}

function Spinner(){
  const [state,load]=useFakeLoad();
  return <div className="wg-stack wg-center"><div className="wg-loadbox" role="status">{state==='loading'?<><span className="wg-spinner" aria-hidden="true"/>Generating your report…</>:state==='done'?'✓ Report ready: 128 orders, RM 11,040':'Nothing running'}</div><Btn className="wg-primary" disabled={state==='loading'} onClick={()=>load()}>{state==='loading'?<><span className="wg-spinner wg-small" aria-hidden="true"/> Working…</>:'Generate report'}</Btn></div>;
}

function Skeleton(){
  const [state,load]=useFakeLoad(1800);useEffect(()=>{load();},[]);
  return <div className="wg-stack"><div className="wg-row" aria-busy={state==='loading'}>{state==='loading'?<><span className="wg-bone wg-bone-avatar"/><div className="wg-stack wg-grow"><span className="wg-bone wg-w60"/><span className="wg-bone wg-w90"/><span className="wg-bone wg-w40"/></div></>:<><span className="wg-avatar wg-large" aria-hidden="true">K</span><div className="wg-stack wg-grow wg-tight"><b>Kopi Lane</b><span>Online store · launched 3 Nov</span><small className="wg-muted">Last order 12 minutes ago</small></div></>}</div>
    <Btn onClick={()=>load()}>Reload to see the placeholder</Btn><span className="wg-muted">Grey shapes match the content that is coming, so the page does not jump when it arrives.</span></div>;
}

function Empty(){
  const [items,setItems]=useState([]);
  return items.length?<div className="wg-stack"><ul className="wg-list">{items.map(item=><li key={item} className="wg-row wg-line-row">📦 {item}</li>)}</ul><div className="wg-row"><Btn onClick={()=>setItems([...items,`Product ${items.length+1}`])}>Add another</Btn><Btn onClick={()=>setItems([])}>Remove all</Btn></div></div>
    :<div className="wg-empty"><span aria-hidden="true">📦</span><b>No products yet</b><p>Add your first product and it will show up here and in your store.</p><Btn className="wg-primary" onClick={()=>setItems(['Product 1'])}>Add a product</Btn></div>;
}

function ErrorState(){
  const [state,load,setState]=useFakeLoad(1200),tries=useRef(0);useEffect(()=>{setState('failed');},[]);
  return <div className="wg-stack">{state==='loading'?<div className="wg-loadbox" role="status"><span className="wg-spinner" aria-hidden="true"/>Trying again…</div>
    :state==='done'?<div className="wg-empty"><span aria-hidden="true">✓</span><b>Sales loaded</b><p>42 orders today, RM 3,610.</p><Btn onClick={()=>{tries.current=0;setState('failed');}}>Break it again</Btn></div>
    :<div className="wg-empty wg-s-critical" role="alert"><span aria-hidden="true">⚠</span><b>We could not load today’s sales</b><p>The connection dropped. Your data is safe. {tries.current>0&&'That attempt failed too.'}</p><Btn className="wg-primary" onClick={()=>{tries.current++;load(tries.current>=2?'done':'failed');}}>Try again</Btn></div>}
    <span className="wg-muted">Says what went wrong in plain words and offers a way forward. The second retry succeeds.</span></div>;
}

// Overlays use the native <dialog>, which traps focus and closes on Esc.
function useDialog(){const ref=useRef(null);return [ref,()=>ref.current?.showModal(),()=>ref.current?.close()];}
// Only a click on the dimmed area closes: the dialog's own padding does not count.
const backdropClose=event=>{const dialog=event.currentTarget,box=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom))dialog.close();};

function Modal(){
  const {toast}=useDemo(),[ref,open,close]=useDialog(),[name,setName]=useState('');
  return <div className="wg-stack"><Btn className="wg-primary" onClick={open}>Add a team member</Btn><span className="wg-muted">The page behind is dimmed and locked until you finish or cancel. Esc closes it.</span>
    <dialog ref={ref} className="wg-dialog" aria-labelledby="wg-modal-title" onClick={backdropClose}><form method="dialog" onSubmit={()=>{toast(`${name||'New member'} added to the team`);setName('');}}>
      <h4 id="wg-modal-title">Add a team member</h4><label className="wg-field">Full name<input className="wg-input" value={name} onChange={event=>setName(event.target.value)} placeholder="e.g. Nur Aisyah" autoFocus/></label><label className="wg-field">Role<select className="wg-input"><option>Editor</option><option>Admin</option><option>Viewer</option></select></label>
      <div className="wg-row wg-end"><Btn onClick={close}>Cancel</Btn><Btn type="submit" className="wg-primary">Add member</Btn></div></form></dialog></div>;
}

function Confirm(){
  const {toast}=useDemo(),[ref,open,close]=useDialog(),[exists,setExists]=useState(true);
  return <div className="wg-stack">{exists?<div className="wg-row wg-between wg-line-row"><span><b>Raya promotion page</b> <small className="wg-muted">Published</small></span><Btn className="wg-danger" onClick={open}>Delete page</Btn></div>:<Btn onClick={()=>setExists(true)}>Restore the page for another try</Btn>}
    <span className="wg-muted">Asks once before something that cannot be undone. The safe choice has focus first.</span>
    <dialog ref={ref} className="wg-dialog wg-narrow" role="alertdialog" aria-labelledby="wg-confirm-title" aria-describedby="wg-confirm-text" onClick={backdropClose}><h4 id="wg-confirm-title">Delete “Raya promotion page”?</h4><p id="wg-confirm-text">Visitors will see a not-found page at this address. This cannot be undone.</p>
      <div className="wg-row wg-end"><Btn onClick={close} autoFocus>Keep page</Btn><Btn className="wg-danger" onClick={()=>{setExists(false);close();toast('Page deleted');}}>Delete page</Btn></div></dialog></div>;
}

function Drawer({sheet=false}){
  const [ref,open,close]=useDialog(),[picked,setPicked]=useState(0),orders=[['#2391','Kopi Lane','RM 420','Paid'],['#2390','Batik House','RM 1,180','Pending'],['#2389','Rumah Kek','RM 96','Paid']],order=orders[picked];
  return <div className="wg-stack">{sheet?<Btn className="wg-primary" onClick={open}>Open share options</Btn>:<ul className="wg-list">{orders.map((row,i)=><li key={row[0]}><button type="button" className="wg-notice" onClick={()=>{setPicked(i);open();}}><span>{row[0]} · {row[1]}</span><small>{row[2]} · open details →</small></button></li>)}</ul>}
    <span className="wg-muted">{sheet?'Slides up from the bottom edge, within thumb reach on a phone. Tap outside or Esc to close.':'Details slide in from the side, so the list stays in view behind it.'}</span>
    <dialog ref={ref} className={`wg-dialog ${sheet?'wg-sheet':'wg-drawer'}`} aria-label={sheet?'Share options':`Order ${order[0]}`} onClick={backdropClose}>
      {sheet?<><span className="wg-grip" aria-hidden="true"/><h4>Share this report</h4><div className="wg-stack">{['Copy link','Send by email','Send on WhatsApp','Download PDF'].map(action=><Btn key={action} onClick={close}>{action}</Btn>)}</div></>
        :<><div className="wg-row wg-between"><h4>Order {order[0]}</h4><button type="button" className="wg-icon-btn" aria-label="Close panel" onClick={close}>✕</button></div><dl className="wg-dl"><dt>Client</dt><dd>{order[1]}</dd><dt>Amount</dt><dd>{order[2]}</dd><dt>Status</dt><dd>{order[3]}</dd><dt>Items</dt><dd>Website care plan, 1 month</dd></dl><div className="wg-row"><Btn className="wg-primary" onClick={close}>Mark as shipped</Btn><Btn onClick={close}>Close</Btn></div></>}</dialog></div>;
}

function Lightbox(){
  const [ref,open,close]=useDialog(),[picked,setPicked]=useState(0),shots=[['aphome.png','Learning platform home'],['booking.png','Booking system'],['apstudash.png','Student dashboard']];
  return <div className="wg-stack"><div className="wg-thumbs">{shots.map(([file,caption],i)=><button type="button" key={file} aria-label={`Enlarge ${caption}`} onClick={()=>{setPicked(i);open();}}><img src={`/${file}`} alt="" loading="lazy" width="160" height="100"/></button>)}</div><span className="wg-muted">Click a thumbnail to see it large without leaving the page.</span>
    <dialog ref={ref} className="wg-dialog wg-lightbox" aria-label={shots[picked][1]} onClick={backdropClose}><img src={`/${shots[picked][0]}`} alt={`${shots[picked][1]} screenshot`}/><div className="wg-row wg-between"><Btn onClick={()=>setPicked((picked+2)%3)}>← Previous</Btn><span>{shots[picked][1]} · {picked+1} of 3</span><Btn onClick={()=>setPicked((picked+1)%3)}>Next →</Btn><Btn onClick={close}>Close</Btn></div></dialog></div>;
}

const COMMANDS=['Create invoice','Add new client','View this month’s sales','Export orders to Excel','Switch to dark theme','Open settings','Invite a team member','Go to enquiries'];
function Palette(){
  const {toast}=useDemo(),[ref,open,close]=useDialog(),[query,setQuery]=useState(''),[at,setAt]=useState(0),matches=COMMANDS.filter(command=>command.toLowerCase().includes(query.toLowerCase()));
  const run=command=>{if(!command)return;close();setQuery('');setAt(0);toast(`Ran: ${command}`);};
  const key=event=>{if(event.key==='ArrowDown'){event.preventDefault();setAt(v=>Math.min(matches.length-1,v+1));}else if(event.key==='ArrowUp'){event.preventDefault();setAt(v=>Math.max(0,v-1));}else if(event.key==='Enter'){event.preventDefault();run(matches[at]);}};
  return <div className="wg-stack"><Btn className="wg-primary" onClick={open}>Open command palette</Btn><span className="wg-muted">Type a few letters, move with the arrow keys and press Enter. Power users reach any action without the mouse.</span>
    <dialog ref={ref} className="wg-dialog wg-palette" aria-label="Command palette" onClick={backdropClose} onClose={()=>{setQuery('');setAt(0);}}><input className="wg-input" role="combobox" aria-expanded="true" aria-controls="wg-commands" aria-activedescendant={matches.length?`wg-command-${at}`:undefined} aria-label="Search actions" placeholder="Type an action…" value={query} onChange={event=>{setQuery(event.target.value);setAt(0);}} onKeyDown={key} autoFocus/>
      <ul className="wg-list" id="wg-commands" role="listbox" aria-label="Actions">{matches.map((command,i)=><li key={command} id={`wg-command-${i}`} role="option" aria-selected={at===i} className={at===i?'is-active':''} onPointerEnter={()=>setAt(i)} onClick={()=>run(command)}>{command}</li>)}{!matches.length&&<li className="wg-muted">No action matches “{query}”.</li>}</ul></dialog></div>;
}

export const feedback=[
  {name:'Toast message',use:'you want to confirm something happened without interrupting the person, such as “Saved”.',Demo:Toast},
  {name:'Snackbar',use:'the confirmation should come with one quick action, usually Undo after a delete.',Demo:Snackbar},
  {name:'Alert banner',use:'everyone on the page needs to know something until it is resolved, such as maintenance or a billing problem.',Demo:Banner},
  {name:'Notification centre',use:'alerts pile up over time and people need one place to catch up on what they missed.',Demo:Bell},
  {name:'Badge',use:'a menu item or icon should hint that something new is waiting behind it.',Demo:Badge},
  {name:'Tooltip',use:'a label or figure needs a short explanation that would clutter the screen if always shown.',Demo:Tooltip},
  {name:'Popover',use:'a small edit or extra detail belongs right next to the thing it is about, without a full dialog.',Demo:Popover},
  {name:'Loading spinner',use:'a short wait has no measurable progress, such as generating a report.',Demo:Spinner},
  {name:'Skeleton loader',use:'a page or card takes a moment to load and you want it to feel fast and stable.',Demo:Skeleton},
  {name:'Empty state',use:'a list or chart has nothing to show yet and the person needs to know what to do first.',Demo:Empty},
  {name:'Error state',use:'data failed to load and the person needs a plain explanation and a way to retry.',Demo:ErrorState},
];
export const overlays=[
  {name:'Pop-up modal',use:'a short task needs full attention before going back, such as adding a record.',Demo:Modal},
  {name:'Confirmation dialog',use:'an action is destructive or costly and deserves one deliberate “are you sure”.',Demo:Confirm},
  {name:'Drawer (side panel)',use:'people open one record after another and should not lose their place in the list.',Demo:()=><Drawer/>},
  {name:'Bottom sheet',use:'the dashboard is used on phones and a set of options should appear within thumb reach.',Demo:()=><Drawer sheet/>},
  {name:'Lightbox',use:'a small image or chart deserves a closer look without navigating away.',Demo:Lightbox},
  {name:'Command palette',use:'the system has many actions and frequent users want to reach any of them by typing.',Demo:Palette},
];
