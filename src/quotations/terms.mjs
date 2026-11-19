// The terms and conditions printed on every quotation.
// A copy is saved inside each quotation when its link is created, so changing the wording
// here never rewrites a quotation a client has already received.
// The business rules (50/50 payment, refunds, RM50 features) come from docs/BUSINESS_TERMS.md.
// Change both together, and change TERMS_VERSION whenever the wording changes.
// This is careful plain-language drafting, not legal advice: have an adviser review it.
export const TERMS_VERSION='2026-11-19';

export const quotationTerms=[
  {id:'quotation',title:'1. About this quotation',paragraphs:[
    'This quotation is issued by MV Studio, a web design and development studio in Malaysia run by Max Yong and Vincent Teo ("we", "us"). "You" means the client named on this quotation.',
    'It is valid until the end of the valid-until date shown above (Malaysia time). After that date the prices and terms no longer apply and we will prepare an updated quotation on request.',
    'This quotation is an invitation to proceed and is not yet a contract. It becomes our agreement when you accept it in writing by WhatsApp or email, quoting the quotation ID, and we receive the deposit described in section 4. If this quotation and our website disagree, this quotation applies to your project.',
  ]},
  {id:'prices',title:'2. Prices and scope',paragraphs:[
    'All prices are in Ringgit Malaysia (RM). Prices are open to discussion until you accept: tell us your budget or priorities and we may adjust the scope, the price or both. Any change is only valid once we confirm it in a revised quotation.',
    'Where a price is shown as a range, the final figure depends on details we still need to confirm with you. We will confirm one fixed price in writing before you pay the deposit.',
    'The price covers only the services listed in this quotation and the requirements listed in its requirement tables. Anything that is not listed is not included. A requirement marked "Extra cost" or "To be confirmed" is not part of the price until it is priced in this quotation or a revised one.',
    'Anything written under "Additional requirements" is noted for discussion and is included only when it also appears as a priced line or as a requirement marked "Included". If a tax or government charge becomes payable on our services by law, we will tell you before you accept.',
  ]},
  {id:'third-party',title:'3. Third-party charges',paragraphs:[
    'Some things a website needs are sold by other companies, not by us. Examples are domain names, hosting, servers, databases, business email, SSL certificates, payment gateways, SMS or WhatsApp services, maps, stock images, fonts, plugins and paid software licences.',
  ],bullets:[
    'These charges are set and billed by the provider. They are not part of our development fee. The part of this quotation headed "Third-party charges" lists them separately, as estimates of the provider’s price.',
    'The provider can change its prices, plans and rules at any time. We do not control this and cannot be held responsible for a provider’s price increase, outage, data loss, suspension, policy change or closure.',
    'Third-party purchases are paid in full before we buy or activate them. Where possible, accounts are opened in your name so that you own them.',
    'Renewals are your responsibility. If a domain, hosting plan or subscription is not renewed, your website may go offline or the domain may be lost.',
  ]},
  {id:'payment',title:'4. Deposit and payment',bullets:[
    'A deposit of 50% of our project fee confirms the project. The project fee is the one-time subtotal under "MV Studio services". We do not start or reserve time until it is received.',
    'After the deposit we prepare the wireframe, confirm the feature list with you and build a prototype.',
    'When you approve the wireframe, the feature list and the prototype, the remaining 50% is payable before real development begins. Development starts once it is received.',
    'Monthly and yearly charges, such as maintenance, are billed in advance for each period.',
    'Payment is by bank transfer or another method we confirm in writing. Please use only the payment details we send you directly. A project is not launched, and no source code is handed over, while any agreed payment is outstanding.',
  ]},
  {id:'refunds',title:'5. Cancellation and refunds',bullets:[
    'To cancel, tell us in writing by email or WhatsApp.',
    'If you cancel within 7 days of paying the deposit and before wireframe work has started, whichever comes first, we refund half of the deposit (25% of the project fee) to the account you paid from, within 14 days of confirming your cancellation.',
    'After wireframe work has started, or after 7 days, the deposit is not refundable.',
    'If you cancel after approving the prototype but before paying the remaining 50%, the deposit is not refundable and nothing further is owed.',
    'Development starts as soon as the remaining 50% is received, so that payment is not refundable.',
    'Money already paid to a third-party provider on your behalf is refundable only if that provider refunds it.',
  ]},
  {id:'timeline',title:'6. Timeline',paragraphs:[
    'Any delivery time we give is an estimate that starts when we have the deposit and the content we need from you. Late content, late feedback, late payment, requested changes and third-party delays move the delivery date by at least the same amount of time.',
  ]},
  {id:'revisions',title:'7. Design revisions',bullets:[
    'The price includes up to 2 rounds of design revisions.',
    'A round is one consolidated list of changes to the agreed design, sent to us together. Please collect feedback from everyone on your side before sending it.',
    'A revision adjusts what was agreed, such as colours, wording, images, spacing or layout. A new page, a new feature, a new integration or a change of direction after approval is additional work and is quoted separately.',
    'Further rounds beyond the 2 included are charged, and we will tell you the price before starting.',
  ]},
  {id:'bug-fixing',title:'8. Free bug fixing for 30 days',bullets:[
    'For 30 days from the launch date we fix bugs free of charge. The launch date is the day the website goes live, or the day we hand the finished work to you, whichever is earlier.',
    'A bug is something that does not work the way this quotation and the approved prototype say it should.',
    'The following are not bugs and are quoted separately: new features, design or content changes, problems caused by changes that you or someone else made, problems caused by a third-party service or its updates, and issues from hosting we did not set up.',
    'Report a bug in writing with enough detail for us to see it, such as the page, the steps and a screenshot.',
  ]},
  {id:'after-launch',title:'9. Additional features after launch',paragraphs:[
    'Anything added or changed after launch that is not a bug under section 8 is charged. Additional features start from RM50 per feature, depending on complexity. We send a price first, and work begins only after you agree to it in writing.',
  ]},
  {id:'maintenance',title:'10. Maintenance after launch',bullets:[
    'Ongoing care of the website after launch is a separate maintenance subscription. It is optional and is included only if it appears under "Maintenance" in this quotation or you subscribe later.',
    'Maintenance covers what your plan states, such as software updates, backups, monitoring and small content updates. It does not include new features.',
    'Without an active maintenance subscription, once the 30 days in section 8 end we are not responsible for updates, backups, security patches, monitoring or uptime, and any work you request is charged per job.',
    'A subscription is billed in advance and continues until either of us cancels it in writing before the next billing date. Fees for a period that has started are not refunded.',
    'We aim to acknowledge a support request and give a next step within two business days, Monday to Friday, excluding Malaysian public holidays. This is a target, not a guaranteed repair time.',
  ]},
  {id:'ownership',title:'11. Ownership and source code',bullets:[
    'When the project fee is paid in full, ownership of the custom source code and the designs we created specifically for your project transfers to you, and we hand the source code over to you.',
    'Until full payment, that work remains ours and may not be used, copied or published.',
    'Your own materials, such as your logo, text, photos and data, always remain yours.',
    'Open-source and third-party software, fonts, images and tools stay under their own licences. We tell you about any that need a paid licence.',
    'We keep the right to reuse our general methods, know-how and non-specific code components in other work. We never reuse your content, your data or your branding.',
    'We show your project in our portfolio only if you agree.',
  ]},
  {id:'privacy',title:'12. Privacy and personal data',paragraphs:[
    'We handle personal data in line with the Personal Data Protection Act 2010 (PDPA) and our privacy policy, published on our website at /privacy.',
  ],bullets:[
    'To prepare this quotation we use the name, company, email address and phone number shown on it, and the requirements you described. We use them only to quote for, agree and deliver your project and to keep business records.',
    'We do not sell your personal data. We share it only with the service providers needed to run our studio and your project, such as hosting, database and email providers, and where the law requires it.',
    'Anyone who has the link to this quotation can read it until it expires. Share the link only with people who should see it.',
    'You may ask us for access to, correction of or deletion of your personal data, or withdraw consent, using the contact details on this quotation.',
    'If the website or system we build collects personal data from your own customers, you are responsible for it under the PDPA. That includes having your own privacy notice, collecting consent where needed and answering your customers’ requests. We handle that data only to build and support the system on your instructions.',
    'Please do not send us passwords, identity card copies, bank login details or card numbers by chat or email.',
  ]},
  {id:'lawful-use',title:'13. Lawful content and use',paragraphs:[
    'You confirm that your business, your content and your use of the website are lawful in Malaysia. This includes the Communications and Multimedia Act 1998, the Computer Crimes Act 1997, the Copyright Act 1987, the Personal Data Protection Act 2010 and consumer protection law.',
  ],bullets:[
    'We do not build, host or support anything used for scams or fraud, phishing, illegal gambling, unlicensed financial or investment schemes, malware, unauthorised access to systems or data, false, obscene, indecent or menacing content, or content that infringes someone else’s rights.',
    'You confirm that you own or have permission to use everything you give us, including text, photos, logos, fonts, videos and data.',
    'If we reasonably believe the work is being used unlawfully, we may stop work or suspend our services, and fees already paid are not refunded.',
    'We cooperate with lawful requests from Malaysian authorities, such as the Royal Malaysia Police (PDRM) and the Malaysian Communications and Multimedia Commission (MCMC), where the law requires us to.',
  ]},
  {id:'limits',title:'14. Limits of our responsibility',bullets:[
    'We build what is described in this quotation with reasonable care and skill. We do not promise a particular search engine position, number of visitors, sales or other business result.',
    'No website is free of every fault or safe from every attack. Outside an active maintenance subscription, we are not responsible for problems that arise after the 30 days in section 8.',
    'To the extent the law allows, we are not liable for loss of profit, loss of business, loss of data or any indirect loss, and our total liability for a project is limited to the fees you paid us for that project.',
    'Nothing in these terms removes or limits any right that the law gives you and that cannot be excluded, including under the Consumer Protection Act 1999 where it applies.',
    'Neither of us is responsible for a delay or failure caused by events outside reasonable control, such as power or internet outages, provider failures, illness, floods or government orders.',
  ]},
  {id:'disputes',title:'15. Governing law and disputes',paragraphs:[
    'These terms are governed by the laws of Malaysia. If there is a disagreement, we will both first try in good faith to settle it by discussion. If that fails, the courts of Malaysia have jurisdiction.',
    'Changes to this quotation or these terms are valid only when both of us agree in writing. WhatsApp and email count as writing.',
  ]},
  {id:'client',title:'16. Your responsibilities as the client',bullets:[
    'Give us the content the project needs, such as text, photos, logo, product details and prices, on time and in a usable format, and make sure it is accurate.',
    'Name one contact person who can make decisions and give approvals for you.',
    'Review each stage and reply with feedback or approval promptly. If we hear nothing for 14 days, we may pause the project and schedule it again when you are ready.',
    'Test the website before launch and tell us about any problem you find.',
    'Pay our fees and all third-party charges on time, and keep domains, hosting and subscriptions renewed.',
    'Keep your passwords and administrator accounts secure, and change any password we set up for you after handover.',
    'Keep your own backups after handover unless backups are part of your maintenance plan.',
    'Hold the licences, registrations and permissions your business needs, and meet your own duties to your customers, including under the PDPA.',
  ]},
];
