// Structured data (schema.org) for search engines. Used by the build (scripts/generate-seo.js)
// and by the browser, so both always publish the same description of the studio.
import {pageForService} from '../services/content.mjs';
import {projectBadge} from './project-type.mjs';
import {canonicalFor,htmlLang} from './locale.mjs';
import {plainText} from '../guides/inline.mjs';
import {fillTokens} from '../guides/tokens.mjs';

const text=value=>typeof value==='string'?value.trim():'';
const text_=text;
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
  const people=active(team).filter(member=>text(member.name)).map(member=>({'@type':'Person',name:text(member.name),jobTitle:text(member.role),sameAs:[member.linkedin_url,member.github_url,member.website_url].map(webUrl).filter(Boolean)}));
  return {
    '@type':'ProfessionalService','@id':`${base}/#studio`,name:'MV Studio',url:`${base}/`,description,
    logo:`${base}/apple-touch-icon.png`,image:`${base}/og-image.png`,
    address:{'@type':'PostalAddress',addressCountry:'MY'},areaServed:malaysia,availableLanguage:['en','ms','zh'],
    email,telephone,
    priceRange:prices.length?`RM ${Math.min(...prices)}–RM ${Math.max(...prices)}+`:undefined,
    knowsAbout:listed.map(service=>text(service.name)).filter(Boolean),
    employee:people,founder:people,
    contactPoint:email||telephone?{'@type':'ContactPoint',contactType:'customer service',email,telephone,areaServed:'MY',availableLanguage:['English','Malay','Chinese']}:undefined,
    hasOfferCatalog:listed.length?{'@type':'OfferCatalog',name:'Web design and development services',itemListElement:listed.map(service=>{
      const page=pageForService(service),url=page?`${base}/services/${page.slug}`:`${base}/#services`;
      return {'@type':'Offer',url,price:servicePrice(service)??undefined,priceCurrency:servicePrice(service)===null?undefined:currencyCode(service),itemOffered:{'@type':'Service',name:text(service.name),description:text(service.summary),url}};
    })}:undefined,
  };
}

export function homeGraph({base,content={},services=[],projects=[],team=[],faqs=[],description,lang='en'}){
  const faq=faqNode(active(faqs).map(row=>[row.title,row.answer]),`${base}/#faq`);
  return compact({'@context':'https://schema.org','@graph':[
    studioNode({base,content,services,team,description}),
    {'@type':'WebSite','@id':`${base}/#website`,url:`${base}/`,name:'MV Studio',inLanguage:['en-MY','ms-MY','zh-Hans-MY'],publisher:{'@id':`${base}/#studio`}},
    {'@type':'ItemList','@id':`${base}/#portfolio`,name:'MV Studio selected projects',itemListElement:active(projects).map((project,index)=>({'@type':'ListItem',position:index+1,item:{'@type':'CreativeWork',name:project.name,keywords:projectBadge(project)?.label,headline:project.seo_title||undefined,description:project.seo_description||project.summary,url:`${base}/projects/${encodeURIComponent(project.id)}`,image:absolute(project.image_url,base)}}))},
    ...(faq?[faq]:[]),
  ]});
}

export function serviceGraph({base,page,service,content={},services=[],team=[],lang='en'}){
  const url=canonicalFor(`/services/${page.slug}`,lang,base),faq=faqNode(page.faqs,`${url}#faq`),home=canonicalFor('/',lang,base);
  return compact({'@context':'https://schema.org','@graph':[
    {'@type':'WebPage','@id':url,url,name:page.title,description:page.description,inLanguage:htmlLang[lang]||'en-MY',isPartOf:{'@id':`${base}/#website`},breadcrumb:{'@id':`${url}#breadcrumb`}},
    {'@type':'Service','@id':`${url}#service`,name:page.name,serviceType:page.name,description:page.description,url,areaServed:malaysia,provider:{'@id':`${base}/#studio`},offers:service?offer(service,url):undefined},
    studioNode({base,content,services,team,description:text(content.seo_description)||text(content.hero_description)}),
    {'@type':'BreadcrumbList','@id':`${url}#breadcrumb`,itemListElement:[['Home',home],['Services',`${home}#services`],[page.name,url]].map(([name,item],index)=>({'@type':'ListItem',position:index+1,name,item}))},
    ...(faq?[faq]:[]),
  ]});
}

const crumbNames={home:{en:'Home',ms:'Laman utama',zh:'首页'},guides:{en:'Guides',ms:'Panduan',zh:'指南'}};

// An article (guide): who wrote it, when, what it is about, where it sits on the site, and its questions.
// Dates are written in Malaysian time. Authors are the people listed on the Team page of the admin.
export function articleGraph({base,guide,text,lang='en',team=[],content={},services=[],faqs=[]}){
  const url=canonicalFor(`/guides/${guide.slug}`,lang,base),home=canonicalFor('/',lang,base),index=canonicalFor('/guides',lang,base);
  const authors=active(team).filter(member=>text_(member.name)).map(member=>({
    '@type':'Person',name:text_(member.name),jobTitle:text_(member.role)||undefined,
    url:webUrl(member.website_url)||webUrl(member.linkedin_url)||undefined,
    sameAs:[member.linkedin_url,member.github_url,member.website_url].map(webUrl).filter(Boolean),
  }));
  const faq=faqNode((faqs||[]).map(([question,answer])=>[question,plainText(fillTokens(answer,{services,lang}))]),`${url}#faq`);
  return compact({'@context':'https://schema.org','@graph':[
    {'@type':'BlogPosting','@id':`${url}#article`,headline:text.title,description:text.description,url,mainEntityOfPage:{'@type':'WebPage','@id':url},
      image:[`${base}/og-image.png`],datePublished:`${guide.published}T09:00:00+08:00`,dateModified:`${guide.modified}T09:00:00+08:00`,
      inLanguage:htmlLang[lang]||'en-MY',articleSection:guide.topic,author:authors,publisher:{'@id':`${base}/#studio`},isPartOf:{'@id':`${base}/#website`}},
    {'@type':'BreadcrumbList','@id':`${url}#breadcrumb`,itemListElement:[[crumbNames.home[lang]||crumbNames.home.en,home],[crumbNames.guides[lang]||crumbNames.guides.en,index],[text.title,url]].map(([name,item],position)=>({'@type':'ListItem',position:position+1,name,item}))},
    studioNode({base,content,services,team,description:text_(content.seo_description)||text_(content.hero_description)}),
    ...(faq?[faq]:[]),
  ]});
}
