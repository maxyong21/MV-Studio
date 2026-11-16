import {useCallback,useEffect,useMemo,useState} from 'react';
import {ChevronDown,Copy,Mail,MapPin,MessageCircle,RefreshCw,Search,Trash2} from 'lucide-react';
import {supabase} from '../supabase.js';
import {whatsappHref} from '../lib/site.js';
import {profileRequestSummary,PROFILE_STATUSES} from '../../supabase/functions/_shared/profile-request.mjs';
import './profile-requests.css';

export const STATUS_LABEL={new:'New',in_progress:'In progress',waiting_verification:'Waiting for Google verification',done:'Done',cancelled:'Cancelled'};
// The table arrives with the database update. Until it is run, say so instead of showing a raw error.
export const tableMissing=error=>['42P01','PGRST205','PGRST204'].includes(error?.code)||/profile_requests.*(does not exist|schema cache)|Unknown table|Could not find the table/i.test(error?.message||'');
const when=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'';};

export default function ProfileRequests({notify,onNewCount}){
  const [rows,setRows]=useState([]),[state,setState]=useState('loading'),[problem,setProblem]=useState('');
  const [filter,setFilter]=useState('open'),[query,setQuery]=useState(''),[openId,setOpenId]=useState(''),[busy,setBusy]=useState(''),[confirming,setConfirming]=useState(''),[notes,setNotes]=useState({});
  const load=useCallback(async()=>{
    setState('loading');
    try{
      const {data,error}=await supabase.from('profile_requests').select('*').order('created_at',{ascending:false});
      if(error){if(tableMissing(error)){setState('unavailable');return;}throw error;}
      setRows(Array.isArray(data)?data:[]);setState('ready');
    }catch(error){setProblem(error.message||'Connection error.');setState('failed');}
  },[]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{if(state==='ready')onNewCount?.(rows.filter(row=>row.status==='new').length);},[rows,state,onNewCount]);
  const shown=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    return rows.filter(row=>(filter==='all'||(filter==='open'?!['done','cancelled'].includes(row.status):row.status===filter))&&(!needle||['business_name','business_category','contact_name','contact_phone','owner_email','address','service_areas'].some(key=>String(row[key]||'').toLowerCase().includes(needle))));
  },[rows,filter,query]);
  // Every change is written to the database first; the list only updates once it has been saved.
  const save=async(row,changes,success)=>{
    setBusy(row.id);
    try{
      const {data,error}=await supabase.from('profile_requests').update(changes).eq('id',row.id).select('*');
      if(error)throw error;
      if(!Array.isArray(data)||!data.length)throw new Error('This request no longer exists. Refresh the list.');
      setRows(current=>current.map(item=>item.id===row.id?{...item,...data[0]}:item));notify(success);return true;
    }catch(error){notify(`Not saved: ${error.message||'connection error'}. Please try again.`,'error');return false;}
    finally{setBusy('');}
  };
  const saveNotes=async row=>{if(await save(row,{admin_notes:(notes[row.id]??'').trim()},'Notes saved.'))setNotes(current=>{const next={...current};delete next[row.id];return next;});};
  const remove=async row=>{
    setBusy(row.id);
    try{
      const {error}=await supabase.from('profile_requests').delete().eq('id',row.id);if(error)throw error;
      setRows(current=>current.filter(item=>item.id!==row.id));setConfirming('');notify(`“${row.business_name}” was deleted for good.`);
    }catch(error){notify(`Not deleted: ${error.message||'connection error'}. Please try again.`,'error');}
    finally{setBusy('');}
  };
  const copy=async row=>{
    try{await navigator.clipboard.writeText(profileRequestSummary(row));notify('Details copied. Paste them where you need them.');}
    catch{notify('Copying is blocked in this browser. Select the text and copy it by hand.','error');}
  };
  const count=state==='ready'?`${shown.length}${shown.length!==rows.length?` of ${rows.length}`:''} request${rows.length===1?'':'s'}`:'Profile setups';
  return <section className="profile-requests" aria-busy={state==='loading'}>
    <div className="entity-toolbar"><div><span>{count}</span><small>Business details customers sent through the Google Business Profile form.</small></div>
      <div className="entity-toolbar-actions"><label className="admin-search"><Search size={17}/><input type="search" aria-label="Search profile setups" placeholder="Search business or contact" value={query} onChange={event=>setQuery(event.target.value)}/></label>
        <label className="profile-filter"><span className="wg-hide-text">Show</span><select aria-label="Show requests with status" value={filter} onChange={event=>setFilter(event.target.value)}><option value="open">Open requests</option><option value="all">All requests</option>{PROFILE_STATUSES.map(status=><option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select></label>
        <button type="button" className="button button-light" onClick={load} disabled={state==='loading'}><RefreshCw size={15}/> Refresh</button></div></div>
    {state==='loading'&&<p className="entity-loading" role="status">Loading profile setups…</p>}
    {state==='failed'&&<div className="enquiry-db-error" role="alert"><b>Profile setups could not be loaded.</b><span>{problem}</span><button type="button" className="button button-light" onClick={load}>Retry</button></div>}
    {state==='unavailable'&&<div className="enquiry-db-error" role="status"><b>Profile setups are not switched on yet.</b><span>Run the database update <code>20261116_profile_requests.sql</code> in Supabase and deploy the <code>submit-profile-request</code> function. Until then the form cannot save, and customers are asked to send their details on WhatsApp.</span></div>}
    {state==='ready'&&!rows.length&&<div className="empty-state"><MapPin/><h3>No profile setups yet</h3><p>Send a customer the link to <code>/business-profile-form</code>. Their business details appear here as soon as they submit it.</p></div>}
    {state==='ready'&&rows.length>0&&!shown.length&&<div className="empty-state"><Search/><h3>No requests match</h3><p>Change the status filter or clear the search to see more.</p><button type="button" className="button button-light" onClick={()=>{setFilter('all');setQuery('');}}>Show all requests</button></div>}
    {state==='ready'&&shown.length>0&&<div className="profile-list">{shown.map(row=>{
      const open=openId===row.id,working=busy===row.id,draft=notes[row.id],noteValue=draft??row.admin_notes??'',noteDirty=draft!==undefined&&draft.trim()!==(row.admin_notes||'').trim(),whatsapp=whatsappHref(row.contact_phone),panel=`profile-panel-${row.id}`;
      return <article className={`profile-card status-${row.status}`} key={row.id}>
        <button type="button" className="profile-card-head" aria-expanded={open} aria-controls={panel} onClick={()=>setOpenId(open?'':row.id)}>
          <span className="profile-card-title"><b>{row.business_name}</b><span>{row.business_category} · {row.contact_name} · {when(row.created_at)}</span></span>
          <span className={`profile-chip chip-${row.status}`}>{STATUS_LABEL[row.status]||row.status}</span><ChevronDown size={18} aria-hidden="true"/>
        </button>
        {open&&<div className="profile-card-body" id={panel}>
          {row.notification_status==='failed'&&<p className="profile-warning" role="status">The email telling the team about this request was not sent. The details below are complete.</p>}
          <dl className="profile-details">
            <div><dt>Contact</dt><dd>{row.contact_name}<br/>{row.contact_phone}</dd></div>
            <div><dt>Google account email</dt><dd>{row.owner_email}</dd></div>
            <div><dt>{row.location_type==='service_area'?'Areas served (address hidden)':'Address'}</dt><dd>{row.location_type==='service_area'?row.service_areas:row.address}</dd></div>
            <div><dt>Business phone</dt><dd>{row.business_phone}</dd></div>
            <div className="is-wide"><dt>Opening hours</dt><dd>{row.opening_hours}</dd></div>
            {[['Description',row.description],['Services or products',row.services],['Website',row.website_url],['Social media',row.social_links],['Customer’s notes',row.notes]].filter(([,value])=>value).map(([label,value])=><div className="is-wide" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          <div className="profile-actions"><button type="button" className="button button-light" onClick={()=>copy(row)}><Copy size={15}/> Copy all details</button>{whatsapp&&<a className="button button-light" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp customer</a>}<a className="button button-light" href={`mailto:${row.owner_email}`}><Mail size={15}/> Email customer</a></div>
          <div className="profile-manage">
            <label>Status<select value={row.status} disabled={working} onChange={event=>save(row,{status:event.target.value},`Status changed to “${STATUS_LABEL[event.target.value]}”.`)}>{PROFILE_STATUSES.map(status=><option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select></label>
            <label className="profile-notes">Your notes (private)<textarea rows="3" maxLength="3000" value={noteValue} disabled={working} onChange={event=>setNotes(current=>({...current,[row.id]:event.target.value}))} placeholder="For example: verification video sent on 18 Nov, waiting for Google."/></label>
            <div className="profile-manage-actions">{noteDirty&&<span className="unsaved-flag" role="status">Unsaved notes</span>}<button type="button" className="button button-dark" disabled={working||!noteDirty} onClick={()=>saveNotes(row)}>{working?'Saving…':'Save notes'}</button></div>
          </div>
          {confirming===row.id
            ?<div className="inline-confirm" role="alertdialog" aria-label="Confirm permanent delete"><span><b>Delete “{row.business_name}” for good?</b> The customer’s details are erased and cannot be restored.</span><button type="button" className="button button-dark" autoFocus disabled={working} onClick={()=>setConfirming('')}>Keep it</button><button type="button" className="button button-light profile-delete-confirm" disabled={working} onClick={()=>remove(row)}>Delete for good</button></div>
            :<button type="button" className="profile-delete" disabled={working} onClick={()=>setConfirming(row.id)}><Trash2 size={15}/> Delete this request</button>}
        </div>}
      </article>;})}</div>}
  </section>;
}
