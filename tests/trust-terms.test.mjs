// Trust and terms: project labels, 50/50 payment wording, timelines, owners-only footer.
// See docs/BUSINESS_TERMS.md.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {database} from './helpers/database.mjs';
import {projectBadge} from '../src/lib/project-type.mjs';
import {validateEntity} from '../src/admin/validation.js';
import {entityConfig} from '../src/admin/config.js';
import {legalDocuments} from '../src/legal/content.mjs';
import {studioOwners} from '../src/lib/site.js';
import {fallbackContent} from '../src/content.js';

test('project label: client name only shows for client projects, and unknown types show nothing',()=>{
  assert.deepEqual(projectBadge({project_type:'client_project',client_name:' Acme Bakery '}),{type:'client_project',label:'Client project',client:'Acme Bakery'});
  assert.equal(projectBadge({project_type:'personal_project',client_name:'Leftover'}).client,'');
  assert.equal(projectBadge({project_type:'demonstration_project'}).label,'Demonstration project');
  assert.equal(projectBadge({}),null);
  assert.equal(projectBadge({project_type:'sponsored'}),null);
});

test('admin: a client project must name the client; other labels do not',()=>{
  const base={name:'X',project_type:'demonstration_project',client_name:''};
  assert.deepEqual(validateEntity(base,entityConfig.projects),{});
  assert.ok(validateEntity({...base,project_type:'client_project'},entityConfig.projects).client_name);
  assert.deepEqual(validateEntity({...base,project_type:'client_project',client_name:'Acme'},entityConfig.projects),{});
  assert.ok(validateEntity({...base,project_type:'invalid'},entityConfig.projects).project_type);
  const types=entityConfig.projects.fields.find(([key])=>key==='project_type')[2];
  assert.ok(types.startsWith('select:demonstration_project|'),'the safest label is the default');
});

test('terms page states the 50/50 payment and the refund rule',()=>{
  const costs=legalDocuments['/terms'].sections.find(section=>section.id==='costs').paragraphs.join(' ');
  assert.match(costs,/first 50%/);assert.match(costs,/remaining 50% is payable before real development begins/);
  assert.match(costs,/within 7 days/);assert.match(costs,/half of the deposit/);
  assert.doesNotMatch(costs,/no-refund policy/);
  assert.match(costs,/in writing/);assert.match(costs,/whichever comes first/);assert.match(costs,/within 14 days of confirming/);
  assert.match(costs,/cancel after approving the prototype but before paying the remaining 50%/);assert.match(costs,/starts as soon as the remaining 50% is received/);
});

test('fallback services carry the agreed payment terms and timelines',()=>{
  const by=name=>fallbackContent.services.find(service=>service.name===name);
  assert.equal(by('Landing Page').timeline,'Ready in 7 days');
  assert.match(by('Company Website').timeline,/3–4 months/);assert.match(by('E-Commerce').timeline,/3–4 months/);
  for(const service of fallbackContent.services)assert.match(service.payment_terms,/50%/);
  assert.ok(fallbackContent.projects.every(project=>projectBadge(project)));
});

test('only the two owners are named: no company or parent organisation appears in the source',async()=>{
  assert.equal(studioOwners,'Max Yong & Vincent Teo');
  const walk=async dir=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(entry=>entry.isDirectory()?walk(join(dir,entry.name)):[join(dir,entry.name)]))).flat();
  for(const file of (await walk('src')).filter(path=>/\.(jsx?|mjs|css)$/.test(path)))assert.doesNotMatch(await readFile(file,'utf8'),/\bYYC\b/i,file);
});

