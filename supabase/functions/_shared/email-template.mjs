// Email clients do not load the website stylesheet. Keep the core layout in
// presentation tables and inline styles, with system fonts and a text fallback.
import {hasPricedSelection} from './enquiry.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const paragraph=value=>escape(value).replace(/\r\n?|\n/g,'<br>');
const currency=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?`RM ${Number(value).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'To be confirmed';
const mailto=value=>`mailto:${encodeURIComponent(String(value||'').trim()).replace(/%40/g,'@')}`;
const heading=label=>`<h2 style="margin:0 0 14px;color:#253c32;font-size:17px;font-weight:700;line-height:1.4;">${escape(label)}</h2>`;
const detailRow=(label,value)=>`<tr><td valign="top" width="110" style="padding:8px 12px 8px 0;color:#666d65;font-size:13px;line-height:1.6;">${escape(label)}</td><td valign="top" style="padding:8px 0;color:#26352c;font-size:14px;line-height:1.6;word-break:break-word;overflow-wrap:anywhere;">${value}</td></tr>`;
const section=content=>`<tr><td class="email-padding" style="padding:26px 32px;border-bottom:1px solid #e7e8e1;">${content}</td></tr>`;
const table=rows=>`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;table-layout:fixed;">${rows}</table>`;
const meetingTime=value=>{const date=new Date(value);return value&&Number.isFinite(date.getTime())?`${new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(date)} UTC`:'To be agreed';};

