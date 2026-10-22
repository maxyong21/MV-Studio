import { createClient } from 'npm:@supabase/supabase-js@2';

const originAllowed = (origin: string | null) => {
  const configured = Deno.env.get('ALLOWED_ORIGIN');
  if (!origin) return true;
  if (!configured) return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return configured.split(',').map(value => value.trim()).includes(origin);
};
const headersFor = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && originAllowed(origin) ? origin : 'null',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});
const json = (body: unknown, status: number, origin: string | null) => new Response(JSON.stringify(body), { status, headers: { ...headersFor(origin), 'Content-Type': 'application/json' } });
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

Deno.serve(async request => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') return new Response('ok', { headers: headersFor(origin) });
  if (!originAllowed(origin)) return json({ error: 'Origin is not allowed.' }, 403, origin);
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);
  try {
    const input = await request.json();
    // A filled honeypot is treated as accepted to avoid teaching bots about the trap.
    if (clean(input.website, 200)) return json({ ok: true }, 200, origin);
    const name = clean(input.name, 120), company = clean(input.company_name, 160), phone = clean(input.phone, 40);
    const email = clean(input.email, 254).toLowerCase(), message = clean(input.message, 3000);
    const billingPeriod = input.billing_period === 'yearly' ? 'yearly' : 'monthly';
    const ids = Array.isArray(input.selected_feature_ids) ? [...new Set(input.selected_feature_ids.filter((id: unknown) => typeof id === 'string').slice(0, 30))] : [];
    if (!name || !company || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter your name, company, phone number, and a valid email address.' }, 400, origin);
    if (input.message && typeof input.message !== 'string') return json({ error: 'Message must be text.' }, 400, origin);

    const url = Deno.env.get('SUPABASE_URL')!, serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const address = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${Deno.env.get('RATE_LIMIT_SALT') || serviceKey}:${address}`));
    const key = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    const { data: allowed, error: limitError } = await admin.rpc('consume_enquiry_rate_limit', { p_key: key, p_max: 5, p_window_seconds: 3600 });
    if (limitError) throw limitError;
    if (!allowed) return json({ error: 'Too many enquiries from this connection. Please try again later.' }, 429, origin);

    let options: any[] = [];
    if (ids.length) {
      const { data, error } = await admin.from('feature_options').select('id,name,description,category,billing_type,price,annual_free_months').in('id', ids).eq('active', true);
      if (error) throw error;
      options = data || [];
    }
    const snapshot = options.map(item => ({ id: item.id, name: item.name, category: item.category, billing_type: item.billing_type, unit_price: Number(item.price || 0), annual_free_months: item.annual_free_months }));
    const oneTime = options.filter(item => item.billing_type === 'one_time').reduce((sum,item) => sum + Number(item.price || 0), 0);
    const monthly = options.filter(item => item.billing_type === 'monthly').reduce((sum,item) => sum + Number(item.price || 0), 0);
    const annual = options.filter(item => item.billing_type === 'monthly').reduce((sum,item) => sum + Number(item.price || 0) * (12 - Number(item.annual_free_months || 0)), 0);
    const requested = Boolean(input.meeting_requested);
    let preferred: string | null = null;
    if (input.preferred_meeting_at) {
      const parsed = new Date(input.preferred_meeting_at);
      if (!requested || Number.isNaN(parsed.getTime()) || parsed.getTime() < Date.now()) return json({ error: 'Choose a future preferred time, or remove it.' }, 400, origin);
      preferred = parsed.toISOString();
    }
    const { data: enquiry, error: insertError } = await admin.from('enquiries').insert({
      name, company_name: company, phone, email, message, selected_features: snapshot, billing_period: billingPeriod,
      one_time_estimate: oneTime, monthly_estimate: monthly, annual_estimate: annual,
      meeting_requested: requested, preferred_meeting_at: preferred,
    }).select('id').single();
    if (insertError) throw insertError;

    const to = (Deno.env.get('ENQUIRY_TO_EMAIL') || '').split(',').map(value => value.trim()).filter(Boolean);
    const resendKey = Deno.env.get('RESEND_API_KEY'), from = Deno.env.get('RESEND_FROM_EMAIL');
    if (!to.length || !resendKey || !from) {
      await admin.from('enquiries').update({ notification_status: 'failed', notification_error: 'Email environment secrets are not configured.' }).eq('id', enquiry.id);
      return json({ ok: true, notification: 'failed' }, 200, origin);
    }
    const featureLines = snapshot.map(item => `${item.name} (${item.billing_type}, RM ${item.unit_price})`).join('\n') || 'No feature selected';
    const html = `<h2>New website enquiry</h2><p><b>Name:</b> ${escapeHtml(name)}<br><b>Company:</b> ${escapeHtml(company)}<br><b>Phone:</b> ${escapeHtml(phone)}<br><b>Email:</b> ${escapeHtml(email)}</p><p><b>Features:</b><br>${escapeHtml(featureLines).replaceAll('\n','<br>')}</p><p><b>Estimate:</b> RM ${oneTime} one-time; RM ${monthly}/month; RM ${annual}/year</p><p><b>Billing preference:</b> ${billingPeriod}<br><b>Meeting requested:</b> ${requested ? 'Yes' : 'No'}${preferred ? `<br><b>Preferred time:</b> ${escapeHtml(preferred)}` : ''}</p><p><b>Message:</b><br>${escapeHtml(message || '—').replaceAll('\n','<br>')}</p><p>Enquiry ID: ${enquiry.id}</p>`;
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to, reply_to: email, subject: `New website enquiry from ${name} · ${company}`, html }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      await admin.from('enquiries').update({ notification_status: 'failed', notification_error: clean(JSON.stringify(result), 1000) }).eq('id', enquiry.id);
      return json({ ok: true, notification: 'failed' }, 200, origin);
    }
    await admin.from('enquiries').update({ notification_status: 'sent', resend_email_id: result.id || '' }).eq('id', enquiry.id);
    return json({ ok: true, notification: 'sent' }, 200, origin);
  } catch (error) {
    console.error('submit-enquiry failed', error);
    return json({ error: 'We could not process your enquiry. Please try again shortly.' }, 500, origin);
  }
});