test('migration: labels, constraints, terms and FAQs apply once, keep admin edits and rerun safely',async()=>{
  const db=await database();
  try{
    await db.exec(await readFile('supabase/migrations/20261024_growth_and_reliability.sql','utf8'));
    await db.exec((await readFile('supabase/schema.sql','utf8')).replace('create extension if not exists pgcrypto;',''));
    const migration=await readFile('supabase/migrations/20261117_trust_and_terms.sql','utf8');
    // Put the database back into the state a live site had before this change.
    const oldTerms='Website development is a one-time project fee. Payment stages, third-party charges and any recurring subscriptions are confirmed in the proposal before development begins.';
    await db.query("update services set payment_terms=$1,timeline='Timeline confirmed together' where name in ('Company Website','E-Commerce')",[oldTerms]);
    await db.query("update services set payment_terms='Our own custom terms',timeline='Ready in 7 days' where name='Landing Page'");
    await db.query("delete from faqs where key in ('payment-and-refunds','timeline-and-replies')");
    await db.query("update chatbot_documents set body='Development deposit amounts and payment stages are confirmed with the team in the proposal. Old text.' where title='Payment stages account arrangements and source code'");
    await db.exec(migration);await db.exec(migration);
    const service=async name=>(await db.query('select payment_terms,timeline from services where name=$1',[name])).rows[0];
    assert.match((await service('Company Website')).payment_terms,/Pay 50% to confirm/);
    assert.equal((await service('Company Website')).timeline,'Typically 3–4 months');
    assert.equal((await service('E-Commerce')).timeline,'Typically 3–4 months');
    assert.deepEqual(await service('Landing Page'),{payment_terms:'Our own custom terms',timeline:'Ready in 7 days'});
    assert.equal((await db.query("select count(*)::int as n from faqs where key in ('payment-and-refunds','timeline-and-replies') and active")).rows[0].n,2);
    assert.match((await db.query("select body from chatbot_documents where title='Payment stages account arrangements and source code'")).rows[0].body,/50% to confirm/);
    assert.equal((await db.query("select project_type from projects where name='APMoodle'")).rows[0].project_type,'demonstration_project');
    await assert.rejects(db.query("update projects set project_type='client_project' where name='APMoodle'"),e=>e.code==='23514');
    await assert.rejects(db.query("update projects set client_name='Acme' where name='APMoodle'"),e=>e.code==='23514');
    await assert.rejects(db.query("update projects set project_type='other' where name='APMoodle'"),e=>e.code==='23514');
    await db.query("update projects set project_type='client_project',client_name='Acme Bakery' where name='APMoodle'");
    await db.exec('set role anon');
    assert.deepEqual((await db.query("select project_type,client_name from projects where name='APMoodle'")).rows[0],{project_type:'client_project',client_name:'Acme Bakery'});
    await db.exec('reset role');
  }finally{await db.close();}
});

// Vercel ignores a top-level "headers" list when "routes" is used, so the live site once
// shipped without its Content-Security-Policy and other protections. Keep them in routes.
test('security headers are sent: defined in routes that continue, before any destination, never in an ignored top-level list',async()=>{
  const config=JSON.parse(await readFile('vercel.json','utf8'));
  assert.equal(config.headers,undefined,'a top-level headers list is ignored when routes is present');
  const all=config.routes.find(route=>route.src==='/(.*)'&&route.headers);
  assert.ok(all&&all.continue===true,'the site-wide header route must continue to the next route');
  assert.ok(config.routes.indexOf(all)<config.routes.findIndex(route=>route.dest||route.handle),'headers must be set before the first destination');
  for(const name of ['Content-Security-Policy','Strict-Transport-Security','X-Content-Type-Options','X-Frame-Options','Referrer-Policy','Permissions-Policy'])assert.ok(all.headers[name],`${name} is missing`);
  assert.match(all.headers['Content-Security-Policy'],/frame-ancestors 'none'/);
  assert.match(all.headers['Content-Security-Policy'],/object-src 'none'/);
  assert.equal(all.headers['X-Frame-Options'],'DENY');
});

test('hero artwork is labelled as an example, and the "who we are" note is present in all three languages',async()=>{
  const app=await readFile('src/App.jsx','utf8');
  assert.match(app,/className="art-example-label">\{t\('Example design'\)\}/);
  assert.match(app,/className="who-note"><b>\{t\('Who we are'\)\}/);
  const ms=(await import('../src/i18n/ms.js')).default,zh=(await import('../src/i18n/zh.js')).default;
  for(const key of ['Example design','Who we are','We’re two independent developers, building our first client projects. Your project gets our full attention.']){
    assert.ok(ms[key]&&ms[key]!==key,`BM: ${key}`);assert.ok(zh[key]&&zh[key]!==key,`ZH: ${key}`);
  }
});
