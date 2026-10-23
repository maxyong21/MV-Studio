export const promotionDayKey='mv-promotion-seen-day-v1';
export function localDay(date=new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function eligiblePromotion(items,now=Date.now()) {
  return [...(items||[])].filter(item=>item.active&&item.enabled&&
    (!item.starts_at||Date.parse(item.starts_at)<=now)&&
    (!item.ends_at||Date.parse(item.ends_at)>now))
    .sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||String(a.id).localeCompare(String(b.id)))[0];
}
// If storage is unavailable, skip unsolicited advertising rather than repeat it.
export function canShowPromotion(storage,date=new Date()) {
  try{return storage.getItem(promotionDayKey)!==localDay(date);}catch{return false;}
}
export function claimPromotion(storage,date=new Date()) {
  if(!canShowPromotion(storage,date))return false;
  try{storage.setItem(promotionDayKey,localDay(date));return true;}catch{return false;}
}
