// The admin landing page: what needs attention today, at a glance.
import {useCallback,useEffect,useMemo,useState} from 'react';
import {AlarmClock,ArrowRight,CheckCircle2,Clock,Inbox,RefreshCw,Trophy} from 'lucide-react';
import {supabase} from '../supabase.js';
import './overview.css';

const DAY=86400000;
const startOfDay=date=>new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime();
const when=value=>new Date(value).toLocaleString([], {weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
const SITE=[['services','Services','Customers cannot see your packages or prices.'],['projects','Projects','The “Selected work” section is empty.'],['faqs','FAQs','The FAQ section is hidden until one is published.'],['testimonials','Client feedback','The feedback section stays hidden until one is published.']];

export default function Overview({goTo,openEnquiry}){
  const [state,setState]=useState('loading'),[problem,setProblem]=useState(''),[enquiries,setEnquiries]=useState([]),[site,setSite]=useState({});
  const load=useCallback(async()=>{
    setState('loading');
    try{
      const result=await supabase.from('enquiries').select('*').order('created_at',{ascending:false});
      if(result.error)throw result.error;
      setEnquiries((result.data||[]).filter(row=>!row.deleted_at));
      // The website counts are a bonus: if one fails the page still shows the enquiries.
      const counts={};
      await Promise.all(SITE.map(async([table])=>{try{const {data,error}=await supabase.from(table).select('*');counts[table]=error?null:(data||[]).filter(row=>row.active!==false&&(table!=='testimonials'||row.permission_confirmed)).length;}catch{counts[table]=null;}}));
      setSite(counts);setState('ready');
    }catch(error){setProblem(error.message||'Connection error.');setState('failed');}
  },[]);
  useEffect(()=>{load();},[load]);

  const view=useMemo(()=>{
    const now=Date.now(),today=startOfDay(new Date()),open=enquiries.filter(row=>!['won','closed'].includes(row.status));
    const attention=[];
    for(const row of open){
      const due=row.follow_up_at?new Date(row.follow_up_at).getTime():null;
      if(due!==null&&due<today)attention.push({row,rank:0,tone:'late',label:'Follow-up overdue',detail:`Was due ${when(row.follow_up_at)}`});
      else if(due!==null&&due<today+DAY)attention.push({row,rank:1,tone:'today',label:'Follow-up due today',detail:`Due ${when(row.follow_up_at)}`});
      else if(row.status==='new'&&due===null&&now-new Date(row.created_at).getTime()>DAY)attention.push({row,rank:2,tone:'waiting',label:'Waiting for a first reply',detail:`Received ${when(row.created_at)}`});
    }
    attention.sort((a,b)=>a.rank-b.rank||new Date(a.row.follow_up_at||a.row.created_at)-new Date(b.row.follow_up_at||b.row.created_at));
    const monthStart=new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime();
    const days=Array.from({length:14},(_,i)=>{const from=today-(13-i)*DAY;return {from,count:enquiries.filter(row=>{const at=new Date(row.created_at).getTime();return at>=from&&at<from+DAY;}).length};});
    return {attention,days,
      fresh:enquiries.filter(row=>row.status==='new').length,
      due:attention.filter(item=>item.rank<2).length,
      active:enquiries.filter(row=>['contacted','qualified'].includes(row.status)).length,
      won:enquiries.filter(row=>row.status==='won'&&new Date(row.updated_at||row.created_at).getTime()>=monthStart).length};
  },[enquiries]);

  if(state==='loading')return <div className="admin-overview" aria-busy="true"><p className="entity-loading" role="status">Loading today’s overview…</p></div>;
  if(state==='failed')return <div className="admin-overview"><div className="enquiry-db-error" role="alert"><b>The overview could not be loaded.</b><span>{problem}</span><button type="button" className="button button-light" onClick={load}><RefreshCw size={15}/> Retry</button></div></div>;
  const peak=Math.max(1,...view.days.map(day=>day.count)),fortnight=view.days.reduce((total,day)=>total+day.count,0);
  const stats=[[Inbox,'New enquiries',view.fresh,'Not yet contacted'],[AlarmClock,'Follow-ups due',view.due,'Today or overdue'],[Clock,'In progress',view.active,'Contacted or qualified'],[Trophy,'Won this month',view.won,'Marked as won']];
  return <div className="admin-overview">
    <div className="overview-stats">{stats.map(([Icon,label,value,hint])=><button type="button" className={`overview-stat ${label==='Follow-ups due'&&value>0?'is-urgent':''}`} key={label} onClick={()=>goTo('enquiries')} aria-label={`${label}: ${value}. ${hint}. Open enquiries.`}><span className="overview-stat-icon" aria-hidden="true"><Icon size={20}/></span><strong>{value}</strong><span>{label}</span><small>{hint}</small></button>)}</div>
    <div className="overview-columns">
      <section className="overview-panel" aria-labelledby="overview-attention"><div className="overview-panel-head"><h2 id="overview-attention">Needs your attention</h2><button type="button" className="button button-light" onClick={load}><RefreshCw size={15}/> Refresh</button></div>
        {view.attention.length?<ul className="overview-list">{view.attention.slice(0,8).map(({row,tone,label,detail})=><li key={row.id}><button type="button" onClick={()=>openEnquiry(row.id)}><span className={`overview-tag is-${tone}`}>{label}</span><b>{row.name} <span>· {row.company_name}</span></b><small>{detail}{row.assigned_to?` · ${row.assigned_to}`:' · Unassigned'}</small><ArrowRight size={16} aria-hidden="true"/></button></li>)}{view.attention.length>8&&<li className="overview-more"><button type="button" onClick={()=>goTo('enquiries')}>And {view.attention.length-8} more in Enquiries</button></li>}</ul>
          :<div className="overview-clear"><CheckCircle2 aria-hidden="true"/><b>Nothing is waiting on you.</b><p>{enquiries.length?'No follow-up is due and every new enquiry is under a day old.':'When a customer sends an enquiry it will appear here.'}</p></div>}
        <p className="overview-note">Set a follow-up date inside an enquiry and it will be listed here on the day, and stay until you move the date or close the enquiry.</p>
      </section>
      <section className="overview-panel" aria-labelledby="overview-trend"><div className="overview-panel-head"><h2 id="overview-trend">Enquiries, last 14 days</h2><strong>{fortnight}</strong></div>
        <svg className="overview-bars" viewBox="0 0 280 90" role="img" aria-label={`${fortnight} enquiries in the last 14 days. Busiest day: ${peak===1&&!fortnight?0:peak}.`}>{view.days.map((day,i)=>{const height=day.count?Math.max(4,day.count/peak*70):2;return <g key={day.from}><title>{`${new Date(day.from).toLocaleDateString([], {day:'numeric',month:'short'})}: ${day.count}`}</title><rect className={day.count?'is-filled':''} x={i*20+3} y={74-height} width="14" height={height} rx="3"/></g>;})}</svg>
        <div className="overview-axis"><span>{new Date(view.days[0].from).toLocaleDateString([], {day:'numeric',month:'short'})}</span><span>Today</span></div>
        <h2 className="overview-sub">Your website at a glance</h2>
        <ul className="overview-site">{SITE.map(([table,label,warning])=>{const count=site[table];return <li key={table}><button type="button" onClick={()=>goTo(table)}><b>{label}</b><span className={count===0?'is-empty':''}>{count===null||count===undefined?'Could not check':count===0?'None published':`${count} published`}</span>{count===0&&<small>{warning}</small>}</button></li>;})}</ul>
      </section>
    </div>
  </div>;
}
