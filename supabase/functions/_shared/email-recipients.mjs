import {emailPattern} from './marketing.mjs';
export function parseRecipients(input={}){
 const recipients={},errors={},seen=new Set();
 for(const field of ['to','cc','bcc']){
  const raw=input[field]||'';
  const entries=Array.isArray(raw)?raw:String(raw).split(/[,;\n]+/);
  recipients[field]=[];
  for(const entry of entries){const value=String(entry).trim();if(!value)continue;
   const email=(value.match(/^[^<>\r\n]*<([^<>]+)>$/)?.[1]||value).trim().toLowerCase();
   if(!emailPattern.test(email)||email.length>254||/[\r\n]/.test(email)){errors[field]='Enter valid email addresses separated by commas.';continue;}
   if(seen.has(email)){errors[field]='An address appears more than once. Keep it in only one recipient field.';continue;}
   seen.add(email);recipients[field].push(email);
  }
 }
 if(!recipients.to.length&&!errors.to)errors.to='Add at least one To recipient.';
 const count=Object.values(recipients).reduce((n,list)=>n+list.length,0);
 if(count>200)errors.to='Use up to 200 recipients in total for this pilot.';
 return {recipients,errors,count};
}
