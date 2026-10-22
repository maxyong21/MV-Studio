const TABLES = {
  services: { json: ['features'], bool: ['active'] },
  projects: { json: ['tags'], bool: ['active', 'featured'] },
  team_members: { bool: ['active'] },
  promotions: { bool: ['enabled', 'active'] },
  feature_options: { bool: ['active'] },
  enquiries: { json: ['selected_features'], bool: ['meeting_requested'] },
};
const EDITABLE = {
  services: ['name','category','price','original_price','currency','summary','features','timeline','active','sort_order'],
  projects: ['name','category','summary','seo_title','seo_description','image_url','demo_url','video_url','tags','featured','active','sort_order'],
  team_members: ['name','role','bio','image_url','linkedin_url','github_url','website_url','active','sort_order'],
  promotions: ['title','message','button_label','button_url','image_url','enabled','active','starts_at','ends_at','sort_order'],
  feature_options: ['name','description','category','billing_type','price','annual_free_months','active','sort_order'],
};
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
let certCache = null;
let certCacheUntil = 0;

const responseJson = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const nowIso = () => new Date().toISOString();
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const asBase64UrlBytes = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)), c => c.charCodeAt(0));
const decodeJwtPart = value => JSON.parse(new TextDecoder().decode(asBase64UrlBytes(value)));

function decodeRow(table, row) {
  if (!row) return row;
  for (const key of TABLES[table]?.json || []) { try { row[key] = JSON.parse(row[key] || '[]'); } catch { row[key] = []; } }
  for (const key of TABLES[table]?.bool || []) row[key] = Boolean(row[key]);
  return row;
}
function prepareValues(table, input, fields) {
  const config = TABLES[table];
  const result = {};
  for (const key of fields) {
    if (!Object.hasOwn(input, key)) continue;
    const value = input[key];
    result[key] = config?.json.includes(key) ? JSON.stringify(Array.isArray(value) ? value : []) : config?.bool.includes(key) ? (value ? 1 : 0) : value;
  }
  return result;
}

async function accessKeys(teamDomain) {
  if (certCache && Date.now() < certCacheUntil) return certCache;
  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!response.ok) throw new Error('Could not load Cloudflare Access signing keys.');
  const value = await response.json();
  certCache = value.keys || [];
  certCacheUntil = Date.now() + 5 * 60 * 1000;
  return certCache;
}

