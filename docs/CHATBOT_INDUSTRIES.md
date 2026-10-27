# Project assistant: knowledge and industry setup

This pack supports education organizations, bakeries, small shops, spare parts retailers, public business websites, booking needs and internal workflows. It collects requirements and prices only selected catalogue items. It does not promise unreviewed integrations or invent custom-system prices.

## Activate on an existing installation

1. Deploy the updated `chatbot`, `chatbot-admin`, `submit-enquiry` and `retry-enquiry` Supabase Edge Functions using the existing project settings. Answer routing, estimates and manual-quotation email handling changed; replacing only the frontend is insufficient.
2. Run supabase/migrations/20261027_chatbot_industries.sql in Supabase SQL Editor. For a new database use the full schema instead. This migration is repeatable, preserves existing matching edits, and does not build or publish a release. It expects the original active business_goal goals question before sort order 18. A deliberately customized or renamed flow needs mapping first; the migration refuses to attach rules to an unrelated question.
3. In Admin -> Enquiry features review the five new manually quoted items. They have no fixed price. Do not replace them with an arbitrary price just to make an estimate appear complete. Existing items and prices are preserved.
4. In Admin -> Project assistant review Knowledge, Questions, Options, Branching and Tests. All seeded content remains editable. Optional discovery cards allow Not sure and do not block a brief when details are unknown.
5. Build a candidate, open private preview, try every relevant industry, and independently check quoted lines and totals. Confirm that changing the main goal discards answers from hidden branches.
6. Run release checks, read the results, write review notes and tick the review confirmation, then publish the candidate. Enable the assistant if paused. New content is not used by the customer assistant until this review and publication step.
7. Deploy the frontend update for the manual-quotation display. Test one real enquiry only when you are ready to receive its notification.

From PowerShell in the repository root, replace `YOUR_PROJECT_REF` with your Supabase project reference:

