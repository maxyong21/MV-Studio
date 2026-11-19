// Rules for a quotation: dates in Malaysia time, price lines, totals, requirement tables and checks.
// No browser or database code lives here, so the admin, the shared page and the tests all use the same rules.
// See docs/QUOTATIONS.md.

export const VALID_DAYS=7;
export const DEPOSIT_PERCENT=50;
export const MAX_ITEMS=40;
export const MAX_TABLES=12;
export const MAX_ROWS=40;
export const MAX_EXCLUDED=12;
export const LIMITS={client_name:120,company_name:160,client_email:254,client_phone:40,extra_requirements:3000,item_name:160,item_description:600,table_name:120,prefix:6,requirement_name:160,requirement_description:600,excluded:200};
export const BILLING={one_time:'One-time',monthly:'Monthly',yearly:'Yearly'};
export const BILLING_SUFFIX={one_time:'',monthly:' / month',yearly:' / year'};
// The three parts of the price. Only "third_party" is money that goes to someone other than MV Studio.
export const GROUPS={
  studio:{title:'MV Studio services',note:'Design and development by MV Studio.'},
  maintenance:{title:'Maintenance',note:'Ongoing care after launch, paid to MV Studio. Optional.'},
  third_party:{title:'Third-party charges',note:'Paid to the provider, not to MV Studio. These are estimates of the provider’s price and can change.'},
};
export const GROUP_KEYS=Object.keys(GROUPS);
export const REQUIREMENT_STATUS={included:'Included',extra:'Extra cost',tbc:'To be confirmed'};
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

// A quotation saved before the three parts existed only says who is paid; that still decides its part.
const groupOf=item=>GROUP_KEYS.includes(item?.group)?item.group:item?.paid_to==='third_party'?'third_party':'studio';
export const emptyItem=(group='studio')=>({name:'',description:'',billing:group==='maintenance'?'monthly':'one_time',group,min:'',max:''});
// Stored shape of one price line. max is null for a single price, or the top of a range.
export function cleanItem(item={}){
  const min=amount(item.min),max=amount(item.max),group=groupOf(item);
  return {name:String(item.name||'').trim().slice(0,LIMITS.item_name),description:String(item.description||'').trim().slice(0,LIMITS.item_description),billing:Object.hasOwn(BILLING,item.billing)?item.billing:'one_time',group,paid_to:group==='third_party'?'third_party':'studio',min:min??0,max:max===null||max===min?null:max};
}
export const itemPrice=item=>`${Number(item.min)===0&&(item.max===null||item.max===undefined)?'Included':formatRange(item.min,item.max)}${Number(item.min)===0&&(item.max===null||item.max===undefined)?'':BILLING_SUFFIX[item.billing]||''}`;

// Each part and each billing type is totalled separately: a monthly fee is never added to a one-time fee,
// and a provider's charge is never added to MV Studio's.
export function totals(items=[]){
  const groups=Object.fromEntries(GROUP_KEYS.map(group=>[group,{count:0,one_time:{min:0,max:0,count:0},monthly:{min:0,max:0,count:0},yearly:{min:0,max:0,count:0}}]));
  for(const raw of items){
    const item=cleanItem(raw);
    if(!Number.isFinite(item.min)||(item.max!==null&&!Number.isFinite(item.max)))continue;
    const bucket=groups[item.group][item.billing];
    bucket.min+=item.min;bucket.max+=item.max??item.min;bucket.count++;groups[item.group].count++;
  }
  for(const group of Object.values(groups))for(const key of Object.keys(BILLING)){group[key].min=Math.round(group[key].min*100)/100;group[key].max=Math.round(group[key].max*100)/100;}
  // The deposit is worked out on MV Studio's one-time service fees only.
  const half=value=>Math.round(value*DEPOSIT_PERCENT)/100;
  return {groups,deposit:{min:half(groups.studio.one_time.min),max:half(groups.studio.one_time.max)}};
}
// The subtotal lines of one part, for example ["RM 1,200 to RM 1,500", "RM 150 / month"].
export const subtotalLines=group=>Object.keys(BILLING).filter(key=>group[key].count).map(key=>[BILLING[key],`${formatRange(group[key].min,group[key].max)}${BILLING_SUFFIX[key]}`]);

// The database sends a price as text such as "989.00"; the form shows it as the number 989.
const listPrice=value=>value===null||value===undefined||value===''||!Number.isFinite(Number(value))?'':Number(value);
// The price list the admin picks from, by part. Packages and features are added from a list;
// maintenance and third-party services are ticked. A feature with no price in the database starts
// empty, so the admin has to type one.
export function catalogueOptions(services=[],features=[]){
  const sorted=rows=>[...rows].filter(row=>row&&row.active!==false&&row.name).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const feature=(row,group)=>({key:`feature:${row.id}`,group,section:'Features',label:row.name,item:{name:row.name,description:String(row.description||'').slice(0,LIMITS.item_description),billing:row.billing_type==='monthly'?'monthly':'one_time',group,min:row.billing_type==='quote'?'':listPrice(row.price),max:''}});
  const rows=sorted(features);
  return {
    studio:[...sorted(services).map(row=>({key:`service:${row.id}`,group:'studio',section:'Packages',label:row.name,item:{name:row.name,description:String(row.summary||'').slice(0,LIMITS.item_description),billing:'one_time',group:'studio',min:listPrice(row.price),max:''}})),...rows.filter(row=>!['third_party','maintenance'].includes(row.category)).map(row=>feature(row,'studio'))],
    maintenance:rows.filter(row=>row.category==='maintenance').map(row=>feature(row,'maintenance')),
    third_party:rows.filter(row=>row.category==='third_party').map(row=>feature(row,'third_party')),
  };
}
// Price lines for a quotation started from an enquiry: the features the customer picked.
export const itemsFromEnquiry=(selected=[])=>(Array.isArray(selected)?selected:[]).filter(feature=>feature?.name).slice(0,MAX_ITEMS).map(feature=>({name:String(feature.name),description:String(feature.description||'').slice(0,LIMITS.item_description),billing:feature.billing_type==='monthly'?'monthly':'one_time',group:['third_party','maintenance'].includes(feature.category)?feature.category:'studio',min:feature.billing_type==='quote'?'':listPrice(feature.unit_price),max:''}));

