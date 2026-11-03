import {whatsappHref} from './site.js';

const singleLine=(value,max)=>String(value||'').replace(/[\r\n\t]+/g,' ').trim().slice(0,max);

export function whatsappEnquiryMessage(values={},features=[]){
  const lines=["Hi MV Studio, I'd like to discuss a website or web app."];
  const contact=[['Name','name',120],['Company','company_name',160],['Phone','phone',40],['Email','email',254]]
    .map(([label,key,max])=>{const value=singleLine(values[key],max);return value?`${label}: ${value}`:'';}).filter(Boolean);
  if(contact.length)lines.push('',...contact);
  const selected=[...new Set(features.slice(0,50).map(feature=>singleLine(feature.name,160)).filter(Boolean))];
  if(selected.length)lines.push('','Interested services:',...selected.map(name=>`- ${name}`));
  if(features.some(feature=>feature.billing_type==='monthly'))lines.push(`Recurring billing preference: ${values.billing_period==='yearly'?'Annual':'Monthly'}`);
  const message=String(values.message||'').trim().slice(0,3000);
  if(message)lines.push('','My enquiry:',message);
  if(values.meeting_requested){
    lines.push('','I would like a short meeting (please confirm availability).');
    const preferred=singleLine(values.preferred_meeting_at,40);
    if(preferred){const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;lines.push(`Preferred meeting: ${preferred.replace('T',' ')} (${zone})`);}
  }
  return lines.join('\n');
}

export function whatsappEnquiryHref(number,values,features){
  const base=whatsappHref(number);
  if(!base)return '';
  const url=new URL(base);
  url.searchParams.set('text',whatsappEnquiryMessage(values,features));
  return url.href;
}
