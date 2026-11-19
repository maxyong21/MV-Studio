import {BILLING,DEPOSIT_PERCENT,PAID_TO,formatDate,formatRange,itemPrice,totals} from './quotation.mjs';
import './quotation.css';

// The quotation as the client reads it, on screen and on paper.
// The same component draws the shared page and the admin preview, so they cannot drift apart.
const Mark=()=><svg className="qd-mark" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#f17951"/><path d="M9 43V21h6l7 11 7-11h6v22h-6V31l-7 10-7-10v12Z" fill="#fffdf8"/><path d="M35 21h7l5 14 5-14h7l-9 22h-6Z" fill="#173c31"/></svg>;
const list=value=>(Array.isArray(value)?value:[]).map(item=>String(item||'').trim()).filter(Boolean);

export default function QuotationDocument({quotation}){
  const items=Array.isArray(quotation.items)?quotation.items:[],sum=totals(items),terms=Array.isArray(quotation.terms)?quotation.terms:[];
  const studio=quotation.studio||{},signer=quotation.signer||{},emails=list(studio.emails),phones=list(studio.phones);
  const totalRows=[['one_time','One-time total',''],['monthly','Monthly total',' / month'],['yearly','Yearly total',' / year']].filter(([key])=>sum[key].count>0);
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

    <section className="qd-section" aria-labelledby="qd-services">
      <h2 id="qd-services">Services and prices</h2>
      <table className="qd-items">
        <thead><tr><th scope="col">Service</th><th scope="col">Billing</th><th scope="col">Paid to</th><th scope="col" className="qd-num">Price</th></tr></thead>
        <tbody>{items.map((item,index)=><tr key={index}>
          <td data-label="Service"><b>{item.name}</b>{item.description&&<span>{item.description}</span>}</td>
          <td data-label="Billing">{BILLING[item.billing]||BILLING.one_time}</td>
          <td data-label="Paid to">{PAID_TO[item.paid_to]||PAID_TO.studio}</td>
          <td data-label="Price" className="qd-num">{itemPrice(item)}</td>
        </tr>)}</tbody>
      </table>
      <dl className="qd-totals">
        {totalRows.map(([key,label,suffix])=><div key={key}><dt>{label}</dt><dd>{formatRange(sum[key].min,sum[key].max)}{suffix}</dd></div>)}
        {sum.deposit.max>0&&<div className="qd-deposit"><dt>Deposit to confirm the project<small>{DEPOSIT_PERCENT}% of MV Studio’s one-time fees</small></dt><dd>{formatRange(sum.deposit.min,sum.deposit.max)}</dd></div>}
      </dl>
      <p className="qd-note">Each billing type is totalled separately. {sum.thirdParty>0?'Lines marked “Third-party provider” are estimates of what the provider charges; they are billed by the provider and can change. ':''}Prices are in Ringgit Malaysia and can be discussed before you accept.</p>
    </section>

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
