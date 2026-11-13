import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ms from '../src/i18n/ms.js';
import zh from '../src/i18n/zh.js';

// Text passed to t() as a literal in the translated components. Strings that reach
// t() through a variable (menu labels, process steps, detail labels) are listed below.
const files=['src/App.jsx','src/components/Faq.jsx','src/components/EnquiryForm.jsx'];
const dynamic=['Studio','Work','Services','Contact','Scope','Revisions','Third-party costs','Maintenance','After-launch support','Payment','Listen first','Shape the idea','Build with you','Launch & support','We get to know your business, the people you serve, and what success looks like.','We map the right scope and share a clear proposal before development begins.','You see progress along the way and help guide the details that matter.','We launch together, then stay available for the next improvements.','The challenge','Our approach','The outcome','starting price','tailored to you','Annual services','Monthly services','Sending enquiry…','Send project enquiry','Continue on WhatsApp','Use WhatsApp instead','Your enquiry is saved. Review and send the same details in WhatsApp to continue with our team.','Review and send your entered details in WhatsApp. This does not submit the website enquiry.'];

test('every translated string exists in Bahasa Malaysia and Chinese',async()=>{
  const used=new Set(dynamic);
  for(const file of files)for(const match of (await readFile(file,'utf8')).matchAll(/\bt\('((?:[^'\\]|\\.)+)'/g))used.add(match[1]);
  assert.ok(used.size>120,`Expected the interface strings to be found, got ${used.size}`);
  for(const [name,table] of [['ms',ms],['zh',zh]]){
    const missing=[...used].filter(text=>typeof table[text]!=='string'||!table[text].trim());
    assert.deepEqual(missing,[],`${name} is missing translations`);
  }
});

test('both languages cover the same keys and keep placeholders intact',()=>{
  assert.deepEqual(Object.keys(ms).sort(),Object.keys(zh).sort());
  for(const [name,table] of [['ms',ms],['zh',zh]])for(const [source,translated] of Object.entries(table)){
    const marks=text=>(text.match(/\{[a-z]+\}/g)||[]).sort();
    assert.deepEqual(marks(translated),marks(source),`${name}: placeholder mismatch in “${source}”`);
    assert.ok(!/[<>]/.test(translated),`${name}: “${source}” must not contain markup`);
  }
});
