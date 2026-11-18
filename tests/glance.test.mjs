import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {glanceFacts} from '../src/lib/glance.mjs';
import {money} from '../src/lib/site.js';
import {fallbackContent} from '../src/content.js';

const t=text=>text;
const keys=facts=>facts.map(fact=>fact.key);
const find=(facts,key)=>facts.find(fact=>fact.key===key);

test('the strip shows the cheapest priced package and its own delivery time',()=>{
  const facts=glanceFacts([
    {name:'Company Website',price:989,currency:'RM',timeline:'Typically 3–4 months'},
    {name:'Landing Page',price:449,currency:'RM',timeline:'Ready in 7 days'},
    {name:'Custom Web App',price:null,currency:'RM',timeline:'Typically 3–4 months or more'},
  ],t,money);
  assert.deepEqual(keys(facts),['price','delivery','payment','first-call']);
  assert.equal(find(facts,'price').value,'From RM 449');
  assert.equal(find(facts,'price').note,'Landing Page');
  assert.equal(find(facts,'delivery').value,'Ready in 7 days');
  assert.match(find(facts,'delivery').note,/^Landing Page\. Full websites/);
});

test('the strip still works with the packages built into the site',()=>{
  const facts=glanceFacts(fallbackContent.services,t,money);
  assert.equal(find(facts,'price').value,`From ${money(Math.min(...fallbackContent.services.filter(s=>s.price>0).map(s=>s.price)),'RM')}`);
  assert.equal(find(facts,'delivery').value,'Ready in 7 days');
});

test('missing or unusual package data never breaks the strip or invents a fact',()=>{
  for(const services of [undefined,null,[],'x',{},[null],[{name:'Custom Web App',price:null}],[{name:'Free',price:0}],[{name:'Bad',price:'abc'}]]){
    const facts=glanceFacts(services,t,money);
    assert.deepEqual(keys(facts),['payment','first-call'],`only the fixed terms remain for ${JSON.stringify(services)}`);
  }
  // A priced package with no delivery time keeps the price and drops the delivery fact.
  assert.deepEqual(keys(glanceFacts([{name:'Landing Page',price:'449',currency:'RM',timeline:'  '}],t,money)),['price','payment','first-call']);
  // A price saved as text still counts and is formatted like the package cards.
  assert.equal(find(glanceFacts([{name:'Landing Page',price:'1709',currency:'RM',timeline:'x'}],t,money),'price').value,'From RM 1,709');
});

test('every fact is translated for Bahasa Malaysia and Chinese',async()=>{
  const {default:ms}=await import('../src/i18n/ms.js');const {default:zh}=await import('../src/i18n/zh.js');
  const wanted=[];
  const spy=text=>{wanted.push(text);return text;};
  glanceFacts(fallbackContent.services,spy,money);
  for(const [label,table] of [['ms',ms],['zh',zh]])for(const text of wanted)if(!/^(Landing Page|Company Website|E-Commerce|Custom Web App)$/.test(text))assert.ok(table[text],`${label}: missing translation for "${text}"`);
});

test('the payment and first-call facts still match the written business terms',async()=>{
  const terms=await readFile('docs/BUSINESS_TERMS.md','utf8');
  const facts=glanceFacts([],t,money);
  assert.match(find(facts,'payment').value,/50%/);
  assert.match(terms,/50% of the project fee confirms the project/,'terms still say half confirms the project');
  assert.match(terms,/remaining 50% is paid before real development begins/);
  assert.match(terms,/free intro call and a written quote\. No payment until the quote is accepted/i,'terms still say the first call and quote are free');
  assert.match(find(facts,'first-call').note,/accept the quote/);
});
