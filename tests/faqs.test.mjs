import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database} from './helpers/database.mjs';
import {validateEntity} from '../src/admin/validation.js';
import {entityConfig} from '../src/admin/config.js';

test('FAQ migration preserves edits and restricts drafts and management to admins',async()=>{
  const db=await database();
  try{
    const sql=await readFile('supabase/migrations/20261026_public_faqs.sql','utf8');
    await db.query("update faqs set title='Our updated hosting policy?',answer='An administrator has reviewed and updated this answer.' where key='hosting-costs'");
    await db.exec(sql);
    assert.equal((await db.query("select title from faqs where key='hosting-costs'")).rows[0].title,'Our updated hosting policy?');
    await db.query("insert into faqs(title,answer,active) values ('Private draft question?','This draft must only be visible to administrators.',false)");
    const adminId=crypto.randomUUID();
    await db.query('insert into auth.users(id) values ($1)',[adminId]);await db.query('insert into admin_users(user_id) values ($1)',[adminId]);
    await db.exec('set role anon');
    assert.equal((await db.query('select count(*)::int as n from faqs')).rows[0].n,6);
    await assert.rejects(db.query("insert into faqs(title,answer) values ('Unauthorized question?','This must not be saved by a visitor.')"),e=>e.code==='42501');
    await db.exec('reset role; set role authenticated');
    assert.equal((await db.query('select count(*)::int as n from faqs')).rows[0].n,6);
    await assert.rejects(db.query("insert into faqs(title,answer) values ('Unauthorized question?','This must not be saved by an ordinary user.')"),e=>e.code==='42501');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[adminId]);
    assert.equal((await db.query('select count(*)::int as n from faqs')).rows[0].n,7);
    const saved=(await db.query("insert into faqs(title,answer,active) values ('Administrator question?','An administrator may manage this published answer.',true) returning id")).rows[0];
    await db.query('update faqs set active=false where id=$1',[saved.id]);await db.query('delete from faqs where id=$1',[saved.id]);
  }finally{await db.close();}
});

test('FAQ editor rejects incomplete answers and invalid display ordering',()=>{
  assert.ok(validateEntity({title:'Why?',answer:'',sort_order:0},entityConfig.faqs).answer);
  assert.ok(validateEntity({title:'Valid question?',answer:'A useful and complete answer.',sort_order:-1},entityConfig.faqs).sort_order);
  assert.deepEqual(validateEntity({title:'Valid question?',answer:'A useful and complete answer.',sort_order:10,active:true},entityConfig.faqs),{});
});