export function renderEnquiryEmail(enquiry){
  const features=Array.isArray(enquiry.selected_features)?enquiry.selected_features:[];
  const featureRows=features.map(feature=>{
    const custom=feature.billing_type==='quote'||feature.unit_price===null||feature.unit_price===undefined;
    const price=custom?'Manual quotation':`${currency(feature.unit_price)}${feature.billing_type==='monthly'?' / month':' one-time'}`;
    const free=Number(feature.annual_free_months||0);
    const annualNote=feature.billing_type==='monthly'&&Number.isInteger(free)&&free>0&&free<=11?`<br><span style="color:#687365;font-size:12px;">Annual plan: ${free} free month${free===1?'':'s'}</span>`:'';
    return `<tr><td style="padding:13px 0;border-bottom:1px solid #e7e8e1;color:#26352c;font-size:14px;line-height:1.6;word-break:break-word;overflow-wrap:anywhere;">${escape(feature.name)}${annualNote}<br><strong style="font-size:13px;font-weight:600;color:${custom?'#975034':'#536448'};">${escape(price)}</strong></td></tr>`;
  }).join('');
  const totals=hasPricedSelection(features)?table([
    ['One-time subtotal',enquiry.one_time_estimate],
    ['Recurring, paid monthly',enquiry.monthly_estimate],
    ['Recurring, paid annually',enquiry.annual_estimate],
  ].map(([label,value])=>`<tr><td style="padding:8px 10px 8px 0;color:#304733;font-size:13px;line-height:1.5;">${escape(label)}</td><td width="115" align="right" valign="top" style="padding:8px 0;color:#203c2b;font-size:16px;line-height:1.5;font-weight:700;white-space:nowrap;">${escape(currency(value))}</td></tr>`).join('')):'<p style="margin:0;color:#304733;font-size:14px;line-height:1.7;"><strong>Manual quotation required.</strong> Scope and pricing are to be discussed with the customer.</p>';
  const contact=table([
    detailRow('Name',escape(enquiry.name)),
    detailRow('Company',escape(enquiry.company_name)),
    detailRow('Email',`<a href="${escape(mailto(enquiry.email))}" style="color:#285b45;text-decoration:underline;">${escape(enquiry.email)}</a>`),
    detailRow('Phone',`<a href="tel:${escape(String(enquiry.phone||'').replace(/[^+\d]/g,''))}" style="color:#285b45;text-decoration:underline;">${escape(enquiry.phone)}</a>`),
    detailRow('Meeting',enquiry.meeting_requested?'Requested — please confirm availability':'Not requested'),
    ...(enquiry.meeting_requested?[detailRow('Preferred time',escape(meetingTime(enquiry.preferred_meeting_at)))]:[]),
  ].join(''));
  const scope=enquiry.chatbot_answers;
  const scopeSection=scope?section(`${heading('Confirmed project brief')}${scope.brief?`<p style="margin:0 0 16px;color:#374739;font-size:14px;line-height:1.8;word-break:break-word;overflow-wrap:anywhere;">${paragraph(scope.brief)}</p>`:''}${table((Array.isArray(scope.summary)?scope.summary:[]).map(row=>detailRow(row.label,paragraph(row.value))).join(''))}`):'';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New project enquiry | MV Studio</title>
<style>@media only screen and (max-width:600px){.email-outer{padding:12px 8px!important}.email-padding{padding:24px 20px!important}.email-title{font-size:29px!important}}</style></head>
<body style="margin:0;padding:0;background-color:#f3f3ec;color:#26352c;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
<div style="display:none;font-size:1px;line-height:1px;color:#f3f3ec;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">A new enquiry from ${escape(enquiry.company_name)} is ready for your review.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f3ec"><tr><td class="email-outer" align="center" style="padding:36px 16px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fdfdf9" style="width:100%;max-width:600px;border:1px solid #e1e5da;border-radius:18px;border-spacing:0;">
<tr><td class="email-padding" bgcolor="#203e31" style="padding:30px 32px;background-color:#203e31;border-radius:17px 17px 0 0;">
<p style="margin:0 0 28px;color:#fff;font-size:19px;font-weight:700;letter-spacing:-0.5px;"><span style="color:#f8a07c;">mv</span>&nbsp; MV Studio</p>
<p style="margin:0 0 12px;color:#d2e6c9;font-size:11px;line-height:1.5;font-weight:700;letter-spacing:2px;">YOUR NEXT CONVERSATION</p>
<h1 class="email-title" style="margin:0 0 14px;color:#fff;font-size:34px;line-height:1.2;font-weight:700;letter-spacing:-1px;">A new idea.<br>A new connection.</h1>
<p style="margin:0;color:#e0eade;font-size:14px;line-height:1.8;">${escape(enquiry.company_name)} sent a project enquiry. Here is the brief to help you take the next step.</p></td></tr>
${section(`${heading('Meet your potential client')}${contact}`)}
${section(`${heading('Selected features')}${features.length?table(featureRows):'<p style="margin:0;color:#687365;font-size:14px;line-height:1.7;">No catalogue features selected. Review the brief with the customer to determine the scope.</p>'}`)}
${section(`${heading('Preliminary estimate')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#e3eddd" style="padding:16px;background-color:#e3eddd;border-radius:12px;">${totals}<p style="margin:12px 0 0;color:#45583e;font-size:12px;line-height:1.7;">Billing preference: <strong>${enquiry.billing_period==='yearly'?'Annual':'Monthly'}</strong>. Monthly and annual totals are alternatives; one-time work is separate.</p></td></tr></table><p style="margin:16px 0 0;padding-left:12px;border-left:3px solid #db8156;color:#78513d;font-size:12px;line-height:1.8;">Priced catalogue items only. Custom work, complete scope, third-party charges and final pricing require review. A meeting preference is a request, not a confirmed booking.</p>`)}
${scopeSection}
${section(`${heading('Customer message')}<p style="margin:0;color:#374739;font-size:14px;line-height:1.8;word-break:break-word;overflow-wrap:anywhere;">${paragraph(enquiry.message||'No additional message provided.')}</p>`)}
<tr><td class="email-padding" style="padding:28px 32px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#203e31" style="background-color:#203e31;border-radius:8px;mso-padding-alt:14px 22px;"><a href="${escape(mailto(enquiry.email))}" style="display:inline-block;padding:14px 22px;border:1px solid #203e31;border-radius:8px;color:#fff;font-size:14px;font-weight:700;line-height:1.4;text-decoration:none;">Reply to ${escape(enquiry.name)}</a></td></tr></table><p style="margin:16px 0 0;color:#687365;font-size:12px;line-height:1.8;">You can also reply directly to this notification. The enquiry and confirmed selections are available in your studio admin workspace.</p></td></tr>
<tr><td class="email-padding" bgcolor="#eef0e7" style="padding:20px 32px;background-color:#eef0e7;border-radius:0 0 17px 17px;"><p style="margin:0;color:#536048;font-size:11px;line-height:1.8;word-break:break-all;">MV Studio · Private enquiry notification<br>Reference: ${escape(enquiry.id)}</p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
<p style="margin:20px 0 0;color:#6b7367;font-size:11px;line-height:1.8;">Thoughtful websites. Clearer conversations.</p>
</td></tr></table></body></html>`;
}
