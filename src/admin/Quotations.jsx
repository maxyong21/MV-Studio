import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,CalendarPlus,Copy,Eye,FileText,Link2,MessageCircle,Pencil,PenLine,Plus,RefreshCw,Save,Search,Trash2,Unlink} from 'lucide-react';
import {supabase} from '../supabase.js';
import {fallbackContent} from '../content.js';
import {normalizeSiteContent,studioOwners,whatsappHref} from '../lib/site.js';
import InlineFieldError from '../components/InlineFieldError.jsx';
import {BILLING,DEPOSIT_PERCENT,LIMITS,MAX_ITEMS,PAID_TO,STATUS_LABEL,VALID_DAYS,addDays,catalogueOptions,cleanItem,daysBetween,defaultValidUntil,displayStatus,emptyItem,formatDate,formatRange,itemsFromEnquiry,malaysiaToday,newShareToken,shareUrl,totals,validateQuotation} from '../quotations/quotation.mjs';
import {TERMS_VERSION,quotationTerms} from '../quotations/terms.mjs';
import './quotations.css';

// The tables arrive with the database update. Until it is run, say so instead of showing a raw error.
const tablesMissing=error=>['42P01','PGRST205','PGRST204'].includes(error?.code)||/quotation.*(does not exist|schema cache)|Could not find the table/i.test(error?.message||'');
// The list never loads signature pictures or the terms text: they are large and only the editor needs them.
const LIST_COLUMNS='id,quote_number,enquiry_id,client_name,company_name,client_email,client_phone,issued_on,valid_until,items,extra_requirements,signature_id,status,share_token,shared_at,created_at';
const blank=()=>{const today=malaysiaToday();return {client_name:'',company_name:'',client_email:'',client_phone:'',issued_on:today,valid_until:defaultValidUntil(today),items:[emptyItem()],extra_requirements:'',signature_id:'',enquiry_id:null};};
const fromEnquiry=row=>{const items=itemsFromEnquiry(row.selected_features);return {...blank(),enquiry_id:row.id,client_name:row.name||'',company_name:row.company_name||'',client_email:row.email||'',client_phone:row.phone||'',items:items.length?items:[emptyItem()],extra_requirements:String(row.chatbot_answers?.brief||row.message||'').slice(0,LIMITS.extra_requirements)};};
const totalText=items=>{const sum=totals(items);return [['one_time',''],['monthly',' / month'],['yearly',' / year']].filter(([key])=>sum[key].count).map(([key,suffix])=>`${formatRange(sum[key].min,sum[key].max)}${suffix}`).join(' · ')||'No prices yet';};

// A signature photo is shrunk and saved as a small picture inside the database row.
async function signatureImage(file){
  if(!['image/png','image/jpeg'].includes(file.type))throw new Error('Choose a PNG or JPG picture of the signature.');
  if(file.size>5*1024*1024)throw new Error('The picture must be 5 MB or smaller.');
  const url=URL.createObjectURL(file);
  try{
    const picture=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('This picture could not be read. Try another file.'));image.src=url;});
    for(const width of [640,480,360]){
      const scale=Math.min(1,width/picture.naturalWidth,width*.45/picture.naturalHeight),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(picture.naturalWidth*scale));canvas.height=Math.max(1,Math.round(picture.naturalHeight*scale));
      canvas.getContext('2d').drawImage(picture,0,0,canvas.width,canvas.height);
      const data=canvas.toDataURL('image/png');
      if(data.length<=290000)return data;
    }
    throw new Error('This picture is too detailed. Use a simple photo of the signature on white paper.');
  }finally{URL.revokeObjectURL(url);}
}

// A typed signature: the text is drawn in a bold, slanted signature font and saved as a picture,
// so it is stored, shown and printed exactly like an uploaded signature.
// The font is the site's own file (Dancing Script, open licence) and is only fetched here in the admin.
const SIGNATURE_FONT='MV Signature';
let signatureFont;
const loadSignatureFont=()=>signatureFont||(signatureFont=new FontFace(SIGNATURE_FONT,"url('/fonts/dancing-script-latin-700-normal.woff2') format('woff2')",{weight:'700'}).load().then(face=>{document.fonts.add(face);return face;}).catch(error=>{signatureFont=null;throw error;}));
export async function typedSignature(text){
  const words=String(text||'').trim().replace(/\s+/g,' ').slice(0,60);
  if(words.length<2)throw new Error('Type at least two letters for the signature.');
  try{await loadSignatureFont();}catch{throw new Error('The signature font could not be loaded. Check your connection and try again, or upload a picture instead.');}
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d'),slant=.2,pad=28;
  // Long names are drawn smaller so the picture never grows past 640 pixels wide.
  let size=104;context.font=`700 ${size}px "${SIGNATURE_FONT}"`;
  const widest=640-pad*2-size*slant,measured=context.measureText(words).width;
  if(measured>widest){size=Math.max(40,Math.floor(size*widest/measured));context.font=`700 ${size}px "${SIGNATURE_FONT}"`;}
  const width=context.measureText(words).width,height=Math.round(size*1.5);
  canvas.width=Math.ceil(width+size*slant+pad*2);canvas.height=height+pad;
  const draw=canvas.getContext('2d');
  draw.font=`700 ${size}px "${SIGNATURE_FONT}"`;draw.fillStyle='#16233f';draw.textBaseline='alphabetic';
  // The slant gives the bold script an italic lean, like handwriting.
  draw.setTransform(1,0,-slant,1,0,0);
  draw.fillText(words,pad+size*slant+height*slant*.5,Math.round(pad/2+size*1.05));
  return canvas.toDataURL('image/png');
}

