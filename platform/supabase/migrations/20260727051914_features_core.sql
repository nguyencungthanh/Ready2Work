-- Core tables for features 1-4: Career Discovery, Roadmap, Job Simulation,
-- Interview Practice. Catalog tables are world-readable; user data is
-- owner-only via RLS.

-- ---------------------------------------------------------------------------
-- Feature 1: Career Discovery
-- ---------------------------------------------------------------------------

-- RIASEC dimension the question scores toward.
create type public.riasec_dimension as enum (
  'realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional'
);

create table public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  position integer not null unique,
  prompt text not null,
  dimension public.riasec_dimension not null,
  created_at timestamptz not null default now()
);

create table public.careers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  industry text not null,
  summary text not null,
  typical_majors text[] not null default '{}',
  entry_roles text[] not null default '{}',
  key_skills text[] not null default '{}',
  -- Ideal RIASEC profile, 0-100 per dimension. Match score compares the
  -- user's profile against this.
  realistic integer not null default 0,
  investigative integer not null default 0,
  artistic integer not null default 0,
  social integer not null default 0,
  enterprising integer not null default 0,
  conventional integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- answers: { questionId: 1..5 }
  answers jsonb not null default '{}'::jsonb,
  -- scores: { realistic: 0..100, ... } computed deterministically on submit
  scores jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger assessment_attempts_set_updated_at
  before update on public.assessment_attempts
  for each row execute function public.set_updated_at();

create index assessment_attempts_user_id_idx on public.assessment_attempts (user_id);

create table public.career_recommendations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts (id) on delete cascade,
  career_id uuid not null references public.careers (id) on delete cascade,
  match_score integer not null,
  rank integer not null,
  saved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (attempt_id, career_id)
);

create index career_recommendations_attempt_id_idx on public.career_recommendations (attempt_id);

-- ---------------------------------------------------------------------------
-- Feature 2: Personalized Roadmap
-- ---------------------------------------------------------------------------

create table public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  career_id uuid not null references public.careers (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, career_id)
);

create trigger roadmaps_set_updated_at
  before update on public.roadmaps
  for each row execute function public.set_updated_at();

create table public.roadmap_steps (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps (id) on delete cascade,
  position integer not null,
  stage text not null,
  title text not null,
  objective text not null,
  resource_label text,
  resource_url text,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (roadmap_id, position)
);

create index roadmap_steps_roadmap_id_idx on public.roadmap_steps (roadmap_id);

-- ---------------------------------------------------------------------------
-- Feature 3: Job Simulation
-- ---------------------------------------------------------------------------

create table public.simulations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  industry text not null,
  position_title text not null,
  brief text not null,
  task_instructions text not null,
  estimated_minutes integer not null default 60,
  -- Rubric criteria: [{ id, label, description, keywords[], weight }]
  -- Keywords drive the deterministic evidence check.
  rubric jsonb not null default '[]'::jsonb,
  min_words integer not null default 120,
  created_at timestamptz not null default now()
);

create table public.simulation_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  simulation_id uuid not null references public.simulations (id) on delete cascade,
  content text not null,
  overall_score integer,
  overall_band text,
  -- criterion_scores: [{ criterionId, label, band, score, maxScore,
  --   strengths[], improvements[] }]
  criterion_scores jsonb,
  submitted_at timestamptz not null default now()
);

create index simulation_submissions_user_id_idx on public.simulation_submissions (user_id);
create index simulation_submissions_simulation_id_idx
  on public.simulation_submissions (simulation_id);

-- ---------------------------------------------------------------------------
-- Feature 4: Interview Practice
-- ---------------------------------------------------------------------------

create table public.interview_sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  industry text not null,
  position_title text not null,
  company_name text,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.interview_sets (id) on delete cascade,
  position integer not null,
  prompt text not null,
  guidance text not null default '',
  keywords text[] not null default '{}',
  unique (set_id, position)
);

create index interview_questions_set_id_idx on public.interview_questions (set_id);

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  set_id uuid not null references public.interview_sets (id) on delete cascade,
  overall_score integer,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index interview_sessions_user_id_idx on public.interview_sessions (user_id);

create table public.interview_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  question_id uuid not null references public.interview_questions (id) on delete cascade,
  answer_text text not null,
  score integer,
  -- criteria: [{ label, score, maxScore, note }]
  criteria jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create index interview_answers_session_id_idx on public.interview_answers (session_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.assessment_questions enable row level security;
alter table public.careers enable row level security;
alter table public.simulations enable row level security;
alter table public.interview_sets enable row level security;
alter table public.interview_questions enable row level security;

alter table public.assessment_attempts enable row level security;
alter table public.career_recommendations enable row level security;
alter table public.roadmaps enable row level security;
alter table public.roadmap_steps enable row level security;
alter table public.simulation_submissions enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.interview_answers enable row level security;

-- Catalog content is public reference data.
create policy "Questions are readable by anyone"
  on public.assessment_questions for select to anon, authenticated using (true);
create policy "Careers are readable by anyone"
  on public.careers for select to anon, authenticated using (true);
create policy "Simulations are readable by anyone"
  on public.simulations for select to anon, authenticated using (true);
create policy "Interview sets are readable by anyone"
  on public.interview_sets for select to anon, authenticated using (true);
create policy "Interview questions are readable by anyone"
  on public.interview_questions for select to anon, authenticated using (true);

-- User-owned data: owner only.
create policy "Users manage own attempts"
  on public.assessment_attempts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage own recommendations"
  on public.career_recommendations for all to authenticated
  using (
    exists (
      select 1 from public.assessment_attempts a
      where a.id = attempt_id and a.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.assessment_attempts a
      where a.id = attempt_id and a.user_id = (select auth.uid())
    )
  );

create policy "Users manage own roadmaps"
  on public.roadmaps for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage own roadmap steps"
  on public.roadmap_steps for all to authenticated
  using (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_id and r.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_id and r.user_id = (select auth.uid())
    )
  );

create policy "Users manage own submissions"
  on public.simulation_submissions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage own interview sessions"
  on public.interview_sessions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage own interview answers"
  on public.interview_answers for all to authenticated
  using (
    exists (
      select 1 from public.interview_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.interview_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Grants (this config does not auto-expose new public tables)
-- ---------------------------------------------------------------------------

grant select on public.assessment_questions, public.careers, public.simulations,
  public.interview_sets, public.interview_questions to anon, authenticated;

grant select, insert, update, delete on
  public.assessment_attempts, public.career_recommendations, public.roadmaps,
  public.roadmap_steps, public.simulation_submissions, public.interview_sessions,
  public.interview_answers to authenticated;

grant select, insert, update, delete on
  public.assessment_questions, public.careers, public.simulations,
  public.interview_sets, public.interview_questions, public.assessment_attempts,
  public.career_recommendations, public.roadmaps, public.roadmap_steps,
  public.simulation_submissions, public.interview_sessions,
  public.interview_answers to service_role;
