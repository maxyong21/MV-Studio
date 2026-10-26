import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeJson,escapeHtml,siteUrl,meta} from '../scripts/seo.mjs';
import {localDateTime} from '../src/lib/site.js';
import {whatsappHref} from '../src/lib/site.js';
import {whatsappEnquiryHref,whatsappEnquiryMessage} from '../src/lib/whatsapp-enquiry.mjs';
test('SEO output escapes public content and rejects invalid canonical origins',()=>{
  const data={text:'</script><script>alert(1)</script>&\u2028'};
  assert.ok(!safeJson(data).includes('</script>'));assert.deepEqual(JSON.parse(safeJson(data)),data);
  assert.equal(escapeHtml('A&B <x>'),'A&amp;B &lt;x&gt;');
  assert.equal(siteUrl('https://mv-aistudio.vercel.app/'),'https://mv-aistudio.vercel.app');
  assert.throws(()=>siteUrl('javascript:alert(1)'));assert.throws(()=>siteUrl('https://example.com/path'));
  const result=meta('<head><meta property="og:title" content="old" /></head>','og:title','A "quote" & value');
  assert.ok(result.includes('A &quot;quote&quot; &amp; value'));assert.equal((result.match(/og:title/g)||[]).length,1);
});
test('editing a promotion date preserves its instant in the local timezone',()=>{
  const instant='2026-10-24T10:00:00.000Z';
  assert.equal(new Date(localDateTime(instant)).toISOString(),instant);
  assert.equal(localDateTime('invalid'),'');
});
test('WhatsApp accepts Malaysian local and international numbers without using the call list',()=>{
  assert.equal(whatsappHref('011-5403 9173'),'https://wa.me/601154039173');
  assert.equal(whatsappHref('+60 11-5403 9173'),'https://wa.me/601154039173');
  assert.equal(whatsappHref(''), '');assert.equal(whatsappHref('javascript:alert(1)'), '');
});
test('WhatsApp draft includes entered scope and contact details without internal IDs or quotation prices',()=>{
  const values={name:'Alex Tan',company_name:'Bread & Butter',phone:'01154039173',email:'alex+bakery@example.test',message:'We need a bakery website.\n可以网上订购吗？',billing_period:'yearly',meeting_requested:true,preferred_meeting_at:'2099-01-01T10:00',request_id:'do-not-share',website:'hidden-field',chatbot_estimate_token:'private-token'};
  const features=[{name:'Landing page',price:9999},{name:'Maintenance',billing_type:'monthly'}];
  const url=new URL(whatsappEnquiryHref('01154039173',values,features));
  assert.equal(url.origin+url.pathname,'https://wa.me/601154039173');
  const message=url.searchParams.get('text');
  assert.match(message,/Name: Alex Tan/);assert.match(message,/Company: Bread & Butter/);assert.match(message,/alex\+bakery@example.test/);
  assert.ok(message.includes(values.message));assert.match(message,/- Landing page/);assert.match(message,/Annual/);assert.match(message,/2099-01-01 10:00/);
  assert.doesNotMatch(message,/do-not-share|hidden-field|private-token|9999|undefined|null/);
});
test('partial and empty WhatsApp drafts stay usable without requiring a website submission',()=>{
  const text=whatsappEnquiryMessage({message:'Just looking for advice.'});
  assert.match(text,/Just looking for advice/);assert.doesNotMatch(text,/Name:|Email:|Recurring|Preferred meeting/);
  assert.ok(whatsappEnquiryMessage().startsWith('Hi MV Studio'));
  assert.equal(whatsappEnquiryHref('',{},[]),'');
});
