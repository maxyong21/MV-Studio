import {BILLING,DEPOSIT_PERCENT,GROUPS,GROUP_KEYS,REQUIREMENT_STATUS,cleanItem,formatDate,formatRange,itemPrice,subtotalLines,totals} from './quotation.mjs';
import './quotation.css';

// The quotation as the client reads it, on screen and on paper.
// The same component draws the shared page and the admin preview, so they cannot drift apart.
const Mark=()=><svg className="qd-mark" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#f17951"/><path d="M9 43V21h6l7 11 7-11h6v22h-6V31l-7 10-7-10v12Z" fill="#fffdf8"/><path d="M35 21h7l5 14 5-14h7l-9 22h-6Z" fill="#173c31"/></svg>;
const list=value=>(Array.isArray(value)?value:[]).map(item=>String(item||'').trim()).filter(Boolean);

export default function QuotationDocument({quotation}){
  const items=(Array.isArray(quotation.items)?quotation.items:[]).map(cleanItem),sum=totals(items),terms=Array.isArray(quotation.terms)?quotation.terms:[];
  const tables=(Array.isArray(quotation.requirements)?quotation.requirements:[]).filter(table=>table&&((table.rows||[]).length||(table.excluded||[]).length));
  const studio=quotation.studio||{},signer=quotation.signer||{},emails=list(studio.emails),phones=list(studio.phones);
  return <article className="qd-sheet" aria-labelledby="qd-title">
    <header className="qd-head">
      <div className="qd-brand"><Mark/><div><b>MV Studio</b><span>Web design and development, Malaysia</span></div></div>
      <div className="qd-title"><h1 id="qd-title">Quotation</h1><span>{quotation.quote_number||'Draft'}</span></div>
    </header>

    <dl className="qd-meta">
      <div><dt>Quotation ID</dt><dd>{quotation.quote_number||'Given when saved'}</dd></div>
      <div><dt>Date issued</dt><dd>{formatDate(quotation.issued_on)}</dd></div>
      <div><dt>Valid until</dt><dd>{formatDate(quotation.valid_until)}<small>End of day, Malaysia time (GMT+8)</small></dd></div>
    </dl>

    <section className="qd-parties" aria-label="Client and studio">
      <div><h2>Prepared for</h2><p className="qd-name">{quotation.client_name}</p>{quotation.company_name&&<p>{quotation.company_name}</p>}{quotation.client_email&&<p>{quotation.client_email}</p>}{quotation.client_phone&&<p>{quotation.client_phone}</p>}</div>
      <div><h2>From</h2><p className="qd-name">MV Studio</p><p>{studio.owners||'Max Yong & Vincent Teo'}</p>{emails.map(email=><p key={email}>{email}</p>)}{phones.map(phone=><p key={phone}>{phone}</p>)}{studio.website&&<p>{studio.website}</p>}</div>
    </section>

    {/* One block per part of the price, so it is always clear who is paid and what repeats. */}
    {GROUP_KEYS.filter(group=>sum.groups[group].count>0).map(group=>{
      const lines=items.filter(item=>item.group===group),subtotals=subtotalLines(sum.groups[group]);
      return <section className={`qd-section qd-group qd-group-${group}`} key={group} aria-labelledby={`qd-group-${group}`}>
        <h2 id={`qd-group-${group}`}>{GROUPS[group].title}</h2>
        <p className="qd-group-note">{GROUPS[group].note}</p>
        <table className="qd-items">
          <thead><tr><th scope="col">{group==='third_party'?'Service and provider':'Service'}</th><th scope="col">Billing</th><th scope="col" className="qd-num">{group==='third_party'?'Estimated price':'Price'}</th></tr></thead>
          <tbody>{lines.map((item,index)=><tr key={index}>
            <td data-label="Service"><b>{item.name}</b>{item.description&&<span>{item.description}</span>}</td>
            <td data-label="Billing">{BILLING[item.billing]||BILLING.one_time}</td>
            <td data-label={group==='third_party'?'Estimated price':'Price'} className="qd-num">{itemPrice(item)}</td>
          </tr>)}</tbody>
        </table>
        <dl className="qd-totals">
          {subtotals.map(([label,value])=><div key={label}><dt>{label} subtotal</dt><dd>{value}</dd></div>)}
          {group==='studio'&&sum.deposit.max>0&&<div className="qd-deposit"><dt>Deposit to confirm the project<small>{DEPOSIT_PERCENT}% of the one-time subtotal above</small></dt><dd>{formatRange(sum.deposit.min,sum.deposit.max)}</dd></div>}
        </dl>
      </section>;
    })}
    <p className="qd-note">Each part and each billing type is totalled separately. Prices are in Ringgit Malaysia and can be discussed before you accept.</p>

    {tables.length>0&&<section className="qd-section qd-requirements" aria-labelledby="qd-requirements">
      <h2 id="qd-requirements">Requirements</h2>
      <p className="qd-group-note">What the services above will do. Anything that is not listed here or in the prices above is not included.</p>
      {tables.map((table,index)=><div className="qd-requirement-table" key={index}>
        <h3>{table.name}</h3>
        {(table.rows||[]).length>0&&<table className="qd-items qd-reqs">
          <thead><tr><th scope="col">ID</th><th scope="col">Requirement</th><th scope="col">Description</th><th scope="col">Included?</th></tr></thead>
          <tbody>{table.rows.map(row=><tr key={row.id}>
            <td data-label="ID" className="qd-req-id">{row.id}</td>
            <td data-label="Requirement"><b>{row.name}</b></td>
            <td data-label="Description">{row.description}</td>
            <td data-label="Included?"><span className={`qd-status qd-status-${row.status}`}>{REQUIREMENT_STATUS[row.status]||REQUIREMENT_STATUS.included}</span></td>
          </tr>)}</tbody>
        </table>}
        {(table.excluded||[]).length>0&&<div className="qd-excluded"><h4>Not included</h4><ul>{table.excluded.map((line,lineIndex)=><li key={lineIndex}>{line}</li>)}</ul></div>}
      </div>)}
    </section>}

    {quotation.extra_requirements&&<section className="qd-section" aria-labelledby="qd-extra"><h2 id="qd-extra">Additional requirements</h2><p className="qd-pre">{quotation.extra_requirements}</p></section>}

    <section className="qd-section qd-terms" aria-labelledby="qd-terms">
      <h2 id="qd-terms">Terms and conditions</h2>
      {terms.map(section=><div className="qd-term" key={section.id||section.title}><h3>{section.title}</h3>{(section.paragraphs||[]).map((text,index)=><p key={index}>{text}</p>)}{section.bullets?.length>0&&<ul>{section.bullets.map((text,index)=><li key={index}>{text}</li>)}</ul>}</div>)}
    </section>

    <section className="qd-sign" aria-labelledby="qd-sign">
      <div className="qd-accept"><h2 id="qd-sign">How to accept</h2><p>Reply to us by WhatsApp or email on or before <b>{formatDate(quotation.valid_until)}</b>, quoting <b>{quotation.quote_number||'the quotation ID'}</b>. The project is confirmed when we receive the deposit.</p></div>
      <div className="qd-signature"><span>Issued and authorised for MV Studio by</span>{signer.image?<img src={signer.image} alt={`Signature of ${signer.name||'the studio'}`}/>:<div className="qd-signature-empty">No signature chosen</div>}<b>{signer.name}</b>{signer.role&&<small>{signer.role}</small>}<small>{formatDate(quotation.issued_on)}</small></div>
    </section>

    <footer className="qd-foot"><span>{quotation.quote_number||'Draft quotation'} · MV Studio</span>{quotation.terms_version&&<span>Terms version {quotation.terms_version}</span>}</footer>
  </article>;
}
