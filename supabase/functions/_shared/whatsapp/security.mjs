const bytes=new TextEncoder();
export async function signature(secret,text){
  const key=await crypto.subtle.importKey('raw',bytes.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,bytes.encode(text)))].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);return difference===0;}
export function phoneKey(phone){let value=String(phone||'').replace(/\D/g,'');if(value.startsWith('00'))value=value.slice(2);if(value.startsWith('0'))value='60'+value.slice(1);return value;}
export async function handoffReference(enquiry,env,now=Date.now()){
  if(env('WHATSAPP_ENABLED')!=='true'||!env('WHATSAPP_LINK_SECRET'))return {};
  const payload=btoa(JSON.stringify({id:enquiry.id,exp:Math.floor(now/1000)+7*86400})).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  return {whatsapp_reference:`${payload}.${await signature(env('WHATSAPP_LINK_SECRET'),payload)}`};
}
export async function verifyReference(token,env,now=Date.now()){
  const [payload,mac,...extra]=String(token||'').split('.');
  if(!env('WHATSAPP_LINK_SECRET')||extra.length||!payload||!mac||!equal(await signature(env('WHATSAPP_LINK_SECRET'),payload),mac))return null;
  try{const decoded=JSON.parse(atob(payload.replaceAll('-','+').replaceAll('_','/')));return /^[0-9a-f-]{36}$/i.test(decoded.id)&&Number.isFinite(decoded.exp)&&decoded.exp>now/1000?decoded.id:null;}catch{return null;}
}
