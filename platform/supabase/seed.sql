-- Development seed for the RIASEC assessment and its original career catalog.
-- Safe to re-run: inserts use natural unique keys with ON CONFLICT DO NOTHING.
-- Prepared simulations/interviews are imported by migration
-- 202610160002_import_prepared_content.sql, which runs before this seed.
-- Do not re-add the old sample simulation/interview sections: their default
-- one-round interview rows lack the prepared grading and availability metadata.
-- This seed never deletes existing production catalog entries or candidate work.

-- ---------------------------------------------------------------------------
-- Feature 1: RIASEC assessment (30 questions, 5 per dimension)
-- ---------------------------------------------------------------------------

insert into public.assessment_questions (position, prompt, dimension) values
  (1,  'I enjoy assembling, repairing, or building things with my hands.', 'realistic'),
  (2,  'I would rather work with tools and machines than with people.', 'realistic'),
  (3,  'I like physically active work over sitting at a desk all day.', 'realistic'),
  (4,  'I enjoy figuring out how equipment or systems physically work.', 'realistic'),
  (5,  'I like seeing a concrete, finished product at the end of my work.', 'realistic'),

  (6,  'I enjoy solving complex problems by analysing data.', 'investigative'),
  (7,  'I like reading about scientific or technical discoveries.', 'investigative'),
  (8,  'I enjoy running experiments to test whether an idea holds up.', 'investigative'),
  (9,  'I prefer work that requires deep thinking over fast action.', 'investigative'),
  (10, 'I like finding the root cause of a problem others gave up on.', 'investigative'),

  (11, 'I enjoy expressing ideas through writing, design, or media.', 'artistic'),
  (12, 'I prefer work with few rules and lots of creative freedom.', 'artistic'),
  (13, 'I like imagining new concepts that nobody has tried yet.', 'artistic'),
  (14, 'I notice aesthetic details others overlook.', 'artistic'),
  (15, 'I would enjoy a job where originality matters more than routine.', 'artistic'),

  (16, 'I enjoy teaching or explaining things to other people.', 'social'),
  (17, 'I feel energised after helping someone solve a personal problem.', 'social'),
  (18, 'I like working in teams more than working alone.', 'social'),
  (19, 'People often come to me for advice or support.', 'social'),
  (20, 'I would choose work that visibly improves other people''s lives.', 'social'),

  (21, 'I enjoy persuading others to accept my proposal.', 'enterprising'),
  (22, 'I like leading a group toward an ambitious target.', 'enterprising'),
  (23, 'I am comfortable taking calculated risks for a bigger reward.', 'enterprising'),
  (24, 'I enjoy negotiating and closing deals.', 'enterprising'),
  (25, 'I would like to start and run my own business one day.', 'enterprising'),

  (26, 'I like working with clear procedures and defined standards.', 'conventional'),
  (27, 'I enjoy organising records, numbers, or files accurately.', 'conventional'),
  (28, 'I feel satisfied when everything reconciles and balances.', 'conventional'),
  (29, 'I prefer knowing exactly what is expected of me at work.', 'conventional'),
  (30, 'I am careful and detail-oriented with paperwork and compliance.', 'conventional')
on conflict (position) do nothing;

-- ---------------------------------------------------------------------------
-- Feature 1: Career catalog (ideal RIASEC profiles, 0-100 per dimension)
-- ---------------------------------------------------------------------------

