import {emailPattern} from './marketing.mjs';
// A display name typed as `Kopi Lane <hello@kopilane.my>` is kept so a separately
// sent email can greet the business by name. Control characters never survive.
const cleanName=value=>String(value||'').replace(/[\u0000-\u001f\u007f"<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,200);
export function parseRecipients(input={}){
 const recipients={},errors={},seen=new Set(),names={};
 for(const field of ['to','cc','bcc']){
  const raw=input[field]||'';
  const entries=Array.isArray(raw)?raw:String(raw).split(/[,;\n]+/);
  recipients[field]=[];
  for(const entry of entries){const value=String(entry).trim();if(!value)continue;
   const named=value.match(/^([^<>\r\n]*)<([^<>]+)>$/);
   const email=(named?.[2]||value).trim().toLowerCase();
   if(!emailPattern.test(email)||email.length>254||/[\r\n]/.test(email)){errors[field]='Enter valid email addresses separated by commas.';continue;}
   if(seen.has(email)){errors[field]='An address appears more than once. Keep it in only one recipient field.';continue;}
   seen.add(email);recipients[field].push(email);
   const name=cleanName(named?.[1]);if(name)names[email]=name;
  }
 }
 if(!recipients.to.length&&!errors.to)errors.to='Add at least one To recipient.';
 const count=Object.values(recipients).reduce((n,list)=>n+list.length,0);
 if(count>200)errors.to='Use up to 200 recipients in total for this pilot.';
 return {recipients,errors,count,names};
}
// The stored envelope. `separate` means one personalised email per To address
// instead of one shared message, so Cc and Bcc have no meaning there.
export function buildEnvelope(input={}){
 const parsed=parseRecipients(input),separate=input.separate===true||input.separate==='true';
 const errors={...parsed.errors};
 if(separate&&(parsed.recipients.cc.length||parsed.recipients.bcc.length)){const message='Separate emails go to each To address only. Remove Cc and Bcc, or send one shared email.';if(parsed.recipients.cc.length)errors.cc=message;if(parsed.recipients.bcc.length)errors.bcc=message;}
 const names=separate?Object.fromEntries(parsed.recipients.to.filter(email=>parsed.names[email]).map(email=>[email,parsed.names[email]])):{};
 return {envelope:{...parsed.recipients,...(separate?{separate:true,names}:{})},errors,count:parsed.count};
}
