// Initial editable content. The public assistant reads a published database release.
import {industryDocuments,industryQuestions,industryOptions,industryRules,industryTests} from './industry-content.mjs';
export const defaultDocuments=[
  ...industryDocuments,
  {title:'How preliminary estimates work',category:'Quotations',body:'An initial estimate is a planning guide. It itemizes selected features using the current catalogue. Custom work and third-party charges may need a separate quotation. Our team confirms the final scope, delivery date and payment terms before work begins.'},
  {title:'Maintenance and annual billing',category:'Maintenance',body:'Recurring services can be billed monthly or annually. Any free months on an annual plan are configured separately for each service. The estimate shows one-time work separately from recurring charges. Ask our team to confirm the maintenance scope and renewal terms.'},
  {title:'Requesting a meeting',category:'Contact',body:'You can request a short meeting with a project enquiry. A preferred date is a request for a callback, not a confirmed booking. Our team will contact you to agree a suitable time.'},
];
export const defaultQuestions=[
  ...industryQuestions,
  {key:'business_goal',title:'What should your system help you do?',kind:'goals',help_text:'Choose the main goals. You can change these later.',sort_order:10},
  {key:'catalogue_size',title:'About how many products or items do you have?',kind:'number',help_text:'An approximate count helps us understand the scope. This does not automatically multiply your price.',sort_order:20},
  {key:'ordering',title:'How should customers place orders?',kind:'single',sort_order:30},
  {key:'payments',title:'How would you like to collect payments?',kind:'single',sort_order:40},
  {key:'delivery',title:'How will customers receive their orders?',kind:'multi',sort_order:50},
  {key:'features',title:'Which website or system features do you need?',kind:'features',catalog_categories:['core'],required:false,help_text:'Choose only what you need. Custom features will be reviewed by our team.',sort_order:60},
  {key:'budget',title:'What budget range are you planning for?',kind:'single',help_text:'This helps us suggest a suitable scope. It does not change the catalogue prices.',sort_order:70},
  {key:'target_date',title:'Do you have a preferred launch date?',kind:'date',required:false,help_text:'This is a preference. Delivery is confirmed after scope review.',sort_order:80},
  {key:'extras',title:'Would you like any additional services?',kind:'features',catalog_categories:['third_party','maintenance'],required:false,help_text:'Optional services may have recurring or third-party charges.',sort_order:90},
  {key:'billing_period',title:'How would you prefer to pay for recurring services?',kind:'billing',allow_unsure:false,sort_order:100},
].map(row=>({help_text:'',required:true,allow_unsure:true,min_value:0,max_value:100000,catalog_categories:[],active:true,...row}));
export const defaultOptions=[
  ['business_goal','online_sales','Sell products online','Product catalogue, ordering and checkout',['online shop','online system','bakery','store','sell','ecommerce','e-commerce','网上','面包','kedai','jualan']],
  ['business_goal','custom_orders','Accept custom orders','For example, made-to-order cakes or personalized products',['custom cake','custom order','cake','personalized','蛋糕','tempahan']],
  ['business_goal','management','Manage internal operations','Stock, orders, staff tools or reporting',['inventory','stock','dashboard','staff','management','管理','库存','stok']],
  ['ordering','enquiry','Enquiries through WhatsApp','Customers discuss their order with you',[]],
  ['ordering','checkout','Website cart and checkout','Customers submit an order through your website',[]],
  ['ordering','both','Both enquiries and checkout','Support both types of orders',[]],
  ['payments','online','Online payments','Provider and integration scope will be confirmed',[]],
  ['payments','manual','Manual payment or pay on collection','For example, transfer or payment on pickup',[]],
  ['delivery','pickup','Customer pickup','Customers collect their orders',[]],
  ['delivery','delivery','Delivery','Delivery coverage and integration need scoping',[]],
  ['budget','under_1000','Below RM1,000','',[]],
  ['budget','range_1000_3000','RM1,000–RM3,000','',[]],
  ['budget','range_3000_10000','RM3,000–RM10,000','',[]],
  ['budget','over_10000','Above RM10,000','',[]],
  ['billing_period','monthly','Monthly','Recurring services billed monthly',[]],
  ['billing_period','yearly','Annual','Apply each service’s configured annual free months',[]],
].map(([question_key,value,label,description,keywords],index)=>({question_key,value,label,description,keywords:keywords.filter(word=>word!=='online system'),active:true,sort_order:index+1})).concat(industryOptions);
export const defaultRules=[
  ...industryRules,
  ...['catalogue_size','ordering','payments','delivery'].map(question_key=>({question_key,source_key:'business_goal',operator:'includes_any',values:['online_sales','custom_orders'],active:true,sort_order:1})),
  {question_key:'billing_period',source_key:'$has_recurring',operator:'equals',values:['true'],active:true,sort_order:1},
];
export const defaultTests=[
  ...industryTests,
  {name:'Bakery request starts guided planning',kind:'answer',prompt:'I want an online system for my bakery shop',expected_action:'guide',expected_terms:['scope'],forbidden_terms:[],active:true,sort_order:1},
  {name:'Unknown information goes to the team',kind:'answer',prompt:'What is the owner’s favourite holiday destination?',expected_action:'handoff',expected_terms:['team'],forbidden_terms:[],active:true,sort_order:2},
  {name:'A meeting preference is not a booking',kind:'answer',prompt:'Is my preferred meeting date a confirmed booking?',expected_action:'answer',expected_terms:['not a confirmed booking'],forbidden_terms:['guaranteed booking'],active:true,sort_order:3},
  {name:'Uncertain scope has no invented catalogue charges',kind:'quote',answers:{business_goal:'__unsure__',budget:'__unsure__',features:[],extras:[]},expected_one_time:0,expected_monthly:0,expected_annual:0,active:true,sort_order:4},
];
