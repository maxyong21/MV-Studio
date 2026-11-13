// Plain-language help for every admin section: what the page is for, where the
// result shows up, how to use it, and what to watch out for. Edit the wording
// here; AdminGuide.jsx only lays it out.
export const navGroups=[
  ['Today',['overview']],
  ['Customers',['enquiries','marketing','chatbot']],
  ['Website content',['services','feature_options','projects','team_members','promotions','testimonials','faqs','site_content']],
  ['Housekeeping',['trash','security','system_status']],
];
export const groupOf=key=>navGroups.find(([,keys])=>keys.includes(key))?.[0]||'Workspace';

const liveNote='Saved changes show on the live website straight away. Search-engine previews update after the next site deploy.';
export const guides={
  overview:{
    purpose:'Start here each day. It shows which customers are waiting on you and whether your website is fully filled in.',
    where:'Private. It reads your enquiries and published content; it changes nothing.',
    steps:['Check “Follow-ups due” and “New enquiries” at the top.','Open each item under “Needs your attention” and deal with it.','Glance at “Your website at a glance” for any section with nothing published.'],
    notes:['An enquiry appears here when its follow-up date arrives, or when it is new and a day old with no follow-up set.','It leaves the list when you move the follow-up date or mark the enquiry won or closed.'],
  },
  security:{
    purpose:'Protect the admin with a second step. After your password, you type a 6-digit code from an app on your phone.',
    where:'Your own sign-in only. Other administrators choose for themselves.',
    steps:['Install an authenticator app on your phone.','Press “Set up authenticator app” and scan the square code.','Type the code the app shows, then press “Confirm and turn on”.'],
    notes:['Once it is on, your password alone is refused everywhere: this page, the database and email sending.','If you lose your phone, the authenticator must be removed in the Supabase dashboard before you can sign in.','Nothing changes until you confirm a code.'],
  },
  trash:{
    purpose:'A safety net. Anything you delete in the admin waits here for 30 days before it is gone for good.',
    where:'Private. A deleted item is removed from the website immediately.',
    steps:['Find the item. The line under its name says how many days are left.','Press “Restore” to put it back exactly as it was.','Press “Delete for good” only when you are sure.'],
    notes:['Restoring a project that was shown in the footer fails if four footer projects are already chosen. Free a slot first.','After 30 days an item is removed permanently and cannot be recovered.'],
  },
  enquiries:{
    purpose:'See every request customers send from the website form or the project assistant, and follow each one through to a result.',
    where:'Private. Customers only see their own confirmation message.',
    steps:['Open an enquiry to read what the customer asked for and their estimate.','Assign it, set a follow-up date and add internal notes so nothing is forgotten.','Reply by WhatsApp or email, then prepare a quotation if they want to go ahead.','Change the status as it moves from new to contacted, qualified, won or closed.'],
    notes:['“Retry enquiry email” resends only the notification to your team, never anything to the customer.','A deleted enquiry goes to Recently deleted and can be restored for 30 days.'],
  },
  marketing:{
    purpose:'Write an email and send it to businesses you want to introduce the studio to, or to existing customers.',
    where:'In the recipient’s inbox. Nothing here changes the website.',
    steps:['Add recipients. Keep “Send a separate email to each address” ticked for first contact.','Write the subject and message, or start from “Use introduction starter”.','Save the draft, then send a test and read it in your own inbox.','Press “Review email”, check the list, and confirm. Progress appears under Campaigns.'],
    notes:['The send button unlocks only after a test of the exact current content. Any edit needs a new test.','“Do not contact” blocks an address. A block you made can be lifted with “Allow contact again”; a recipient’s own opt-out cannot.','Emails leave one at a time, within the daily limit.'],
  },
  chatbot:{
    purpose:'Control what the “Plan your project” assistant on the website says, asks and estimates.',
    where:'The chat button on the homepage and on project pages.',
    steps:['Edit the approved answers and the guided questions as a draft.','Use “Review as a customer” to try the draft privately.','Create a candidate release and run its checks.','Publish the release when it passes. Visitors keep the old version until then.'],
    notes:['Drafts are private. Only a published release reaches visitors.','Estimates from the assistant are preliminary and always marked for manual review.'],
  },
  services:{
    purpose:'Set the packages and starting prices customers compare before they contact you.',
    where:'The “What we can do” section of the homepage.',
    steps:['Press “Add service”, or the pencil to edit one.','Fill in the name, price, what is included and the delivery estimate.','Tick “Visible on website” and save.','Use “Display order” to arrange the cards: lower numbers come first.'],
    notes:[liveNote,'The second card in the order is shown as the highlighted favourite.'],
  },
  feature_options:{
    purpose:'Choose the add-ons a customer can tick in the enquiry form, and how each is priced.',
    where:'The feature list inside the enquiry form, and the estimate it calculates.',
    steps:['Add a feature with a short name and a one-line description.','Pick the billing type: one-time, monthly, or quote for anything priced case by case.','Enter the price, tick “Available to customers” and save.'],
    notes:[liveNote,'Changing a price affects new enquiries only. Past enquiries keep the figures the customer saw.'],
  },
  projects:{
    purpose:'Show the work the team has built, each with its own detail page.',
    where:'“Selected work” on the homepage, each project’s page, and up to four in the footer.',
    steps:['Add a project with its name, type and a short description.','Upload a screenshot and add the demo link or video if there is one.','Fill in challenge, approach and outcome to turn it into a case study.','Tick “Visible on website” and save.'],
    notes:[liveNote,'Only state outcomes you can verify.','The footer shows at most four projects.'],
  },
  team_members:{
    purpose:'Keep each person’s profile, photo and work contact details current.',
    where:'The team section of the homepage, and the signature of marketing emails.',
    steps:['Add or edit a team member.','Enter a work email and phone: these are public and appear in email signatures.','Upload a photo, tick “Visible on website” and save.'],
    notes:[liveNote,'Use work contact details only. Everything here is publicly readable.'],
  },
  promotions:{
    purpose:'Run a time-limited offer that pops up for website visitors.',
    where:'A popup on the homepage, the “Offers” link in the menu, and a strip above the services.',
    steps:['Add a promotion with a headline, the offer details and a button link.','Use “Preview popup” to see exactly what visitors will see.','Set start and end times if it should switch on and off by itself.','Tick both “Published” and “Popup enabled”, then save.'],
    notes:[liveNote,'The popup opens by itself once a day for each visitor. They can reopen it from “Offers”.','Only one promotion shows at a time: the first one that is published, enabled and within its dates.'],
  },
  testimonials:{
    purpose:'Publish quotes from real clients, with their permission.',
    where:'The “In our clients’ words” section of the homepage. The section stays hidden until at least one is published.',
    steps:['Add the client’s name, company and their exact words.','Tick the permission box only after the client has agreed in writing.','Tick “Publish on website” and save.'],
    notes:[liveNote,'A quote without confirmed permission is never shown, even if published.'],
  },
  faqs:{
    purpose:'Answer the questions customers ask most, so they do not have to message you first.',
    where:'The FAQ section near the bottom of the homepage.',
    steps:['Add a question in the customer’s own words.','Write a short, direct answer.','Tick “Publish on website” and save. Use “Display order” to arrange them.'],
    notes:[liveNote],
  },
  site_content:{
    purpose:'Edit the homepage headline and story, your contact details, and what search engines show.',
    where:'The top of the homepage, the contact section, the footer and search results.',
    steps:['Change the text you need. Fields marked Required cannot be left empty.','Add or remove email addresses and phone numbers with the buttons under each list.','Press “Save changes” at the top. Nothing is saved until you do.'],
    notes:[liveNote,'Leaving this page before saving discards your edits.'],
  },
  system_status:{
    purpose:'Check whether the public website is loading its content, and see what went wrong if it is not.',
    where:'Private. Visitors never see this page.',
    steps:['Open this page when a customer says the site looks empty or shows “coming soon”.','Read “Website availability” for the current state.','Check “Recent diagnostics” for the failure message to pass on to your developer.'],
    notes:['Diagnostics are kept in this browser only and are not shared with anyone.'],
  },
};
