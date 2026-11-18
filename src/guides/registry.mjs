// The guides (articles) at /guides. This file holds only the small facts every page needs: titles,
// descriptions, dates and links between articles. The article text lives in ./articles/ and is loaded
// only on guide pages, so the home page stays light. See docs/GUIDES.md.
//
// seoTitle is the <title> without the brand (kept to about 55 characters so Google rarely cuts it).
// title is the on-page heading. description is the search snippet (about 120 to 160 characters).
// Dates are ISO (YYYY-MM-DD). modified changes only when the article really changed.
export const guideLanguages=['en','ms','zh'];

export const guides=[
  {
    slug:'how-long-does-it-take-to-build-a-website-malaysia',
    published:'2026-11-13',modified:'2026-11-13',topic:'Timeline',
    services:['landing-page','company-website'],related:['how-much-does-a-website-cost-in-malaysia','new-business-website-checklist-malaysia','landing-page-or-full-website-for-sme'],
    en:{title:'How Long Does It Take to Build a Website in Malaysia?',seoTitle:'How Long Does It Take to Build a Website in Malaysia?',description:'A landing page can be ready in about 7 days. A full website or online store usually takes 3 to 4 months. Here is where the time goes, and how to speed it up.',minutes:5},
  },
  {
    slug:'domain-hosting-maintenance-costs-malaysia',
    published:'2026-11-10',modified:'2026-11-17',topic:'Costs',
    services:['company-website','ecommerce-website'],related:['how-much-does-a-website-cost-in-malaysia','new-business-website-checklist-malaysia','how-long-does-it-take-to-build-a-website-malaysia'],
    en:{title:'Domain, Hosting and Website Maintenance Costs in Malaysia (2026)',seoTitle:'Domain, Hosting and Maintenance Costs in Malaysia 2026',description:'What you pay every year to keep a website online in Malaysia: domain, hosting, SSL, business email and maintenance, with reference prices and what to check first.',minutes:5},
  },
  {
    slug:'tuition-centre-website-what-to-include',
    published:'2026-11-06',modified:'2026-11-06',topic:'Education',
    services:['landing-page','custom-web-app'],related:['landing-page-or-full-website-for-sme','google-business-profile-setup-malaysia','how-much-does-a-website-cost-in-malaysia'],
    en:{title:'What a Tuition Centre Website Should Include (and What Can Wait)',seoTitle:'What a Tuition Centre Website Should Include',description:'Parents decide fast. Here is what a tuition centre website needs on day one, what to add next, and which features, like attendance and fees, can wait.',minutes:5},
    ms:{title:'Apa yang Patut Ada pada Laman Web Pusat Tuisyen',seoTitle:'Laman Web Pusat Tuisyen: Apa yang Patut Ada',description:'Ibu bapa membuat keputusan dengan cepat. Ini yang perlu ada pada laman web pusat tuisyen anda, apa yang boleh ditambah kemudian, dan apa yang boleh menunggu.',minutes:4},
    zh:{title:'补习中心网站应该包含什么？先做哪些，后做哪些',seoTitle:'补习中心网站应该包含什么？',description:'家长做决定很快。这篇文章说明补习中心网站第一天就该有的内容、之后可以加的功能，以及哪些（如出席记录、缴费）可以先不做。',minutes:4},
  },
  {
    slug:'new-business-website-checklist-malaysia',
    published:'2026-11-03',modified:'2026-11-14',topic:'Startups',
    services:['landing-page','company-website'],related:['do-you-need-a-website-if-you-have-a-facebook-page','google-business-profile-setup-malaysia','domain-hosting-maintenance-costs-malaysia'],
    en:{title:'The Website Checklist for a New Business or Startup in Malaysia',seoTitle:'Website Checklist for a New Business in Malaysia',description:'Launching a business? Use this practical website checklist: domain and email, Google Business Profile, WhatsApp, privacy page and the basics that most startups miss.',minutes:7},
  },
  {
    slug:'landing-page-or-full-website-for-sme',
    published:'2026-10-27',modified:'2026-11-10',topic:'Choosing',
    services:['landing-page','company-website','ecommerce-website'],related:['how-much-does-a-website-cost-in-malaysia','do-you-need-a-website-if-you-have-a-facebook-page','how-long-does-it-take-to-build-a-website-malaysia'],
    en:{title:'Landing Page or Full Website: Which Does Your SME Need?',seoTitle:'Landing Page or Full Website: Which Does an SME Need?',description:'Not sure whether a one-page landing page is enough or you need a full website? A plain-English guide for Malaysian small businesses, with a quick way to decide.',minutes:5},
    ms:{title:'Landing Page atau Laman Web Penuh: Mana Satu Sesuai untuk PKS Anda?',seoTitle:'Landing Page atau Laman Web Penuh untuk PKS?',description:'Tidak pasti sama ada landing page satu halaman sudah cukup atau anda perlukan laman web penuh? Panduan ringkas untuk PKS Malaysia dengan cara mudah untuk memilih.',minutes:4},
    zh:{title:'单页网站还是完整网站？小型企业该怎么选',seoTitle:'单页网站还是完整网站？中小企业怎么选',description:'不确定一个单页网站够不够用，还是需要完整的公司网站？这是写给马来西亚小型企业的简明指南，教你怎么快速决定。',minutes:4},
  },
  {
    slug:'do-you-need-a-website-if-you-have-a-facebook-page',
    published:'2026-10-20',modified:'2026-10-20',topic:'Choosing',
    services:['landing-page','company-website'],related:['landing-page-or-full-website-for-sme','google-business-profile-setup-malaysia','how-much-does-a-website-cost-in-malaysia'],
    en:{title:'Do You Need a Website If You Already Have a Facebook Page?',seoTitle:'Do You Need a Website If You Have a Facebook Page?',description:'A Facebook page is a good start, but you do not own it. Here is what a website gives a small business that Facebook cannot, and why you should keep both.',minutes:5},
    ms:{title:'Perlukah Laman Web Jika Anda Sudah Ada Halaman Facebook?',seoTitle:'Perlukah Laman Web Jika Sudah Ada Facebook?',description:'Halaman Facebook ialah permulaan yang baik, tetapi anda tidak memilikinya. Ini yang laman web berikan kepada perniagaan kecil yang Facebook tidak boleh.',minutes:5},
    zh:{title:'已经有 Facebook 专页，还需要网站吗？',seoTitle:'已经有 Facebook 专页，还需要网站吗？',description:'Facebook 专页是个不错的起点，但它并不属于你。这篇文章说明网站能给小生意带来什么，是 Facebook 做不到的，以及为什么两者都该保留。',minutes:4},
  },
  {
    slug:'google-business-profile-setup-malaysia',
    published:'2026-10-13',modified:'2026-11-04',topic:'Getting found',
    services:['google-business-profile'],related:['new-business-website-checklist-malaysia','do-you-need-a-website-if-you-have-a-facebook-page','tuition-centre-website-what-to-include'],
    en:{title:'Google Business Profile in Malaysia: A Step-by-Step Setup Guide for Shops',seoTitle:'Google Business Profile Malaysia: Step-by-Step Setup',description:'How to put your shop on Google Search and Maps for free: what to prepare, the setup steps, how verification works, and the mistakes that cost you reviews.',minutes:6},
  },
  {
    slug:'how-much-does-a-website-cost-in-malaysia',
    published:'2026-10-06',modified:'2026-11-12',topic:'Costs',
    services:['landing-page','company-website','ecommerce-website'],related:['domain-hosting-maintenance-costs-malaysia','landing-page-or-full-website-for-sme','how-long-does-it-take-to-build-a-website-malaysia'],
    en:{title:'How Much Does a Website Cost in Malaysia? (2026 Guide for Small Businesses)',seoTitle:'How Much Does a Website Cost in Malaysia? 2026 Guide',description:'Real starting prices for a landing page, company website and online store in Malaysia, what changes the price, what quotes leave out, and five questions to ask first.',minutes:6},
    ms:{title:'Berapa Kos Membuat Laman Web di Malaysia? (Panduan 2026 untuk Perniagaan Kecil)',seoTitle:'Berapa Kos Buat Laman Web di Malaysia? Panduan 2026',description:'Harga permulaan sebenar untuk landing page, laman web syarikat dan kedai dalam talian di Malaysia, apa yang mengubah harga, dan lima soalan untuk ditanya dahulu.',minutes:6},
    zh:{title:'在马来西亚做网站要多少钱？（2026 小型企业价格指南）',seoTitle:'在马来西亚做网站要多少钱？2026 价格指南',description:'马来西亚单页网站、公司网站和网店的真实起步价，哪些因素会影响价格，报价常常漏掉什么，以及付款前要先问的五个问题。',minutes:5},
  },
];

