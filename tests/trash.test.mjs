import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database} from './helpers/database.mjs';

const admin='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',stranger='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
// Act as a signed-in user, the way the hosted database sees a browser request.
const as=async(db,user,sql,values=[])=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);await db.exec(`set role ${user?'authenticated':'anon'}`);try{return await db.query(sql,values);}finally{await db.exec('reset role');}};

test('recently deleted: content and enquiries can be restored for 30 days by administrators only',async()=>{
  const db=await database();
  try{
    const migration=await readFile('supabase/migrations/20261114_recently_deleted.sql','utf8');await db.exec(migration);await db.exec(migration);
    await db.query('insert into auth.users(id) values ($1),($2)',[admin,stranger]);await db.query('insert into admin_users(user_id) values ($1)',[admin]);
    const before=(await db.query("select * from services order by sort_order limit 1")).rows[0];assert.ok(before?.id,'The seed data has a service');
    const total=(await db.query('select count(*)::int n from services')).rows[0].n;

    // Only an administrator may delete, list, restore or purge.
    await assert.rejects(as(db,stranger,'select admin_trash_delete($1,$2)',['services',before.id]),/Administrator access required/);
    await assert.rejects(as(db,null,'select admin_trash_delete($1,$2)',['services',before.id]));
    await assert.rejects(as(db,stranger,'select * from admin_trash_list()'),/Administrator access required/);
    await assert.rejects(as(db,stranger,'select * from admin_trash'),/permission denied/);
    assert.equal((await db.query('select count(*)::int n from services')).rows[0].n,total);

    // Delete moves the row out of the public table, so the website can no longer read it.
    await as(db,admin,'select admin_trash_delete($1,$2)',['services',before.id]);
    assert.equal((await db.query('select count(*)::int n from services where id=$1',[before.id])).rows[0].n,0);
    assert.equal((await as(db,null,'select count(*)::int n from services where id=$1',[before.id])).rows[0].n,0);
    const listed=(await as(db,admin,'select * from admin_trash_list()')).rows;assert.equal(listed.length,1);assert.equal(listed[0].source_table,'services');assert.equal(listed[0].label,before.name);
    await assert.rejects(as(db,admin,'select admin_trash_delete($1,$2)',['services',before.id]),/not found or is already deleted/);
    await assert.rejects(as(db,admin,'select admin_trash_delete($1,$2)',['admin_users',admin]),/cannot be deleted here/);
    await assert.rejects(as(db,admin,'select admin_trash_delete($1,$2)',['services; drop table services',before.id]),/cannot be deleted here/);

    // Restore brings back the identical row, including its id, price and feature list.
    await as(db,admin,'select admin_trash_restore($1,$2)',['services',listed[0].trash_id]);
    assert.deepEqual((await db.query('select * from services where id=$1',[before.id])).rows[0],before);
    assert.equal((await as(db,admin,'select * from admin_trash_list()')).rows.length,0);
    await assert.rejects(as(db,admin,'select admin_trash_restore($1,$2)',['services',listed[0].trash_id]),/no longer in Recently deleted/);

    // Delete forever removes it for good.
    await as(db,admin,'select admin_trash_delete($1,$2)',['services',before.id]);
    const again=(await as(db,admin,'select * from admin_trash_list()')).rows[0];
    await as(db,admin,'select admin_trash_purge($1,$2)',['services',again.trash_id]);
    assert.equal((await as(db,admin,'select * from admin_trash_list()')).rows.length,0);assert.equal((await db.query('select count(*)::int n from services')).rows[0].n,total-1);

    // Enquiries keep their history: delete only marks them, restore unmarks them.
    const enquiry=(await db.query("insert into enquiries(name,company_name,phone,email,message) values('Aina','Kopi Lane','+60123456789','aina@example.com','Website') returning id")).rows[0].id;
    const history=(await db.query('select count(*)::int n from enquiry_status_history where enquiry_id=$1',[enquiry])).rows[0].n;
    await as(db,admin,'select admin_trash_delete($1,$2)',['enquiries',enquiry]);
    assert.ok((await db.query('select deleted_at from enquiries where id=$1',[enquiry])).rows[0].deleted_at);
    assert.deepEqual((await as(db,admin,'select source_table,label,detail from admin_trash_list()')).rows,[{source_table:'enquiries',label:'Aina',detail:'Kopi Lane'}]);
    await as(db,admin,'select admin_trash_restore($1,$2)',['enquiries',enquiry]);
    assert.equal((await db.query('select deleted_at from enquiries where id=$1',[enquiry])).rows[0].deleted_at,null);
    assert.equal((await db.query('select count(*)::int n from enquiry_status_history where enquiry_id=$1',[enquiry])).rows[0].n,history,'Restoring does not duplicate history');

    // Anything left for more than 30 days is cleared the next time the list is opened.
    const faq=(await db.query("insert into faqs(title,answer) values('Old question','Old answer') returning id")).rows[0].id;
    await as(db,admin,'select admin_trash_delete($1,$2)',['faqs',faq]);await as(db,admin,'select admin_trash_delete($1,$2)',['enquiries',enquiry]);
    assert.equal((await as(db,admin,'select * from admin_trash_list()')).rows.length,2);
    await db.exec("update admin_trash set deleted_at=now()-interval '31 days'; update enquiries set deleted_at=now()-interval '31 days' where deleted_at is not null");
    assert.equal((await as(db,admin,'select * from admin_trash_list()')).rows.length,0);
    assert.equal((await db.query('select count(*)::int n from enquiries where id=$1',[enquiry])).rows[0].n,0);
  }finally{await db.close();}
});
