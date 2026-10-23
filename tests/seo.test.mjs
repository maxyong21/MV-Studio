import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeJson,escapeHtml,siteUrl,meta} from '../scripts/seo.mjs';
import {localDateTime} from '../src/lib/site.js';
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