async function currentAdmin(request, env) {
  if (env.ENVIRONMENT === 'development' && env.DEV_ADMIN_EMAIL) {
    const email = request.headers.get('x-dev-admin-email') || env.DEV_ADMIN_EMAIL;
    return { email: email.toLowerCase() };
  }
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = decodeJwtPart(parts[0]);
    const claims = decodeJwtPart(parts[1]);
    const allowedAudiences = env.ACCESS_AUD.split(',').map(value => value.trim()).filter(Boolean);
    if (header.alg !== 'RS256' || !claims.exp || claims.exp <= Date.now() / 1000 || claims.nbf > Date.now() / 1000) return null;
    const teamIssuer = `https://${env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
    if (String(claims.iss || '').replace(/\/$/, '') !== teamIssuer) return null;
    if (!allowedAudiences.some(audience => (Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(audience))) return null;
    const jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, ''))).find(key => key.kid === header.kid);
    if (!jwk) return null;
    const publicKey = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const verified = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, asBase64UrlBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!verified) return null;
    const email = clean(claims.email, 254).toLowerCase();
    const permitted = (env.ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    return email && permitted.includes(email) ? { email } : null;
  } catch (error) {
    console.error('Access assertion validation failed', error);
    return null;
  }
}

async function listRows(env, table, activeOnly = false) {
  const filter = activeOnly ? ' WHERE active = 1' : '';
  const order = table === 'enquiries' ? ' ORDER BY created_at DESC' : ' ORDER BY sort_order ASC';
  const { results } = await env.DB.prepare(`SELECT * FROM ${table}${filter}${order}`).all();
  return results.map(row => decodeRow(table, row));
}

async function submitEnquiry(request, env) {
  const input = await request.json();
  if (clean(input.website, 200)) return responseJson({ ok: true });
  const name = clean(input.name, 120), company = clean(input.company_name, 160), phone = clean(input.phone, 40);
  const email = clean(input.email, 254).toLowerCase(), message = clean(input.message, 3000);
  const billing = input.billing_period === 'yearly' ? 'yearly' : 'monthly';
  if (!name || !company || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return responseJson({ error: 'Enter your name, company, phone number, and a valid email address.' }, 400);
  if (input.message && typeof input.message !== 'string') return responseJson({ error: 'Message must be text.' }, 400);
  const selectedIds = Array.isArray(input.selected_feature_ids) ? [...new Set(input.selected_feature_ids.filter(value => typeof value === 'string').slice(0, 30))] : [];
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.ENQUIRY_RATE_SALT || 'mv-studio-rate-limit'}:${ip}`));
  const key = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const timestamp = Math.floor(Date.now() / 1000);
  await env.DB.prepare('INSERT INTO enquiry_rate_limits(key_hash,window_started_at,submission_count) VALUES(?,?,1) ON CONFLICT(key_hash) DO UPDATE SET window_started_at=CASE WHEN window_started_at < ? THEN excluded.window_started_at ELSE window_started_at END, submission_count=CASE WHEN window_started_at < ? THEN 1 ELSE submission_count+1 END').bind(key, timestamp, timestamp - 3600, timestamp - 3600).run();
  const limit = await env.DB.prepare('SELECT submission_count FROM enquiry_rate_limits WHERE key_hash = ?').bind(key).first();
  if (limit?.submission_count > 5) return responseJson({ error: 'Too many enquiries from this connection. Please try again later.' }, 429);
  let options = [];
  if (selectedIds.length) {
    const placeholders = selectedIds.map(() => '?').join(',');
    const { results } = await env.DB.prepare(`SELECT id,name,category,billing_type,price,annual_free_months FROM feature_options WHERE active=1 AND id IN (${placeholders})`).bind(...selectedIds).all();
    options = results;
  }
  const snapshot = options.map(item => ({ id: item.id, name: item.name, category: item.category, billing_type: item.billing_type, unit_price: Number(item.price || 0), annual_free_months: item.annual_free_months }));
  const oneTime = options.filter(item => item.billing_type === 'one_time').reduce((sum, item) => sum + Number(item.price || 0), 0);
  const monthly = options.filter(item => item.billing_type === 'monthly').reduce((sum, item) => sum + Number(item.price || 0), 0);
  const annual = options.filter(item => item.billing_type === 'monthly').reduce((sum, item) => sum + Number(item.price || 0) * (12 - Number(item.annual_free_months || 0)), 0);
  const meeting = Boolean(input.meeting_requested);
  let preferred = null;
  if (input.preferred_meeting_at) {
    const date = new Date(input.preferred_meeting_at);
    if (!meeting || Number.isNaN(date.getTime()) || date.getTime() < Date.now()) return responseJson({ error: 'Choose a future preferred time, or remove it.' }, 400);
    preferred = date.toISOString();
  }
  const id = crypto.randomUUID(), timestampIso = nowIso();
  await env.DB.prepare('INSERT INTO enquiries(id,name,company_name,phone,email,message,selected_features,billing_period,one_time_estimate,monthly_estimate,annual_estimate,meeting_requested,preferred_meeting_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id,name,company,phone,email,message,JSON.stringify(snapshot),billing,oneTime,monthly,annual,meeting?1:0,preferred,timestampIso,timestampIso).run();
  const recipients = (env.ENQUIRY_TO_EMAIL || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!recipients.length || !env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    await env.DB.prepare("UPDATE enquiries SET notification_status='failed',notification_error=? WHERE id=?").bind('Email environment secrets are not configured.', id).run();
    return responseJson({ ok: true, notification: 'failed' });
  }
  const featureLines = snapshot.map(item => `${item.name} (${item.billing_type}, RM ${item.unit_price})`).join('\n') || 'No feature selected';
  const html = `<h2>New website enquiry</h2><p><b>Name:</b> ${esc(name)}<br><b>Company:</b> ${esc(company)}<br><b>Phone:</b> ${esc(phone)}<br><b>Email:</b> ${esc(email)}</p><p><b>Features:</b><br>${esc(featureLines).replaceAll('\n','<br>')}</p><p><b>Estimate:</b> RM ${oneTime} one-time; RM ${monthly}/month; RM ${annual}/year</p><p><b>Billing preference:</b> ${billing}<br><b>Meeting requested:</b> ${meeting ? 'Yes' : 'No'}${preferred ? `<br><b>Preferred time:</b> ${esc(preferred)}` : ''}</p><p><b>Message:</b><br>${esc(message || '—').replaceAll('\n','<br>')}</p><p>Enquiry ID: ${id}</p>`;
  try {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: recipients, reply_to: email, subject: `New website enquiry from ${name} · ${company}`, html }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      await env.DB.prepare("UPDATE enquiries SET notification_status='failed',notification_error=? WHERE id=?").bind(JSON.stringify(result).slice(0,1000), id).run();
      return responseJson({ ok: true, notification: 'failed' });
    }
    await env.DB.prepare("UPDATE enquiries SET notification_status='sent',resend_email_id=? WHERE id=?").bind(result.id || '', id).run();
    return responseJson({ ok: true, notification: 'sent' });
  } catch (error) {
    await env.DB.prepare("UPDATE enquiries SET notification_status='failed',notification_error=? WHERE id=?").bind(clean(error.message,1000), id).run();
    return responseJson({ ok: true, notification: 'failed' });
  }
}

