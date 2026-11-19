import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database} from './helpers/database.mjs';
import {DEPOSIT_PERCENT,addDays,catalogueOptions,cleanItem,defaultValidUntil,displayStatus,formatDate,formatRange,isExpired,itemPrice,itemsFromEnquiry,malaysiaToday,newShareToken,shareUrl,tokenFromHash,totals,validateQuotation} from '../src/quotations/quotation.mjs';
import {TERMS_VERSION,quotationTerms} from '../src/quotations/terms.mjs';
import {legalDocuments} from '../src/legal/content.mjs';

test('dates follow Malaysia time and a quotation is valid for the whole of its last day',()=>{
  // 16:30 UTC on 19 Nov is already 00:30 on 20 Nov in Malaysia.
  assert.equal(malaysiaToday(new Date('2026-11-19T15:59:59Z')),'2026-11-19');
  assert.equal(malaysiaToday(new Date('2026-11-19T16:30:00Z')),'2026-11-20');
  assert.equal(defaultValidUntil('2026-11-19'),'2026-11-26');
  assert.equal(addDays('2026-12-28',7),'2027-01-04');
  // Issued Thursday 19 Nov: still valid late on Thursday 26 Nov, expired from Friday 27 Nov (Malaysia time).
  assert.equal(isExpired('2026-11-26',new Date('2026-11-26T15:59:00Z')),false);
  assert.equal(isExpired('2026-11-26',new Date('2026-11-26T16:00:00Z')),true);
  assert.equal(formatDate('2026-11-26'),'26 November 2026');
  assert.equal(displayStatus({status:'shared',valid_until:'2026-11-26'},new Date('2026-12-01T00:00:00Z')),'expired');
  assert.equal(displayStatus({status:'draft',valid_until:'2026-11-26'},new Date('2026-12-01T00:00:00Z')),'draft');
});

test('prices: fixed or a range per line, each billing type totalled separately',()=>{
  const items=[
    {name:'Company Website',billing:'one_time',paid_to:'studio',min:989,max:''},
    {name:'Booking system',billing:'one_time',paid_to:'studio',min:1500,max:2200},
    {name:'Domain',billing:'yearly',paid_to:'third_party',min:50,max:90},
    {name:'Hosting',billing:'monthly',paid_to:'third_party',min:30,max:''},
    {name:'Maintenance',billing:'monthly',paid_to:'studio',min:120,max:''},
    {name:'Server setup',billing:'one_time',paid_to:'third_party',min:200,max:''},
  ];
  const sum=totals(items);
  assert.deepEqual([sum.one_time.min,sum.one_time.max],[2689,3389]);
  assert.deepEqual([sum.monthly.min,sum.monthly.max],[150,150]);
  assert.deepEqual([sum.yearly.min,sum.yearly.max],[50,90]);
  assert.equal(sum.thirdParty,3);
  // The deposit is half of MV Studio's own one-time fees; the third-party server setup is left out.
  assert.equal(DEPOSIT_PERCENT,50);assert.deepEqual(sum.deposit,{min:1244.5,max:1594.5});
  assert.equal(formatRange(1500,2200),'RM 1,500 to RM 2,200');assert.equal(formatRange(989,null),'RM 989');assert.equal(formatRange(1244.5,1244.5),'RM 1,244.50');
  assert.equal(itemPrice(cleanItem(items[3])),'RM 30 / month');assert.equal(itemPrice(cleanItem({name:'SSL',min:0})),'Included');
  assert.equal(cleanItem({name:' x ',min:'10',max:'10'}).max,null);
});

test('the price list starts from the database and unpriced features must be typed',()=>{
  const options=catalogueOptions([{id:'s1',name:'Landing Page',price:449,summary:'One page',active:true,sort_order:1},{id:'s2',name:'Hidden',price:1,active:false}],[{id:'f1',name:'Hosting',category:'third_party',billing_type:'monthly',price:'30.00',active:true,sort_order:4},{id:'f2',name:'Domain registration',category:'third_party',billing_type:'quote',price:null,active:true,sort_order:6},{id:'f3',name:'Website maintenance',category:'maintenance',billing_type:'monthly',price:120,active:true,sort_order:7}]);
  assert.deepEqual(options.map(option=>option.label),['Landing Page','Hosting','Domain registration','Website maintenance']);
  assert.deepEqual(options[1].item,{name:'Hosting',description:'',billing:'monthly',paid_to:'third_party',min:30,max:''});
  assert.equal(options[2].item.min,'');assert.equal(options[3].group,'Maintenance');
  assert.deepEqual(itemsFromEnquiry([{name:'Landing page',category:'core',billing_type:'one_time',unit_price:449},{name:'Payment page',billing_type:'quote',unit_price:null}]).map(item=>[item.name,item.min]),[['Landing page',449],['Payment page','']]);
});

