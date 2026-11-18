// A read-only security check of the LIVE site, using only what any visitor has: the public browser key that
// the site's own page already contains. It writes nothing: the write checks use an id that does not exist, so
// even a mistake in the access rules could not change a real row.
//   npm run test:security                 (checks https://mv-aistudio.vercel.app)
//   SITE_URL=https://example.com npm run test:security
// It also runs every Monday on GitHub (.github/workflows/security.yml). See docs/SECURITY_CHECKS.md.
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=(process.env.SITE_URL||'https://mv-aistudio.vercel.app').replace(/\/$/,'');
// Tables that are meant to be readable by the public. Every OTHER table the migrations create must be closed.
// A new table that belongs here has to be added on purpose; that is the point of the list.
const PUBLIC_TABLES={faqs:'uuid',feature_options:'uuid',projects:'uuid',promotions:'uuid',services:'uuid',site_content:'int',team_members:'uuid',testimonials:'uuid'};
// Admin-only server functions: must refuse a caller who has no administrator session.
const ADMIN_FUNCTIONS=['marketing','chatbot-admin','retry-enquiry'];
const results=[];
const check=(name,ok,detail='')=>{results.push({name,ok,detail});console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?`  (${detail})`:''}`);};
const get=async(url,options={})=>{try{return await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(25000),...options});}catch(error){return {status:0,headers:new Headers(),text:async()=>'',json:async()=>null,error};}};

function privateTables(){
  const files=[path.join(root,'supabase/schema.sql'),...readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).map(f=>path.join(root,'supabase/migrations',f))];
  const found=new Set();
  for(const file of files)for(const match of readFileSync(file,'utf8').matchAll(/create table(?: if not exists)?\s+(?:public\.)?([a-z_]+)/gi))found.add(match[1].toLowerCase());
  return [...found].filter(name=>!(name in PUBLIC_TABLES)).sort();
}

const home=await get(`${SITE}/`);
const html=home.status===200?await home.text():'';
check('Home page loads',home.status===200,`http ${home.status}`);
const bundle=(html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)||[])[0];
const bundleText=bundle?await (await get(`${SITE}${bundle}`)).text():'';
const supabaseUrl=(bundleText.match(/https:\/\/[a-z0-9]+\.supabase\.co/)||[])[0];
const anonKey=(bundleText.match(/sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/)||[])[0];
check('Public database address and key found in the site',Boolean(supabaseUrl&&anonKey));

if(supabaseUrl&&anonKey){
  const auth={apikey:anonKey,Authorization:`Bearer ${anonKey}`};
  // 1. Strangers cannot create accounts.
  const settings=await (await get(`${supabaseUrl}/auth/v1/settings`,{headers:{apikey:anonKey}})).json().catch(()=>null);
  check('Public sign-up is switched off',settings?.disable_signup===true,`disable_signup=${settings?.disable_signup}`);
  // 2. Private tables are closed to the public key.
  const open=[];
  for(const table of privateTables()){
    const response=await get(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`,{headers:auth});
    const body=await response.json().catch(()=>null);
    if(response.status===200&&Array.isArray(body)&&body.length>0)open.push(table);
    else if(response.status===200&&Array.isArray(body))open.push(`${table} (readable, currently empty)`);
  }
  check(`Private tables are closed to the public key (${privateTables().length} checked)`,open.length===0,open.join(', '));
  // 3. The public key cannot change anything. The id does not exist, so nothing could be modified.
  const writable=[];
  for(const [table,idType] of Object.entries(PUBLIC_TABLES)){
    const id=idType==='int'?'-1':'00000000-0000-0000-0000-000000000000';
    for(const method of ['PATCH','DELETE']){
      const response=await get(`${supabaseUrl}/rest/v1/${table}?id=eq.${id}`,{method,headers:{...auth,'Content-Type':'application/json'},...(method==='PATCH'?{body:JSON.stringify({updated_at:'2026-01-01'})}:{})});
      if(![401,403].includes(response.status))writable.push(`${method} ${table} -> ${response.status}`);
    }
  }
  check('Public tables refuse changes from the public key',writable.length===0,writable.join(', '));
  // 4. File names in the image storage cannot be listed (the files themselves stay public by address).
  const listing=await get(`${supabaseUrl}/storage/v1/object/list/site-media`,{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({prefix:'',limit:3})});
  const listed=await listing.json().catch(()=>null);
  check('Strangers cannot list the files in image storage',!(listing.status===200&&Array.isArray(listed)&&listed.length>0),`http ${listing.status}, ${Array.isArray(listed)?listed.length:0} names`);
  // 5. Admin functions refuse a caller without a session, and every function refuses other websites.
  for(const name of ADMIN_FUNCTIONS){
    const noSession=await get(`${supabaseUrl}/functions/v1/${name}`,{method:'POST',headers:{...auth,'Content-Type':'application/json',Origin:SITE},body:'{"action":"list"}'});
    check(`Admin function "${name}" refuses a caller with no session`,noSession.status===401||noSession.status===403,`http ${noSession.status}`);
  }
  const foreign=await get(`${supabaseUrl}/functions/v1/submit-enquiry`,{method:'OPTIONS',headers:{Origin:'https://evil.example','Access-Control-Request-Method':'POST'}});
  check('Server functions refuse other websites',foreign.status===403,`http ${foreign.status}`);
}