// ---- Requirement tables: one per portal or role, each row with its own ID.
export const emptyRequirementRow=()=>({name:'',description:'',status:'included'});
export const emptyRequirementTable=()=>({name:'',prefix:'',prefixEdited:false,rows:[emptyRequirementRow()],excluded:''});
// "Customer portal" gives CP, "Admin" gives ADM, and an unnamed table gives REQ.
export function requirementPrefix(name){
  const words=String(name||'').toUpperCase().match(/[A-Z0-9]+/g)||[];
  if(!words.length)return 'REQ';
  return (words.length===1?words[0].slice(0,3):words.map(word=>word[0]).join('')).slice(0,LIMITS.prefix);
}
export const tablePrefix=table=>{const typed=String(table?.prefix||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,LIMITS.prefix);return table?.prefixEdited&&typed?typed:requirementPrefix(table?.name);};
export const requirementId=(prefix,index)=>`${prefix}-${pad(index+1)}`;
const excludedLines=value=>(Array.isArray(value)?value:String(value||'').split(/\r?\n/)).map(line=>String(line).trim().slice(0,LIMITS.excluded)).filter(Boolean).slice(0,MAX_EXCLUDED);
const rowUsed=row=>Boolean(String(row?.name||'').trim()||String(row?.description||'').trim());
const tableUsed=table=>Boolean(String(table?.name||'').trim()||(table?.rows||[]).some(rowUsed)||excludedLines(table?.excluded).length);
// Stored shape: empty rows and empty tables are left out, and every row is given its ID.
export function cleanRequirements(tables=[]){
  return (Array.isArray(tables)?tables:[]).filter(tableUsed).slice(0,MAX_TABLES).map(table=>{
    const prefix=tablePrefix(table);
    return {name:String(table.name||'').trim().slice(0,LIMITS.table_name),prefix,rows:(table.rows||[]).filter(rowUsed).slice(0,MAX_ROWS).map((row,index)=>({id:requirementId(prefix,index),name:String(row.name||'').trim().slice(0,LIMITS.requirement_name),description:String(row.description||'').trim().slice(0,LIMITS.requirement_description),status:Object.hasOwn(REQUIREMENT_STATUS,row.status)?row.status:'included'})),excluded:excludedLines(table.excluded)};
  });
}
// A saved table opened for editing again.
export const editableRequirements=(saved=[])=>{const tables=(Array.isArray(saved)?saved:[]).map(table=>({name:table.name||'',prefix:table.prefix||'',prefixEdited:Boolean(table.prefix)&&table.prefix!==requirementPrefix(table.name),rows:(table.rows||[]).length?table.rows.map(row=>({name:row.name||'',description:row.description||'',status:Object.hasOwn(REQUIREMENT_STATUS,row.status)?row.status:'included'})):[emptyRequirementRow()],excluded:excludedLines(table.excluded).join('\n')}));return tables.length?tables:[emptyRequirementTable()];};

const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Returns {field: message}. Price line problems are keyed "item-<index>-<field>",
// requirement problems "req-<table>-<field>" and "req-<table>-<row>-name".
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
  if(items.length>MAX_ITEMS)errors.items=`A quotation can have ${MAX_ITEMS} price lines at most.`;
  items.forEach((item,index)=>{
    const min=amount(item.min),max=amount(item.max);
    if(!String(item.name||'').trim())errors[`item-${index}-name`]='Name this line.';
    if(min===null)errors[`item-${index}-min`]='Enter a price. Use 0 for an included item.';
    else if(Number.isNaN(min)||min<0||min>9999999)errors[`item-${index}-min`]='Enter a price of 0 or more.';
    if(max!==null&&(Number.isNaN(max)||max>9999999))errors[`item-${index}-max`]='Enter the top of the range, or leave it empty.';
    else if(max!==null&&Number.isFinite(min)&&max<min)errors[`item-${index}-max`]='The top of the range must be more than the first price.';
  });
  const tables=Array.isArray(values.requirements)?values.requirements:[],seen=new Map();
  if(tables.length>MAX_TABLES)errors.requirements=`A quotation can have ${MAX_TABLES} requirement tables at most.`;
  tables.forEach((table,index)=>{
    if(!tableUsed(table))return;
    if(!String(table.name||'').trim())errors[`req-${index}-name`]='Name this table, for example “Customer portal”.';
    if((table.rows||[]).length>MAX_ROWS)errors[`req-${index}-name`]=`A table can have ${MAX_ROWS} rows at most.`;
    const prefix=tablePrefix(table);
    if(seen.has(prefix))errors[`req-${index}-prefix`]=`“${prefix}” is already used by another table. Change one, so every requirement ID is different.`;
    else seen.set(prefix,index);
    (table.rows||[]).forEach((row,rowIndex)=>{if(rowUsed(row)&&!String(row.name||'').trim())errors[`req-${index}-${rowIndex}-name`]='Name this requirement.';});
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