async function uploadMedia(request, env, origin) {
  const size = Number(request.headers.get('content-length') || 0);
  const type = (request.headers.get('content-type') || '').split(';')[0].toLowerCase();
  const allowed = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'];
  if (!allowed.includes(type)) return responseJson({ error: 'Unsupported media type.' }, 415);
  if (size > MAX_UPLOAD_BYTES) return responseJson({ error: 'Media must be 50 MiB or smaller.' }, 413);
  const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'})[type];
  const key = `${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key, request.body, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' } });
  return responseJson({ url: `${origin}/media/${key}` });
}

async function projectHtml(request, env, id) {
  const row = await env.DB.prepare('SELECT id,name,summary,seo_title,seo_description,image_url FROM projects WHERE id=? AND active=1').bind(id).first();
  if (!row) return null;
  const root = new URL('/', request.url);
  const response = await env.ASSETS.fetch(new Request(root, request));
  let html = await response.text();
  const url = new URL(`/projects/${encodeURIComponent(id)}`, request.url).href;
  const title = row.seo_title || `${row.name} | MV Studio Projects`;
  const description = row.seo_description || row.summary || `Explore the ${row.name} project by MV Studio.`;
  const image = row.image_url ? new URL(row.image_url, request.url).href : new URL('/aphome.png', request.url).href;
  const meta = (key, value, attribute = 'property') => {
    const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tag = `<meta ${attribute}="${esc(key)}" content="${esc(value)}" />`;
    const re = new RegExp(`<meta\\s+${attribute}=["']${safeKey}["'][^>]*>`, 'i');
    html = re.test(html) ? html.replace(re, tag) : html.replace('</head>', `${tag}</head>`);
  };
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`);
  meta('description', description, 'name'); meta('og:title', title); meta('og:description', description); meta('og:url', url); meta('og:image', image); meta('twitter:title', title, 'name'); meta('twitter:description', description, 'name');
  const canonical = `<link rel="canonical" href="${esc(url)}" />`;
  html = /<link rel="canonical" href="[^"]*"\s*\/>/i.test(html)
    ? html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/i, canonical)
    : html.replace('</head>', `${canonical}</head>`);
  const graph = { '@context':'https://schema.org', '@type':'CreativeWork', name:row.name, headline:title, description, url, image, creator:{ '@type':'Organization', name:'MV Studio', url:root.href } };
  html = html.replace(/<script id="mv-studio-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/i, `<script id="mv-studio-jsonld" type="application/ld+json">${JSON.stringify(graph).replace(/</g,'\\u003c')}</script>`);
  return new Response(html, { headers: { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'public, max-age=60, s-maxage=300' } });
}

async function sitemap(env, origin) {
  const { results } = await env.DB.prepare('SELECT id,updated_at FROM projects WHERE active=1').all();
  const urls = [origin, ...results.map(row => `${origin}/projects/${encodeURIComponent(row.id)}`), ...['APMoodle.html','hypertextedu.html','PsychologyConsultationManagementSystem.html','SuperMathsBros.html'].map(file => `${origin}/${file}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${esc(url)}</loc></url>`).join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type':'application/xml; charset=utf-8', 'Cache-Control':'public, max-age=300' } });
}

async function api(request, env) {
  const url = new URL(request.url), path = url.pathname.replace(/\/$/, '') || '/';
  if (request.method === 'GET' && path === '/api/public') {
    const names = ['site_content','services','projects','team_members','promotions','feature_options'];
    const results = await Promise.all(names.map(async table => {
      if (table === 'site_content') { const row = await env.DB.prepare('SELECT * FROM site_content WHERE id=1').first(); try { row.content = JSON.parse(row.content); } catch { row.content = {}; } return [table,row]; }
      return [table,await listRows(env, table, true)];
    }));
    return responseJson(Object.fromEntries(results));
  }
  if (request.method === 'POST' && path === '/api/enquiries') return submitEnquiry(request, env);
  if (path.startsWith('/api/admin/')) {
    const admin = await currentAdmin(request, env);
    if (!admin) return responseJson({ error:'Administrator authentication required. Sign in through Cloudflare Access.' }, 401);
    const remainder = path.slice('/api/admin/'.length).split('/').filter(Boolean);
    const table = remainder[0];
    if (table === 'session' && request.method === 'GET') return responseJson({ email:admin.email });
    if (table === 'site_content') {
      if (request.method === 'GET') { const row = await env.DB.prepare('SELECT * FROM site_content WHERE id=1').first(); row.content = JSON.parse(row.content || '{}'); return responseJson(row); }
      if (request.method === 'PUT') { const body = await request.json(); await env.DB.prepare("UPDATE site_content SET content=?,updated_at=? WHERE id=1").bind(JSON.stringify(body.content || {}),nowIso()).run(); return responseJson({ ok:true }); }
    }
    if (table === 'enquiries') {
      if (request.method === 'GET') return responseJson(await listRows(env,'enquiries'));
      if (request.method === 'PATCH' && remainder[1]) { const body = await request.json(); const valid = ['new','contacted','qualified','won','closed']; if (!valid.includes(body.status)) return responseJson({error:'Invalid enquiry status.'},400); await env.DB.prepare('UPDATE enquiries SET status=?,updated_at=? WHERE id=?').bind(body.status,nowIso(),remainder[1]).run(); return responseJson({ok:true}); }
      if (request.method === 'DELETE' && remainder[1]) { await env.DB.prepare('DELETE FROM enquiries WHERE id=?').bind(remainder[1]).run(); return responseJson({ok:true}); }
    }
    if (table === 'upload' && request.method === 'POST') return uploadMedia(request,env,url.origin);
    if (Object.hasOwn(EDITABLE,table)) {
      if (request.method === 'GET' && !remainder[1]) return responseJson(await listRows(env,table));
      if (request.method === 'POST' && !remainder[1]) {
        const body = await request.json(), values = prepareValues(table,body,EDITABLE[table]);
        const id = crypto.randomUUID(), timestamp = nowIso();
        const entries = Object.entries({id,...values,created_at:timestamp,updated_at:timestamp});
        await env.DB.prepare(`INSERT INTO ${table}(${entries.map(([key])=>key).join(',')}) VALUES(${entries.map(()=>'?').join(',')})`).bind(...entries.map(([,value])=>value)).run();
        return responseJson({id});
      }
      if (request.method === 'PUT' && remainder[1]) {
        const body = await request.json(), values = prepareValues(table,body,EDITABLE[table]), entries = Object.entries({...values,updated_at:nowIso()});
        if (!entries.length) return responseJson({ok:true});
        await env.DB.prepare(`UPDATE ${table} SET ${entries.map(([key])=>`${key}=?`).join(',')} WHERE id=?`).bind(...entries.map(([,value])=>value),remainder[1]).run();
        return responseJson({ok:true});
      }
      if (request.method === 'DELETE' && remainder[1]) { await env.DB.prepare(`DELETE FROM ${table} WHERE id=?`).bind(remainder[1]).run(); return responseJson({ok:true}); }
    }
  }
  return responseJson({ error:'Not found.' },404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(request,env);
      if (request.method === 'GET' && url.pathname === '/robots.txt') return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${url.origin}/sitemap.xml\n`, { headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=300'} });
      if (request.method === 'GET' && url.pathname === '/sitemap.xml') return await sitemap(env,url.origin);
      if (request.method === 'GET' && url.pathname.startsWith('/media/')) {
        const key = url.pathname.slice('/media/'.length);
        if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|webm|mov)$/i.test(key)) return new Response('Not found.',{status:404});
        const object = await env.MEDIA.get(key);
        if (!object) return new Response('Not found.',{status:404});
        const headers = new Headers(); object.writeHttpMetadata(headers); headers.set('etag',object.httpEtag); headers.set('Cache-Control','public, max-age=31536000, immutable');
        return new Response(object.body,{headers});
      }
      const projectMatch = url.pathname.match(/^\/projects\/([0-9a-f-]{36})\/?$/i);
      if (request.method === 'GET' && projectMatch) { const page = await projectHtml(request,env,projectMatch[1]); if (page) return page; }
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error('Worker request failed',error);
      return url.pathname.startsWith('/api/') ? responseJson({error:'The request could not be completed. Please try again.'},500) : new Response('Internal server error.',{status:500});
    }
  },
};
