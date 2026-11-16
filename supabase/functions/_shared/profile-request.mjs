// Details a customer sends so the studio can set up their Google Business Profile.
// One set of rules for the form in the browser and the function that saves it, so
// the two can never disagree about what is valid.
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phonePattern=/^[+()\d.\s-]+$/;
const sitePattern=/^(?:https?:\/\/)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?:[/?#]\S*)?$/i;
export const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PROFILE_STATUSES=['new','in_progress','waiting_verification','done','cancelled'];
export const PROFILE_LIMITS={contact_name:120,contact_phone:40,business_name:160,business_category:120,address:500,service_areas:500,business_phone:40,opening_hours:1000,owner_email:254,description:750,services:2000,website_url:300,social_links:500,notes:1500};
export const PROFILE_TEXT_FIELDS=Object.keys(PROFILE_LIMITS);
export const emptyProfileRequest=()=>({...Object.fromEntries(PROFILE_TEXT_FIELDS.map(key=>[key,''])),location_type:'address',authorised:false});

const text=value=>typeof value==='string'?value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim():'';
const phoneError=(value,empty)=>{
  if(!value)return empty;
  const digits=value.replace(/\D/g,'').length;
  return value.length>40||!phonePattern.test(value)||digits<7||digits>15?'Enter a valid number with 7–15 digits.':'';
};

export function validateProfileRequest(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return {form:'Send valid business details.'};
  const errors={},value=Object.fromEntries(PROFILE_TEXT_FIELDS.map(key=>[key,text(input[key])]));
  for(const key of PROFILE_TEXT_FIELDS){
    if(input[key]!==undefined&&input[key]!==null&&typeof input[key]!=='string')errors[key]='Enter text in this field.';
    else if(value[key].length>PROFILE_LIMITS[key])errors[key]=`Keep this within ${PROFILE_LIMITS[key].toLocaleString('en-MY')} characters.`;
  }
  const require=(key,message,min=2)=>{if(errors[key])return;if(!value[key])errors[key]=message;else if(value[key].length<min)errors[key]=`Use at least ${min} characters.`;};
  require('contact_name','Enter your name.');
  if(!errors.contact_phone){const problem=phoneError(value.contact_phone,'Enter a number we can reach you on.');if(problem)errors.contact_phone=problem;}
  require('business_name','Enter the business name shown on your signboard.');
  require('business_category','Enter the type of business, for example tuition centre.');
  if(!['address','service_area'].includes(input.location_type))errors.location_type='Choose whether customers visit you or you travel to them.';
  else if(input.location_type==='address')require('address','Enter the full address with postcode.',10);
  else require('service_areas','List the towns or areas you serve.');
  if(!errors.business_phone){const problem=phoneError(value.business_phone,'Enter the phone number customers should call.');if(problem)errors.business_phone=problem;}
  require('opening_hours','Enter your opening hours for each day.',5);
  if(!errors.owner_email){
    if(!value.owner_email)errors.owner_email='Enter the Google account email that will own the profile.';
    else if(!emailPattern.test(value.owner_email))errors.owner_email='Enter an email in the format name@example.com.';
  }
  if(!errors.website_url&&value.website_url&&!sitePattern.test(value.website_url))errors.website_url='Enter a website address such as example.com.my, or leave this empty.';
  if(input.authorised!==true)errors.authorised='Tick the box to confirm you may share these details.';
  return errors;
}

// Call only after validateProfileRequest returns no errors.
export function normalizeProfileRequest(input){
  const record=Object.fromEntries(PROFILE_TEXT_FIELDS.map(key=>[key,text(input[key])]));
  record.owner_email=record.owner_email.toLowerCase();
  record.location_type=input.location_type;
  // Keep only the answer that matches the chosen location type.
  if(record.location_type==='address')record.service_areas='';else record.address='';
  if(record.website_url&&!/^https?:\/\//i.test(record.website_url))record.website_url=`https://${record.website_url}`;
  return record;
}

// Plain-text summary, used for the studio email and for the WhatsApp fallback.
export function profileRequestSummary(values={}){
  const get=key=>text(values[key]).slice(0,PROFILE_LIMITS[key]);
  const line=(label,key)=>get(key)?`${label}: ${get(key)}`:'';
  const block=(label,key)=>get(key)?`\n${label}:\n${get(key)}`:'';
  return [
    line('Contact name','contact_name'),line('Contact number','contact_phone'),
    line('Business name','business_name'),line('Type of business','business_category'),
    values.location_type==='service_area'?line('Areas served','service_areas'):line('Address','address'),
    line('Business phone','business_phone'),line('Google account email','owner_email'),line('Website','website_url'),
    block('Opening hours','opening_hours'),block('Description','description'),block('Services or products','services'),block('Social media','social_links'),block('Notes','notes'),
  ].filter(Boolean).join('\n');
}
