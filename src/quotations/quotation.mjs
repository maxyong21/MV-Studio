// Rules for a quotation: dates in Malaysia time, price lines, totals and checks.
// No browser or database code lives here, so the admin, the shared page and the tests all use the same rules.
// See docs/QUOTATIONS.md.

export const VALID_DAYS=7;
export const DEPOSIT_PERCENT=50;
export const MAX_ITEMS=40;
export const LIMITS={client_name:120,company_name:160,client_email:254,client_phone:40,extra_requirements:3000,item_name:160,item_description:600};
export const BILLING={one_time:'One-time',monthly:'Monthly',yearly:'Yearly'};
export const BILLING_SUFFIX={one_time:'',monthly:' / month',yearly:' / year'};
export const PAID_TO={studio:'MV Studio',third_party:'Third-party provider'};
export const STATUSES=['draft','shared','accepted','declined','revoked'];
export const STATUS_LABEL={draft:'Draft',shared:'Shared',accepted:'Accepted',declined:'Declined',revoked:'Link revoked',expired:'Expired'};

const pad=value=>String(value).padStart(2,'0');
const isDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`));

// Today's date in Malaysia (GMT+8, no daylight saving), whatever the device's own clock zone is.
export function malaysiaToday(now=new Date()){
  const local=new Date(now.getTime()+8*3600*1000);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth()+1)}-${pad(local.getUTCDate())}`;
}
export function addDays(date,days){
  const next=new Date(`${date}T00:00:00Z`);next.setUTCDate(next.getUTCDate()+days);
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth()+1)}-${pad(next.getUTCDate())}`;
}
export const daysBetween=(from,to)=>Math.round((Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`))/86400000);
export const defaultValidUntil=issued=>addDays(issued,VALID_DAYS);
// A quotation is good for the whole of its valid-until day in Malaysia, and expired from the next day.
export const isExpired=(validUntil,now=new Date())=>isDate(validUntil)&&malaysiaToday(now)>validUntil;
export function formatDate(date){
  if(!isDate(date))return '';
  const [year,month,day]=date.split('-').map(Number);
  return `${day} ${['January','February','March','April','May','June','July','August','September','October','November','December'][month-1]} ${year}`;
}
// What the admin and the client see: a shared quotation past its date reads as expired.
export const displayStatus=(row,now=new Date())=>row.status==='shared'&&isExpired(row.valid_until,now)?'expired':row.status;

const amount=value=>{if(value===''||value===null||value===undefined)return null;const number=Number(value);return Number.isFinite(number)?Math.round(number*100)/100:NaN;};
export const formatMoney=value=>`RM ${Number(value).toLocaleString('en-MY',{minimumFractionDigits:Number.isInteger(Number(value))?0:2,maximumFractionDigits:2})}`;
export const formatRange=(min,max)=>max!==null&&max!==undefined&&Number(max)!==Number(min)?`${formatMoney(min)} to ${formatMoney(max)}`:formatMoney(min);

export const emptyItem=()=>({name:'',description:'',billing:'one_time',paid_to:'studio',min:'',max:''});
// Stored shape of one price line. max is null for a single price, or the top of a range.
export function cleanItem(item={}){
  const min=amount(item.min),max=amount(item.max);
  return {name:String(item.name||'').trim().slice(0,LIMITS.item_name),description:String(item.description||'').trim().slice(0,LIMITS.item_description),billing:Object.hasOwn(BILLING,item.billing)?item.billing:'one_time',paid_to:item.paid_to==='third_party'?'third_party':'studio',min:min??0,max:max===null||max===min?null:max};
}
export const itemPrice=item=>`${Number(item.min)===0&&(item.max===null||item.max===undefined)?'Included':formatRange(item.min,item.max)}${Number(item.min)===0&&(item.max===null||item.max===undefined)?'':BILLING_SUFFIX[item.billing]||''}`;

// Each billing type is totalled separately: a monthly fee is never added to a one-time fee.
export function totals(items=[]){
  const sum={one_time:{min:0,max:0,count:0},monthly:{min:0,max:0,count:0},yearly:{min:0,max:0,count:0}};
  let thirdParty=0;
  for(const raw of items){
    const item=cleanItem(raw),bucket=sum[item.billing];
    if(!Number.isFinite(item.min)||(item.max!==null&&!Number.isFinite(item.max)))continue;
    bucket.min+=item.min;bucket.max+=item.max??item.min;bucket.count++;
    if(item.paid_to==='third_party')thirdParty++;
  }
  for(const bucket of Object.values(sum)){bucket.min=Math.round(bucket.min*100)/100;bucket.max=Math.round(bucket.max*100)/100;}
  // The deposit is worked out on MV Studio's own one-time fees only; providers are paid separately.
  const studio=items.map(cleanItem).filter(item=>item.billing==='one_time'&&item.paid_to==='studio'&&Number.isFinite(item.min)&&(item.max===null||Number.isFinite(item.max)));
  const studioMin=studio.reduce((total,item)=>total+item.min,0),studioMax=studio.reduce((total,item)=>total+(item.max??item.min),0);
  const half=value=>Math.round(value*DEPOSIT_PERCENT)/100;
  return {...sum,thirdParty,deposit:{min:half(studioMin),max:half(studioMax)}};
}

