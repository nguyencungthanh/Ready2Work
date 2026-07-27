-- Catalog seed data for features 1-4. Safe to re-run: every insert is keyed on
-- a natural unique column and ends with on conflict do nothing.

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

-- ---------------------------------------------------------------------------
-- Feature 3: Job simulations (2 positions per industry)
-- Rubric weights must total 100 per simulation.
-- ---------------------------------------------------------------------------

insert into public.simulations (
  slug, industry, position_title, brief, task_instructions, estimated_minutes,
  min_words, rubric
) values
  ('audit-receivables-review', 'Accounting & Auditing', 'Audit Associate',
   'You are an audit associate at a mid-tier firm. A retail client reports accounts receivable of 4.2bn VND, up 60% year on year while revenue grew only 8%. The engagement manager wants your view before fieldwork starts.',
   'Write a memo to the manager that: (1) states the risk you see and why the ratio movement matters, (2) lists the audit procedures you would perform, (3) names the evidence you would request from the client, and (4) states what would make you escalate this to the partner.',
   60, 150,
   '[{"id":"risk","label":"Risk identification","description":"Names the specific risk and links it to the ratio movement.","keywords":["risk","overstat","fictitious","cut-off","collectab","impair","allowance","doubtful"],"weight":30},
     {"id":"procedures","label":"Audit procedures","description":"Proposes concrete, relevant procedures.","keywords":["confirmation","circular","ageing","aging","subsequent receipt","cut-off test","sample","vouch","reconcil"],"weight":30},
     {"id":"evidence","label":"Evidence requested","description":"Identifies the documents needed to support a conclusion.","keywords":["invoice","ledger","statement","contract","bank","credit note","delivery","goods received"],"weight":20},
     {"id":"communication","label":"Professional communication","description":"Structured memo with a clear escalation trigger.","keywords":["recommend","conclusion","escalate","partner","material"],"weight":20}]'::jsonb),

  ('cost-variance-analysis', 'Accounting & Auditing', 'Cost Analyst',
   'You support the plant controller of a food manufacturer. Last month direct material cost per unit rose 12% against standard while output volume fell 5%. The plant manager insists nothing changed on the line.',
   'Prepare an analysis that: (1) breaks the overrun into price and usage (quantity) variance, (2) states which variance is likelier to explain the gap and why, (3) lists the data you need to confirm it, and (4) recommends one corrective action with the owner named.',
   45, 120,
   '[{"id":"decomposition","label":"Variance decomposition","description":"Separates price effect from usage/quantity effect.","keywords":["price variance","usage","quantity variance","standard cost","actual","favourable","unfavourable","efficiency"],"weight":35},
     {"id":"reasoning","label":"Analytical reasoning","description":"Argues which driver dominates using evidence, not assertion.","keywords":["because","driver","root cause","supplier","wastage","scrap","yield","spoilage"],"weight":30},
     {"id":"data","label":"Data requirements","description":"Names the specific data needed to verify the conclusion.","keywords":["purchase","invoice","bom","bill of materials","production report","timesheet","inventory"],"weight":15},
     {"id":"action","label":"Actionable recommendation","description":"Recommends a concrete step with an owner.","keywords":["recommend","action","owner","renegotiat","monitor","review","training"],"weight":20}]'::jsonb),

  ('credit-appraisal-sme', 'Finance & Banking', 'Credit Analyst',
   'An SME logistics firm requests a 5bn VND working capital facility. Revenue is 40bn VND, net margin 4%, existing debt 12bn VND, EBITDA 3.1bn VND. The owner offers a warehouse as collateral.',
   'Write a credit appraisal that: (1) computes and interprets leverage and coverage, (2) identifies the two largest risks, (3) proposes a decision (approve, approve with conditions, or decline) with covenants or conditions, and (4) states what evidence would change your decision.',
   60, 150,
   '[{"id":"analysis","label":"Financial analysis","description":"Computes and interprets the key credit ratios.","keywords":["leverage","debt/ebitda","debt to ebitda","coverage","dscr","interest cover","gearing","margin","cash flow"],"weight":35},
     {"id":"risk","label":"Risk assessment","description":"Identifies material, specific credit risks.","keywords":["concentration","customer","cyclical","receivable","fuel","collateral","valuation","liquidity","refinanc"],"weight":25},
     {"id":"decision","label":"Decision and structure","description":"Reaches a clear decision with conditions or covenants.","keywords":["approve","decline","condition","covenant","security","guarantee","monitor","limit"],"weight":25},
     {"id":"communication","label":"Clarity","description":"Organised, decision-ready writing.","keywords":["recommend","conclusion","summary","therefore"],"weight":15}]'::jsonb),

  ('equity-valuation-note', 'Finance & Banking', 'Financial Analyst',
   'You cover consumer staples. A listed dairy company trades at P/E 14x versus a sector average of 18x. Revenue growth has slowed to 3% and a new competitor entered with aggressive pricing.',
   'Draft an investment note that: (1) states your recommendation (buy, hold, or sell), (2) justifies it with valuation reasoning, (3) names the two key assumptions your view depends on, and (4) states the main risk that would break your thesis.',
   60, 150,
   '[{"id":"valuation","label":"Valuation reasoning","description":"Uses a defensible method and explains the discount or premium.","keywords":["p/e","pe ratio","dcf","multiple","comparable","discount","premium","terminal","wacc","eps"],"weight":35},
     {"id":"thesis","label":"Investment thesis","description":"Clear recommendation supported by an argument.","keywords":["buy","hold","sell","upside","downside","target price","catalyst","recommend"],"weight":25},
     {"id":"assumptions","label":"Assumptions stated","description":"Makes key assumptions explicit and testable.","keywords":["assum","growth rate","margin","market share","forecast","sensitiv"],"weight":25},
     {"id":"risk","label":"Risk to the view","description":"Names what would invalidate the thesis.","keywords":["risk","competition","pricing","input cost","regulat","downside"],"weight":15}]'::jsonb),

  ('bug-triage-api', 'Information Technology', 'Junior Developer',
   'Users report that the checkout endpoint intermittently returns 500 errors, roughly 2% of requests, only during peak hours. Logs show "connection pool exhausted". The code has not changed in three weeks.',
   'Write your investigation plan: (1) state your leading hypothesis and why, (2) list the diagnostics you would run in order, (3) describe the fix you would attempt first and how you would verify it, and (4) explain what you would monitor after deploying.',
   45, 120,
   '[{"id":"hypothesis","label":"Hypothesis quality","description":"Forms a specific, testable hypothesis fitting the evidence.","keywords":["connection pool","leak","exhaust","concurren","timeout","load","peak","hypothes"],"weight":30},
     {"id":"diagnostics","label":"Diagnostic approach","description":"Proposes an ordered, evidence-driven investigation.","keywords":["log","metric","trace","monitor","reproduce","query","profil","measure"],"weight":30},
     {"id":"fix","label":"Fix and verification","description":"Names a fix and how it would be proven to work.","keywords":["pool size","release","close","retry","timeout","test","verify","load test","rollback"],"weight":25},
     {"id":"followup","label":"Post-deploy monitoring","description":"States what to watch after shipping.","keywords":["alert","monitor","dashboard","error rate","latency","observ"],"weight":15}]'::jsonb),

  ('churn-dashboard-spec', 'Information Technology', 'Data Analyst',
   'The head of product asks: "Why are users churning?" You have access to event data, subscription records, and support tickets. You have one week.',
   'Write your analysis plan: (1) define churn precisely and justify the definition, (2) state the metrics and segments you would examine, (3) describe the analysis you would run to find drivers, and (4) explain how you would present findings so product can act on them.',
   45, 120,
   '[{"id":"definition","label":"Metric definition","description":"Defines churn unambiguously with a time window.","keywords":["churn","define","definition","window","cohort","active","cancel","30 day","monthly"],"weight":30},
     {"id":"method","label":"Analytical method","description":"Proposes sound segmentation and driver analysis.","keywords":["cohort","segment","retention","correlat","regression","funnel","compare","control"],"weight":30},
     {"id":"data","label":"Data and caveats","description":"Names data sources and acknowledges limitations.","keywords":["event","subscription","ticket","sample","bias","missing","confound","causal"],"weight":20},
     {"id":"communication","label":"Actionable presentation","description":"Frames output so product can decide.","keywords":["dashboard","recommend","stakeholder","action","priorit","visual","insight"],"weight":20}]'::jsonb),

  ('campaign-launch-plan', 'Marketing', 'Marketing Executive',
   'You have 200m VND and six weeks to launch a productivity app to Vietnamese university students. Target: 10,000 installs. Two competitors already dominate paid search.',
   'Write the campaign plan: (1) define the audience and the core message, (2) allocate budget across channels with reasoning, (3) state the metrics you will judge success by, and (4) describe the test you would run in week one before committing the full spend.',
   60, 150,
   '[{"id":"audience","label":"Audience and positioning","description":"Defines a specific audience and a differentiated message.","keywords":["audience","segment","student","persona","insight","positioning","message","value prop"],"weight":30},
     {"id":"channels","label":"Channel and budget logic","description":"Allocates spend with stated reasoning.","keywords":["tiktok","facebook","instagram","kol","influencer","seo","budget","allocat","cac","organic"],"weight":25},
     {"id":"metrics","label":"Measurement","description":"Names metrics tied to the install goal.","keywords":["cpi","cac","ctr","conversion","install","retention","roas","attribut"],"weight":25},
     {"id":"testing","label":"Test before scale","description":"Proposes validation before full commitment.","keywords":["a/b","test","pilot","experiment","iterate","creative test","learn"],"weight":20}]'::jsonb),

  ('brand-repositioning-brief', 'Marketing', 'Brand Executive',
   'A 20-year-old Vietnamese tea brand is seen as "for older people". Sales are flat and under-25 awareness is low, but loyal older customers drive 70% of revenue.',
   'Write a repositioning brief that: (1) states the tension you must resolve, (2) proposes the new positioning in one sentence, (3) describes how you reach a younger audience without alienating loyal customers, and (4) names how you would measure whether the reposition worked.',
   45, 120,
   '[{"id":"tension","label":"Problem framing","description":"Articulates the strategic tension clearly.","keywords":["tension","risk","alienat","loyal","heritage","perception","trade-off"],"weight":25},
     {"id":"positioning","label":"Positioning statement","description":"Offers a sharp, single-minded positioning.","keywords":["positioning","promise","for","differentiat","brand platform","single"],"weight":30},
     {"id":"execution","label":"Execution plan","description":"Describes credible activation across touchpoints.","keywords":["packaging","campaign","channel","content","collab","product","launch","touchpoint"],"weight":25},
     {"id":"measurement","label":"Measurement","description":"Defines how success is judged.","keywords":["awareness","brand track","survey","nps","sales","measure","baseline"],"weight":20}]'::jsonb),

  ('inventory-optimisation', 'Logistics', 'Supply Chain Analyst',
   'A retailer holds 45 days of inventory against an industry benchmark of 30. Stockouts still occur on 8% of top-selling SKUs. Working capital is under pressure from the CFO.',
   'Write your analysis: (1) explain how high inventory and stockouts can coexist, (2) state the analysis you would run to prove it, (3) recommend specific changes to stocking policy, and (4) name the risk your recommendation introduces and how you would contain it.',
   60, 150,
   '[{"id":"diagnosis","label":"Problem diagnosis","description":"Explains the mix/allocation issue behind the paradox.","keywords":["mix","allocat","abc","slow moving","dead stock","forecast error","variability","segment"],"weight":35},
     {"id":"method","label":"Analytical method","description":"Proposes concrete quantitative analysis.","keywords":["abc analysis","safety stock","service level","reorder point","eoq","demand variability","turnover","lead time"],"weight":30},
     {"id":"recommendation","label":"Policy recommendation","description":"Recommends differentiated, specific policy.","keywords":["safety stock","reorder","replenish","supplier","frequency","differentiat","policy"],"weight":20},
     {"id":"risk","label":"Risk awareness","description":"Names the downside and a containment plan.","keywords":["risk","stockout","service","trade-off","pilot","monitor","phase"],"weight":15}]'::jsonb),

  ('shipment-delay-escalation', 'Logistics', 'Logistics Coordinator',
   'A 40ft container of raw material for a factory line is stuck at customs for a documentation mismatch. The plant runs out of material in 72 hours. Air freight costs 8x sea freight.',
   'Write your action plan: (1) state your immediate next three actions in order, (2) explain the fix for the customs issue, (3) present the options with cost implications and your recommendation, and (4) state how you would prevent recurrence.',
   45, 120,
   '[{"id":"triage","label":"Prioritised action","description":"Sequences immediate actions sensibly under time pressure.","keywords":["immediate","first","contact","broker","customs","escalate","confirm","timeline"],"weight":30},
     {"id":"resolution","label":"Problem resolution","description":"Addresses the documentation root cause concretely.","keywords":["declaration","hs code","invoice","packing list","certificate","origin","amend","correct","permit"],"weight":25},
     {"id":"tradeoff","label":"Options and trade-offs","description":"Compares options with cost and gives a recommendation.","keywords":["air freight","partial","cost","option","alternative","supplier","buffer","recommend","expedite"],"weight":25},
     {"id":"prevention","label":"Prevention","description":"Proposes a process change to stop recurrence.","keywords":["prevent","checklist","process","sop","review","training","audit"],"weight":20}]'::jsonb)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Feature 4: Interview sets (2 per industry) and questions
