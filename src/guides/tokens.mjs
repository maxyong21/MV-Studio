// Prices inside article text come from the live site data, so an article never quotes an old price.
// {price:landing|company|ecommerce} is a package's starting price; {fee:hosting|maintenance} is an
// optional monthly plan. If the live data is missing, the built-in defaults (src/content.js) are used.
import {fallbackContent} from '../content.js';
import {pageForService} from '../services/content.mjs';

const packageSlugs={landing:'landing-page',company:'company-website',ecommerce:'ecommerce-website'};
const feeNames={hosting:'Hosting',maintenance:'Website maintenance'};
const perMonth={en:'/month',ms:'/bulan',zh:'/月'};
const seedFees={hosting:30,maintenance:120};
const ringgit=value=>`RM${Number(value).toLocaleString('en-MY')}`;

export function priceFor(key,services=[]){
  const slug=packageSlugs[key];
  const live=services.find(service=>service&&service.active!==false&&pageForService(service)?.slug===slug&&Number(service.price)>0);
  const seed=fallbackContent.services.find(service=>pageForService(service)?.slug===slug);
  const price=live?.price??seed?.price;
  return Number(price)>0?ringgit(price):'';
}
export function feeFor(key,features=[],lang='en'){
  const live=features.find(feature=>feature&&feature.active!==false&&feature.name===feeNames[key]&&Number(feature.price)>0);
  const price=live?Number(live.price):seedFees[key];
  return `${ringgit(price)}${perMonth[lang]||perMonth.en}`;
}
export function fillTokens(text,{services=[],features=[],lang='en'}={}){
  return String(text).replace(/\{(price|fee):([a-z]+)\}/g,(match,kind,key)=>{
    const value=kind==='price'?priceFor(key,services):feeFor(key,features,lang);
    return value||match;
  });
}
export const tokensIn=text=>[...String(text).matchAll(/\{(price|fee):([a-z]+)\}/g)].map(match=>({kind:match[1],key:match[2]}));
export const knownTokens={price:Object.keys(packageSlugs),fee:Object.keys(feeNames)};