test('checks: only the client name is required among the contact details',()=>{
  const good={client_name:'Aisyah',company_name:'',client_email:'',client_phone:'',issued_on:'2026-11-19',valid_until:'2026-11-26',items:[{name:'Landing Page',min:449,max:''}],signature_id:'x'};
  assert.deepEqual(validateQuotation(good,'2026-11-19'),{});
  const bad=validateQuotation({...good,client_name:' ',client_email:'nope',client_phone:'12',valid_until:'2026-11-18',items:[{name:'',min:'',max:''},{name:'A',min:100,max:50}],signature_id:''},'2026-11-19');
  assert.deepEqual(Object.keys(bad).sort(),['client_email','client_name','client_phone','item-0-min','item-0-name','item-1-max','signature_id','valid_until']);
  assert.ok(validateQuotation({...good,items:[]},'2026-11-19').items);
  assert.ok(validateQuotation({...good,valid_until:'2027-03-01'},'2026-11-19').valid_until);
});

test('share links carry an unguessable secret after the # sign',()=>{
  const first=newShareToken(),second=newShareToken();
  assert.match(first,/^[A-Za-z0-9_-]{43}$/);assert.notEqual(first,second);
  assert.equal(shareUrl('https://example.test/',first),`https://example.test/quotation#${first}`);
  assert.equal(tokenFromHash(`#${first}`),first);assert.equal(tokenFromHash('#short'),'');assert.equal(tokenFromHash('#<script>alert(1)</script>aaaaaaaaaaaaaaaaaaaaaaaaaa'),'');
});

test('the terms cover every topic the studio promised, and the public terms agree',()=>{
  const all=quotationTerms.map(section=>[section.title,...(section.paragraphs||[]),...(section.bullets||[])].join(' ')).join(' ');
  for(const phrase of ['Third-party','open to discussion','50%','refund','source code','up to 2 rounds of design revisions','30 days','RM50','maintenance subscription','Personal Data Protection Act 2010','Computer Crimes Act 1997','Communications and Multimedia Act 1998','laws of Malaysia'])assert.ok(all.includes(phrase),`terms mention: ${phrase}`);
  assert.equal(quotationTerms.at(-1).id,'client');
  assert.equal(new Set(quotationTerms.map(section=>section.id)).size,quotationTerms.length);
  assert.match(TERMS_VERSION,/^\d{4}-\d{2}-\d{2}$/);
  const website=JSON.stringify(legalDocuments['/terms'].sections);
  assert.ok(website.includes('up to 2 rounds of design revisions'));assert.ok(website.includes('30 days after launch we fix bugs free of charge'));
});

const admin='22222222-2222-4222-8222-222222222222',token='A'.repeat(43);
const as=async(db,user,sql,values=[])=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);await db.exec(`set role ${user?'authenticated':'anon'}`);try{return await db.query(sql,values);}finally{await db.exec('reset role');}};
const shared=async(db,value=token)=>(await as(db,null,'select public.shared_quotation($1) as r',[value])).rows[0].r;
const signer={name:'Vincent Teo',role:'Co-founder',image:'data:image/png;base64,AAAA'};