-- ---------------------------------------------------------------------------

insert into public.interview_sets (slug, industry, position_title, company_name, description) values
  ('audit-associate-general', 'Accounting & Auditing', 'Audit Associate', null,
   'General first-round questions for audit graduate roles.'),
  ('big4-audit-round1', 'Accounting & Auditing', 'Audit Associate', 'Big 4 Firm',
   'Company-specific first round: technical judgement plus fit.'),
  ('financial-analyst-general', 'Finance & Banking', 'Financial Analyst', null,
   'General questions for analyst roles in banking and investment.'),
  ('commercial-bank-credit-round1', 'Finance & Banking', 'Credit Analyst', 'Commercial Bank',
   'Company-specific credit round focused on risk judgement.'),
  ('software-engineer-general', 'Information Technology', 'Software Engineer', null,
   'General behavioural and technical-reasoning questions for junior developers.'),
  ('product-company-data-round1', 'Information Technology', 'Data Analyst', 'Product Company',
   'Company-specific round on metrics thinking and stakeholder communication.'),
  ('marketing-executive-general', 'Marketing', 'Marketing Executive', null,
   'General questions for marketing graduate roles.'),
  ('fmcg-brand-round1', 'Marketing', 'Brand Executive', 'FMCG Company',
   'Company-specific brand round on consumer insight and commercial thinking.'),
  ('supply-chain-analyst-general', 'Logistics', 'Supply Chain Analyst', null,
   'General questions for supply chain and planning roles.'),
  ('3pl-operations-round1', 'Logistics', 'Logistics Coordinator', '3PL Provider',
   'Company-specific operations round on pressure handling and coordination.')
