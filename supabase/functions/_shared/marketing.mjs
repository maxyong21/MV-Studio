import {marketingLayout} from './marketing-layout.mjs';
export const emailPattern=/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
export const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function safeWebsiteUrl(value){try{const u=new URL(String(value||'').trim());return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function validateSignature(signature){
 const errors={},field=(key,message)=>{errors[`signature.${key}`]=message;};
 if(!signature?.company?.trim())field('company','Enter the company name.');
 if(!safeWebsiteUrl(signature?.portfolio))field('portfolio','Enter a full http:// or https:// studio portfolio URL.');
 if(!safeUrl(signature?.logo_url))field('logo_url','Enter a public HTTPS logo image URL.');
 const members=Array.isArray(signature?.members)?signature.members:[];
 if(!members.some(m=>m.enabled))errors.signature='Select at least one team member to sign this email.';
 if(members.filter(m=>m.enabled).length>10)errors.signature='Select up to 10 signers.';
 members.forEach((m,index)=>{if(!m.enabled)return;const prefix=`members.${index}.`;
  if(!m.name?.trim()||m.name.length>120)field(prefix+'name','Enter a name of up to 120 characters.');
  if(!emailPattern.test(String(m.email||'').trim()))field(prefix+'email','Enter a valid work email address.');
  const phone=String(m.phone||'').trim(),digits=phone.replace(/\D/g,'').length;
  if(!/^\+?[\d\s().-]{7,30}$/.test(phone)||digits<7||digits>15)field(prefix+'phone','Enter a phone number with 7–15 digits.');
  if(!safeWebsiteUrl(m.portfolio))field(prefix+'portfolio','Enter a full http:// or https:// personal portfolio URL.');
 });
 if(Object.keys(errors).length&&!errors.signature)errors.signature='Review the highlighted signature fields below.';
 return errors;
}
export function validateCampaign(c){
 const errors={};for(const [key,max] of [['name',120],['subject',160],['headline',180],['body',8000]])if(typeof c[key]!=='string'||!c[key].trim()||c[key].length>max)errors[key]=`Required; maximum ${max} characters.`;
 Object.assign(errors,validateSignature(c.signature));
 if(c.purpose&& !['introduction','customer_update'].includes(c.purpose))errors.purpose='Choose an email purpose.';
 if(c.purpose==='customer_update'&&(!c.followup_reason?.trim()||c.followup_reason.trim().length<10))errors.followup_reason='Explain the specific reason for this customer update (at least 10 characters).';
 if(/[\r\n]/.test(c.subject||''))errors.subject='Use a single line.';
 if(!safeUrl(c.cta_url))errors.cta_url='Enter a full HTTPS link.';
 if(c.image_link&&!safeUrl(c.image_link))errors.image_link='Enter a full HTTPS link, or leave it empty.';
 if(c.image_url&&(!safeUrl(c.image_url)||!c.image_alt?.trim()))errors.image_url='Use an HTTPS image and describe it with alt text.';
 if((c.images||[]).length>4||(c.images||[]).some(i=>!safeUrl(i.url)||!i.alt?.trim()))errors.images='Use up to four images, each with an HTTPS URL and alt text.';
 for(const key of ['subject','headline','body','preview_text'])if(/{{(?!\s*(first_name|company_name)\s*}})[^}]*}}/.test(c[key]||''))errors[key]='Only {{first_name}} and {{company_name}} are supported.';
 return errors;
}
export function renderMarketing(c,contact={},unsubscribe='https://example.com/unsubscribe'){
 const personalize=value=>String(value||'').replace(/{{\s*first_name\s*}}/g,contact.first_name||'there').replace(/{{\s*company_name\s*}}/g,contact.company_name||'your business');
 const subject=personalize(c.subject).replace(/[\r\n]/g,' '),body=personalize(c.body),headline=personalize(c.headline);
 const images=[...(c.image_url?[{url:c.image_url,alt:c.image_alt}]:[]),...(c.images||[])].filter(i=>safeUrl(i.url));
 const img=images.map(i=>{const image=`<img src="${escape(safeUrl(i.url))}" alt="${escape(i.alt)}" width="600" style="display:block;width:100%;height:auto;margin:20px 0;border-radius:12px;">`;return safeUrl(c.image_link)?`<a href="${escape(safeUrl(c.image_link))}">${image}</a>`:image;}).join('');
 const cta=safeUrl(c.cta_url),link=safeUrl(unsubscribe),signature=c.signature||{},company=signature.company||'MV Studio',members=(signature.members||[]).filter(m=>m.enabled);
 const signatureText=[company,...members.map(m=>`${m.name}\n${m.email||''}\n${m.phone||''}\n${safeWebsiteUrl(m.portfolio)}`),safeWebsiteUrl(signature.portfolio)].join('\n\n');
 const context=c.purpose==='customer_update'?'A relevant update for your business.':'A personal introduction to our web development services.';
 return {subject,text:`${headline}\n\n${body}\n\n${c.cta_label||'Discuss your project'}: ${cta}\n\nKind regards,\n${signatureText}\n\n${context}\nRequest no further outreach: ${link}`,html:marketingLayout({escape,safeUrl,safeWebsiteUrl,url:{cta,unsubscribe:link,portfolio:signature.portfolio},company,members,logoUrl:signature.logo_url,headline,body,images:img,ctaLabel:c.cta_label||'Discuss your project',preview:personalize(c.preview_text),context})};
}
