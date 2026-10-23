import test from 'node:test';
import assert from 'node:assert/strict';
import {localDay,eligiblePromotion,canShowPromotion,claimPromotion} from '../src/lib/promotions.mjs';
test('one impression per local calendar day across all campaigns',()=>{
  const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  const today=new Date(2026,9,23,23,59),tomorrow=new Date(2026,9,24,0,1);
  assert.equal(localDay(today),'2026-10-23');
  assert.equal(claimPromotion(storage,today),true);
  assert.equal(canShowPromotion(storage,today),false);
  assert.equal(claimPromotion(storage,today),false);
  assert.equal(claimPromotion(storage,tomorrow),true);
});
test('blocked or full storage skips advertising without crashing',()=>{
  const blocked={getItem(){throw Error('blocked');}};
  assert.equal(canShowPromotion(blocked),false);
  assert.equal(claimPromotion(blocked),false);
  assert.equal(claimPromotion({getItem:()=>null,setItem(){throw Error('quota');}}),false);
});
test('only published enabled offers inside their date window are eligible',()=>{
  const now=Date.parse('2026-10-23T12:00:00Z'),base={active:true,enabled:true};
  const items=[{...base,id:'disabled',enabled:false},{...base,id:'draft',active:false},{...base,id:'expired',ends_at:'2026-10-23T12:00:00Z'},{...base,id:'future',starts_at:'2026-10-24T00:00:00Z'},{...base,id:'invalid',starts_at:'bad'},{...base,id:'second',sort_order:2},{...base,id:'first',sort_order:1}];
  assert.equal(eligiblePromotion(items,now).id,'first');
  assert.equal(eligiblePromotion(items.slice(0,5),now),undefined);
});