insert into public.careers (
  slug, title, industry, summary, typical_majors, entry_roles, key_skills,
  realistic, investigative, artistic, social, enterprising, conventional
) values
  ('auditor', 'External Auditor', 'Accounting & Auditing',
   'Examines financial statements so investors, regulators, and lenders can trust them. Strong entry route into finance, with a clear professional qualification ladder.',
   array['Accounting', 'Auditing', 'Finance'],
   array['Audit Associate', 'Assurance Intern'],
   array['Financial reporting', 'Analytical scepticism', 'Excel', 'Documentation'],
   10, 70, 10, 35, 40, 95),

  ('management-accountant', 'Management Accountant', 'Accounting & Auditing',
   'Turns internal cost and performance data into decisions managers can act on. Sits closer to operations than statutory reporting does.',
   array['Accounting', 'Management Accounting', 'Business Analytics'],
   array['Cost Analyst', 'Finance Graduate'],
   array['Cost analysis', 'Budgeting', 'Variance analysis', 'Excel modelling'],
   10, 65, 15, 40, 45, 90),

  ('financial-analyst', 'Financial Analyst', 'Finance & Banking',
   'Values companies and assets, builds forecasting models, and recommends where capital should go.',
   array['Finance', 'Economics', 'Accounting'],
   array['Analyst', 'Investment Banking Intern'],
   array['Valuation', 'Financial modelling', 'Market research', 'Presenting'],
   5, 80, 20, 30, 65, 75),

  ('credit-officer', 'Credit Officer', 'Finance & Banking',
   'Assesses whether borrowers can repay, then structures lending that balances risk against return.',
   array['Finance', 'Banking', 'Economics'],
   array['Credit Analyst', 'Relationship Banking Trainee'],
   array['Credit risk', 'Financial statement analysis', 'Client interviews'],
   10, 65, 10, 55, 60, 85),

  ('software-engineer', 'Software Engineer', 'Information Technology',
   'Designs, writes, and maintains the software systems a product runs on.',
   array['Computer Science', 'Software Engineering', 'Information Systems'],
   array['Junior Developer', 'Software Engineer Intern'],
   array['Programming', 'Data structures', 'Debugging', 'Version control'],
   45, 90, 40, 25, 35, 55),

  ('data-analyst', 'Data Analyst', 'Information Technology',
   'Converts raw data into the metrics and dashboards a business steers by.',
   array['Data Science', 'Statistics', 'Computer Science', 'Economics'],
   array['Data Analyst', 'BI Intern'],
   array['SQL', 'Statistics', 'Visualisation', 'Business storytelling'],
   15, 90, 30, 35, 40, 70),

  ('digital-marketer', 'Digital Marketing Specialist', 'Marketing',
   'Plans and runs paid, organic, and owned campaigns, then optimises them against real performance data.',
   array['Marketing', 'Communications', 'Business'],
   array['Marketing Executive', 'Growth Intern'],
   array['Campaign planning', 'Analytics', 'Copywriting', 'A/B testing'],
   5, 50, 70, 50, 80, 40),

  ('brand-content-strategist', 'Brand & Content Strategist', 'Marketing',
   'Defines what a brand stands for and builds the content system that expresses it consistently.',
   array['Marketing', 'Communications', 'Journalism', 'Design'],
   array['Content Executive', 'Brand Intern'],
   array['Storytelling', 'Editorial planning', 'Audience research', 'Design sense'],
   5, 40, 90, 55, 65, 30),

  ('supply-chain-analyst', 'Supply Chain Analyst', 'Logistics',
   'Uses demand and cost data to keep inventory, sourcing, and distribution efficient.',
   array['Logistics', 'Supply Chain Management', 'Industrial Engineering'],
   array['Supply Chain Analyst', 'Planning Intern'],
   array['Demand planning', 'Data analysis', 'ERP systems', 'Cost optimisation'],
   35, 75, 10, 35, 50, 85),

  ('logistics-coordinator', 'Logistics Coordinator', 'Logistics',
   'Keeps freight moving day to day, coordinating carriers, warehouses, and customs paperwork.',
   array['Logistics', 'Supply Chain Management', 'International Trade'],
   array['Logistics Coordinator', 'Operations Intern'],
   array['Scheduling', 'Vendor coordination', 'Customs documentation', 'Problem solving'],
   55, 40, 10, 60, 55, 80)
on conflict (slug) do nothing;
