import {normalizeContactList} from '../lib/site.js';
import {entityConfig} from './config.js';
import {sitemapPaths} from '../lib/sitemap.mjs';
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phonePattern = /^[+()\d.\s-]+$/;
export function validateContentField(key,value){
  const text=String(value??'').trim(), values=Array.isArray(value)?normalizeContactList(value):text.split('\n').map(item=>item.trim()).filter(Boolean);
  if(key==='sitemap_paths_text')return sitemapPaths(value).errors.length?'Enter one site path per line, starting with /. External URLs, project URLs and admin paths are not allowed.':'';
  if(['hero_title','hero_description','hero_eyebrow','hero_cta','about_title','about_text','seo_title','seo_description'].includes(key)&&!text)return 'This field is required.';
  if(key==='contact_emails'&&Array.isArray(value)){if(value.length>1&&!values.length)return 'Remove extra blank email fields or enter a contact email.';if(values.length&&value.some(item=>!String(item).trim()||!emailPattern.test(String(item).trim())))return 'Enter a valid email address in each contact field.';}
  else if(key==='contact_phones'&&Array.isArray(value)){if(value.length>1&&!values.length)return 'Remove extra blank phone fields or enter a contact number.';if(values.length&&value.some(item=>{const phone=String(item).trim(),digits=phone.replace(/\D/g,'').length;return !phone||!phonePattern.test(phone)||digits<7||digits>15;}))return 'Enter a valid phone number with 7-15 digits in each contact field.';}
  else if(key.includes('email')&&text&&!emailPattern.test(text))return 'Enter a valid email address.';
  else if((key.includes('phone')||key.includes('whatsapp'))&&text&&(!phonePattern.test(text)||text.replace(/\D/g,'').length<7||text.replace(/\D/g,'').length>15))return 'Enter a valid phone number with 7–15 digits.';
  if(key==='seo_title'&&text.length>70)return 'Keep the search title within 70 characters.';
  if(key==='seo_description'&&text.length>160)return 'Keep the search description within 160 characters.';
  if(text.length>3000)return 'Keep this within 3,000 characters.';
  return '';
}

export function validateEntity(values,config){
  const errors={};
  const requiredKey=config.fields.find(([key])=>['name','title'].includes(key))?.[0];
  for(const [key,label,type] of config.fields){
    const value=values[key],text=String(value??'').trim();
    if(key===requiredKey&&!text)errors[key]=`${label} is required.`;
    else if(type==='number'&&text){const number=Number(text);if(!Number.isFinite(number)||number<0)errors[key]='Enter a number of zero or more.';else if(['sort_order','annual_free_months'].includes(key)&&!Number.isInteger(number))errors[key]='Enter a whole number.';else if(key==='annual_free_months'&&number>11)errors[key]='Use a value between 0 and 11.';}
    else if((key==='price'||key==='original_price')&&text&&Number(text)<0)errors[key]='Price cannot be negative.';
    else if(key==='annual_free_months'&&text&&(Number(text)<0||Number(text)>11))errors[key]='Use a value between 0 and 11.';
    else if(['image_url','video_url','demo_url','linkedin_url','github_url','website_url','button_url','project_url'].includes(key)&&text&&!text.startsWith('#')){
      try{const url=new URL(text,'https://mvstudio.invalid');if(!['http:','https:'].includes(url.protocol)||/[\r\n]/.test(text))errors[key]='Use a valid http or https URL.';}
      catch{errors[key]='Enter a valid URL or relative path.';}
    }
    if(type==='lines'&&text.length>3000)errors[key]='Keep this list within 3,000 characters.';
    if(type==='textarea'&&text.length>3000)errors[key]='Keep this within 3,000 characters.';
    if(key==='name'&&text.length>120)errors[key]='Keep the name within 120 characters.';
    if(key==='company_name'&&text.length>160)errors[key]='Keep the company name within 160 characters.';
    if(key==='seo_title'&&text.length>70)errors[key]='Keep the search title within 70 characters.';
    if(key==='seo_description'&&text.length>160)errors[key]='Keep the search description within 160 characters.';
  }
  if(values.starts_at&&values.ends_at&&new Date(values.ends_at)<=new Date(values.starts_at))errors.ends_at='End time must be after the start time.';
  if(config===entityConfig.feature_options){
    if(!['core','third_party','maintenance'].includes(values.category))errors.category='Choose core, third-party, or maintenance.';
    if(!['one_time','monthly','quote'].includes(values.billing_type))errors.billing_type='Choose one-time, monthly, or quote.';
    if(values.billing_type!=='quote'&&(values.price===''||values.price===null||values.price===undefined))errors.price='Enter a price for this billing type.';
  }
  if(config===entityConfig.testimonials){
    if(String(values.name||'').trim().length<2)errors.name='Enter the client’s name.';
    if(String(values.quote||'').trim().length<10||String(values.quote||'').trim().length>2000)errors.quote='Enter a genuine client quote of 10–2,000 characters.';
    if(values.active&&!values.permission_confirmed)errors.permission_confirmed='Confirm permission before publishing.';
  }
  if(config===entityConfig.services&&values.price!==''&&values.price!==null&&Number(values.original_price)&&Number(values.original_price)<Number(values.price))errors.original_price='Original price must be at least the sale price.';
  return errors;
}
