import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database} from './helpers/database.mjs';

test('schema migration, RLS, permissions, rate limits, publication and duplicate protection',async()=>{
  const db=await database();
  try{
    await db.exec(await readFile('supabase/migrations/20261024_growth_and_reliability.sql','utf8'));
    await db.exec((await readFile('supabase/schema.sql','utf8')).replace('create extension if not exists pgcrypto;',''));
    assert.equal((await db.query('select count(*)::int as n from public.services')).rows[0].n,4);
    await assert.rejects(db.query("insert into testimonials(name,quote,active) values ('Client','A real quote with permission.',true)"),e=>e.code==='23514');
    await db.query("insert into testimonials(name,quote,permission_confirmed,active) values ('Client','A real quote with permission.',true,true),('Draft','A private draft without approval.',false,false)");
    await db.exec('set role anon');
    assert.equal((await db.query('select count(*)::int as n from testimonials')).rows[0].n,1);
    await assert.rejects(db.query('select * from enquiries'),e=>e.code==='42501');
    await assert.rejects(db.query("insert into services(name) values ('Unauthorized')"),e=>e.code==='42501');
    await assert.rejects(db.query("select consume_enquiry_rate_limit('public')"),e=>e.code==='42501');
    await db.exec('reset role; set role service_role');
    assert.ok((await db.query('select * from feature_options')).rows.length);
    const results=[];for(let i=0;i<6;i++)results.push((await db.query("select consume_enquiry_rate_limit('test-limit',5,3600) as ok")).rows[0].ok);
    assert.deepEqual(results,[true,true,true,true,true,false]);
    await db.query("insert into enquiries(name,company_name,phone,email,request_id) values ('Client','Company','+60123456789','client@example.test','22222222-2222-4222-8222-222222222222')");
    await assert.rejects(db.query("insert into enquiries(name,company_name,phone,email,request_id) values ('Client','Company','+60123456789','client@example.test','22222222-2222-4222-8222-222222222222')"),e=>e.code==='23505');
    await db.exec('reset role');
    const ids=(await db.query('select id from projects')).rows;
    for(const {id} of ids)await db.query('update projects set show_in_footer=true where id=$1',[id]);
    await assert.rejects(db.query("insert into projects(name,show_in_footer) values ('Fifth footer project',true)"),e=>e.code==='23514');
    const adminId='33333333-3333-4333-8333-333333333333';
    await db.query('insert into auth.users(id) values ($1)',[adminId]);await db.query('insert into admin_users(user_id) values ($1)',[adminId]);
    await db.exec('set role authenticated');
    await assert.rejects(db.query("insert into testimonials(name,quote) values ('Stranger','This should not be allowed.')"),e=>e.code==='42501');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[adminId]);
    await db.query("insert into testimonials(name,quote) values ('Approved admin','Admin-created draft quote.')");
    assert.equal((await db.query('select count(*)::int as n from testimonials')).rows[0].n,3);
  }finally{await db.close();}
});
