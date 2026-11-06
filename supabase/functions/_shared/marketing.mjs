export const emailPattern=/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
export const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function validateCampaign(c){
 const errors={};for(const [key,max] of [['name',120],['subject',160],['headline',180],['body',8000],['sender_identity',500]])if(typeof c[key]!=='string'||!c[key].trim()||c[key].length>max)errors[key]=`Required; maximum ${max} characters.`;
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
 const cta=safeUrl(c.cta_url),link=safeUrl(unsubscribe);
 return {subject,text:`${headline}\n\n${body}\n\n${c.cta_label||'Discuss your project'}: ${cta}\n\n${c.sender_identity}\nUnsubscribe: ${link}`,html:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head><body style="margin:0;background:#f3f4ef;color:#243b30;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escape(personalize(c.preview_text))}</div><table role="presentation" width="100%"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" style="max-width:600px;background:white;border-radius:16px"><tr><td style="padding:32px"><p style="font-size:14px;letter-spacing:2px">MV STUDIO</p><h1 style="font-size:28px;line-height:1.25">${escape(headline)}</h1><div style="font-size:16px;line-height:1.8">${escape(body).replace(/\n/g,'<br>')}</div>${img}<p style="margin:28px 0"><a href="${escape(cta)}" style="background:#254d3e;color:white;padding:14px 22px;display:inline-block;border-radius:24px;text-decoration:none">${escape(c.cta_label||'Discuss your project')}</a></p><hr style="border:0;border-top:1px solid #ddd"><p style="font-size:12px;line-height:1.7">${escape(c.sender_identity)}<br>You received this because you agreed to receive our marketing updates.<br><a href="${escape(link)}">Unsubscribe from marketing emails</a></p></td></tr></table></td></tr></table></body></html>`};
}
