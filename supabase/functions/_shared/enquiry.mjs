const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phonePattern = /^[+()\d.\s-]+$/;
export const validateContact = values => {
  const errors = {};
  const name = String(values.name || '').trim();
  const company = String(values.company_name || '').trim();
  const phone = String(values.phone || '').trim();
  const email = String(values.email || '').trim();
  if (!name) errors.name = 'Enter your name.';
  else if (name.length < 2 || name.length > 120 || !/^[\p{L}\p{M}][\p{L}\p{M} .’'\-]*$/u.test(name)) errors.name = 'Use 2–120 letters, spaces, apostrophes, periods, or hyphens.';
  if (!company) errors.company_name = 'Enter your company or business name.';
  else if (company.length < 2 || company.length > 160) errors.company_name = 'Use 2–160 characters.';
  const phoneDigits = phone.replace(/\D/g, '').length;
  if (!phone) errors.phone = 'Enter a contact number.';
  else if (phone.length>40 || !phonePattern.test(phone) || phoneDigits < 7 || phoneDigits > 15) errors.phone = 'Enter a valid number with 7–15 digits.';
  if (!email) errors.email = 'Enter your email address.';
  else if (email.length > 254 || !emailPattern.test(email)) errors.email = 'Enter an email in the format name@example.com.';
  if (String(values.message || '').length > 3000) errors.message = 'Keep your message under 3,000 characters.';
  if (values.preferred_meeting_at) {
    const time = new Date(values.preferred_meeting_at).getTime();
    if (!values.meeting_requested) errors.preferred_meeting_at = 'Select the meeting request option first.';
    else if (!Number.isFinite(time) || time <= Date.now()) errors.preferred_meeting_at = 'Choose a future date and time.';
  }
  return errors;
};

export const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateEnquiryInput(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return {form:'Send a valid enquiry.'};
  const errors=validateContact(input);
  for(const key of ['name','company_name','phone','email','message','website'])if(input[key]!==undefined&&typeof input[key]!=='string')errors[key]='Enter text in this field.';
  if(input.billing_period&&!['monthly','yearly'].includes(input.billing_period))errors.billing_period='Choose monthly or annual billing.';
  if(input.meeting_requested!==undefined&&typeof input.meeting_requested!=='boolean')errors.meeting_requested='Choose whether you would like a meeting.';
  if(input.selected_feature_ids!==undefined&&(!Array.isArray(input.selected_feature_ids)||input.selected_feature_ids.length>30||input.selected_feature_ids.some(id=>typeof id!=='string'||!uuidPattern.test(id))))errors.selected_feature_ids='Choose valid features from the catalogue.';
  if(input.request_id&&!uuidPattern.test(input.request_id))errors.request_id='Refresh the page before submitting again.';
  return errors;
}
export function estimateFeatures(options=[]){
  let once=0,monthly=0,annual=0;const quoted=[];
  for(const item of options){
    if(item.billing_type==='quote'||item.price===null||item.price===''){quoted.push(item.name);continue;}
    const cents=Math.round(Number(item.price)*100),free=Number(item.annual_free_months||0);
    if(!Number.isFinite(cents)||cents<0||!Number.isInteger(free)||free<0||free>11)throw new Error('A selected feature has invalid pricing.');
    if(item.billing_type==='one_time')once+=cents;
    if(item.billing_type==='monthly'){monthly+=cents;annual+=cents*(12-free);}
  }
  return {one_time_estimate:once/100,monthly_estimate:monthly/100,annual_estimate:annual/100,quoted};
}