// The price list the admin picks from: packages first, then every enquiry feature.
// A feature with no price in the database starts empty, so the admin has to type one.
// The database sends a price as text such as "989.00"; the form shows it as the number 989.
const listPrice=value=>value===null||value===undefined||value===''||!Number.isFinite(Number(value))?'':Number(value);
export function catalogueOptions(services=[],features=[]){
  const sorted=rows=>[...rows].filter(row=>row&&row.active!==false&&row.name).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  return [
    ...sorted(services).map(row=>({key:`service:${row.id}`,group:'Packages',label:row.name,item:{name:row.name,description:String(row.summary||'').slice(0,LIMITS.item_description),billing:'one_time',paid_to:'studio',min:listPrice(row.price),max:''}})),
    ...sorted(features).map(row=>({key:`feature:${row.id}`,group:row.category==='third_party'?'Domain, hosting and other providers':row.category==='maintenance'?'Maintenance':'Features',label:row.name,item:{name:row.name,description:String(row.description||'').slice(0,LIMITS.item_description),billing:row.billing_type==='monthly'?'monthly':'one_time',paid_to:row.category==='third_party'?'third_party':'studio',min:row.billing_type==='quote'?'':listPrice(row.price),max:''}})),
  ];
}
// Price lines for a quotation started from an enquiry: the features the customer picked.
export const itemsFromEnquiry=(selected=[])=>(Array.isArray(selected)?selected:[]).filter(feature=>feature?.name).slice(0,MAX_ITEMS).map(feature=>({name:String(feature.name),description:String(feature.description||'').slice(0,LIMITS.item_description),billing:feature.billing_type==='monthly'?'monthly':'one_time',paid_to:feature.category==='third_party'?'third_party':'studio',min:feature.billing_type==='quote'?'':listPrice(feature.unit_price),max:''}));

const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Returns {field: message}. Item problems are keyed "item-<index>-<field>".
export function validateQuotation(values={},today=malaysiaToday()){
  const errors={},name=String(values.client_name||'').trim(),email=String(values.client_email||'').trim(),phone=String(values.client_phone||'').trim();
  if(name.length<2)errors.client_name='Enter the client’s name.';
  if(email&&!emailPattern.test(email))errors.client_email='Enter a valid email address, or leave it empty.';
  if(phone){const digits=phone.replace(/\D/g,'').length;if(!/^[+()\d.\s-]+$/.test(phone)||digits<7||digits>15)errors.client_phone='Enter a valid phone number with 7 to 15 digits, or leave it empty.';}
  if(!isDate(values.valid_until))errors.valid_until='Choose the last day this quotation is valid.';
  else if(values.valid_until<today)errors.valid_until='The valid-until date has already passed. Choose today or a later day.';
  else if(isDate(values.issued_on)&&daysBetween(values.issued_on,values.valid_until)>90)errors.valid_until='A quotation can be valid for 90 days at most.';
  const items=Array.isArray(values.items)?values.items:[];
  if(!items.length)errors.items='Add at least one service or charge.';
  if(items.length>MAX_ITEMS)errors.items=`A quotation can have ${MAX_ITEMS} lines at most.`;
  items.forEach((item,index)=>{
    const min=amount(item.min),max=amount(item.max);
    if(!String(item.name||'').trim())errors[`item-${index}-name`]='Name this line.';
    if(min===null)errors[`item-${index}-min`]='Enter a price. Use 0 for an included item.';
    else if(Number.isNaN(min)||min<0||min>9999999)errors[`item-${index}-min`]='Enter a price of 0 or more.';
    if(max!==null&&(Number.isNaN(max)||max>9999999))errors[`item-${index}-max`]='Enter the top of the range, or leave it empty.';
    else if(max!==null&&Number.isFinite(min)&&max<min)errors[`item-${index}-max`]='The top of the range must be more than the first price.';
  });
  if(!values.signature_id)errors.signature_id='Choose who signs this quotation.';
  return errors;
}

// The secret part of a share link: 32 random bytes, safe to put in a web address.
export function newShareToken(random=globalThis.crypto){
  const bytes=random.getRandomValues(new Uint8Array(32));
  let text='';for(const byte of bytes)text+=String.fromCharCode(byte);
  return btoa(text).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
// The token sits after "#", which browsers never send to a server, so it stays out of hosting logs and analytics.
export const shareUrl=(origin,token)=>`${String(origin).replace(/\/$/,'')}/quotation#${token}`;
export const tokenFromHash=hash=>{const token=String(hash||'').replace(/^#/,'');return /^[A-Za-z0-9_-]{32,128}$/.test(token)?token:'';};
