// The guides (articles) at /guides. See docs/GUIDES.md.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {guides,guideBySlug,hasLanguage,guideText,featuredSlugs,guidesIndexMeta,sortedGuides} from '../src/guides/registry.mjs';
import articles from '../src/guides/articles.mjs';
import {parseInline,plainText,wordCount} from '../src/guides/inline.mjs';
import {fillTokens,tokensIn,knownTokens} from '../src/guides/tokens.mjs';
import {servicePages} from '../src/services/content.mjs';
import {sitemapXml} from '../src/lib/sitemap.mjs';
import {alternatesFor,isLocalizable,localizePath} from '../src/lib/locale.mjs';
import {articleGraph} from '../src/lib/structured-data.mjs';
import {fallbackContent} from '../src/content.js';

const walk=value=>typeof value==='string'?[value]:Array.isArray(value)?value.flatMap(walk):value&&typeof value==='object'?Object.values(value).flatMap(walk):[];
const bodyText=(slug,lang)=>walk(articles[slug][lang]).join('\n');
const langsOf=guide=>['en','ms','zh'].filter(lang=>guide[lang]);

test('registry: slugs, dates, titles and snippets are well formed',()=>{
  assert.equal(new Set(guides.map(guide=>guide.slug)).size,guides.length,'unique slugs');
  const titles=new Set();
  for(const guide of guides){
    assert.match(guide.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert.ok(guide.slug.length<=70,`${guide.slug}: keep addresses short`);
    assert.match(guide.published,/^2026-1[01]-\d\d$/,`${guide.slug}: published in October or November 2026`);
    assert.match(guide.modified,/^2026-1[01]-\d\d$/);assert.ok(guide.modified>=guide.published,`${guide.slug}: modified is not before published`);
    assert.ok(guide.modified<='2026-11-18',`${guide.slug}: no future dates`);
    assert.ok(guide.en,`${guide.slug}: English exists`);
    const translated=['ms','zh'].filter(lang=>guide[lang]);assert.ok([0,2].includes(translated.length),`${guide.slug}: Bahasa Malaysia and Chinese come as a pair`);
    for(const lang of langsOf(guide)){
      const text=guide[lang],label=`${guide.slug}/${lang}`;
      assert.ok(text.title&&text.seoTitle&&text.description&&text.minutes>0,label);
      assert.ok(!titles.has(`${lang}|${text.title}`),`${label}: titles must be unique`);titles.add(`${lang}|${text.title}`);
      const limit=lang==='zh'?32:60,snippet=lang==='zh'?[50,130]:[110,175];
      assert.ok(text.seoTitle.length<=limit,`${label}: seoTitle is ${text.seoTitle.length} characters, keep it to ${limit} so Google rarely cuts it`);
      assert.ok(text.description.length>=snippet[0]&&text.description.length<=snippet[1],`${label}: description length ${text.description.length}`);
    }
    assert.ok(guide.related.length>=2&&guide.related.every(slug=>slug!==guide.slug&&guideBySlug(slug)),`${guide.slug}: related guides exist`);
    assert.ok(guide.services.length>0&&guide.services.every(slug=>servicePages.some(page=>page.slug===slug)),`${guide.slug}: related services exist`);
  }
  assert.ok(featuredSlugs.every(slug=>guideBySlug(slug)));
  for(const lang of ['en','ms','zh'])assert.ok(guidesIndexMeta[lang].title&&guidesIndexMeta[lang].description&&guidesIndexMeta[lang].intro);
  assert.deepEqual(sortedGuides().map(guide=>guide.published),sortedGuides().map(guide=>guide.published).sort().reverse(),'newest first');
});

test('articles: every registered language has a complete body',()=>{
  assert.deepEqual(Object.keys(articles).sort(),guides.map(guide=>guide.slug).sort());
  for(const guide of guides)for(const lang of langsOf(guide)){
    const body=articles[guide.slug][lang],label=`${guide.slug}/${lang}`;
    assert.ok(body,`${label}: body`);assert.ok(body.lead?.length>=1&&body.answer&&body.sections?.length>=5&&body.faqs?.length>=3,label);
    assert.equal(new Set(body.sections.map(section=>section.id)).size,body.sections.length,`${label}: unique section ids`);
    assert.ok(body.sections.every(section=>/^[a-z0-9-]+$/.test(section.id)&&section.heading&&section.blocks.length),label);
    assert.ok(body.faqs.every(([question,answer])=>question.trim().length>(lang==='zh'?3:10)&&answer.trim().length>(lang==='zh'?10:20)),label);
    const words=wordCount(walk([body.lead,body.answer,body.sections,body.faqs]).join(' '));
    if(lang==='zh')assert.ok(words>=1300,`${label}: ${words} characters`);else{assert.ok(words>=(lang==='en'?850:750),`${label}: ${words} words is too thin`);const minutes=Math.round(words/200);assert.ok(Math.abs(minutes-guide[lang].minutes)<=Math.max(2,minutes*.4),`${label}: reading time ${guide[lang].minutes} min does not match about ${minutes} min`);}
  }
  for(const slug of Object.keys(articles))assert.deepEqual(Object.keys(articles[slug]).sort(),langsOf(guideBySlug(slug)).sort(),`${slug}: the registry and the article agree on languages`);
});

test('prices come from live data: only known tokens, all resolvable, and no package price typed by hand',()=>{
  for(const guide of guides)for(const lang of langsOf(guide)){
    const text=bodyText(guide.slug,lang);
    for(const {kind,key} of tokensIn(text))assert.ok(knownTokens[kind].includes(key),`${guide.slug}/${lang}: unknown token {${kind}:${key}}`);
    const filled=fillTokens(text,{services:fallbackContent.services,features:[],lang});
    assert.doesNotMatch(filled,/\{(price|fee):/,`${guide.slug}/${lang}: a token was left unfilled`);
    assert.doesNotMatch(text.replace(/\{(price|fee):[a-z]+\}/g,''),/RM\s?(449|989|1,?709|30|120)\b(?!\d)/,`${guide.slug}/${lang}: write {price:...} or {fee:...}, not the number`);
  }
  assert.equal(fillTokens('{price:landing} {price:company} {price:ecommerce} {fee:hosting} {fee:maintenance}',{services:[],features:[],lang:'en'}),'RM449 RM989 RM1,709 RM30/month RM120/month');
  assert.equal(fillTokens('{price:landing}',{services:[{name:'Landing Page',price:599,active:true}]}),'RM599','a live price wins');
  assert.equal(fillTokens('{fee:hosting}',{features:[{name:'Hosting',price:45,active:true}],lang:'ms'}),'RM45/bulan');
});

test('links inside articles go somewhere real and have descriptive anchor text',()=>{
  const services=new Set(servicePages.map(page=>`/services/${page.slug}`)),allowed=new Set(['/','/#terms','/#enquiry','/#contact','/terms','/terms#costs','/privacy']);
  for(const guide of guides)for(const lang of langsOf(guide)){
    const links=walk(articles[guide.slug][lang]).flatMap(parseInline).filter(part=>part.type==='link');
    for(const link of links){
      const label=`${guide.slug}/${lang}: [${link.text}](${link.href})`;
      if(/^https:\/\//.test(link.href))continue;
      assert.ok(link.href.startsWith('/'),`${label}: only https or site links`);
      const guideMatch=link.href.match(/^\/guides\/([a-z0-9-]+)$/);
      if(guideMatch)assert.ok(guideBySlug(guideMatch[1]),`${label}: unknown guide`);
      else assert.ok(services.has(link.href)||allowed.has(link.href),`${label}: unknown address`);
      assert.ok(link.text.length>=(lang==='zh'?2:8),`${label}: anchor text should describe the destination`);
      assert.doesNotMatch(link.text,/^(click here|here|read more|more|link|this)$/i,label);
    }
  }
  // Every article links to at least two other guides and one service page, so none is a dead end.
  for(const guide of guides){
    const links=walk(articles[guide.slug].en).flatMap(parseInline).filter(part=>part.type==='link').map(part=>part.href);
    assert.ok(new Set(links.filter(href=>href.startsWith('/guides/'))).size>=2,`${guide.slug}: link to at least two other guides in the text`);
    assert.ok(links.some(href=>href.startsWith('/services/')||href==='/#terms'),`${guide.slug}: link to a service or the terms in the text`);
  }
});

test('writing guard: no filler phrases, no exaggerated claims, no invented client results',()=>{
  const banned=/\b(delve|tapestry|in today'?s (?:digital|fast)|digital landscape|game[- ]?changer|unlock(?:ing)? the|seamless(?:ly)?|leverag(?:e|ing)|robust|cutting[- ]edge|dive into|it'?s important to note|in conclusion|elevate your|supercharge|holistic|ever[- ]evolving|paramount|testament to|moreover|furthermore|additionally|navigate the|in the realm of|plays? a (?:crucial|vital) role)\b/i;
  const inventedExperience=/\b(we'?ve (?:built|helped|worked with|delivered)|our (?:clients|customers) (?:say|love|report)|hundreds of|thousands of|\d+\+? (?:clients|customers|projects)|years of experience|trusted by|award[- ]winning|guaranteed (?:ranking|results|first))\b/i;
  for(const slug of Object.keys(articles)){
    const text=bodyText(slug,'en');
    assert.doesNotMatch(text,banned,`${slug}: filler phrase "${text.match(banned)?.[0]}"`);
    assert.doesNotMatch(text,inventedExperience,`${slug}: claim we cannot back up "${text.match(inventedExperience)?.[0]}"`);
    assert.equal((text.match(/—/g)||[]).length,0,`${slug}: no em dashes`);
    assert.ok((text.match(/!/g)||[]).length<=1,`${slug}: easy on the exclamation marks`);
    assert.ok(/\b(don't|can't|it's|you're|we'd|isn't|that's)\b/i.test(text),`${slug}: should read like a person, with contractions`);
    const sentences=text.split(/(?<=[.?!])\s+/).map(sentence=>sentence.split(/\s+/).length),short=sentences.filter(count=>count<=8).length;
    assert.ok(short/sentences.length>=.12,`${slug}: mix in some short sentences (${short}/${sentences.length})`);
  }
});

test('translated guides exist as a pair and get their own address and hreflang',()=>{
  const translated=guides.filter(guide=>guide.ms&&guide.zh).map(guide=>guide.slug);
  assert.deepEqual(translated.sort(),['do-you-need-a-website-if-you-have-a-facebook-page','how-much-does-a-website-cost-in-malaysia','landing-page-or-full-website-for-sme','tuition-centre-website-what-to-include']);
  for(const slug of translated){
    assert.ok(isLocalizable(`/guides/${slug}`));assert.equal(localizePath(`/guides/${slug}`,'zh'),`/zh/guides/${slug}`);
    assert.deepEqual(alternatesFor(`/guides/${slug}`,'https://x.test').map(([code])=>code),['en-MY','ms-MY','zh-Hans','x-default']);
  }
  const englishOnly='how-long-does-it-take-to-build-a-website-malaysia';
  assert.ok(!isLocalizable(`/guides/${englishOnly}`));assert.equal(localizePath(`/guides/${englishOnly}`,'ms'),`/guides/${englishOnly}`);assert.deepEqual(alternatesFor(`/guides/${englishOnly}`,'https://x.test'),[]);
  assert.ok(isLocalizable('/guides')&&localizePath('/guides','ms')==='/ms/guides');
  assert.ok(!hasLanguage(englishOnly,'ms')&&hasLanguage(translated[0],'ms'));
  assert.equal(guideText(guideBySlug(englishOnly),'ms'),guideBySlug(englishOnly).en,'falls back to English');
});

test('sitemap lists the guides in each language they exist in, with the date they last changed',()=>{
  const xml=sitemapXml('https://example.test',[]);
  assert.match(xml,/<loc>https:\/\/example\.test\/guides<\/loc>/);
  for(const guide of guides){
    assert.match(xml,new RegExp(`<loc>https://example\\.test/guides/${guide.slug}</loc>\\s*<lastmod>${guide.modified}</lastmod>`),guide.slug);
    for(const lang of ['ms','zh'])assert.equal(xml.includes(`<loc>https://example.test/${lang}/guides/${guide.slug}</loc>`),Boolean(guide.ms&&guide.zh),`${guide.slug}/${lang}`);
  }
});

test('article structured data: who, when, where it sits, and its questions in plain text',()=>{
  const guide=guideBySlug('how-much-does-a-website-cost-in-malaysia'),text=guideText(guide,'en');
  const graph=articleGraph({base:'https://example.test',guide,text,lang:'en',team:fallbackContent.team_members,content:fallbackContent.site_content.content,services:fallbackContent.services,faqs:articles[guide.slug].en.faqs})['@graph'];
  const post=graph.find(node=>node['@type']==='BlogPosting');
  assert.equal(post.headline,text.title);assert.equal(post.datePublished,'2026-10-06T09:00:00+08:00');assert.equal(post.dateModified,'2026-11-12T09:00:00+08:00');
  assert.equal(post.url,'https://example.test/guides/how-much-does-a-website-cost-in-malaysia');assert.equal(post.inLanguage,'en-MY');
  assert.deepEqual(post.author.map(author=>author.name),['Max Yong','Vincent Teo']);assert.ok(post.author.every(author=>author['@type']==='Person'&&author.url));
  assert.deepEqual(graph.find(node=>node['@type']==='BreadcrumbList').itemListElement.map(item=>item.name),['Home','Guides',text.title]);
  const faq=graph.find(node=>node['@type']==='FAQPage');assert.ok(faq.mainEntity.length>=3);
  assert.doesNotMatch(JSON.stringify(faq),/\]\(|\*\*|\{fee:|\{price:/,'questions and answers are plain text');
  assert.match(JSON.stringify(faq),/RM30\/month/);
  const ms=articleGraph({base:'https://example.test',guide,text:guideText(guide,'ms'),lang:'ms',team:[],content:{},services:[],faqs:articles[guide.slug].ms.faqs})['@graph'];
  assert.equal(ms.find(node=>node['@type']==='BlogPosting').url,'https://example.test/ms/guides/how-much-does-a-website-cost-in-malaysia');assert.equal(ms.find(node=>node['@type']==='BlogPosting').inLanguage,'ms-MY');
});

test('vercel serves the guides list and every article, in every language it exists in',async()=>{
  const config=JSON.parse(await readFile('vercel.json','utf8')),routes=config.routes.filter(route=>/guides/.test(route.src));
  const english=routes.find(route=>route.dest==='/guides/$1/index.html'),translated=routes.find(route=>route.dest==='/$1/guides/$2/index.html');
  assert.ok(routes.some(route=>route.src==='/guides/?'&&route.dest==='/guides/index.html')&&routes.some(route=>route.src==='/(ms|zh)/guides/?'));
  for(const guide of guides){
    assert.match(`/guides/${guide.slug}`,new RegExp(`^${english.src.replace(/\/\?$/,'/?')}$`),guide.slug);
    assert.equal(new RegExp(`^${translated.src}$`).test(`/ms/guides/${guide.slug}`),Boolean(guide.ms&&guide.zh),`${guide.slug} in Bahasa Malaysia`);
  }
  assert.ok(config.routes.indexOf(english)<config.routes.findIndex(route=>route.handle==='filesystem'),'before the filesystem step');
});

test('inline text format: bold, links, and plain text for search markup',()=>{
  assert.deepEqual(parseInline('See [the guide: costs?](/guides/x) and **this**.').map(part=>part.type),['text','link','text','bold','text']);
  assert.equal(plainText('A [link](/x) and **bold**'),'A link and bold');
  assert.equal(wordCount('one two three'),3);assert.equal(wordCount('你好世界'),4);
});
