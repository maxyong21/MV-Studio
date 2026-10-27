-- Fill only blank fields on the existing starter records. Preserve admin edits.
-- These describe delivered functionality, not client endorsements or measured gains.
begin;
with descriptions(name,challenge,solution,outcome) as (values
 ('APMoodle',
  'Students and lecturers need one place to access course materials, practise through quizzes and review learning progress.',
  'Built a learning management system with course materials, themed quizzes and progress tracking.',
  'The application brings learning materials, quiz activities and progress information into one learning workflow.'),
 ('Psychology Consultation',
  'Students and lecturers need a structured way to arrange and manage consultation appointments.',
  'Built a consultation booking and management system with scheduling workflows for students and lecturers.',
  'The delivered system supports consultation booking and appointment management in one application.'),
 ('Super Maths Bros',
  'Students need opportunities to practise differentiation while lecturers need visibility of learning progress.',
  'Built a game-based mathematics experience combining differentiation lessons, quizzes and progress tracking.',
  'The application combines mathematics practice and progress tracking within a game-based learning experience.'),
 ('HyperText Edu',
  'Students learning HTML need opportunities to practise concepts through interactive activities.',
  'Built a gamified HTML learning platform with quizzes and coding challenges.',
  'The platform brings HTML practice, quizzes and coding challenges into one learning experience.')
)
update public.projects p set
 challenge=case when nullif(btrim(p.challenge),'') is null then d.challenge else p.challenge end,
 solution=case when nullif(btrim(p.solution),'') is null then d.solution else p.solution end,
 outcome=case when nullif(btrim(p.outcome),'') is null then d.outcome else p.outcome end
from descriptions d where p.name=d.name;

with scopes(name,scope) as (values
 ('Landing Page','One responsive landing page with the listed contact and social links. Content, design and any additional integrations are agreed before development.'),
 ('Company Website','Up to five pages with the listed company, product or service sections. Page structure, content editing needs and integrations are agreed in the proposal.'),
 ('E-Commerce','The listed catalogue, cart, customer account, inventory, order and payment integration features. Product volume, payment provider and additional workflows are agreed in the proposal.'),
 ('Custom Web App','A custom scope agreed after discussing the required users, workflows, data and integrations. The proposal defines the deliverables and quotation.')
)
update public.services s set
 scope=case when nullif(btrim(s.scope),'') is null then d.scope else s.scope end,
 revisions=case when nullif(btrim(s.revisions),'') is null then 'A revision is a collected set of changes within the agreed design. Included rounds are confirmed in the proposal; new features and scope changes are quoted separately.' else s.revisions end,
 third_party_costs=case when nullif(btrim(s.third_party_costs),'') is null then 'Development prices exclude deployment, hosting, domain registration and paid third-party tools. Provider subscriptions and transaction fees are separate and confirmed before work begins.' else s.third_party_costs end,
 maintenance_terms=case when nullif(btrim(s.maintenance_terms),'') is null then 'Ongoing maintenance is optional and quoted separately. Monthly or annual billing and any free months follow the selected maintenance plan and confirmed promotion.' else s.maintenance_terms end,
 support_terms=case when nullif(btrim(s.support_terms),'') is null then 'Support coverage is agreed in the proposal. One month of free maintenance may apply under a confirmed promotion; additional features after launch start from RM50 each, depending on complexity.' else s.support_terms end,
 payment_terms=case when nullif(btrim(s.payment_terms),'') is null then 'Website development is a one-time project fee. Payment stages, third-party charges and any recurring subscriptions are confirmed in the proposal before development begins.' else s.payment_terms end
from scopes d where s.name=d.name;
-- No testimonials are seeded: publish only genuine feedback with permission.
commit;
