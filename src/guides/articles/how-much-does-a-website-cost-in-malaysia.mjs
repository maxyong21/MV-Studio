// Article text. Block types: a plain string is a paragraph; {ul}, {ol}, {h3}, {note}, {table:{head,rows}}.
// Inline: **bold**, [anchor](/path or https://...), and {price:landing|company|ecommerce} or
// {fee:hosting|maintenance}, which are filled in from the live prices so they never go stale.
export default {
  en:{
    lead:[
      "Here's the honest answer first, then the long one. At MV Studio, a one-page landing page starts at {price:landing}, a company website at {price:company} and an online store at {price:ecommerce}. Other developers will quote differently, some a lot lower and some a lot higher.",
      "What matters more than the number is what's inside it. The same amount of money can buy you a site you control, or a site you're effectively renting and can't move. So this guide covers what changes the price, what quotes tend to leave out, and what to ask before you pay a deposit to anyone, us included.",
    ],
    answer:"At MV Studio the starting prices are {price:landing} for a landing page, {price:company} for a company website and {price:ecommerce} for an online store. Domain, hosting and other running costs are separate. Custom systems are quoted after we understand the job.",
    sections:[
      {id:'our-prices',heading:'Our starting prices, side by side',blocks:[
        "A starting price covers the scope listed for that package. If you want more than that, we put the extra in writing and quote it before any work begins.",
        {table:{head:['Package','Starting price','What you get','Usual timeline'],rows:[
          ['Landing page','{price:landing}','One focused page, contact form and WhatsApp button, works on phones','About 7 days once we have your content'],
          ['Company website','{price:company}','Up to five pages, product and service sections, SEO-ready foundations','3 to 4 months'],
          ['Online store','{price:ecommerce}','Product catalogue and cart, customer accounts, stock and order tools, payment integration','3 to 4 months'],
          ['Custom web app',"Let's talk",'Booking systems, databases and workflows built around how you work','3 to 4 months or more, confirmed in your quote'],
        ]}},
        "Each package has its own page with the full list of what's included: the [landing page service](/services/landing-page), the [company website service](/services/company-website) and the [online store service](/services/ecommerce-website).",
      ]},
      {id:'what-changes-the-price',heading:'What actually changes the price',blocks:[
        "Almost every quote you'll ever get is some mix of six things.",
        {ul:[
          "**How many pages.** A one-page site and a fifteen-page site are very different jobs, even if their home pages look alike.",
          "**How much content you already have.** Photos, text, your logo, your prices. If we have to help you write and organize all of it, that takes time, and time is mostly what you're paying for.",
          "**Custom design or a template.** Both are fine. Custom design costs more because someone designs your site instead of adapting a ready-made layout.",
          "**Features.** A contact form is easy. Bookings, customer logins, payments and stock tracking each add real work, and each one has to be tested.",
          "**Integrations.** A WhatsApp button is simple. Connecting a payment provider or a courier is not, and the provider decides how long its approval takes.",
          "**Languages.** English, Bahasa Malaysia and Chinese on one site means writing, checking and maintaining everything two or three times.",
        ]},
      ]},
      {id:'costs-outside-the-quote',heading:'The costs that sit outside the build price',blocks:[
        "This is where first-time owners get surprised. Building the site is a one-time job. Keeping it online is not.",
        {ul:[
          "**Domain name.** Your web address, renewed every year.",
          "**Hosting.** The computer that serves your site to visitors.",
          "**Business email.** An address that ends in your own domain.",
          "**Maintenance.** Updates, backups, security checks and small changes after launch.",
          "**Payment provider fees.** If you take payments online, the provider takes a cut of each sale.",
        ]},
        "None of these are inside our package prices. We help you set them up and tell you the charge before anything is bought, and the accounts stay in your name. For reference prices and what to check, read [domain, hosting and maintenance costs in Malaysia](/guides/domain-hosting-maintenance-costs-malaysia).",
      ]},
      {id:'cheap-quotes',heading:'Why a very cheap quote can end up costing more',blocks:[
        "We're not going to tell you cheap is bad. Starting small is a smart move. The trouble starts when a low price comes with a vague scope. Watch for these:",
        {ul:[
          "**\"Website\" with no page count.** Does that mean one page or ten?",
          "**No mention of phones.** Most of your visitors will be holding one.",
          "**Revisions left unsaid.** Some developers charge for every change after the first draft.",
          "**The developer owns the domain or hosting.** If you part ways, you can lose the site.",
          "**Nothing about after launch.** Who fixes it at 9 p.m. when the contact form stops working?",
        ]},
        "A clear scope on paper is worth more than a few hundred ringgit off the price.",
      ]},
      {id:'how-we-price',heading:'How pricing and payment work with us',blocks:[
        "The first call is free and so is the written quote. You pay nothing until you accept the quote.",
        "After that, it's 50% to confirm the project. Then we do the wireframe, confirm the feature list with you and build a prototype. Once you approve those, the remaining 50% is paid and real development begins.",
        "If you cancel within 7 days of paying and before wireframe work starts, we refund half of the deposit. After that, the deposit isn't refundable. The full wording is in our [terms and conditions](/terms#costs), and there's a short version under [how we work and pay](/#terms).",
        "After launch, new features start from RM50 each, depending on how complex they are. We quote first, and nothing starts until you agree.",
      ]},
      {id:'five-questions',heading:'Five questions to ask any web developer before you pay',blocks:[
        {ol:[
          "**What exactly is included, page by page and feature by feature?**",
          "**Who owns the domain, the hosting account and the files?** The answer should be you.",
          "**How many rounds of changes are included?**",
          "**What will I pay every year to keep it online?**",
          "**What happens if something breaks after launch, and who do I contact?**",
        ]},
        "If a developer can't answer these in writing, keep looking. That goes for us too, which is why every quote we send answers them.",
      ]},
      {id:'budgeting',heading:'So how much should you budget?',blocks:[
        "There's no magic number, but there is a sensible way to land on one.",
        {ol:[
          "Decide the one job the site must do first. Get enquiries? Take orders? Show your menu?",
          "Pick the smallest package that does that job well.",
          "Add the yearly running costs on top.",
          "Leave a little room for the first round of changes after launch.",
        ]},
        "If you're not sure whether one page is enough, start there. You can add pages later, and extra pages are quoted separately at that point. We walk through the decision in [landing page or full website: which does your SME need?](/guides/landing-page-or-full-website-for-sme)",
      ]},
    ],
    faqs:[
      ["Is the landing page price really all I pay?","It covers the design and development of the page. Hosting, a domain name and paid third-party tools are separate, and we confirm those costs with you before you decide."],
      ["Do your prices include a domain name and hosting?","No. We help you apply for them, tell you the charge in advance, and you settle it with the provider. The accounts are in your name."],
      ["Can I pay in installments?","Payment is 50% to confirm and 50% before development begins, after you've approved the wireframe, the feature list and the prototype."],
      ["Is there a monthly fee?","Not for the build itself. Hosting and maintenance are optional and billed separately: hosting is {fee:hosting} and maintenance is {fee:maintenance}."],
      ["What if I need something that isn't on your list?","Tell us what you need. We'll scope it, then quote in writing before any work starts."],
    ],
  },
  ms:{
    lead:[
      "Jawapan jujur dahulu, kemudian yang panjang. Di MV Studio, landing page satu halaman bermula pada {price:landing}, laman web syarikat pada {price:company} dan kedai dalam talian pada {price:ecommerce}. Pembangun lain akan memberi sebut harga berbeza, ada yang jauh lebih rendah dan ada yang jauh lebih tinggi.",
      "Yang lebih penting daripada angka itu ialah apa yang ada di dalamnya. Jumlah wang yang sama boleh memberi anda laman web yang anda kawal sendiri, atau laman web yang pada dasarnya anda sewa dan tidak boleh dialihkan. Jadi panduan ini menerangkan apa yang mengubah harga, apa yang sering tertinggal dalam sebut harga, dan apa yang perlu ditanya sebelum anda membayar deposit kepada sesiapa, termasuk kami.",
    ],
    answer:"Di MV Studio, harga permulaan ialah {price:landing} untuk landing page, {price:company} untuk laman web syarikat dan {price:ecommerce} untuk kedai dalam talian. Domain, pengehosan dan kos operasi lain adalah berasingan. Sistem tersuai disebut harga selepas kami faham keperluan anda.",
    sections:[
      {id:'our-prices',heading:'Harga permulaan kami, dibandingkan',blocks:[
        "Harga permulaan meliputi skop yang disenaraikan bagi pakej itu. Jika anda mahu lebih daripada itu, kami tulis tambahannya dan beri sebut harga sebelum sebarang kerja bermula.",
        {table:{head:['Pakej','Harga permulaan','Apa yang anda dapat','Tempoh biasa'],rows:[
          ['Landing page','{price:landing}','Satu halaman fokus, borang hubungan dan butang WhatsApp, sesuai di telefon','Kira-kira 7 hari selepas kami terima kandungan anda'],
          ['Laman web syarikat','{price:company}','Sehingga lima halaman, bahagian produk dan perkhidmatan, asas mesra SEO','3 hingga 4 bulan'],
          ['Kedai dalam talian','{price:ecommerce}','Katalog produk dan troli, akaun pelanggan, alat stok dan pesanan, integrasi pembayaran','3 hingga 4 bulan'],
          ['Aplikasi web tersuai','Mari berbincang','Sistem tempahan, pangkalan data dan aliran kerja mengikut cara anda bekerja','3 hingga 4 bulan atau lebih, disahkan dalam sebut harga'],
        ]}},
        "Setiap pakej ada halamannya sendiri dengan senarai penuh apa yang termasuk: [perkhidmatan landing page](/services/landing-page), [perkhidmatan laman web syarikat](/services/company-website) dan [perkhidmatan kedai dalam talian](/services/ecommerce-website).",
      ]},
      {id:'what-changes-the-price',heading:'Apa sebenarnya yang mengubah harga',blocks:[
        "Hampir setiap sebut harga yang anda terima ialah campuran enam perkara ini.",
        {ul:[
          "**Bilangan halaman.** Laman satu halaman dan laman lima belas halaman ialah kerja yang sangat berbeza, walaupun halaman utamanya nampak serupa.",
          "**Berapa banyak kandungan yang anda sudah ada.** Gambar, teks, logo, harga. Jika kami perlu membantu menulis dan menyusunnya, itu mengambil masa, dan masa ialah yang paling banyak anda bayar.",
          "**Reka bentuk tersuai atau templat.** Kedua-duanya baik. Reka bentuk tersuai lebih mahal kerana seseorang mereka bentuk laman anda dan bukan mengubah suai susun atur sedia ada.",
          "**Ciri.** Borang hubungan mudah. Tempahan, log masuk pelanggan, pembayaran dan penjejakan stok masing-masing menambah kerja sebenar, dan setiap satu perlu diuji.",
          "**Integrasi.** Butang WhatsApp mudah. Menyambungkan penyedia pembayaran atau kurier tidak mudah, dan penyedia itu yang menentukan berapa lama kelulusannya.",
          "**Bahasa.** Bahasa Inggeris, Bahasa Malaysia dan Cina dalam satu laman bermakna menulis, menyemak dan menyelenggara semuanya dua atau tiga kali.",
        ]},
      ]},
      {id:'costs-outside-the-quote',heading:'Kos di luar harga pembinaan',blocks:[
        "Di sinilah pemilik baharu sering terkejut. Membina laman ialah kerja sekali sahaja. Mengekalkannya dalam talian bukan begitu.",
        {ul:[
          "**Nama domain.** Alamat web anda, diperbaharui setiap tahun.",
          "**Pengehosan.** Komputer yang memaparkan laman anda kepada pengunjung.",
          "**E-mel perniagaan.** Alamat yang berakhir dengan domain anda sendiri.",
          "**Penyelenggaraan.** Kemas kini, sandaran, semakan keselamatan dan perubahan kecil selepas pelancaran.",
          "**Yuran penyedia pembayaran.** Jika anda menerima bayaran dalam talian, penyedia mengambil bahagiannya daripada setiap jualan.",
        ]},
        "Tiada satu pun daripada ini termasuk dalam harga pakej kami. Kami membantu anda menyediakannya dan memberitahu caj sebelum apa-apa dibeli, dan akaun kekal atas nama anda. Untuk harga rujukan dan apa yang perlu disemak, baca [kos domain, pengehosan dan penyelenggaraan di Malaysia](/guides/domain-hosting-maintenance-costs-malaysia).",
      ]},
      {id:'cheap-quotes',heading:'Mengapa sebut harga yang sangat murah boleh jadi lebih mahal',blocks:[
        "Kami tidak akan kata murah itu buruk. Bermula kecil ialah langkah bijak. Masalah bermula apabila harga rendah datang dengan skop yang kabur. Perhatikan perkara ini:",
        {ul:[
          "**\"Laman web\" tanpa bilangan halaman.** Satu halaman atau sepuluh?",
          "**Tiada sebutan tentang telefon.** Kebanyakan pengunjung anda memegang telefon.",
          "**Semakan semula tidak dinyatakan.** Sesetengah pembangun mengenakan bayaran untuk setiap perubahan selepas draf pertama.",
          "**Pembangun memiliki domain atau pengehosan.** Jika anda berpisah, anda boleh kehilangan laman itu.",
          "**Tiada apa-apa tentang selepas pelancaran.** Siapa yang membetulkannya pada pukul 9 malam apabila borang hubungan berhenti berfungsi?",
        ]},
        "Skop yang jelas di atas kertas lebih bernilai daripada beberapa ratus ringgit diskaun.",
      ]},
      {id:'how-we-price',heading:'Bagaimana harga dan pembayaran berfungsi dengan kami',blocks:[
        "Panggilan pertama percuma dan sebut harga bertulis juga percuma. Anda tidak membayar apa-apa sehingga anda menerima sebut harga itu.",
        "Selepas itu, 50% untuk mengesahkan projek. Kemudian kami buat rangka wayar (wireframe), sahkan senarai ciri bersama anda dan bina prototaip. Setelah anda meluluskannya, baki 50% dibayar dan pembangunan sebenar bermula.",
        "Jika anda membatalkan dalam masa 7 hari selepas membayar dan sebelum kerja rangka wayar bermula, kami memulangkan separuh deposit. Selepas itu, deposit tidak boleh dipulangkan. Kata-kata penuh ada dalam [terma dan syarat](/terms#costs) kami, dan versi ringkas di bawah [cara kami bekerja dan bayaran](/#terms).",
        "Selepas pelancaran, ciri baharu bermula dari RM50 setiap satu, bergantung pada kerumitan. Kami beri sebut harga dahulu, dan tiada apa-apa bermula sehingga anda bersetuju.",
      ]},
      {id:'five-questions',heading:'Lima soalan untuk ditanya kepada mana-mana pembangun web sebelum anda membayar',blocks:[
        {ol:[
          "**Apa sebenarnya yang termasuk, halaman demi halaman dan ciri demi ciri?**",
          "**Siapa yang memiliki domain, akaun pengehosan dan fail?** Jawapannya sepatutnya anda.",
          "**Berapa pusingan perubahan yang termasuk?**",
          "**Berapa yang akan saya bayar setiap tahun untuk mengekalkannya dalam talian?**",
          "**Apa yang berlaku jika ada yang rosak selepas pelancaran, dan siapa yang saya hubungi?**",
        ]},
        "Jika pembangun tidak dapat menjawab ini secara bertulis, teruskan mencari. Itu juga terpakai kepada kami, sebab itulah setiap sebut harga kami menjawabnya.",
      ]},
      {id:'budgeting',heading:'Jadi berapa yang patut anda peruntukkan?',blocks:[
        "Tiada angka ajaib, tetapi ada cara yang munasabah untuk sampai kepada satu angka.",
        {ol:[
          "Tentukan satu tugas utama yang mesti dilakukan oleh laman anda. Dapatkan pertanyaan? Terima pesanan? Tunjukkan menu?",
          "Pilih pakej terkecil yang melakukan tugas itu dengan baik.",
          "Tambah kos operasi tahunan di atasnya.",
          "Sediakan sedikit ruang untuk pusingan pertama perubahan selepas pelancaran.",
        ]},
        "Jika anda tidak pasti sama ada satu halaman sudah cukup, mulakan di situ. Anda boleh menambah halaman kemudian, dan halaman tambahan disebut harga secara berasingan pada ketika itu. Kami terangkan cara memutuskannya dalam [landing page atau laman web penuh: mana satu sesuai untuk PKS anda?](/guides/landing-page-or-full-website-for-sme)",
      ]},
    ],
    faqs:[
      ["Adakah harga landing page itu semua yang saya bayar?","Ia meliputi reka bentuk dan pembangunan halaman itu. Pengehosan, nama domain dan alat pihak ketiga berbayar adalah berasingan, dan kami mengesahkan kos itu dengan anda sebelum anda membuat keputusan."],
      ["Adakah harga anda termasuk nama domain dan pengehosan?","Tidak. Kami membantu anda memohonnya, memberitahu caj lebih awal, dan anda menyelesaikannya dengan penyedia. Akaun itu atas nama anda."],
      ["Bolehkah saya membayar secara ansuran?","Bayaran ialah 50% untuk mengesahkan dan 50% sebelum pembangunan bermula, selepas anda meluluskan rangka wayar, senarai ciri dan prototaip."],
      ["Adakah ada yuran bulanan?","Bukan untuk pembinaan itu sendiri. Pengehosan dan penyelenggaraan adalah pilihan dan dibilkan berasingan: pengehosan ialah {fee:hosting} dan penyelenggaraan ialah {fee:maintenance}."],
      ["Bagaimana jika saya perlukan sesuatu yang tiada dalam senarai anda?","Beritahu kami keperluan anda. Kami akan menentukan skop, kemudian memberi sebut harga bertulis sebelum sebarang kerja bermula."],
    ],
  },
  zh:{
    lead:[
      "先给你诚实的简短答案，再讲详细的。在 MV Studio，单页网站（Landing Page）起步价是 {price:landing}，公司网站是 {price:company}，网店是 {price:ecommerce}。别的网站开发商报价会不一样，有的低很多，有的高很多。",
      "比数字更重要的是价格里面包含了什么。同样的钱，可能买到一个完全由你掌控的网站，也可能只是租来的、搬不走的网站。所以这篇文章会讲清楚：什么会影响价格、报价单常常漏掉什么，以及在你付订金给任何人（包括我们）之前该先问什么。",
    ],
    answer:"MV Studio 的起步价：单页网站 {price:landing}，公司网站 {price:company}，网店 {price:ecommerce}。域名、主机和其他运营费用另计。定制系统会在我们了解需求之后报价。",
    sections:[
      {id:'our-prices',heading:'我们的起步价一览',blocks:[
        "起步价涵盖该方案所列的范围。如果你需要更多，我们会先以书面列出并报价，之后才开始工作。",
        {table:{head:['方案','起步价','包含内容','一般所需时间'],rows:[
          ['单页网站','{price:landing}','一个重点突出的页面、联系表格和 WhatsApp 按钮，手机上也好用','收到你的内容后约 7 天'],
          ['公司网站','{price:company}','最多五个页面、产品和服务介绍、符合 SEO 基础','3 至 4 个月'],
          ['网店','{price:ecommerce}','产品目录和购物车、顾客账户、库存和订单工具、付款整合','3 至 4 个月'],
          ['定制网页应用','欢迎洽谈','预约系统、数据库，以及按你的运作方式设计的工作流程','3 至 4 个月或更久，以报价单为准'],
        ]}},
        "每个方案都有自己的页面，列出完整的包含内容：[单页网站服务](/services/landing-page)、[公司网站服务](/services/company-website)和[网店服务](/services/ecommerce-website)。",
      ]},
      {id:'what-changes-the-price',heading:'到底是什么在影响价格',blocks:[
        "你拿到的几乎每一份报价，都是这六件事的不同组合。",
        {ul:[
          "**页面数量。** 一页的网站和十五页的网站是完全不同的工作量，即使首页看起来差不多。",
          "**你手上已有多少内容。** 照片、文字、标志、价格。如果需要我们帮你撰写和整理，这要花时间，而时间正是你主要付费的部分。",
          "**定制设计还是模板。** 两者都可以。定制设计比较贵，因为是有人为你设计，而不是修改现成的版面。",
          "**功能。** 联系表格很简单。预约、顾客登入、付款和库存管理每一项都增加实际工作，也都必须测试。",
          "**对接。** WhatsApp 按钮很简单。对接付款服务商或快递公司就不简单，而且审批多久由对方决定。",
          "**语言。** 一个网站同时有英文、马来文和中文，意味着所有内容要写、要检查、要维护两到三遍。",
        ]},
      ]},
      {id:'costs-outside-the-quote',heading:'不在建站价格里的费用',blocks:[
        "这是第一次建站的人最容易被吓到的地方。建站是一次性的工作，让网站一直在线却不是。",
        {ul:[
          "**域名。** 你的网址，每年续费。",
          "**主机。** 把你的网站提供给访客的那台电脑。",
          "**企业电邮。** 以你自己的域名结尾的电邮地址。",
          "**维护。** 更新、备份、安全检查，以及上线后的小改动。",
          "**付款服务费。** 如果你在线收款，服务商会从每笔销售中抽成。",
        ]},
        "以上这些都不包含在我们的方案价格里。我们会协助你申请，并在购买之前告诉你费用，而且账户都登记在你的名下。参考价格和注意事项，请看[马来西亚域名、主机和网站维护费用](/guides/domain-hosting-maintenance-costs-malaysia)。",
      ]},
      {id:'cheap-quotes',heading:'为什么特别便宜的报价，最后可能更贵',blocks:[
        "我们不会说便宜就是不好。从小处开始是明智的做法。问题出在价格低、范围又模糊。留意这些：",
        {ul:[
          "**写着“网站”却没有页数。** 是一页还是十页？",
          "**完全没提手机。** 你大部分访客都是拿着手机的。",
          "**没说清楚修改次数。** 有些开发商初稿之后每改一次都收费。",
          "**域名或主机归开发商所有。** 如果以后不合作了，你可能连网站都拿不回来。",
          "**上线之后的事只字不提。** 晚上九点联系表格坏了，谁来修？",
        ]},
        "白纸黑字写清楚的范围，比便宜几百令吉更值钱。",
      ]},
      {id:'how-we-price',heading:'我们的报价与付款方式',blocks:[
        "第一次通话免费，书面报价也免费。在你接受报价之前，你不需要付任何费用。",
        "之后，先付 50% 确认项目。接着我们做线框图、和你确认功能清单，并制作原型。你批准之后，再付其余 50%，正式开发才开始。",
        "如果你在付款后 7 天内、线框图工作开始前取消，我们会退还一半订金。之后订金不予退还。完整条款在我们的[条款与细则](/terms#costs)里，简短版本在[合作与付款方式](/#terms)。",
        "上线之后，新增功能每项从 RM50 起，视复杂程度而定。我们会先报价，你同意之后才开始。",
      ]},
      {id:'five-questions',heading:'付款之前，要问任何网站开发商的五个问题',blocks:[
        {ol:[
          "**到底包含什么？一页一页、一项功能一项功能地说清楚。**",
          "**域名、主机账户和文件归谁？** 答案应该是你。",
          "**包含几轮修改？**",
          "**每年要付多少钱才能让网站继续在线？**",
          "**上线后如果出问题，我该找谁？**",
        ]},
        "如果开发商无法用书面回答这些问题，那就继续找。我们也一样，所以我们寄出的每份报价都会回答这些问题。",
      ]},
      {id:'budgeting',heading:'那么，预算该怎么定？',blocks:[
        "没有神奇的数字，但有个合理的方法可以定下来。",
        {ol:[
          "先决定网站最首要的一项任务。要获得询问？接订单？展示菜单？",
          "选能把这件事做好的最小方案。",
          "把每年的运营费用加上去。",
          "留一点空间给上线后的第一轮修改。",
        ]},
        "如果你不确定一页是否足够，就从一页开始。以后可以再加页面，届时额外的页面另行报价。我们在[单页网站还是完整网站？小型企业该怎么选](/guides/landing-page-or-full-website-for-sme)里说明了怎么决定。",
      ]},
    ],
    faqs:[
      ["单页网站的价格就是我要付的全部吗？","这个价格涵盖该页面的设计和开发。主机、域名和付费的第三方工具另计，我们会在你做决定之前先与你确认这些费用。"],
      ["你们的价格包含域名和主机吗？","不包含。我们会协助你申请、提前告诉你费用，由你向服务商支付。账户登记在你的名下。"],
      ["可以分期付款吗？","付款方式是确认时付 50%，开发开始前再付 50%，也就是在你批准线框图、功能清单和原型之后。"],
      ["有月费吗？","建站本身没有月费。主机和维护是可选项目，另外计费：主机 {fee:hosting}，维护 {fee:maintenance}。"],
      ["如果我需要的东西不在你们的清单上呢？","告诉我们你的需求。我们会先确定范围，再以书面报价，之后才开始工作。"],
    ],
  },
};