```powershell
npx.cmd supabase functions deploy chatbot --project-ref YOUR_PROJECT_REF --no-verify-jwt
npx.cmd supabase functions deploy chatbot-admin --project-ref YOUR_PROJECT_REF --no-verify-jwt
npx.cmd supabase functions deploy submit-enquiry --project-ref YOUR_PROJECT_REF --no-verify-jwt
npx.cmd supabase functions deploy retry-enquiry --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

Admin functions still verify the signed-in user and admin membership inside their handlers. Do not put service-role, Resend or AI provider secrets in frontend variables. Existing secrets and allowed-origin settings remain necessary.

The feature catalogue is live and separate from the draft publishing system. Adding or changing catalogue items affects available features and invalidates old estimates and release-check results. Build and test after the catalogue is ready. Knowledge and question changes remain private until a candidate is published.

## Customer flow

The customer describes an idea or starts the cards. The assistant suggests goals, which the customer can confirm or edit. Education goals reveal education questions; a spare parts catalogue reveals parts questions; retail ordering appears only if online sales or custom orders were selected. Multiple goals can be combined. Other industries have an open requirements question.

Next come optional catalogue features, budget, target date and optional third-party services. Recurring billing is shown only when a recurring service is selected. The customer reviews the scope, requests a preliminary estimate, then supplies mandatory name, company, phone and email and confirms the enquiry. The backend calculates amounts and stores the confirmed brief and selections; the normal notification path informs the team.

Selecting a goal or a learner/product count does not itself create a charge. A custom-only brief displays Manual quotation required, not a free project price. When a brief mixes priced items and custom work, displayed subtotals exclude unpriced custom requirements. No full-system quotation is promised.

## Confirmed business policies

- Education scope includes school/tuition websites and custom learning/admin systems, quoted after review.
- Revision rounds and development deposits/payment stages are agreed with the team in the proposal. Two consolidated design rounds were suggested as a starting policy, but no fixed allowance has been approved or published.
- Additional features after launch start at RM50 per feature depending on complexity, with scope and price confirmed before work.
- Third-party costs such as database, hosting and domain require full payment before purchase or activation.
- Domain and hosting accounts belong to the client. The client receives custom project source code after full project payment; third-party licences remain subject to their terms.
- The support target is acknowledgement and a next step within 2 business days, Monday-Friday excluding Malaysian public holidays. This is not a guaranteed resolution time or a 24-hour emergency service.
- English, Bahasa Melayu (MS) and Chinese (CN) website requirements can be discussed. Translation responsibilities and multilingual setup are scoped separately. This does not mean the assistant UI or every retrieved answer has been translated.
- Free maintenance depends on the confirmed promotion. Annual maintenance uses each database item's configured free months; one free month means paying eleven monthly charges.
- Hosting, domain, deployment and paid third-party services are separate from development unless explicitly included in the proposal.

## Approved knowledge articles

The following are seed answers, not generated promises. Add or edit them in Admin -> Project assistant -> Knowledge. Saving an admin draft does not change a published release.

### Choosing a website or custom system

**Client question:** Do I need a website, an online store or a custom system?

**Draft answer:** A business website introduces your organization, services and contact information. An online store adds product ordering. A custom system supports workflows such as education, bookings, inventory or internal administration. Tell us your main goal; our team reviews feasibility, scope and the final quotation.

### Education websites and learning systems

**Client question:** Can you build a school website or tuition learning system?

**Draft answer:** We accept enquiries for school and tuition websites and custom learning or administration systems. Describe your organization, learners, staff roles and the workflows you need. Learning materials, quizzes, progress tracking, enrolment and administration can be discussed as custom requirements. Availability, integrations, delivery and pricing are confirmed after review; education systems are not automatically included in a standard website package.

### Education student numbers and existing platforms

**Client question:** What do you need to know about our learners and existing education tools?

**Draft answer:** For an education project, share approximate learner and staff counts, required access roles and whether you already use a learning platform. Tell us if you need enrolment, attendance, timetables, fees, quizzes or learning materials. Connections to existing school or learning platforms need technical review; no integration is guaranteed before assessment. Student counts describe scope and do not automatically multiply a catalogue price.

### Education access and student information

**Client question:** Can students, parents and teachers have different access?

**Draft answer:** For school and tuition systems, explain which information students, parents, teachers and administrators should access. Flag requirements involving children, assessment records, uploads or sensitive information for review. Do not enter student records, passwords or private documents into this assistant. Access controls, data handling and other requirements are agreed during project scoping.

### Bakery websites and cake orders

**Client question:** Can my bakery accept custom cake requests and pickup dates?

**Draft answer:** For a bakery, we can discuss a product showcase, WhatsApp enquiries, online ordering or custom cake requests. Useful requirements include product variations, cake sizes, flavours, personalization, order lead times and collection dates. Delivery areas, order cutoffs, payment providers and custom workflows require scope review. Mention whether you want enquiries only or a full checkout; custom cake logic is not assumed to be included in a basic package.

### Retail shops and online selling

**Client question:** Can my shop start with WhatsApp enquiries instead of online payment?

**Draft answer:** For a small shop, describe the product count, variations, stock process and whether customers should enquire or pay online. A catalogue with WhatsApp enquiries and a full online store are different scopes. Tell us about delivery, pickup and existing sales tools. Stock synchronization, point-of-sale connections and payment integrations must be reviewed before confirmation.

### Spare parts catalogue and compatibility

**Client question:** Can customers search spare parts by number or vehicle compatibility?

**Draft answer:** For spare parts retail, describe part numbers, brands, categories, variations and the product data you already have. Specify whether customers search by part number, vehicle model or another compatibility reference, and whether they request a quotation or buy online. Compatibility depends on verified data supplied or approved by your business; the assistant cannot determine whether a part fits a vehicle. Search, fitment, wholesale pricing and supplier connections require custom scope review.

### Importing product and parts data

**Client question:** Can you import our spreadsheet or existing product information?

**Draft answer:** If you already have product, spare parts or learning content in a spreadsheet or another system, describe the format, approximate volume and data quality. Importing, cleaning, image preparation and migration are assessed separately. Do not paste private data or credentials into chat. Our team confirms the migration process, responsibilities and quotation after reviewing suitable samples securely.

### Appointments and booking systems

**Client question:** Can I request an appointment booking system?

**Draft answer:** Describe what people book, staff or resource availability, locations, booking rules, reminders and cancellation needs. A booking system is a custom requirement unless explicitly included in your proposal. Calendar connections, automated reminders, deposits and payment providers need feasibility review. A meeting request submitted to MV Studio is not an automatic confirmed booking.

### Internal administration and dashboards

**Client question:** Can you help replace our manual internal processes with a dashboard?

**Draft answer:** For internal operations, describe staff roles and the tasks you want to manage, such as inventory, approvals, reporting, appointments or learning administration. Tell us what is currently manual and which existing tools need connections. Dashboards, permissions, reports and integrations are scoped and quoted after review; selecting a goal does not automatically add a priced feature.

### Other industries and uncertain requirements

**Client question:** Can I enquire if my industry is not listed?

**Draft answer:** You do not need to be a retailer to contact us. Education organizations, bakeries, shops, spare parts retailers and other businesses can describe their goals. If a requirement is unclear or not listed, choose Other or Not sure and explain the workflow. Our team reviews feasibility and prepares a suitable scope rather than promising an unsupported feature.

### Hosting domain deployment and third-party tools

**Client question:** Are hosting, domain, deployment and third-party charges included?

**Draft answer:** Website development package prices cover development only. Hosting, domain registration, deployment and paid third-party tools are not included unless explicitly stated in the proposal. Third-party costs, including database, hosting and domain purchases, must be paid in full before those services are purchased or activated. Subscription fees, payment-provider fees and renewal charges are confirmed separately. Domain and hosting accounts belong to the client.

### Providing text images and editing content

**Client question:** Who supplies the text and images, and can I edit them later?

**Draft answer:** Please discuss the text, product information, branding and images you can supply. Where an admin dashboard is included in the agreed scope, your administrators can update the supported text, images or products after launch. The editable areas must be agreed; not every website package includes a dashboard. Copywriting, photography and content migration are confirmed separately.

### Revisions and new feature requests

**Client question:** How many revisions do I get, and what if I add features after launch?

**Draft answer:** A revision is a collected set of changes within the agreed design and scope. Included revision rounds are confirmed in the proposal. New pages, features or changed workflows may require a separate quotation. After-launch feature additions start from RM50 per feature depending on complexity; the team confirms the actual scope and charge before starting.

### After-launch support and maintenance coverage

**Client question:** What support will I receive and how quickly will you respond?

**Draft answer:** We aim to respond to support requests within 2 business days, Monday to Friday, excluding Malaysian public holidays. This means acknowledging the request and providing a next step, not guaranteeing a fix within that time. Resolution depends on the issue and agreed scope. After-launch support and maintenance coverage are agreed in the proposal. One month of free maintenance may be available under the current confirmed promotion; it is not an unconditional offer. Ongoing maintenance is optional and priced separately.

### One-time development and recurring subscriptions

**Client question:** Do I pay development again next year?

**Draft answer:** The website development fee is a one-time project purchase for the agreed scope. Hosting, domain renewals, maintenance and paid third-party subscriptions can create recurring charges, billed monthly or annually according to the selected service or provider. Additional development is separate. The preliminary estimate separates one-time and recurring amounts; it is not a final contract.

### Annual maintenance discount and free months

**Client question:** How does the annual maintenance free month work?

**Draft answer:** Maintenance is priced from the current database catalogue. With one annual free month, the annual charge is eleven times the monthly amount. The free-month setting can differ by service and promotion. The estimate uses the current configured free months; monthly and annual totals are alternative billing choices, not charges to add together.

### Budget and custom system estimates

**Client question:** Does choosing a budget or learner count determine the final price?

**Draft answer:** Your budget helps the team prioritize scope; it does not change catalogue prices automatically. Product counts, learner counts and staff counts are discovery information unless a priced item explicitly states otherwise. Education workflows, parts compatibility, supplier connections and other custom work need manual quotation. A preliminary subtotal includes only selected priced catalogue items and is not the full cost of an unscoped custom system.

### Delivery dates and project readiness

**Client question:** Can you promise my preferred launch date?

**Draft answer:** Share a preferred launch date and whether your content, access and requirements are ready. Timelines depend on the agreed scope, feedback, content and integrations. A starter landing-page timeline does not apply automatically to an education platform, online store or custom system. The team confirms the delivery schedule in the proposal.

### Payment stages account arrangements and source code

**Client question:** Who controls the accounts and source code, and when do I pay?

**Draft answer:** Development deposit amounts and payment stages are confirmed with the team in the proposal. Third-party database, hosting and domain costs require full payment before purchase or activation. Domain and hosting accounts belong to the client. The client receives the custom project source code after full project payment. Third-party licences remain subject to their own terms. Handover details are confirmed in the proposal; no particular development deposit percentage is promised before agreement.

### SEO visibility and website performance

**Client question:** Can you guarantee first place on Google?

**Draft answer:** SEO-ready foundations can be included in the agreed website scope, such as useful page content, descriptive titles, crawlable pages and mobile usability. Search rankings, first place on Google, visitor numbers and sales are not guaranteed. Ongoing SEO work, content writing and performance requirements should be discussed and quoted separately where needed.

### Languages accessibility and special requirements

**Client question:** Can my website use English, Bahasa Melayu and Chinese?

**Draft answer:** We can discuss websites in English, Bahasa Melayu (MS) and Chinese (CN). Tell us which languages your audience needs. Translation, supplied content, multilingual content management and specific accessibility requirements are scoped and priced in the proposal. Multiple language versions are not automatically included in a single-language package. Accessibility certification or compliance is not promised automatically.

### Getting advice WhatsApp and enquiry submission

**Client question:** Can I ask for advice before deciding all the features?

**Draft answer:** You can ask for initial advice without knowing every feature. Use the website enquiry form, the guided project assistant or the WhatsApp contact button. A WhatsApp draft must be reviewed and sent by you; opening it does not save a website enquiry. A confirmed website enquiry is saved for the team to review. A preferred meeting time is a request, not a confirmed appointment.

## Guided questions and branching

| Identifier | Customer question | Shown for |
|---|---|---|
| website_content | What should your public website include? | business_website |
| education_scope | What should your education website or system support? | education |
| education_audience | What kind of education organization is this for? | education |
| education_users | About how many learners will use the system? | education |
| education_access | Who needs access to the education system? | education |
| education_connections | Do you need to connect an existing education platform or tool? | education |
| parts_requirements | What should customers or staff be able to do with your parts catalogue? | parts_catalogue |
| parts_data | How is your parts information stored today? | parts_catalogue |
| management_scope | Which internal workflows do you want to improve? | management |
| booking_scope | What booking rules or workflows do you need? | bookings |
| custom_order_details | What details do you need for a custom order? | custom_orders |
| other_scope | What would you like your website or system to do? | other_project |

## New manually quoted catalogue items

- **Learning management system:** Learning materials, quizzes or progress workflows; feasibility and scope reviewed before quotation.
- **Education administration:** Enrolment, attendance, roles or education administration; requirements reviewed before quotation.
- **Spare parts catalogue:** Part search, verified compatibility data or quotation workflows; requirements reviewed before quotation.
- **Booking system:** Availability, appointment and reminder requirements; integrations and pricing confirmed after review.
- **Custom business workflow:** Internal administration, dashboards, approvals or integrations; feasibility and pricing confirmed after review.

## Customer questions and expected behavior

For a factual answer, check the approved source and full meaning, not just whether an expected phrase appears. For a planning request, the expected response opens relevant cards rather than inventing an exact quote.

| Customer asks | Expected action | Must include |
|---|---|---|
| I need a tuition management system | guide | scope |
| I want a school website with student enrolment | guide | scope |
| I want a spare parts catalogue with part number search | guide | scope |
| I need an appointment booking system | guide | scope |
| I want a company website | guide | scope |
| Are hosting and domain charges included? | answer | not included |
| How many revisions can I request? | answer | proposal |
| What support do I receive after launch? | answer | proposal |
| Can I update my website text and images? | answer | agreed scope |
| Can you guarantee first place on Google? | answer | not guaranteed |
| What deposit percentage do I pay? | answer | proposal |
| How much is a tuition learning system? | clarify | scope |
| Can you guarantee this part fits my vehicle? | answer | verified |
| Can you build everything for RM500? | clarify | scope |
| What is your support response time? | answer | 2 business days; not guaranteeing a fix |
| Will I receive the project source code? | answer | full project payment; Third-party licences |
| When must I pay for hosting and domain? | answer | paid in full |
| What website languages do you support? | answer | English; Bahasa Melayu; Chinese |

Also manually test a bakery custom cake brief, a parts catalogue without checkout, combined education and online-sales goals, no budget, unknown launch date, edited goals, disabled features, a price change before submission, a temporary failure and retry, and a request the team cannot assess from published knowledge. Preview never submits an enquiry. End-to-end automated browser tests use a temporary database and mocked email delivery.

## Maintaining this pack

The reviewed seed source is supabase/functions/_shared/chatbot/industry-content.mjs. Run node scripts/generate-chatbot-content.mjs to regenerate the migration and its matching full-schema block after a reviewed source change. Inserts preserve existing matching rows; they do not overwrite admin changes or update live rows just because a seed file changed. Use admin drafts for ongoing edits, then build/test/publish. Do not rerun an old destructive reset to refresh chatbot content.

There are 23 new articles, 12 conditional questions, 50 options, 5 manually quoted items and 18 answer tests, in addition to existing content. Approval of one scenario is not proof that every answer is correct; keep reviewing real, redacted enquiries and adding representative tests.
