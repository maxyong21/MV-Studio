// One page per service at /services/<slug>. See docs/SEO.md.
// The copy here is fixed. The price, timeline and feature list come from the matching
// service in the admin, so a price is never written in two places.
export const servicePages=[
  {
    slug:'landing-page',
    match:/landing|one[- ]page|single[- ]page/i,
    name:'Landing page design',
    heading:'Landing page design for Malaysian small businesses',
    title:'Landing Page Design Malaysia | MV Studio',
    description:'A one-page website for your Malaysian small business. Mobile-friendly, with a contact form and WhatsApp button, and a clear starting price.',
    intro:'A landing page is a single, focused web page that explains what you offer and makes it easy to contact you. It is the quickest and most affordable way to get your business online in Malaysia.',
    includes:['One page designed around a single goal, such as enquiries or bookings','A layout that works on phones, tablets and desktops','A contact form and a WhatsApp button','Links to your social media pages'],
    suits:['You are starting a business and need an online presence quickly','You run ads or share a link on Facebook, Instagram or WhatsApp and need somewhere to send people','You run a tuition centre, clinic, shop or service and customers ask the same questions every day'],
    faqs:[
      ['How much does a landing page cost in Malaysia?','Our current starting price is shown at the top of this page. It covers the design and development of the page. Hosting, a domain name and paid third-party tools are separate, and we confirm those costs with you before you decide.'],
      ['How long does a landing page take to build?','The usual timeline is shown beside the price. It starts once we have your text, logo and photos. We agree the delivery date with you in the proposal before work begins.'],
      ['What do I need to prepare?','A short description of your business, your logo if you have one, a few photos, and the contact details customers should use. If you do not have text ready, tell us about your business and we will help you shape it.'],
      ['Can a landing page grow into a full website later?','Yes. We can add pages later and turn it into a company website. Extra pages are quoted separately at that time.'],
    ],
    ms:'Kami membina landing page (laman web satu halaman) yang mesra telefon untuk perniagaan kecil di Malaysia, lengkap dengan borang pertanyaan dan butang WhatsApp.',
    zh:'我们为马来西亚小型企业制作单页网站（Landing Page），手机浏览顺畅，并附有咨询表格和 WhatsApp 按钮。',
  },
  {
    slug:'company-website',
    match:/company|corporate|business website|multi[- ]page/i,
    name:'Company website design',
    heading:'Company website design for Malaysian businesses',
    title:'Company Website Design Malaysia | MV Studio',
    description:'A multi-page company website for your Malaysian business, with service and product pages, a contact form and SEO-ready foundations.',
    intro:'A company website gives your business a proper home online: who you are, what you sell, and how to reach you. Customers who search for your business name should find you, not only your Facebook page.',
    includes:['Several pages, such as Home, About, Services or Products, and Contact','Sections for your products and services','A contact form and a WhatsApp button','SEO-ready foundations, so search engines can read every page'],
    suits:['Your business has grown past a Facebook page','Customers, suppliers or banks ask whether you have a website','You offer several services or products and one page is not enough'],
    faqs:[
      ['How much does a company website cost in Malaysia?','Our current starting price is shown at the top of this page. It covers the listed scope. Hosting, a domain name and paid third-party tools are separate, and we confirm them in your proposal before work begins.'],
      ['Do I pay the development fee every year?','No. The development fee is paid once. Ongoing services such as hosting, domain renewal and maintenance are separate and are billed monthly or yearly by the provider or plan you choose.'],
      ['Can I update the website myself?','For projects that include an admin dashboard, you can update the supported text, images and product details yourself. We confirm what you can manage before development begins.'],
      ['Will my website appear on Google?','We build every site so that search engines can read it, with correct titles, descriptions and a sitemap. Ranking for a given search depends on competition and takes time, so we do not promise a position.'],
    ],
    ms:'Kami mereka bentuk laman web syarikat berbilang halaman untuk perniagaan di Malaysia, dengan halaman perkhidmatan, produk dan borang hubungan.',
    zh:'我们为马来西亚企业设计多页面公司网站，包含服务与产品页面以及联系表格。',
  },
  {
    slug:'ecommerce-website',
    match:/commerce|online store|web ?shop|e-?store/i,
    name:'E-commerce website development',
    heading:'E-commerce website development in Malaysia',
    title:'E-Commerce Website Development Malaysia | MV Studio',
    description:'An online store for your Malaysian business, with a product catalogue, shopping cart, customer accounts, order tools and payment integration.',
    intro:'An online store lets customers browse your products and place orders at any hour, without waiting for a reply to a message. You keep your own customer list and are not tied to a single marketplace.',
    includes:['A product catalogue and shopping cart','Customer accounts','Tools to manage stock and orders','Payment integration'],
    suits:['You sell through WhatsApp or social media and orders are getting hard to track','You want your own store alongside marketplace listings','You need customers to pay online'],
    faqs:[
      ['How much does an e-commerce website cost in Malaysia?','Our current starting price is shown at the top of this page. It covers the listed scope. Payment provider fees, hosting and a domain name are separate, and we confirm them in your proposal before work begins.'],
      ['Which payment methods can my store accept?','That depends on the payment provider you choose. Malaysian providers commonly support online banking (FPX), cards and e-wallets. The provider sets its own approval process and transaction fees, and we help you compare options before you decide.'],
      ['Can I add and edit products myself?','Yes. An online store includes tools to add products, change prices and manage stock and orders without asking us.'],
      ['Do you also handle delivery?','We build the store. Delivery is arranged with the courier you choose. Where a courier or shipping service offers an integration, we can quote for connecting it.'],
    ],
    ms:'Kami membangunkan laman web e-dagang (kedai online) untuk perniagaan di Malaysia, dengan katalog produk, troli, akaun pelanggan dan integrasi pembayaran.',
    zh:'我们为马来西亚商家开发电商网站（网店），包含产品目录、购物车、顾客账户和付款整合。',
  },
  {
    slug:'custom-web-app',
    match:/custom|web ?app|system|bespoke/i,
    name:'Custom web app development',
    heading:'Custom web app development in Malaysia',
    title:'Custom Web App Development Malaysia | MV Studio',
    description:'Booking systems, management systems and other custom web applications for Malaysian businesses, built around how your team already works.',
    intro:'When spreadsheets, paper forms and chat groups no longer keep up, a custom web app puts the work in one place. We design it around the way your business already runs.',
    includes:['Booking and management systems','Database design','Connections to other services through their APIs','Workflows built for your own process'],
    suits:['Your team re-types the same information into several places','You take bookings, appointments or registrations by hand','Off-the-shelf software does not fit how you work'],
    faqs:[
      ['How much does a custom web app cost?','It depends on what the system must do, so there is no fixed price. We talk through your process first, then give you a written scope and quote before any development begins.'],
      ['How long does a custom system take?','It depends on the scope. We give you a timeline with the quote and show progress along the way.'],
      ['Do you support the system after launch?','Yes. We stay available after launch for fixes and improvements. Maintenance and support terms are agreed in your proposal, and new features are quoted separately.'],
      ['Can it connect to tools we already use?','Often, yes, if the tool offers a way for other software to connect to it. We check this during scoping and tell you what is and is not possible.'],
    ],
    ms:'Kami membangunkan aplikasi web tersuai untuk perniagaan di Malaysia, seperti sistem tempahan dan sistem pengurusan, mengikut cara kerja pasukan anda.',
    zh:'我们为马来西亚企业开发定制网页应用，例如预约系统和管理系统，并按照您团队的工作方式设计。',
  },
];

export const servicePaths=servicePages.map(page=>`/services/${page.slug}`);
export const servicePage=slug=>servicePages.find(page=>page.slug===slug)||null;

// Admin services have no slug column. Match by name, and only link a service card to a
// page when exactly one page fits, so a renamed service never points at the wrong page.
export function pageForService(service){
  const name=String(service?.name||'');
  const matches=servicePages.filter(page=>page.match.test(name));
  return matches.length===1?matches[0]:null;
}
export function serviceForPage(page,services=[]){
  return services.find(service=>service&&service.active!==false&&pageForService(service)===page)||null;
}