test('database: IDs, access rules, share link states and expiry',async()=>{
  const db=await database();
  try{
    // The migration can be run again on a database that already has it.
    const migration=await readFile('supabase/migrations/20261119_quotations.sql','utf8');
    await db.exec(migration);await db.exec(migration);
    await db.query('insert into auth.users(id) values ($1)',[admin]);await db.query('insert into admin_users(user_id) values ($1)',[admin]);
    const today=(await db.query("select (now() at time zone 'Asia/Kuala_Lumpur')::date::text as d")).rows[0].d,stamp=today.replaceAll('-','');
    const insert=name=>as(db,admin,"insert into quotations(client_name,client_email,valid_until,items,signer,studio,terms,terms_version,quote_number) values ($1,'client@example.test',$2::date+7,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,'v1','FAKE-1') returning id,quote_number,issued_on::text,status",[name,today,JSON.stringify([{name:'Landing Page',billing:'one_time',paid_to:'studio',min:449,max:null}]),JSON.stringify(signer),JSON.stringify({emails:['hello@example.test']}),JSON.stringify([{id:'a',title:'1. A',paragraphs:['x']}])]);
    const first=(await insert('Aisyah Rahman')).rows[0],second=(await insert('Tan Wei')).rows[0];
    // The database gives the ID; a value typed by the browser is ignored.
    assert.equal(first.quote_number,`MVQ-${stamp}-001`);assert.equal(second.quote_number,`MVQ-${stamp}-002`);
    assert.equal(first.issued_on,today);assert.equal(first.status,'draft');
    // The ID cannot be changed afterwards, and a deleted ID is never reused.
    await as(db,admin,"update quotations set quote_number='MVQ-HACK' where id=$1",[first.id]);
    assert.equal((await db.query('select quote_number from quotations where id=$1',[first.id])).rows[0].quote_number,first.quote_number);
    await as(db,admin,'delete from quotations where id=$1',[second.id]);
    assert.equal((await insert('Third Client')).rows[0].quote_number,`MVQ-${stamp}-003`);

    // Visitors and signed-in non-administrators cannot read or write the tables.
    await assert.rejects(as(db,null,'select * from quotations'),/permission denied/);
    await assert.rejects(as(db,null,'select * from quotation_signatures'),/permission denied/);
    assert.equal((await as(db,'11111111-1111-4111-8111-111111111111','select * from quotations')).rows.length,0);
    await assert.rejects(as(db,'11111111-1111-4111-8111-111111111111',"insert into quotations(client_name,valid_until) values ('X Y',current_date+7)"),/row-level security/);
    await assert.rejects(as(db,'11111111-1111-4111-8111-111111111111','select * from quotation_counters'),/permission denied/);

    // A draft has no link, so nothing is shown, and a draft may not hold a secret.
    assert.deepEqual(await shared(db),{state:'not_found'});
    await assert.rejects(as(db,admin,'update quotations set share_token=$2 where id=$1',[first.id,token]),/quotations_link/);
    await as(db,admin,"update quotations set status='shared',share_token=$2,shared_at=now() where id=$1",[first.id,token]);
    const live=await shared(db);
    assert.equal(live.state,'active');assert.equal(live.quotation.quote_number,first.quote_number);assert.equal(live.quotation.client_name,'Aisyah Rahman');assert.equal(live.quotation.signer.name,'Vincent Teo');
    // Private fields never leave the database.
    for(const key of ['id','share_token','created_by','enquiry_id','signature_id'])assert.equal(key in live.quotation,false,`${key} is not shown`);
    // A wrong, short or malformed secret reveals nothing.
    for(const wrong of ['B'.repeat(43),'short','',`${token}' or '1'='1`])assert.deepEqual(await shared(db,wrong),{state:'not_found'});
    assert.deepEqual((await as(db,null,'select public.shared_quotation(null) as r')).rows[0].r,{state:'not_found'});

    // Accepted stays readable; declined and revoked do not.
    await as(db,admin,"update quotations set status='accepted' where id=$1",[first.id]);assert.equal((await shared(db)).state,'active');
    await as(db,admin,"update quotations set status='declined' where id=$1",[first.id]);assert.deepEqual(await shared(db),{state:'not_found'});
    await as(db,admin,"update quotations set status='revoked',share_token=null where id=$1",[first.id]);assert.deepEqual(await shared(db),{state:'not_found'});

    // On its last valid day it is still shown; the day after, only the ID and the date remain.
    await as(db,admin,"update quotations set status='shared',share_token=$2,issued_on=$3::date-7,valid_until=$3::date where id=$1",[first.id,token,today]);
    assert.equal((await shared(db)).state,'active');
    await as(db,admin,"update quotations set issued_on=$2::date-8,valid_until=$2::date-1 where id=$1",[first.id,today]);
    const expired=await shared(db);
    assert.equal(expired.state,'expired');assert.equal(expired.quote_number,first.quote_number);
    assert.deepEqual(Object.keys(expired).sort(),['quote_number','state','studio','valid_until']);

    // Guard rails on the data itself.
    await assert.rejects(as(db,admin,'update quotations set valid_until=issued_on+91 where id=$1',[first.id]),/quotations_dates/);
    await assert.rejects(as(db,admin,"insert into quotation_signatures(name,image) values ('Max Yong','https://example.test/sign.png')"),/check/);
    const sign=(await as(db,admin,"insert into quotation_signatures(name,role,image) values ('Max Yong','Co-founder','data:image/png;base64,AAAA') returning id")).rows[0].id;
    await as(db,admin,'update quotations set signature_id=$2 where id=$1',[first.id,sign]);
    // Removing a signature keeps the copy already placed on a quotation.
    await as(db,admin,'delete from quotation_signatures where id=$1',[sign]);
    const kept=(await db.query('select signature_id,signer from quotations where id=$1',[first.id])).rows[0];
    assert.equal(kept.signature_id,null);assert.equal(kept.signer.name,'Vincent Teo');
  }finally{await db.close();}
});