// 6. Browser protections on the pages.
const headers=home.headers;
const csp=headers.get('content-security-policy')||'';
check('Content-Security-Policy is sent and strict',/default-src 'self'/.test(csp)&&!/script-src[^;]*'unsafe-(inline|eval)'/.test(csp)&&!/style-src[^;]*'unsafe-inline'/.test(csp),'public pages allow no inline scripts or styles');
check('Strict-Transport-Security is sent',/max-age=\d{7,}/.test(headers.get('strict-transport-security')||''));
check('Framing is blocked',/deny/i.test(headers.get('x-frame-options')||'')&&/frame-ancestors 'none'/.test(csp));
check('MIME sniffing is blocked',/nosniff/i.test(headers.get('x-content-type-options')||''));
check('Referrer-Policy and Permissions-Policy are sent',Boolean(headers.get('referrer-policy')&&headers.get('permissions-policy')));
const admin=await get(`${SITE}/admin`);
const adminCsp=admin.headers.get('content-security-policy')||'';
check('Admin page never allows inline or eval scripts',admin.status===200&&/script-src 'self'/.test(adminCsp)&&!/script-src[^;]*'unsafe-(inline|eval)'/.test(adminCsp));
// 7. Nothing that should not be public.
check('Source maps are not served',bundle?[403,404].includes((await get(`${SITE}${bundle}.map`)).status):false);
check('A missing page is a real 404',(await get(`${SITE}/this-page-does-not-exist`)).status===404);
const robots=await (await get(`${SITE}/robots.txt`)).text();
check('Admin is kept out of search results (robots.txt)',/Disallow:\s*\/admin/i.test(robots));
// 8. Anyone who finds a problem knows where to report it, and the notice has not expired.
const securityTxt=await get(`${SITE}/.well-known/security.txt`);
const securityText=securityTxt.status===200?await securityTxt.text():'';
const expires=(securityText.match(/^Expires:\s*(.+)$/im)||[])[1];
check('security.txt lists a contact and has not expired',securityTxt.status===200&&/^Contact:\s*\S+/im.test(securityText)&&Boolean(expires)&&new Date(expires)>new Date(),expires?`expires ${expires}`:`http ${securityTxt.status}`);

const failed=results.filter(r=>!r.ok);
console.log(`\n${results.length-failed.length}/${results.length} checks passed.`);
if(failed.length){console.log('Failed:');for(const r of failed)console.log(` - ${r.name}${r.detail?` (${r.detail})`:''}`);process.exit(1);}
