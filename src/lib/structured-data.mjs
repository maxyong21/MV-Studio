// Structured data (schema.org) for search engines. Used by the build (scripts/generate-seo.js)
// and by the browser, so both always publish the same description of the studio.
import {pageForService} from '../services/content.mjs';

const text=value=>typeof value==='string'?value.trim():'';
const webUrl=value=>{try{const url=new URL(text(value));return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}};
const absolute=(value,base)=>{try{return text(value)?new URL(text(value),`${base}/`).href:undefined;}catch{return undefined;}};
// Removes empty values so no blank property is published.
const compact=value=>JSON.parse(JSON.stringify(value,(key,item)=>item===''||item===null||(Array.isArray(item)&&!item.length)?undefined:item));
const active=rows=>(Array.isArray(rows)?rows:[]).filter(row=>row&&row.active!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
const malaysia={'@type':'Country',name:'Malaysia'};

export function servicePrice(service){
  const price=service?.price;
  if(price===null||price===undefined||price==='')return null;
  const amount=Number(price);
  return Number.isFinite(amount)&&amount>0?amount:null;
}
const currencyCode=service=>/^(?:RM|MYR)?$/i.test(text(service?.currency))?'MYR':text(service.currency).toUpperCase();
const offer=(service,url)=>{
  const price=servicePrice(service);
  return price===null?undefined:{'@type':'Offer',price,priceCurrency:currencyCode(service),url};
};

export function faqNode(pairs,id){
  const mainEntity=pairs.filter(([question,answer])=>text(question)&&text(answer)).map(([question,answer])=>({'@type':'Question',name:text(question),acceptedAnswer:{'@type':'Answer',text:text(answer)}}));
  return mainEntity.length?{'@type':'FAQPage','@id':id,mainEntity}:null;
}

export function studioNode({base,content={},services=[],team=[],description}){
  const listed=active(services),prices=listed.map(servicePrice).filter(price=>price!==null);
  const email=Array.isArray(content.contact_emails)?text(content.contact_emails[0]):'';
  const telephone=Array.isArray(content.contact_phones)?text(content.contact_phones[0]):'';
  return {
    '@type':'ProfessionalService','@id':`${base}/#studio`,name:'MV Studio',url:`${base}/`,description,
    logo:`${base}/apple-touch-icon.png`,image:`${base}/aphome.png`,
    address:{'@type':'PostalAddress',addressCountry:'MY'},areaServed:malaysia,availableLanguage:['en','ms','zh'],
    email,telephone,
    priceRange:prices.length?`RM ${Math.min(...prices)}–RM ${Math.max(...prices)}+`:undefined,
    knowsAbout:listed.map(service=>text(service.name)).filter(Boolean),
    employee:active(team).filter(member=>text(member.name)).map(member=>({'@type':'Person',name:text(member.name),jobTitle:text(member.role),sameAs:[member.linkedin_url,member.github_url,member.website_url].map(webUrl).filter(Boolean)})),
    hasOfferCatalog:listed.length?{'@type':'OfferCatalog',name:'Web design and development services',itemListElement:listed.map(service=>{
      const page=pageForService(service),url=page?`${base}/services/${page.slug}`:`${base}/#services`;
      return {'@type':'Offer',url,price:servicePrice(service)??undefined,priceCurrency:servicePrice(service)===null?undefined:currencyCode(service),itemOffered:{'@type':'Service',name:text(service.name),description:text(service.summary),url}};
    })}:undefined,
  };
}

export function homeGraph({base,content={},services=[],projects=[],team=[],faqs=[],description}){
  const faq=faqNode(active(faqs).map(row=>[row.title,row.answer]),`${base}/#faq`);
  return compact({'@context':'https://schema.org','@graph':[
    studioNode({base,content,services,team,description}),
    {'@type':'WebSite','@id':`${base}/#website`,url:`${base}/`,name:'MV Studio',inLanguage:'en-MY',publisher:{'@id':`${base}/#studio`}},
    {'@type':'ItemList','@id':`${base}/#portfolio`,name:'MV Studio selected projects',itemListElement:active(projects).map((project,index)=>({'@type':'ListItem',position:index+1,item:{'@type':'CreativeWork',name:project.name,headline:project.seo_title||undefined,description:project.seo_description||project.summary,url:`${base}/projects/${encodeURIComponent(project.id)}`,image:absolute(project.image_url,base)}}))},
    ...(faq?[faq]:[]),
  ]});
}

export function serviceGraph({base,page,service,content={},services=[],team=[]}){
  const url=`${base}/services/${page.slug}`,faq=faqNode(page.faqs,`${url}#faq`);
  return compact({'@context':'https://schema.org','@graph':[
    {'@type':'WebPage','@id':url,url,name:page.title,description:page.description,inLanguage:'en-MY',isPartOf:{'@id':`${base}/#website`},breadcrumb:{'@id':`${url}#breadcrumb`}},
    {'@type':'Service','@id':`${url}#service`,name:page.name,serviceType:page.name,description:page.description,url,areaServed:malaysia,provider:{'@id':`${base}/#studio`},offers:service?offer(service,url):undefined},
    studioNode({base,content,services,team,description:text(content.seo_description)||text(content.hero_description)}),
    {'@type':'BreadcrumbList','@id':`${url}#breadcrumb`,itemListElement:[['Home',`${base}/`],['Services',`${base}/#services`],[page.name,url]].map(([name,item],index)=>({'@type':'ListItem',position:index+1,name,item}))},
    ...(faq?[faq]:[]),
  ]});
}
