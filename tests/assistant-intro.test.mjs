import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assistantIntroKey,canIntroduceAssistant,claimAssistantIntro,rememberAssistantIntro} from '../src/lib/assistant-intro.mjs';
test('assistant introduction is shown once per browser and stays dismissed',()=>{
 const rows=new Map(),storage={getItem:key=>rows.get(key)??null,setItem:(key,value)=>rows.set(key,value)};
 assert.equal(canIntroduceAssistant(storage),true);assert.equal(claimAssistantIntro(storage),true);
 assert.equal(rows.get(assistantIntroKey),'seen');assert.equal(claimAssistantIntro(storage),false);
 assert.equal(rememberAssistantIntro(storage),true);assert.equal(canIntroduceAssistant(storage),false);
 assert.equal(rows.size,1);
});
test('blocked or full storage skips the automatic introduction safely',()=>{
 const blocked={getItem(){throw Error('Blocked');},setItem(){throw Error('Blocked');}};
 assert.equal(canIntroduceAssistant(blocked),false);assert.equal(claimAssistantIntro(blocked),false);
 assert.equal(claimAssistantIntro({getItem:()=>null,setItem(){throw Error('Full');}}),false);
});
