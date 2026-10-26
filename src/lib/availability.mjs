export const emptyPublicContent=()=>({site_content:null,services:[],projects:[],team_members:[],promotions:[],feature_options:[],testimonials:[],faqs:[]});
export function hasPublicContent(data){
  if(!data||typeof data!=='object')return false;
  const content=data.site_content?.content;
  if(content&&typeof content==='object'&&Object.values(content).some(value=>typeof value==='string'?value.trim():Array.isArray(value)&&value.length))return true;
  return ['services','projects','team_members','promotions','feature_options','testimonials','faqs'].some(key=>Array.isArray(data[key])&&data[key].some(row=>row&&row.active!==false));
}
const storageKey='mv-public-diagnostics';
export function readDiagnostics(){try{const rows=JSON.parse(sessionStorage.getItem(storageKey)||'[]');return Array.isArray(rows)?rows.filter(row=>row&&typeof row.target==='string'&&typeof row.detail==='string'):[];}catch{return [];}}
export function recordDiagnostic(target,error){
  if(typeof window==='undefined')return;
  const detail=String(error?.diagnostic||error?.message||error||'Unexpected response').slice(0,1800).replace(/Bearer\s+\S+/gi,'Bearer [removed]').replace(/\b(?:sb_secret_|re_)[A-Za-z0-9_-]+/g,'[key removed]');
  const entry={target,time:new Date().toISOString(),status:error?.status||null,detail};
  try{sessionStorage.setItem(storageKey,JSON.stringify([entry,...readDiagnostics().filter(row=>row.target!==target)].slice(0,20)));window.dispatchEvent(new Event('mv-diagnostics'));}catch{}
}
export function clearDiagnostics(target){try{sessionStorage.setItem(storageKey,JSON.stringify(target?readDiagnostics().filter(row=>row.target!==target):[]));window.dispatchEvent(new Event('mv-diagnostics'));}catch{}}
export class PublicServiceError extends Error{
  constructor(kind,status,diagnostic,fields){super(kind==='coming-soon'?'Coming soon':kind==='review'?'Please review your details and try again.':kind==='refresh'?'Please review your scope and generate a fresh estimate.':kind==='limit'?'Please wait a little while before trying again.':'Under maintenance');this.kind=kind;this.status=status;this.diagnostic=diagnostic;this.fields=fields;}
}
export function publicFailure(error){
  if(error instanceof PublicServiceError)return error;
  return new PublicServiceError('maintenance',error?.status||0,'The request could not be completed.');
}
