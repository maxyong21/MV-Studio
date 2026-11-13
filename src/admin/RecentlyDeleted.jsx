import {useCallback,useEffect,useState} from 'react';
import {RefreshCw,RotateCcw,Trash2} from 'lucide-react';
import {supabase} from '../supabase.js';
import {trashMissing} from './trash.js';

const KIND={services:'Service',projects:'Project',team_members:'Team member',promotions:'Promotion',feature_options:'Enquiry feature',testimonials:'Client feedback',faqs:'FAQ',enquiries:'Enquiry'};
const KEEP_DAYS=30;
const daysLeft=deletedAt=>Math.max(0,KEEP_DAYS-Math.floor((Date.now()-new Date(deletedAt).getTime())/86400000));

export default function RecentlyDeleted({notify}){
  const [rows,setRows]=useState([]),[state,setState]=useState('loading'),[problem,setProblem]=useState(''),[busy,setBusy]=useState(''),[confirming,setConfirming]=useState('');
  const load=useCallback(async()=>{
    setState('loading');
    try{
      const {data,error}=await supabase.rpc('admin_trash_list');
      if(error){if(trashMissing(error)){setState('unavailable');return;}throw error;}
      setRows(Array.isArray(data)?data:[]);setState('ready');
    }catch(error){setProblem(error.message||'Connection error.');setState('failed');}
  },[]);
  useEffect(()=>{load();},[load]);
  const act=async(row,action)=>{
    setBusy(row.trash_id);
    try{
      const {error}=await supabase.rpc(action==='restore'?'admin_trash_restore':'admin_trash_purge',{p_table:row.source_table,p_id:row.trash_id});
      if(error)throw error;
      notify(action==='restore'?`“${row.label}” was restored.`:`“${row.label}” was deleted for good.`);setConfirming('');await load();
    }catch(error){
      // Restoring a footer project fails when four are already shown; say so plainly.
      notify(/footer/i.test(error.message||'')?'The footer already shows four projects. Untick “Show in footer” on one of them, then restore this again.':error.message||'That did not work. Please try again.','error');
    }finally{setBusy('');}
  };
  return <section className="trash-page" aria-busy={state==='loading'}>
    <div className="entity-toolbar"><div><span>{state==='ready'?`${rows.length} item${rows.length===1?'':'s'}`:'Recently deleted'}</span><small>Deleted items wait here for {KEEP_DAYS} days, then are removed for good.</small></div><div className="entity-toolbar-actions"><button type="button" className="button button-light" onClick={load} disabled={state==='loading'}><RefreshCw size={15}/> Refresh</button></div></div>
    {state==='loading'&&<p className="entity-loading" role="status">Loading deleted items…</p>}
    {state==='failed'&&<div className="enquiry-db-error" role="alert"><b>Recently deleted could not be loaded.</b><span>{problem}</span><button type="button" className="button button-light" onClick={load}>Retry</button></div>}
    {state==='unavailable'&&<div className="enquiry-db-error" role="status"><b>Recently deleted is not switched on yet.</b><span>Until the database update <code>20261114_recently_deleted.sql</code> is run in Supabase, deleting an item removes it permanently and nothing appears here.</span></div>}
    {state==='ready'&&!rows.length&&<div className="empty-state"><Trash2/><h3>Nothing has been deleted</h3><p>When you delete a service, project, FAQ, enquiry or other item, it comes here first so a mistake can be undone.</p></div>}
    {state==='ready'&&rows.length>0&&<div className="entity-list">{rows.map(row=>{const left=daysLeft(row.deleted_at),key=`${row.source_table}-${row.trash_id}`;return <article className="entity-row trash-row" key={key}>
      <div className="entity-avatar"><span>{(row.label||'?').slice(0,1)}</span></div>
      <div className="entity-info"><b>{row.label||'Untitled'}</b><span>{KIND[row.source_table]||'Item'}{row.detail?` · ${row.detail}`:''}</span><small className={left<=3?'trash-soon':''}>Deleted {new Date(row.deleted_at).toLocaleDateString()} · {left===0?'removed for good today':`${left} day${left===1?'':'s'} left to restore`}</small></div>
      {confirming===key?<div className="inline-confirm" role="alertdialog" aria-label="Confirm permanent delete"><span><b>Delete “{row.label}” for good?</b> This cannot be undone.</span><button type="button" className="button button-dark" autoFocus disabled={busy===row.trash_id} onClick={()=>setConfirming('')}>Keep it</button><button type="button" className="button button-light trash-purge-confirm" disabled={busy===row.trash_id} onClick={()=>act(row,'purge')}>Delete for good</button></div>
        :<div className="trash-actions"><button type="button" className="button button-dark trash-restore" disabled={busy===row.trash_id} onClick={()=>act(row,'restore')}><RotateCcw size={15}/> {busy===row.trash_id?'Working…':'Restore'}</button><button type="button" className="button button-light trash-purge" disabled={busy===row.trash_id} onClick={()=>setConfirming(key)}>Delete for good</button></div>}
    </article>;})}</div>}
  </section>;
}
