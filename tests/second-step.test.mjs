import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database} from './helpers/database.mjs';
import {secondStepSatisfied} from '../supabase/functions/_shared/http.mjs';

const admin='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const token=claims=>`header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;

test('server functions refuse a password-only session once an authenticator is verified',()=>{
  const verified={factors:[{status:'verified'}]},pending={factors:[{status:'unverified'}]};
  assert.equal(secondStepSatisfied({},token({aal:'aal1'})),true,'No authenticator: the password is enough');
  assert.equal(secondStepSatisfied(pending,token({aal:'aal1'})),true,'An unfinished setup does not lock anyone out');
  assert.equal(secondStepSatisfied(verified,token({aal:'aal1'})),false);
  assert.equal(secondStepSatisfied(verified,token({})),false);
  assert.equal(secondStepSatisfied(verified,token({aal:'aal2'})),true);
  // Anything unreadable is treated as not verified, never as verified.
  for(const bad of ['','not-a-token','a.b.c','a..c',null,undefined])assert.equal(secondStepSatisfied(verified,bad),false,`“${bad}” must not pass`);
  assert.equal(secondStepSatisfied(null,'anything'),true);
});

test('the database treats an administrator with an authenticator as admin only after the second step',async()=>{
  const db=await database();
  // Act as a signed-in user with the given session claims, the way the hosted database sees a request.
  const isAdmin=async(user,claims={})=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(claims)]);await db.exec('set role authenticated');try{return (await db.query('select public.is_admin() ok')).rows[0].ok;}finally{await db.exec('reset role');}};
  const canReadEnquiries=async(user,claims)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(claims)]);await db.exec('set role authenticated');try{return (await db.query('select count(*)::int n from enquiries')).rows[0].n;}finally{await db.exec('reset role');}};
  try{
    const migration=await readFile('supabase/migrations/20261115_admin_second_step.sql','utf8');await db.exec(migration);await db.exec(migration);
    await db.query('insert into auth.users(id) values ($1),($2)',[admin,other]);await db.query('insert into admin_users(user_id) values ($1)',[admin]);
    await db.query("insert into enquiries(name,company_name,phone,email) values('Aina','Kopi Lane','+60123456789','aina@example.com')");

    assert.equal(await isAdmin(admin,{aal:'aal1'}),true,'Without an authenticator nothing changes');
    assert.equal(await isAdmin(other,{aal:'aal2'}),false,'A non-administrator is never an administrator');
    await db.query("insert into auth.mfa_factors(user_id,status) values ($1,'unverified')",[admin]);
    assert.equal(await isAdmin(admin,{aal:'aal1'}),true,'An unfinished setup does not lock the administrator out');

    await db.query("update auth.mfa_factors set status='verified' where user_id=$1",[admin]);
    assert.equal(await isAdmin(admin,{aal:'aal1'}),false,'Password alone is refused');
    assert.equal(await isAdmin(admin,{}),false,'A session with no assurance level is refused');
    assert.equal(await isAdmin(admin,{aal:'aal2'}),true,'Password plus authenticator is accepted');
    // The row-level rules follow: enquiries are invisible to the password-only session.
    assert.equal(await canReadEnquiries(admin,{aal:'aal1'}),0);
    assert.equal(await canReadEnquiries(admin,{aal:'aal2'}),1);
    // Another administrator without an authenticator is unaffected by this one's choice.
    await db.query('insert into admin_users(user_id) values ($1)',[other]);
    assert.equal(await isAdmin(other,{aal:'aal1'}),true);

    await db.query('delete from auth.mfa_factors where user_id=$1',[admin]);
    assert.equal(await isAdmin(admin,{aal:'aal1'}),true,'Removing the authenticator restores password-only access');
  }finally{await db.close();}
});
