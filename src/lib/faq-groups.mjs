import {sortRows} from './site.js';

// Headings are interface text, so the page translates them. Questions and answers are database content.
export const faqGroups=[['costs','Costs & payments'],['process','Process & timing'],['support','Support & changes']];

// Groups only when every published question has a group. A database that has not been
// updated yet, or a question left in "general", keeps the plain single list.
export function groupFaqs(rows){
  const published=sortRows(rows).filter(row=>row.title?.trim()&&row.answer?.trim());
  const grouped=published.length>0&&published.every(row=>faqGroups.some(([key])=>key===row.category));
  if(!grouped)return {published,groups:null};
  return {published,groups:faqGroups.map(([key,label])=>({key,label,items:published.filter(row=>row.category===key)})).filter(group=>group.items.length)};
}
