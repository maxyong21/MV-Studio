import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {servicePages,servicePaths,servicePage,pageForService,serviceForPage} from '../src/services/content.mjs';
import {homeGraph,serviceGraph,servicePrice,faqNode} from '../src/lib/structured-data.mjs';
import {sitemapXml} from '../src/lib/sitemap.mjs';
import {fallbackContent} from '../src/content.js';

const base='https://mv-aistudio.vercel.app';
const find=(graph,type)=>graph['@graph'].find(node=>node['@type']===type);

test('every service page has complete, search-sized text and a unique address',()=>{
  assert.equal(new Set(servicePages.map(page=>page.slug)).size,servicePages.length);
  assert.equal(new Set(servicePages.map(page=>page.title)).size,servicePages.length);
  for(const page of servicePages){
    assert.match(page.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(page.title.length<=60,`${page.slug}: title is ${page.title.length} characters`);
    assert.ok(page.description.length>=70&&page.description.length<=160,`${page.slug}: description is ${page.description.length} characters`);
    assert.match(page.title,/Malaysia/);assert.match(page.title,/MV Studio$/);
    for(const key of ['name','heading','intro','ms','zh'])assert.ok(page[key].trim(),`${page.slug}: ${key}`);
    assert.ok(page.includes.length>=3&&page.suits.length>=3&&page.faqs.length>=3);
    for(const [question,answer] of page.faqs){assert.match(question,/\?$/);assert.ok(answer.length>40);}
    // Prices live in the admin only; a figure typed here would go out of date.
    assert.doesNotMatch(JSON.stringify(page),/RM\s?\d/);
    assert.equal(servicePage(page.slug),page);
  }
  assert.equal(servicePage('unknown'),null);assert.equal(servicePage('../admin'),null);
});

test('the default services each link to exactly one page, and renamed services link to none',()=>{
  const linked=fallbackContent.services.map(service=>pageForService(service)?.slug);
  assert.deepEqual(linked,['landing-page','company-website','ecommerce-website','custom-web-app']);
  assert.equal(pageForService({name:'Logo design'}),null);
  assert.equal(pageForService({name:'Custom company landing system'}),null,'An ambiguous name must not guess');
  assert.equal(pageForService(null),null);
  const page=servicePage('landing-page');
  assert.equal(serviceForPage(page,fallbackContent.services).id,'seed-1');
  assert.equal(serviceForPage(page,[{...fallbackContent.services[0],active:false}]),null,'An unpublished service must not supply a price');
  assert.equal(serviceForPage(page,[]),null);
});

test('home structured data describes the studio, its prices, people and published FAQs',()=>{
  const data=fallbackContent;
  const graph=homeGraph({base,content:{...data.site_content.content,contact_emails:['hello@example.test']},services:[...data.services,{name:'Hidden',price:1,active:false}],projects:data.projects,team:data.team_members,faqs:[{title:'Is hosting included?',answer:'Hosting is separate.',active:true},{title:'Draft?',answer:'Not published.',active:false},{title:'',answer:'No question.',active:true}],description:'A description.'});
  const studio=find(graph,'ProfessionalService');
  assert.equal(studio['@id'],`${base}/#studio`);assert.equal(studio.email,'hello@example.test');assert.equal(studio.telephone,undefined);
  assert.equal(studio.priceRange,'RM 449–RM 1709+');assert.equal(studio.address.addressCountry,'MY');
  const offers=studio.hasOfferCatalog.itemListElement;
  assert.equal(offers.length,4);assert.equal(offers[0].price,449);assert.equal(offers[0].priceCurrency,'MYR');assert.equal(offers[0].url,`${base}/services/landing-page`);
  assert.equal(offers[3].price,undefined);assert.equal(offers[3].priceCurrency,undefined,'A quoted service must not publish a price');
  assert.deepEqual(studio.employee.map(person=>person.name),['Max Yong','Vincent Teo']);
  assert.ok(studio.employee[0].sameAs.every(url=>/^https?:\/\//.test(url)));
  assert.equal(find(graph,'FAQPage').mainEntity.length,1);
  assert.equal(find(graph,'ItemList').itemListElement.length,4);
  assert.equal(find(graph,'WebSite').publisher['@id'],studio['@id']);
  assert.doesNotMatch(JSON.stringify(graph),/Hidden|Draft|null|""/);
});

test('structured data survives empty and unsafe content',()=>{
  const empty=homeGraph({base,description:''});
  assert.equal(find(empty,'FAQPage'),undefined);assert.equal(find(empty,'ProfessionalService').hasOfferCatalog,undefined);
  const unsafe=homeGraph({base,team:[{name:'A',linkedin_url:'javascript:alert(1)',website_url:'not a url'}],services:[{name:'X',price:'abc',currency:'usd'},{name:'Y',price:0},{name:'Z',price:'120',currency:'usd'}]});
  const studio=find(unsafe,'ProfessionalService');
  assert.equal(studio.employee[0].sameAs,undefined);assert.equal(studio.priceRange,'RM 120–RM 120+');
  assert.equal(studio.hasOfferCatalog.itemListElement[2].priceCurrency,'USD');
  assert.equal(servicePrice({price:''}),null);assert.equal(servicePrice({price:-5}),null);assert.equal(servicePrice({price:'989'}),989);
  assert.equal(faqNode([['','x'],['q?','']],'id'),null);
});

test('service structured data carries the live price, breadcrumb and page FAQs',()=>{
  const page=servicePage('company-website'),services=fallbackContent.services;
  const graph=serviceGraph({base,page,service:serviceForPage(page,services),content:fallbackContent.site_content.content,services,team:fallbackContent.team_members});
  const service=find(graph,'Service'),url=`${base}/services/company-website`;
  assert.equal(service.url,url);assert.equal(service.offers.price,989);assert.equal(service.offers.priceCurrency,'MYR');assert.equal(service.provider['@id'],`${base}/#studio`);
  assert.deepEqual(find(graph,'BreadcrumbList').itemListElement.map(item=>item.item),[`${base}/`,`${base}/#services`,url]);
  assert.equal(find(graph,'FAQPage').mainEntity.length,page.faqs.length);
  const quoted=serviceGraph({base,page:servicePage('custom-web-app'),service:serviceForPage(servicePage('custom-web-app'),services),services});
  assert.equal(find(quoted,'Service').offers,undefined);
  assert.equal(find(serviceGraph({base,page,service:null}),'Service').offers,undefined);
});

test('service pages are in the sitemap and routed, and the search title fits',async()=>{
  const xml=sitemapXml(base,[],'');
  for(const path of servicePaths)assert.ok(xml.includes(`<loc>${base}${path}</loc>`),path);
  const config=JSON.parse(await readFile('vercel.json','utf8'));
  const route=config.routes.find(item=>item.dest==='/services/$1/index.html');
  assert.ok(route,'Service route is missing');
  assert.ok(config.routes.indexOf(route)<config.routes.findIndex(item=>item.handle==='filesystem'));
  const pattern=new RegExp(`^${route.src}$`);
  for(const path of servicePaths){assert.match(path,pattern);assert.match(`${path}/`,pattern);}
  assert.doesNotMatch('/services/unknown',pattern);assert.doesNotMatch('/services/landing-page/extra',pattern);
  const {seo_title,seo_description}=fallbackContent.site_content.content;
  assert.ok(seo_title.length<=60);assert.ok(seo_description.length<=160);
  const html=await readFile('index.html','utf8');
  assert.ok(html.includes(`<title>${seo_title}</title>`));assert.ok(html.includes(`<meta name="description" content="${seo_description}" />`));
});