// The guides linked from every page's footer: the most-searched ones, so they get the strongest internal links.
export const featuredSlugs=['how-much-does-a-website-cost-in-malaysia','do-you-need-a-website-if-you-have-a-facebook-page','landing-page-or-full-website-for-sme','google-business-profile-setup-malaysia'];

export const guideBySlug=slug=>guides.find(guide=>guide.slug===slug)||null;
// Which languages an article exists in. English always does.
export const languagesOf=guide=>guideLanguages.filter(lang=>Boolean(guide?.[lang]));
export const hasLanguage=(slug,lang)=>Boolean(guideBySlug(slug)?.[lang]);
// Newest first, the order used on the index, the home page and in the footer.
export const sortedGuides=()=>[...guides].sort((a,b)=>b.published.localeCompare(a.published)||a.slug.localeCompare(b.slug));
export const guidePaths=guides.map(guide=>`/guides/${guide.slug}`);
export const guideText=(guide,lang)=>guide?.[lang]||guide?.en;

// Short labels for tight spaces such as the footer.
export const shortTitle={
  'how-much-does-a-website-cost-in-malaysia':{en:'Website cost in Malaysia',ms:'Kos laman web di Malaysia',zh:'网站价格指南'},
  'google-business-profile-setup-malaysia':{en:'Google Business Profile setup'},
  'do-you-need-a-website-if-you-have-a-facebook-page':{en:'Website or Facebook page?',ms:'Laman web atau Facebook?',zh:'网站还是 Facebook 专页？'},
  'landing-page-or-full-website-for-sme':{en:'Landing page or full website?',ms:'Landing page atau laman penuh?',zh:'单页还是完整网站？'},
  'new-business-website-checklist-malaysia':{en:'New business website checklist'},
  'tuition-centre-website-what-to-include':{en:'Tuition centre website guide',ms:'Laman web pusat tuisyen',zh:'补习中心网站指南'},
  'domain-hosting-maintenance-costs-malaysia':{en:'Domain and hosting costs'},
  'how-long-does-it-take-to-build-a-website-malaysia':{en:'How long a website takes'},
};
export const shortLabel=(slug,lang)=>shortTitle[slug]?.[lang]||shortTitle[slug]?.en||guideBySlug(slug)?.en.title||slug;