export default function Quotations({notify,seed,onSeedUsed,onDirtyChange}){
  const [rows,setRows]=useState([]),[signatures,setSignatures]=useState([]),[catalogue,setCatalogue]=useState([]),[studio,setStudio]=useState({}),[team,setTeam]=useState([]);
  const [state,setState]=useState('loading'),[problem,setProblem]=useState(''),[query,setQuery]=useState(''),[filter,setFilter]=useState('all');
  const [editing,setEditing]=useState(null),[managing,setManaging]=useState(false),[busy,setBusy]=useState(''),[confirming,setConfirming]=useState('');
  const load=useCallback(async()=>{
    setState('loading');
    try{
      const [quotes,signs,services,features,content,members]=await Promise.all([
        supabase.from('quotations').select(LIST_COLUMNS).order('created_at',{ascending:false}),
        supabase.from('quotation_signatures').select('*').order('created_at',{ascending:true}),
        supabase.from('services').select('*'),supabase.from('feature_options').select('*'),
        supabase.from('site_content').select('content').eq('id',1).maybeSingle(),supabase.from('team_members').select('name,role,active'),
      ]);
      const missing=[quotes.error,signs.error].find(error=>error&&tablesMissing(error));
      if(missing){setState('unavailable');return;}
      const failed=[quotes,signs].find(result=>result.error);if(failed)throw failed.error;
      setRows(quotes.data||[]);setSignatures(signs.data||[]);
      // The price list and contact details are helpers: a quotation can still be typed by hand without them.
      setCatalogue(catalogueOptions(services.data||[],features.data||[]));setTeam((members.data||[]).filter(member=>member.active!==false));
      // Contact details come from Site content. With no phone list there, the WhatsApp number is used.
      const site=normalizeSiteContent({...fallbackContent.site_content.content,...(content.data?.content||{})}),phones=site.contact_phones.length?site.contact_phones:[site.whatsapp_number].filter(Boolean);
      setStudio({owners:studioOwners,emails:site.contact_emails.slice(0,3),phones:phones.slice(0,3),website:window.location.host});
      setState('ready');
    }catch(error){setProblem(error.message||'Connection error.');setState('failed');}
  },[]);
  useEffect(()=>{load();},[load]);
  // "Create quotation" on an enquiry opens the editor here with the customer's details filled in.
  useEffect(()=>{if(seed&&state==='ready'){setEditing({row:null,values:fromEnquiry(seed)});setManaging(false);onSeedUsed?.();}},[seed,state,onSeedUsed]);

  const shown=useMemo(()=>{const needle=query.trim().toLowerCase();return rows.filter(row=>(filter==='all'||displayStatus(row)===filter)&&(!needle||['quote_number','client_name','company_name','client_email','client_phone'].some(key=>String(row[key]||'').toLowerCase().includes(needle))));},[rows,query,filter]);
  const change=async(row,changes,success)=>{
    setBusy(row.id);
    try{
      const {data,error}=await supabase.from('quotations').update(changes).eq('id',row.id).select(LIST_COLUMNS);
      if(error)throw error;
      if(!data?.length)throw new Error('This quotation no longer exists. Refresh the list.');
      setRows(current=>current.map(item=>item.id===row.id?data[0]:item));notify(success);return data[0];
    }catch(error){notify(`Not saved: ${/quotations_dates/.test(error.message||'')?'a quotation can be valid for 90 days at most from its issue date. Duplicate it to issue a new one.':error.message||'connection error'}`,'error');return null;}
    finally{setBusy('');}
  };
  const copy=async text=>{try{await navigator.clipboard.writeText(text);notify('Link copied. Paste it into WhatsApp or an email.');}catch{notify('Copying is blocked in this browser. Select the link and copy it by hand.','error');}};
  // Sharing starts the clock: the issue date becomes today and the quotation keeps the same number of valid days.
  const share=async row=>{
    const today=malaysiaToday(),length=Math.max(0,daysBetween(row.issued_on,row.valid_until)),token=newShareToken();
    const saved=await change(row,{status:'shared',share_token:token,shared_at:new Date().toISOString(),issued_on:today,valid_until:addDays(today,length)},`Share link created. It works until the end of ${formatDate(addDays(today,length))}.`);
    if(saved)copy(shareUrl(window.location.origin,token));
  };
  const extend=row=>{const today=malaysiaToday(),from=row.valid_until>today?row.valid_until:today,next=addDays(from,VALID_DAYS);return change(row,{valid_until:next},`Now valid until ${formatDate(next)}.`);};
  const remove=async row=>{
    setBusy(row.id);
    try{const {error}=await supabase.from('quotations').delete().eq('id',row.id);if(error)throw error;setRows(current=>current.filter(item=>item.id!==row.id));setConfirming('');notify(`Quotation ${row.quote_number} was deleted for good.`);}
    catch(error){notify(`Not deleted: ${error.message||'connection error'}`,'error');}
    finally{setBusy('');}
  };
  const open=async(row,duplicate=false)=>{
    setBusy(row.id);
    try{
      const {data,error}=await supabase.from('quotations').select('*').eq('id',row.id).maybeSingle();
      if(error)throw error;if(!data)throw new Error('This quotation no longer exists. Refresh the list.');
      const today=malaysiaToday(),values={client_name:data.client_name,company_name:data.company_name,client_email:data.client_email,client_phone:data.client_phone,issued_on:duplicate?today:data.issued_on,valid_until:duplicate?defaultValidUntil(today):data.valid_until,items:(data.items||[]).map(item=>({...emptyItem(),...item,max:item.max??''})),extra_requirements:data.extra_requirements,signature_id:signatures.some(sign=>sign.id===data.signature_id)?data.signature_id:'',enquiry_id:data.enquiry_id};
      setManaging(false);setEditing({row:duplicate?null:data,values});
    }catch(error){notify(error.message||'The quotation could not be opened.','error');}
    finally{setBusy('');}
  };
  const closeEditor=saved=>{setEditing(null);onDirtyChange?.(false);if(saved)load();};

  if(editing)return <QuotationEditor key={editing.row?.id||'new'} row={editing.row} initial={editing.values} signatures={signatures} catalogue={catalogue} studio={studio} notify={notify} onDirtyChange={onDirtyChange} onClose={closeEditor} onManageSignatures={()=>{setEditing(null);onDirtyChange?.(false);setManaging(true);}}/>;
  if(managing)return <SignatureManager signatures={signatures} team={team} notify={notify} onChange={setSignatures} onClose={()=>setManaging(false)}/>;
  const count=state==='ready'?`${shown.length}${shown.length!==rows.length?` of ${rows.length}`:''} quotation${rows.length===1?'':'s'}`:'Quotations';
  return <section className="quotations" aria-busy={state==='loading'}>
    <div className="entity-toolbar"><div><span>{count}</span><small>Priced offers you send to clients as a link or a PDF.</small></div>
      <div className="entity-toolbar-actions"><label className="admin-search"><Search size={17}/><input type="search" aria-label="Search quotations" placeholder="Search ID or client" value={query} onChange={event=>setQuery(event.target.value)}/></label>
        <label className="qt-filter"><span className="wg-hide-text">Show</span><select aria-label="Show quotations with status" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">All quotations</option>{['draft','shared','expired','accepted','declined','revoked'].map(status=><option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select></label>
        <button type="button" className="button button-light" disabled={state!=='ready'} onClick={()=>setManaging(true)}><PenLine size={15}/> Signatures</button>
        <button type="button" className="button button-dark" disabled={state!=='ready'} onClick={()=>setEditing({row:null,values:blank()})}><Plus size={16}/> New quotation</button></div></div>
    {state==='loading'&&<p className="entity-loading" role="status">Loading quotations…</p>}
    {state==='failed'&&<div className="enquiry-db-error" role="alert"><b>Quotations could not be loaded.</b><span>{problem}</span><button type="button" className="button button-light" onClick={load}><RefreshCw size={14}/> Retry</button></div>}
    {state==='unavailable'&&<div className="enquiry-db-error" role="status"><b>Quotations are not switched on yet.</b><span>Run the database update <code>20261119_quotations.sql</code> in the Supabase SQL Editor, then press Retry.</span><button type="button" className="button button-light" onClick={load}><RefreshCw size={14}/> Retry</button></div>}
    {state==='ready'&&!signatures.length&&<p className="qt-tip" role="status"><b>Add a signature first.</b> Every quotation is signed by a member of the studio. Press “Signatures” to add one.</p>}
    {state==='ready'&&!rows.length&&<div className="empty-state"><FileText/><h3>No quotations yet</h3><p>Create a quotation, check the preview, then create a share link for your client.</p><button type="button" className="button button-dark" onClick={()=>setEditing({row:null,values:blank()})}><Plus size={16}/> New quotation</button></div>}
    {state==='ready'&&rows.length>0&&!shown.length&&<div className="empty-state"><Search/><h3>No quotations match</h3><p>Change the status filter or clear the search to see more.</p><button type="button" className="button button-light" onClick={()=>{setFilter('all');setQuery('');}}>Show all quotations</button></div>}
    {state==='ready'&&shown.length>0&&<div className="qt-list">{shown.map(row=>{
      const status=displayStatus(row),working=busy===row.id,link=row.share_token&&['shared','accepted'].includes(row.status)?shareUrl(window.location.origin,row.share_token):'',live=link&&status!=='expired',editable=['draft','revoked'].includes(row.status);
      const whatsapp=live&&row.client_phone?whatsappHref(row.client_phone):'',message=`Hi ${row.client_name}, here is your quotation ${row.quote_number} from MV Studio, valid until ${formatDate(row.valid_until)}:\n${link}`;
      return <article className={`qt-card status-${status}`} key={row.id}>
        <div className="qt-card-head"><div className="qt-card-title"><b>{row.quote_number}</b><span>{row.client_name}{row.company_name?` · ${row.company_name}`:''}</span></div><span className={`qt-chip chip-${status}`}>{STATUS_LABEL[status]}</span></div>
        <dl className="qt-facts"><div><dt>Total</dt><dd>{totalText(row.items)}</dd></div><div><dt>Issued</dt><dd>{formatDate(row.issued_on)}</dd></div><div><dt>{status==='expired'?'Expired after':'Valid until'}</dt><dd>{formatDate(row.valid_until)}</dd></div></dl>
        {link&&<div className="qt-link"><label htmlFor={`qt-link-${row.id}`}>{live?'Share link (anyone with it can read the quotation)':'Share link (now shows an expired notice)'}</label><div><input id={`qt-link-${row.id}`} readOnly value={link} onFocus={event=>event.target.select()}/><button type="button" className="button button-light" onClick={()=>copy(link)}><Copy size={15}/> Copy</button>{whatsapp&&<a className="button button-light" href={`${whatsapp}${whatsapp.includes('?')?'&':'?'}text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp</a>}</div></div>}
        <div className="qt-actions">
          <a className="button button-light" href={`/quotation?preview=${row.id}`} target="_blank" rel="noopener"><Eye size={15}/> Preview and PDF</a>
          {editable&&<button type="button" className="button button-light" disabled={working} onClick={()=>open(row)}><Pencil size={15}/> Edit</button>}
          {editable&&<button type="button" className="button button-dark" disabled={working||!row.signature_id} title={row.signature_id?undefined:'Edit the quotation and choose who signs it first'} onClick={()=>share(row)}><Link2 size={15}/> Create share link</button>}
          {link&&<button type="button" className="button button-light" disabled={working} onClick={()=>extend(row)}><CalendarPlus size={15}/> {status==='expired'?`Reopen for ${VALID_DAYS} days`:`Extend ${VALID_DAYS} days`}</button>}
          {['shared','accepted','declined'].includes(row.status)&&<label className="qt-outcome"><span>Outcome</span><select value={row.status} disabled={working} onChange={event=>change(row,{status:event.target.value},`Marked as ${event.target.value==='shared'?'awaiting reply':event.target.value}.`)}><option value="shared">Awaiting reply</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select></label>}
          {row.share_token&&<button type="button" className="button button-light" disabled={working} onClick={()=>change(row,{status:'revoked',share_token:null},'Link revoked. It no longer opens the quotation, and you can edit it again.')}><Unlink size={15}/> Revoke link</button>}
          <button type="button" className="button button-light" disabled={working} onClick={()=>open(row,true)}><Copy size={15}/> Duplicate</button>
          {confirming!==row.id&&<button type="button" className="qt-delete" disabled={working} onClick={()=>setConfirming(row.id)}><Trash2 size={15}/> Delete</button>}
        </div>
        {!editable&&<p className="qt-help">A shared quotation is locked so the client always sees what you sent. To change it, duplicate it as a new quotation, or revoke the link and edit.</p>}
        {confirming===row.id&&<div className="inline-confirm" role="alertdialog" aria-label="Confirm permanent delete"><span><b>Delete {row.quote_number} for good?</b> Its link stops working and it cannot be restored.</span><button type="button" className="button button-dark" autoFocus disabled={working} onClick={()=>setConfirming('')}>Keep it</button><button type="button" className="button button-light qt-delete-confirm" disabled={working} onClick={()=>remove(row)}>Delete for good</button></div>}
      </article>;})}</div>}
  </section>;
}

function QuotationEditor({row,initial,signatures,catalogue,studio,notify,onDirtyChange,onClose,onManageSignatures}){
  const [values,setValues]=useState(initial),[errors,setErrors]=useState({}),[attempted,setAttempted]=useState(false),[saving,setSaving]=useState(false),[pick,setPick]=useState(''),[leaving,setLeaving]=useState(false);
  const start=useRef(JSON.stringify(initial)),heading=useRef(null);
  const dirty=JSON.stringify(values)!==start.current,sum=totals(values.items);
  useEffect(()=>{onDirtyChange?.(dirty);},[dirty,onDirtyChange]);
  useEffect(()=>{heading.current?.focus();},[]);
  const set=(key,value)=>{const next={...values,[key]:value};setValues(next);if(attempted)setErrors(validateQuotation(next));};
  const setItem=(index,key,value)=>set('items',values.items.map((item,i)=>i===index?{...item,[key]:value}:item));
  const addFromList=()=>{const option=catalogue.find(entry=>entry.key===pick);if(!option)return;const only=values.items.length===1&&!values.items[0].name&&values.items[0].min==='';set('items',[...(only?[]:values.items),{...emptyItem(),...option.item}]);setPick('');};
  const groups=useMemo(()=>[...new Set(catalogue.map(option=>option.group))].map(group=>[group,catalogue.filter(option=>option.group===group)]),[catalogue]);
  const save=async preview=>{
    setAttempted(true);const found=validateQuotation(values);setErrors(found);
    if(Object.keys(found).length){document.getElementById(`qt-${Object.keys(found)[0]}`)?.focus();notify('Please review the highlighted fields.','error');return;}
    const sign=signatures.find(item=>item.id===values.signature_id);
    const payload={client_name:values.client_name.trim(),company_name:values.company_name.trim(),client_email:values.client_email.trim().toLowerCase(),client_phone:values.client_phone.trim(),issued_on:values.issued_on,valid_until:values.valid_until,items:values.items.map(cleanItem),extra_requirements:values.extra_requirements.trim(),signature_id:sign.id,signer:{name:sign.name,role:sign.role,image:sign.image},studio,terms:quotationTerms,terms_version:TERMS_VERSION,enquiry_id:values.enquiry_id||null};
    // The preview tab is opened before saving, while the click still counts, so pop-up blockers allow it.
    const tab=preview?window.open('','_blank'):null;
    setSaving(true);
    try{
      const request=row?supabase.from('quotations').update(payload).eq('id',row.id):supabase.from('quotations').insert({...payload,status:'draft'});
      const {data,error}=await request.select('id,quote_number').single();
      if(error)throw error;
      notify(`Quotation ${data.quote_number} saved as a draft. Create a share link from the list when it is ready.`);
      if(tab)tab.location.href=`/quotation?preview=${data.id}`;
      onClose(true);
    }catch(error){tab?.close();notify(`Not saved: ${error.message||'connection error'}. Your typing is still here; please try again.`,'error');}
    finally{setSaving(false);}
  };
  const field=(key,label,props={},note='')=>{const id=`qt-${key}`,error=errors[key];return <label className={error?'has-error':''} htmlFor={id}><span>{label}{note&&<i>{note}</i>}</span><input id={id} value={values[key]} aria-invalid={Boolean(error)} aria-describedby={error?`${id}-error`:undefined} onChange={event=>set(key,event.target.value)} {...props}/>{error&&<InlineFieldError id={`${id}-error`} message={error}/>}</label>;};
  return <section className="quotations qt-editor" aria-labelledby="qt-editor-title">
    <div className="qt-editor-head"><button type="button" className="button button-light" onClick={()=>dirty?setLeaving(true):onClose(false)}><ArrowLeft size={15}/> Back to quotations</button><div><span className="section-overline">{row?`EDIT ${row.quote_number}`:'NEW QUOTATION'}</span><h2 id="qt-editor-title" tabIndex={-1} ref={heading}>{row?'Edit quotation':'Prepare a quotation'}</h2><p>It is saved as a private draft. The client sees nothing until you create a share link.</p></div></div>
    {leaving&&<div className="inline-confirm" role="alertdialog" aria-label="Unsaved changes"><span><b>Leave without saving?</b> Your changes to this quotation will be lost.</span><button type="button" className="button button-dark" autoFocus onClick={()=>setLeaving(false)}>Keep editing</button><button type="button" className="button button-light" onClick={()=>onClose(false)}>Discard changes</button></div>}
    <form className="qt-form" noValidate onSubmit={event=>{event.preventDefault();save(false);}}>
      <fieldset><legend>Client</legend><div className="qt-grid">
        {field('client_name','Client name',{maxLength:LIMITS.client_name,autoComplete:'off'},'Required')}
        {field('company_name','Company name',{maxLength:LIMITS.company_name,autoComplete:'off'},'Optional')}
        {field('client_email','Email address',{type:'email',inputMode:'email',maxLength:LIMITS.client_email,autoComplete:'off'},'Optional')}
        {field('client_phone','Phone number',{type:'tel',inputMode:'tel',maxLength:LIMITS.client_phone,autoComplete:'off',placeholder:'+60 12-345 6789'},'Optional')}
      </div></fieldset>
      <fieldset><legend>Dates</legend><div className="qt-grid">
        <div className="qt-readonly"><span>Date issued</span><b>{formatDate(values.issued_on)}</b><small>Malaysia time. It is set to the day you create the share link.</small></div>
        {field('valid_until','Valid until (last valid day)',{type:'date',min:malaysiaToday(),max:addDays(values.issued_on,90)},'Required')}
      </div><p className="qt-help">The usual validity is {VALID_DAYS} days: a quotation issued today is good until the end of {formatDate(defaultValidUntil(malaysiaToday()))}, Malaysia time, and expires the next day.</p></fieldset>
      <fieldset><legend>Services and prices</legend>
        <div className="qt-add"><label htmlFor="qt-pick">Add from your price list<select id="qt-pick" value={pick} onChange={event=>setPick(event.target.value)}><option value="">{catalogue.length?'Choose a package, feature or charge':'No price list loaded'}</option>{groups.map(([group,options])=><optgroup key={group} label={group}>{options.map(option=><option key={option.key} value={option.key}>{option.label}{option.item.min===''?' (no price set)':` · RM ${option.item.min}`}</option>)}</optgroup>)}</select></label><button type="button" className="button button-light" disabled={!pick||values.items.length>=MAX_ITEMS} onClick={addFromList}><Plus size={15}/> Add to quotation</button><button type="button" className="button button-light" disabled={values.items.length>=MAX_ITEMS} onClick={()=>set('items',[...values.items,emptyItem()])}><Plus size={15}/> Add a blank line</button></div>
        <p className="qt-help">Prices start from “Services & pricing” and “Enquiry features”, and you can change any of them here. Fill “Up to” only when the price is a range. Use 0 for something that is included.</p>
        {errors.items&&<InlineFieldError id="qt-items-error" message={errors.items}/>}
        <ol className="qt-items" id="qt-items" tabIndex={-1}>{values.items.map((item,index)=>{const id=`qt-item-${index}`;return <li key={index}>
          <label className={`qt-item-name ${errors[`item-${index}-name`]?'has-error':''}`} htmlFor={`${id}-name`}><span>Service or charge {index+1}</span><input id={`${id}-name`} maxLength={LIMITS.item_name} value={item.name} aria-invalid={Boolean(errors[`item-${index}-name`])} onChange={event=>setItem(index,'name',event.target.value)}/>{errors[`item-${index}-name`]&&<InlineFieldError message={errors[`item-${index}-name`]}/>}</label>
          <label className="qt-item-description" htmlFor={`${id}-description`}><span>What it covers<i>Optional</i></span><input id={`${id}-description`} maxLength={LIMITS.item_description} value={item.description} onChange={event=>setItem(index,'description',event.target.value)}/></label>
          <label htmlFor={`${id}-billing`}><span>Billing</span><select id={`${id}-billing`} value={item.billing} onChange={event=>setItem(index,'billing',event.target.value)}>{Object.entries(BILLING).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          <label htmlFor={`${id}-paid`}><span>Paid to</span><select id={`${id}-paid`} value={item.paid_to} onChange={event=>setItem(index,'paid_to',event.target.value)}>{Object.entries(PAID_TO).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          <label className={errors[`item-${index}-min`]?'has-error':''} htmlFor={`${id}-min`}><span>Price (RM)</span><input id={`${id}-min`} type="number" inputMode="decimal" min="0" step="0.01" value={item.min} aria-invalid={Boolean(errors[`item-${index}-min`])} onChange={event=>setItem(index,'min',event.target.value)}/>{errors[`item-${index}-min`]&&<InlineFieldError message={errors[`item-${index}-min`]}/>}</label>
          <label className={errors[`item-${index}-max`]?'has-error':''} htmlFor={`${id}-max`}><span>Up to (RM)</span><input id={`${id}-max`} placeholder="Range only" type="number" inputMode="decimal" min="0" step="0.01" value={item.max} aria-invalid={Boolean(errors[`item-${index}-max`])} onChange={event=>setItem(index,'max',event.target.value)}/>{errors[`item-${index}-max`]&&<InlineFieldError message={errors[`item-${index}-max`]}/>}</label>
          <button type="button" className="qt-remove" aria-label={`Remove line ${index+1}${item.name?`: ${item.name}`:''}`} disabled={values.items.length===1} onClick={()=>set('items',values.items.filter((_,i)=>i!==index))}><Trash2 size={16}/></button>
        </li>;})}</ol>
        <dl className="qt-totals" aria-live="polite">{[['one_time','One-time total',''],['monthly','Monthly total',' / month'],['yearly','Yearly total',' / year']].filter(([key])=>sum[key].count).map(([key,label,suffix])=><div key={key}><dt>{label}</dt><dd>{formatRange(sum[key].min,sum[key].max)}{suffix}</dd></div>)}<div><dt>Deposit ({DEPOSIT_PERCENT}% of MV Studio’s one-time fees)</dt><dd>{formatRange(sum.deposit.min,sum.deposit.max)}</dd></div></dl>
      </fieldset>
      <fieldset><legend>Additional requirements</legend><label htmlFor="qt-extra_requirements"><span>Anything else the client asked for<i>Optional</i></span><textarea id="qt-extra_requirements" rows={4} maxLength={LIMITS.extra_requirements} value={values.extra_requirements} onChange={event=>set('extra_requirements',event.target.value)} placeholder="For example: bilingual pages, a booking calendar, launch before Chinese New Year."/><small>{values.extra_requirements.length} of {LIMITS.extra_requirements} characters. The terms say these are included only when they are also priced above.</small></label></fieldset>
      <fieldset><legend>Signature and terms</legend><div className="qt-grid">
        <label className={errors.signature_id?'has-error':''} htmlFor="qt-signature_id"><span>Signed by<i>Required</i></span><select id="qt-signature_id" value={values.signature_id} aria-invalid={Boolean(errors.signature_id)} onChange={event=>set('signature_id',event.target.value)}><option value="">{signatures.length?'Choose who signs':'No signature uploaded yet'}</option>{signatures.map(sign=><option key={sign.id} value={sign.id}>{sign.name}{sign.role?` · ${sign.role}`:''}</option>)}</select>{errors.signature_id&&<InlineFieldError message={errors.signature_id}/>}</label>
        <div className="qt-readonly"><span>Terms and conditions</span><b>Standard terms, version {TERMS_VERSION}</b><small>{quotationTerms.length} sections are added automatically. Check them in the preview.</small></div>
      </div><button type="button" className="qt-text-button" onClick={()=>dirty?notify('Save this quotation first, then open Signatures from the list.','info'):onManageSignatures()}><PenLine size={15}/> Add or change signatures</button></fieldset>
      <div className="qt-save">{dirty&&<span className="unsaved-flag" role="status">Unsaved changes</span>}<button type="button" className="button button-light" disabled={saving} onClick={()=>save(true)}><Eye size={15}/> Save and preview</button><button className="button button-dark" disabled={saving}><Save size={15}/> {saving?'Saving…':'Save draft'}</button></div>
    </form>
  </section>;
}

function SignatureManager({signatures,team,notify,onChange,onClose}){
  const [name,setName]=useState(''),[role,setRole]=useState(''),[mode,setMode]=useState('typed'),[text,setText]=useState(''),[textEdited,setTextEdited]=useState(false),[image,setImage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirming,setConfirming]=useState('');
  const file=useRef(null),words=textEdited?text:name;
  // The typed signature is redrawn a moment after the typing stops.
  useEffect(()=>{
    if(mode!=='typed')return;
    if(words.trim().length<2){setImage('');return;}
    let alive=true;const timer=setTimeout(()=>{typedSignature(words).then(data=>{if(alive){setImage(data);setError('');}},problem=>{if(alive){setImage('');setError(problem.message);}});},200);
    return()=>{alive=false;clearTimeout(timer);};
  },[mode,words]);
  const switchMode=next=>{setMode(next);setImage('');setError('');if(file.current)file.current.value='';};
  const choose=async event=>{const chosen=event.target.files?.[0];setError('');setImage('');if(!chosen)return;try{setImage(await signatureImage(chosen));}catch(problem){setError(problem.message);event.target.value='';}};
  const add=async event=>{
    event.preventDefault();
    if(name.trim().length<2){setError('Enter the name of the person signing.');return;}
    setBusy(true);setError('');
    try{
      // Drawn again at the moment of saving, so the saved picture always matches the text in the box.
      const picture=mode==='typed'?await typedSignature(words):image;
      if(!picture)throw new Error('Choose a picture of the signature.');
      const {data,error:failure}=await supabase.from('quotation_signatures').insert({name:name.trim(),role:role.trim(),image:picture}).select('*').single();if(failure)throw new Error(`Not saved: ${failure.message||'connection error'}`);
      onChange([...signatures,data]);setName('');setRole('');setText('');setTextEdited(false);setImage('');if(file.current)file.current.value='';notify(`Signature for ${data.name} saved.`);
    }catch(problem){setError(problem.message||'Not saved: connection error');}
    finally{setBusy(false);}
  };
  const remove=async sign=>{
    setBusy(true);
    try{const {error:failure}=await supabase.from('quotation_signatures').delete().eq('id',sign.id);if(failure)throw failure;onChange(signatures.filter(item=>item.id!==sign.id));setConfirming('');notify(`Signature for ${sign.name} removed. Quotations already signed keep it.`);}
    catch(problem){notify(`Not removed: ${problem.message||'connection error'}`,'error');}
    finally{setBusy(false);}
  };
  return <section className="quotations qt-editor" aria-labelledby="qt-sign-title">
    <div className="qt-editor-head"><button type="button" className="button button-light" onClick={onClose}><ArrowLeft size={15}/> Back to quotations</button><div><span className="section-overline">WHO CAN SIGN</span><h2 id="qt-sign-title">Signatures</h2><p>Type a name and it is written in a signature font, or upload a photo of a handwritten signature. A signature is stored privately and appears only on quotations it signs.</p></div></div>
    {signatures.length>0?<ul className="qt-signatures">{signatures.map(sign=><li key={sign.id}><img src={sign.image} alt={`Signature of ${sign.name}`}/><div><b>{sign.name}</b><span>{sign.role||'No role given'}</span></div>{confirming===sign.id?<div className="inline-confirm" role="alertdialog" aria-label="Confirm remove signature"><span><b>Remove this signature?</b> Quotations already signed keep it.</span><button type="button" className="button button-dark" autoFocus disabled={busy} onClick={()=>setConfirming('')}>Keep it</button><button type="button" className="button button-light" disabled={busy} onClick={()=>remove(sign)}>Remove</button></div>:<button type="button" className="qt-delete" onClick={()=>setConfirming(sign.id)}><Trash2 size={15}/> Remove</button>}</li>)}</ul>:<p className="qt-tip" role="status"><b>No signature yet.</b> Add one below to be able to issue quotations.</p>}
    <form className="qt-form" noValidate onSubmit={add}><fieldset><legend>Add a signature</legend><div className="qt-grid">
      <label htmlFor="qt-sign-name"><span>Name<i>Required</i></span><input id="qt-sign-name" list="qt-team-names" maxLength={120} value={name} onChange={event=>{setName(event.target.value);const member=team.find(person=>person.name===event.target.value);if(member&&!role)setRole(member.role||'');}}/><datalist id="qt-team-names">{team.map(member=><option key={member.name} value={member.name}/>)}</datalist></label>
      <label htmlFor="qt-sign-role"><span>Role shown under the name<i>Optional</i></span><input id="qt-sign-role" maxLength={120} value={role} placeholder="Co-founder, MV Studio" onChange={event=>setRole(event.target.value)}/></label>
      <div className="qt-choice" role="radiogroup" aria-label="How to make the signature">{[['typed','Write it in a signature font'],['upload','Upload a picture']].map(([value,label])=><label key={value} htmlFor={`qt-sign-mode-${value}`}><input id={`qt-sign-mode-${value}`} type="radio" name="qt-sign-mode" checked={mode===value} onChange={()=>switchMode(value)}/><span>{label}</span></label>)}</div>
      {mode==='typed'
        ?<label htmlFor="qt-sign-text"><span>Signature text<i>Full name or initials</i></span><input id="qt-sign-text" maxLength={60} value={words} placeholder="For example: Vincent Teo, or V. Teo" onChange={event=>{setText(event.target.value);setTextEdited(true);}}/><small>It follows the name above until you change it.</small></label>
        :<label htmlFor="qt-sign-file"><span>Picture of the signature<i>PNG or JPG</i></span><input id="qt-sign-file" ref={file} type="file" accept="image/png,image/jpeg" onChange={choose}/><small>Sign in dark ink on white paper, take a photo, and crop it close.</small></label>}
      <div className="qt-sign-preview" aria-live="polite">{image?<img src={image} alt="Preview of the signature"/>:<span>The signature preview appears here.</span>}</div>
    </div>{error&&<InlineFieldError id="qt-sign-error" message={error}/>}<div className="qt-save"><button className="button button-dark" disabled={busy}><Save size={15}/> {busy?'Saving…':'Save signature'}</button></div></fieldset></form>
  </section>;
}
