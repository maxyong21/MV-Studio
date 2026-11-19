import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database} from './helpers/database.mjs';
import {legalDocuments,privacyMalay,legalUpdated} from '../src/legal/content.mjs';

const read=path=>readFile(path,'utf8');

test('storage listing is limited to administrators, the retention schedule is guarded, both are safe to run twice, and the review queries in the docs run',async()=>{
  const db=await database();
  try{
    await db.exec(await read('supabase/migrations/20261024_growth_and_reliability.sql'));
    await db.exec((await read('supabase/schema.sql')).replace('create extension if not exists pgcrypto;',''));
    for(const file of ['20261106_marketing.sql','20261116_profile_requests.sql'])await db.exec(await read(`supabase/migrations/${file}`));
    // The storage change: no policy lets anonymous visitors list the folder, and an administrator policy remains.
    const storage=await read('supabase/migrations/20261118_storage_listing.sql');
    await db.exec(storage);await db.exec(storage);
    const policies=(await db.query("select policyname,roles::text as roles from pg_policies where schemaname='storage' and tablename='objects' and cmd='SELECT'")).rows;
    assert.ok(policies.length>=1,'an administrator listing policy exists');
    assert.ok(policies.every(row=>!/anon|public/.test(row.roles)),`no anonymous listing policy remains: ${JSON.stringify(policies)}`);
    assert.ok(!policies.some(row=>row.policyname==='Public can view site media'));
    // The schedule file must not fail where the scheduler is unavailable (it only prints a notice), and must not break on a second run.
    const schedule=await read('supabase/migrations/20261118_retention_schedule.sql');
    await db.exec(schedule);await db.exec(schedule);
    assert.match(schedule,/cron\.schedule\('chatbot-purge-old-data', '30 19 \* \* \*'/);
    assert.match(schedule,/cron\.unschedule/,'running the file again replaces the job instead of duplicating it');
    // The review queries documented for the twice-a-year review run against the real schema and return rows from it only.
    const doc=await read('docs/RETENTION.md');
    const queries=[...doc.matchAll(/```sql\n([\s\S]*?)```/g)].map(match=>match[1]).filter(sql=>!/cron\.job/.test(sql));
    assert.equal(queries.length,1,'one block holds the three review queries');
    for(const sql of queries[0].split(/;\s*\n/).map(part=>part.trim()).filter(part=>/^(--[^\n]*\n)*\s*select/i.test(part)))await db.query(sql);
    assert.equal(queries[0].match(/^select /gim).length,3);
    assert.doesNotMatch(queries[0].replace(/--[^\n]*/g,''),/\b(delete|update|insert|drop|truncate)\b/i,'the review queries only list records');
  }finally{await db.close?.();}
});

test('security.txt names a contact and is not about to expire',async()=>{
  const text=await read('public/.well-known/security.txt');
  assert.ok((text.match(/^Contact:\s*mailto:\S+@\S+$/gm)||[]).length>=2,'both team emails are listed');
  const expires=new Date((text.match(/^Expires:\s*(.+)$/m)||[])[1]);
  assert.ok(expires>new Date(Date.now()+60*24*3600*1000),`security.txt expires ${expires.toISOString().slice(0,10)}: renew it (docs/SECURITY_CHECKS.md)`);
  assert.match(text,/^Canonical:\s*https:\/\/\S+\/\.well-known\/security\.txt$/m);
});

test('server functions run in Singapore, next to the database',async()=>{
  const config=JSON.parse(await read('vercel.json'));
  assert.deepEqual(config.regions,['sin1']);
});

test('the privacy notice covers outreach, retention periods and data locations in both languages',()=>{
  for(const [label,doc] of [['English',legalDocuments['/privacy']],['Bahasa Melayu',privacyMalay]]){
    const titles=doc.sections.map(section=>section.title);
    titles.forEach((title,index)=>assert.ok(title.startsWith(`${index+1}. `),`${label}: section numbers run 1 to ${titles.length} without gaps (${title})`));
    const text=doc.sections.map(section=>[...(section.paragraphs||[]),...(section.bullets||[])].join(' ')).join(' ');
    const outreach=doc.sections.find(section=>section.id==='outreach');
    assert.ok(outreach,`${label}: a business outreach section exists`);
    assert.match(outreach.paragraphs.join(' '),/12/,`${label}: outreach retention period`);
    assert.match(text,/24/,`${label}: enquiry retention period`);
    assert.match(text,/Singapore|Singapura/,`${label}: data location`);
    assert.doesNotMatch(text,/not automatically deleted after a fixed period|tidak dipadam secara automatik selepas tempoh tetap/,`${label}: old retention wording is gone`);
  }
  assert.equal(legalUpdated,'2026-11-19');
  assert.match(JSON.stringify(legalDocuments['/data-deletion']),/marketing email contact/);
});
