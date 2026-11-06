export const contactReady=c=>!c.suppressed&&Boolean((c.contact_source?.trim()&&c.outreach_note?.trim())||(c.consent_at&&c.consent_source&&c.consent_notice));
export const outreachEligible=(c,content={})=>contactReady(c)&&(content.purpose==='customer_update'?c.relationship==='customer':!c.intro_blocked);
