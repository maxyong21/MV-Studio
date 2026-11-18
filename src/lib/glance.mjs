// The facts in the "At a glance" strip under the home page hero. Price and delivery time come from the live
// packages (the cheapest package that has a price), so they cannot drift from the package cards. The payment
// and first-call wording matches docs/BUSINESS_TERMS.md; a test fails if that document stops saying so.
// If packages have not loaded, or none has a price, those two facts are left out instead of showing a guess.
export function glanceFacts(services,t,money){
  const priced=(Array.isArray(services)?services:[])
    .filter(service=>service&&Number(service.price)>0)
    .sort((a,b)=>Number(a.price)-Number(b.price))[0];
  const timeline=String(priced?.timeline||'').trim();
  return [
    priced&&{key:'price',label:t('Starting price'),value:`${t('From')} ${money(priced.price,priced.currency)}`,note:t(priced.name)},
    timeline&&{key:'delivery',label:t('Delivery time'),value:t(timeline),note:`${t(priced.name)}. ${t('Full websites and online stores take 3–4 months.')}`},
    {key:'payment',label:t('Pay in two halves'),value:'50% + 50%',note:t('Half to confirm, half after you approve the prototype.')},
    {key:'first-call',label:t('First call and quote'),value:t('Free'),note:t('You pay nothing until you accept the quote.')},
  ].filter(Boolean);
}
