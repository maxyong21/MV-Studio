export const sortRows = (rows=[]) => [...rows].filter(row => row.active !== false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
export const money = (value,currency='RM') => value === null || value === '' || value === undefined ? 'Let’s talk' : `${currency} ${Number(value).toLocaleString('en-MY')}`;
export const normalizeContactList=value=>Array.isArray(value)?value.map(item=>String(item).trim()).filter(Boolean):typeof value==='string'?value.split(/\r?\n/).map(item=>item.trim()).filter(Boolean):[];
export const publicHref=value=>/^(?:https?:\/\/|\/|#)/i.test(value)?value:`/${value}`;
export function localDateTime(value){
  const date=new Date(value);
  return Number.isFinite(date.getTime())?new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16):'';
}
export function normalizeSiteContent(content={}){
  const emails=content.contact_emails??[content.email_max,content.email_vincent].filter(Boolean);
  const phones=content.contact_phones??[content.whatsapp_max,content.whatsapp_vincent].filter(Boolean);
  const clean={...content,contact_emails:normalizeContactList(emails),contact_phones:normalizeContactList(phones)};
  ['email_max','email_vincent','whatsapp_max','whatsapp_vincent'].forEach(key=>delete clean[key]);
  return clean;
}