// The /guides index page. Its own title and description, per language.
export const guidesIndexMeta={
  en:{seoTitle:'Website Guides for Small Businesses in Malaysia',title:'Guides for small businesses getting online in Malaysia',description:'Plain-English guides on website costs, timelines, Google Business Profile and choosing the right site, written by the two developers behind MV Studio.',intro:"Plain-English answers to the questions small business owners ask us before they build a website: what it costs, how long it takes, what to include and how to get found. Written by the two of us, and updated when the facts change."},
  ms:{seoTitle:'Panduan Laman Web untuk Perniagaan Kecil Malaysia',title:'Panduan untuk perniagaan kecil yang mahu hadir dalam talian di Malaysia',description:'Panduan mudah tentang kos laman web, tempoh pembinaan, Google Business Profile dan cara memilih laman yang sesuai, ditulis oleh dua pembangun di sebalik MV Studio.',intro:'Jawapan mudah kepada soalan yang pemilik perniagaan kecil tanya kami sebelum membina laman web: berapa kosnya, berapa lama masa yang diambil, apa yang perlu ada dan bagaimana untuk dijumpai. Ditulis oleh kami berdua, dan dikemas kini apabila fakta berubah.'},
  zh:{seoTitle:'马来西亚小型企业网站指南',title:'给马来西亚小型企业上线的实用指南',description:'用简单的话讲解网站费用、建站时间、Google 商家资料，以及如何选择合适的网站，由 MV Studio 背后的两位开发者撰写。',intro:'小生意老板在建网站之前常问我们的问题，这里用平实的话回答：要多少钱、要多久、该放什么内容、怎样被人找到。由我们两个人撰写，事实改变时会更新。'},
};
