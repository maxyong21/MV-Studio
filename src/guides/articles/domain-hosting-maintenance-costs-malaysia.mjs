export default {
  en:{
    lead:[
      "You've got a quote for your website and it looks fair. Then someone mentions the domain, the hosting, the email and maintenance, and suddenly you're not sure what you're really signing up for. It's the most common question we get after the quote: what do I pay every year, and to whom?",
      "This guide goes through each recurring cost in plain words, gives reference prices where we could find them, and tells you what to check before you buy. Prices were checked in November 2026.",
    ],
    answer:"Every website has running costs on top of the build: a domain (renewed yearly), hosting, optional business email, and maintenance. A .com.my domain usually costs around RM80 a year, and entry hosting runs from under RM100 to a few hundred ringgit a year. These figures are for reference only, so check each provider's official site before buying.",
    note:"*These prices are a reference only. Prices change and promotions expire, so always check the official website of the registrar or provider for the real price before you buy.",
    sections:[
      {id:'what-we-cover',heading:'First, what is and is not in our packages',blocks:[
        "None of the costs below are included in our package prices. We help you apply for them, we tell you the charge before anything is bought, and you settle the charges with the provider. The accounts are registered in your name. If any service charge applies to our help, or to the optional plans we mention below, we tell you up front and in writing. The same goes for our [company website](/services/company-website) and [online store](/services/ecommerce-website) packages, and the full payment steps are under [how we work and pay](/#terms).",
      ]},
      {id:'domain',heading:'Domain name: your web address',blocks:[
        "This is the address people type, like yourshop.com.my. You rent it, and you renew it every year.",
        {ul:[
          "**.com.my** is the usual choice for Malaysian businesses. Registrars commonly charge around RM80 a year, though the registry adjusted its fees slightly in 2024, so confirm the current price. Registering one usually needs your business registration details.",
          "**A promotion:** since July 2025, a newly registered SSM business can get one .com.my domain for RM60 a year. It's limited to one per business, so check whether you qualify.",
          "**.my** costs more than .com.my. Check the current price with the registrar.",
          "**.com** is also fine and is priced by the registrar. Renewal prices can be different from the first-year price.",
        ]},
        "Register it in your own name. And switch on auto-renew, because a domain that expires can be lost.",
      ]},
      {id:'hosting',heading:'Hosting: where your website lives',blocks:[
        "Hosting is the service that keeps your site online and delivers it to visitors. Prices vary a lot, and the headline price isn't always the price you keep paying.",
        {ul:[
          "Entry-level shared hosting from Malaysian providers runs from under RM100 to a few hundred ringgit a year, depending on the plan and the provider.",
          "Promotional prices are often for the first term only. Renewal prices can be a lot higher, so read the renewal price before you pay.",
          "Local servers are generally faster for Malaysian visitors. Cheaper overseas plans can be fine for a simple site, but check what support you get.",
        ]},
        "If you'd like us to arrange hosting, our optional hosting plan is {fee:hosting}. You can also buy hosting directly from any provider.",
      ]},
      {id:'ssl',heading:'SSL certificate: the padlock',blocks:[
        "An SSL certificate is what turns your address into https and puts the padlock in the browser. Browsers warn visitors about sites without one, so you want it.",
        "The good news is that it's often free. Many hosts include it, and [Let's Encrypt](https://letsencrypt.org/about/) is a free, nonprofit certificate authority. Paid certificates exist, but a small business site rarely needs one.",
      ]},
      {id:'email',heading:'Business email: you@yourshop.com.my',blocks:[
        "An email on your own domain looks more trustworthy than a personal Gmail. You have two common routes.",
        {ul:[
          "**Email bundled with your hosting.** Many plans include basic mailboxes.",
          "**A dedicated email service.** Google Workspace's entry plan is listed at about RM29 a user each month at the regular price, before tax, with introductory discounts for new customers. See [Google's pricing page for Malaysia](https://workspace.google.com/intl/en_my/pricing.html) for the current price.",
        ]},
        "Count how many mailboxes you need. Most small businesses need one to three.",
      ]},
      {id:'maintenance',heading:'Maintenance: keeping it healthy',blocks:[
        "A website isn't something you build once and forget. Software needs updates, backups need to run, security needs watching, and sometimes a price or a photo needs changing. You can handle that yourself, or you can pay someone to do it.",
        {ul:[
          "Our optional maintenance plan is {fee:maintenance}. It covers updates, backups and ongoing site care.",
          "After launch, one-off changes and new features start from RM50 each, depending on how complex they are. We quote first.",
          "If you don't take a plan, you're responsible for updates and backups, so ask your developer what that involves.",
        ]},
        "Maintenance can be a long-term arrangement if you subscribe, so it's worth asking what's covered and how to cancel.",
      ]},
      {id:'other-costs',heading:'Other costs that can show up',blocks:[
        {ul:[
          "**Payment provider fees.** If you take payments online, the provider charges a fee on each sale and has its own approval steps.",
          "**Paid tools and plugins.** Some features rely on paid services, like SMS or booking tools.",
          "**Professional photos or copywriting,** if you'd rather not do it yourself.",
        ]},
        "We list these in your quote so nothing surprises you. For the build price itself, see [how much a website costs in Malaysia](/guides/how-much-does-a-website-cost-in-malaysia).",
      ]},
      {id:'worksheet',heading:'A simple worksheet for your yearly budget',blocks:[
        {ol:[
          "Domain: the registrar's current price for the extension you want.",
          "Hosting: the renewal price, not the first-term promotion.",
          "Email: the number of mailboxes times the monthly price times twelve, or zero if it's bundled.",
          "Maintenance: our optional plan, another provider, or yourself.",
          "Add a small buffer for payment fees or a change you didn't plan for.",
        ]},
        "Add those up and you'll have your real running cost. Then look at the build price and the [timeline](/guides/how-long-does-it-take-to-build-a-website-malaysia), and you'll know what you're signing up for. If you're setting up a new business at the same time, the [website checklist](/guides/new-business-website-checklist-malaysia) puts all of this in order.",
      ]},
    ],
    faqs:[
      ["Do I have to pay for hosting if I buy a domain?","Yes. A domain is just the address. Hosting is the space where the site lives, and the two are bought separately."],
      ["Who should own the domain?","You should. It's registered in your name, with a contact email you control, so you can always move or keep your website."],
      ["Is .my or .com.my better for a Malaysian business?","The .com.my is the common choice and usually costs around RM80 a year. The .my is more expensive. Either works, so pick based on price and how you'd like your address to look."],
      ["What happens if I forget to renew my domain?","It can expire and be lost. Turn on auto-renew and keep your registration email up to date."],
      ["Are the prices in this article exact?","No. They are references. Prices change and promotions expire, so check the official site of the registrar or provider before you buy."],
    ],
  },
};