on conflict (slug) do nothing;

insert into public.interview_questions (set_id, position, prompt, guidance, keywords)
select s.id, q.position, q.prompt, q.guidance, q.keywords
from public.interview_sets s
join (values
  ('audit-associate-general', 1,
   'Why do you want to start your career in audit rather than another finance function?',
   'Show genuine motivation and a realistic understanding of the work, not just "good training".',
   array['motivation','skill','exposure','qualification','client','foundation','career']),
  ('audit-associate-general', 2,
   'Tell me about a time you found an error in your own or someone else''s work. What did you do?',
   'Use a clear situation-action-result structure and emphasise how you escalated or corrected it.',
   array['situation','action','result','checked','reconcil','escalat','corrected','learned']),
  ('audit-associate-general', 3,
   'A client pressures you to accept an explanation you find unconvincing. How do you respond?',
   'Show professional scepticism and the correct escalation path without being combative.',
   array['scepticism','evidence','document','escalate','manager','independen','professional','ethic']),

  ('big4-audit-round1', 1,
   'Walk me through what happens to the financial statements when a company capitalises a cost that should have been expensed.',
   'Trace the effect through all three statements and note the audit implication.',
   array['asset','expense','profit','overstat','balance sheet','cash flow','depreciat','equity']),
  ('big4-audit-round1', 2,
   'You are behind on your section and the deadline is tomorrow. Your senior is unavailable. What do you do?',
   'Show prioritisation, proactive communication, and no shortcuts on quality.',
   array['priorit','communicat','inform','manager','team','realistic','quality','flag']),
  ('big4-audit-round1', 3,
   'Why our firm specifically, and not the other three?',
   'Give a specific, researched reason rather than generic praise.',
   array['culture','industry','training','specific','research','sector','value','team']),

  ('financial-analyst-general', 1,
   'Walk me through how you would value a company you know nothing about.',
   'Show a structured approach: understand the business, then choose a method and justify it.',
   array['business model','dcf','comparable','multiple','revenue','margin','cash flow','assumption','wacc']),
  ('financial-analyst-general', 2,
   'Pitch me a stock or an asset you would buy today.',
   'Give a clear recommendation, two or three reasons, and the main risk.',
   array['recommend','thesis','valuation','catalyst','risk','upside','competit','growth']),
  ('financial-analyst-general', 3,
   'Describe a time you had to work with incomplete data to reach a decision.',
   'Show judgement under uncertainty and how you stated assumptions explicitly.',
   array['assumption','estimate','sensitiv','judgement','validate','proxy','decision','result']),

  ('commercial-bank-credit-round1', 1,
   'What are the first three things you look at when assessing whether a business can repay a loan?',
   'Prioritise cash flow over collateral and explain why.',
   array['cash flow','coverage','leverage','debt','collateral','character','industry','history']),
  ('commercial-bank-credit-round1', 2,
   'A long-standing client with a good record asks for a facility your analysis says is too risky. How do you handle it?',
   'Balance relationship value against credit discipline; propose a structured alternative.',
   array['relationship','risk','condition','covenant','structure','decline','alternative','communicat','escalate']),
  ('commercial-bank-credit-round1', 3,
   'Tell me about a time you had to deliver an unwelcome decision to someone.',
   'Show clarity, empathy, and that you held the line where it mattered.',
   array['situation','explain','honest','clear','empath','alternative','outcome','result']),

  ('software-engineer-general', 1,
   'Describe the most technically difficult bug you have fixed. How did you find it?',
   'Emphasise the diagnostic process, not just the outcome.',
   array['reproduce','hypothes','log','debug','isolate','test','root cause','fix','verify']),
  ('software-engineer-general', 2,
   'How do you decide when code needs tests and when it does not?',
   'Show pragmatic judgement about risk rather than dogma in either direction.',
   array['risk','critical','regression','coverage','edge case','integration','unit','trade-off','maintain']),
  ('software-engineer-general', 3,
   'You disagree with a senior engineer''s technical decision. What do you do?',
   'Show you can argue with evidence and then commit to the team''s decision.',
   array['evidence','data','discuss','prototype','trade-off','commit','respect','escalate','learn']),

  ('product-company-data-round1', 1,
   'A product manager says a feature "feels successful". How would you verify that with data?',
   'Define the metric first, then the comparison and the confounders.',
   array['metric','define','baseline','cohort','control','segment','significan','confound','a/b']),
  ('product-company-data-round1', 2,
   'Your analysis contradicts what a senior stakeholder expected. How do you present it?',
   'Show confidence in the method, transparency about limitations, and no softening of the finding.',
   array['method','evidence','limitation','transparent','caveat','clear','stakeholder','honest','recommend']),
  ('product-company-data-round1', 3,
   'How would you measure whether our onboarding flow is working?',
   'Pick a small number of decision-relevant metrics and justify them.',
   array['completion','funnel','drop-off','retention','activation','time to value','segment','metric']),

  ('marketing-executive-general', 1,
   'Tell me about a campaign, yours or someone else''s, that you think worked. Why did it work?',
   'Show analytical thinking about mechanism, not just aesthetic appreciation.',
   array['insight','audience','message','channel','result','engagement','conversion','why','mechanism']),
  ('marketing-executive-general', 2,
   'You have a small budget and an ambitious target. Where do you start?',
   'Show prioritisation, testing discipline, and awareness of unit economics.',
   array['test','priorit','organic','cac','budget','channel','measure','iterate','audience']),
  ('marketing-executive-general', 3,
   'A campaign you designed is underperforming halfway through. What do you do?',
   'Diagnose before acting; distinguish creative, targeting, and offer problems.',
   array['data','diagnose','creative','targeting','offer','reallocat','test','pause','learn']),

  ('fmcg-brand-round1', 1,
   'What consumer insight do you think our category is currently ignoring?',
   'Offer a specific, researched observation rather than a generality.',
   array['insight','consumer','behaviour','trend','need','unmet','specific','category','occasion']),
  ('fmcg-brand-round1', 2,
   'How would you decide whether to launch a line extension or invest in the core product?',
   'Show commercial reasoning about incrementality and cannibalisation.',
   array['incremental','cannibal','margin','core','distribution','share','risk','data','roi']),
  ('fmcg-brand-round1', 3,
   'Tell me about a time you had to persuade someone without formal authority over them.',
   'Show influence through evidence and empathy.',
   array['persuade','evidence','stakeholder','listen','align','data','outcome','relationship']),

  ('supply-chain-analyst-general', 1,
   'How would you reduce inventory without increasing stockouts?',
   'Show differentiated policy thinking rather than a blanket cut.',
   array['safety stock','abc','service level','forecast','lead time','variability','differentiat','supplier','reorder']),
  ('supply-chain-analyst-general', 2,
   'Describe a time you used data to change how something was done.',
   'Emphasise the analysis, the persuasion, and the measured result.',
   array['data','analysis','recommend','stakeholder','implement','result','measure','improve']),
  ('supply-chain-analyst-general', 3,
   'A key supplier misses a delivery deadline repeatedly. How do you address it?',
   'Distinguish immediate mitigation from structural supplier management.',
   array['root cause','supplier','escalate','buffer','alternative','contract','kpi','review','mitigat']),

  ('3pl-operations-round1', 1,
   'Three urgent shipments are competing for the same truck. How do you decide?',
   'State an explicit prioritisation basis, then communicate to those affected.',
   array['priorit','impact','customer','cost','deadline','communicat','alternative','escalate','criteria']),
  ('3pl-operations-round1', 2,
   'A customer is angry about a delay that was not your fault. What do you say?',
   'Own the communication without deflecting; focus on resolution.',
   array['apolog','acknowledge','explain','resolution','option','update','ownership','follow up']),
  ('3pl-operations-round1', 3,
   'How do you keep track of many moving shipments without dropping one?',
   'Show a concrete system, not just "I am organised".',
   array['system','tracking','checklist','priorit','update','tool','process','review','escalate'])
) as q(set_slug, position, prompt, guidance, keywords)
  on q.set_slug = s.slug
on conflict (set_id, position) do nothing;
