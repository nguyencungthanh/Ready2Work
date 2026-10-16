-- Additive merge: keep existing identities, passwords, roles and recorded work.
begin;

alter table public.simulations
  add column position_id text,
  add column is_available boolean not null default true,
  add column unavailable_reason text,
  add column grading_rubric jsonb not null default '[]',
  add column reference_data jsonb not null default '{}';
update public.simulations set grading_rubric = rubric;
update public.simulations set rubric = coalesce((select jsonb_agg(jsonb_build_object(
  'id', c->>'id', 'label', c->>'label', 'weight', c->'weight', 'maxScore', coalesce(c->'maxScore','4'::jsonb)
)) from jsonb_array_elements(rubric) c), '[]'::jsonb);

alter table public.interview_sets
  add column position_id text,
  add column is_available boolean not null default true,
  add column unavailable_reason text;
alter table public.interview_questions
  add column round_number integer not null default 1 check (round_number between 1 and 3),
  add column max_score integer not null default 100 check (max_score > 0 and max_score <= 100),
  add column rubric jsonb not null default '[]',
  add column grading_rubric jsonb not null default '[]',
  add column reference_answer text not null default '';
alter table public.interview_sessions add column round_scores jsonb;
-- Preserve older sets; divide existing questions into three ordered rounds only
-- if enough actual questions exist. Never fabricate absent source content.
with ranked as (
  select id, ntile(3) over (partition by set_id order by position) as round_number,
    count(*) over (partition by set_id) as question_count
  from public.interview_questions
)
update public.interview_questions q set round_number = r.round_number
from ranked r where r.id = q.id and r.question_count >= 3;
update public.interview_sets s set is_available = false,
  unavailable_reason = 'Bộ câu hỏi nguồn chưa có đủ ba vòng phỏng vấn.'
where (select count(distinct round_number) from public.interview_questions q where q.set_id = s.id) < 3;

create table public.cv_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  position_id text not null,
  position_title text not null,
  file_path text,
  file_name text,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index cv_analyses_user_created_idx on public.cv_analyses(user_id, created_at desc);
alter table public.cv_analyses enable row level security;
create policy "Candidates read their own CV analyses" on public.cv_analyses
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.cv_analyses to authenticated;

create table public.mentor_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id),
  position_id text not null,
  score integer not null check (score between 0 and 100),
  feedback text not null default '',
  created_at timestamptz not null default now()
);
create index mentor_reviews_candidate_created_idx on public.mentor_reviews(candidate_id, created_at desc);
alter table public.mentor_reviews enable row level security;
create policy "Candidates read their mentor reviews" on public.mentor_reviews
  for select to authenticated using (candidate_id = (select auth.uid()));
create policy "Mentors read reviews they authored" on public.mentor_reviews
  for select to authenticated using (mentor_id = (select auth.uid()));
grant select on public.mentor_reviews to authenticated;

create table public.company_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  name text not null check (length(name) between 2 and 180),
  industry text not null check (length(industry) between 2 and 120),
  website text not null default '',
  contact_name text not null check (length(contact_name) between 2 and 150),
  created_at timestamptz not null default now()
);
alter table public.company_profiles enable row level security;
create policy "Company profiles belong to their owner" on public.company_profiles
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update on public.company_profiles to authenticated;

create table public.employer_content (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.company_profiles(user_id) on delete cascade,
  kind text not null check (kind in ('simulation','interview')),
  title text not null check (length(title) between 5 and 200),
  position_id text not null,
  industry text not null,
  assignment_path text not null,
  rubric_path text not null,
  assignment_name text not null,
  rubric_name text not null,
  assignment_data jsonb not null,
  rubric_data jsonb not null,
  status text not null default 'draft' check (status in ('draft','published')),
  simulation_id uuid references public.simulations(id),
  interview_set_id uuid references public.interview_sets(id),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  check ((kind = 'simulation' and interview_set_id is null) or (kind = 'interview' and simulation_id is null))
);
create index employer_content_owner_kind_created_idx on public.employer_content(owner_id,kind,created_at desc);
alter table public.employer_content enable row level security;
create policy "Employers read their paired uploads" on public.employer_content
  for select to authenticated using (owner_id = (select auth.uid()));
grant select on public.employer_content to authenticated;
grant all on public.cv_analyses, public.mentor_reviews, public.company_profiles, public.employer_content to service_role;

-- Scores and internal grading references are written/read only by validated
-- server code. Direct Data API calls cannot submit their own grade.
revoke insert, update, delete on public.simulation_submissions from authenticated;
revoke insert, update, delete on public.interview_answers from authenticated;
revoke insert, update, delete on public.interview_sessions from authenticated;
grant insert (user_id,set_id) on public.interview_sessions to authenticated;
grant all on public.simulations, public.simulation_submissions, public.interview_sets,
  public.interview_questions, public.interview_sessions, public.interview_answers to service_role;

revoke select on public.simulations from anon,authenticated;
grant select (id,slug,industry,position_title,brief,task_instructions,estimated_minutes,rubric,min_words,
  created_at,position_id,is_available,unavailable_reason) on public.simulations to anon,authenticated;
revoke select on public.interview_questions from anon,authenticated;
grant select (id,set_id,position,prompt,guidance,keywords,round_number,max_score,rubric)
  on public.interview_questions to anon,authenticated;
-- Restrict legacy broad grants that otherwise permit changing account status
-- or self-approving a role application through the Data API.
revoke update on public.profiles from authenticated;
grant update (display_name,onboarding_status,university,major,graduation_year,city,preferred_language)
  on public.profiles to authenticated;
revoke insert on public.role_applications from authenticated;
grant insert (user_id,requested_role,justification) on public.role_applications to authenticated;

insert into storage.buckets(id,name,public,file_size_limit)
values ('candidate-cvs','candidate-cvs',false,3145728),('business-documents','business-documents',false,3145728)
on conflict(id) do nothing;
create policy "Owners upload private career documents" on storage.objects for insert to authenticated
  with check (bucket_id in ('candidate-cvs','business-documents') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners read private career documents" on storage.objects for select to authenticated
  using (bucket_id in ('candidate-cvs','business-documents') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners remove private career documents" on storage.objects for delete to authenticated
  using (bucket_id in ('candidate-cvs','business-documents') and (storage.foldername(name))[1] = (select auth.uid())::text);

-- One locked transaction prevents double publish and partial question sets.
create or replace function public.publish_employer_content(content_id uuid, actor_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  item public.employer_content%rowtype;
  company_name text;
  catalog_id uuid;
  round_data jsonb;
  question_data jsonb;
  question_rubric jsonb;
  public_rubric jsonb;
  question_index integer;
  global_index integer := 0;
begin
  if (select auth.role()) is distinct from 'service_role' then raise exception 'Server-only operation'; end if;
  if not exists(select 1 from public.user_roles r join public.profiles p on p.id = r.user_id
    where r.user_id = actor_id and p.account_status = 'active'
    and r.role in ('employer_admin','employer_member','admin','super_admin')) then raise exception 'Employer approval required'; end if;
  select * into item from public.employer_content e where e.id = content_id and e.owner_id = actor_id for update;
  if not found then raise exception 'Content not found'; end if;
  if item.status = 'published' then return; end if;
  select c.name into company_name from public.company_profiles c where c.user_id = actor_id;
  if item.kind = 'simulation' then
    select jsonb_agg(jsonb_build_object('id',c->>'id','label',c->>'label','weight',c->'weight','maxScore',4))
      into public_rubric from jsonb_array_elements(item.rubric_data) c;
    insert into public.simulations(slug,industry,position_title,brief,task_instructions,rubric,grading_rubric,position_id)
      values ('company-'||item.id,item.industry,item.title,company_name||' · '||item.title,
        item.assignment_data #>> '{}',public_rubric,item.rubric_data,item.position_id) returning id into catalog_id;
    update public.employer_content set simulation_id = catalog_id where id = item.id;
  else
    insert into public.interview_sets(slug,industry,position_title,company_name,description,position_id)
      values ('company-'||item.id,item.industry,item.title,company_name,item.title,item.position_id) returning id into catalog_id;
    for round_data in select value from jsonb_array_elements(item.assignment_data->'rounds') loop
      question_index := 0;
      for question_data in select value from jsonb_array_elements(round_data->'questions') loop
        question_index := question_index + 1; global_index := global_index + 1;
        select value->'criteria' into question_rubric from jsonb_array_elements(item.rubric_data)
          where (value->>'roundNumber')::int = (round_data->>'roundNumber')::int and (value->>'questionIndex')::int = question_index;
        if question_rubric is null then raise exception 'Missing rubric'; end if;
        select jsonb_agg(jsonb_build_object('id',c->>'id','label',c->>'label','weight',c->'weight','maxScore',4))
          into public_rubric from jsonb_array_elements(question_rubric) c;
        insert into public.interview_questions(set_id,position,prompt,round_number,max_score,rubric,grading_rubric,reference_answer)
          values (catalog_id,global_index,question_data->>'prompt',(round_data->>'roundNumber')::int,
            (question_data->>'maxScore')::int,public_rubric,question_rubric,coalesce(question_data->>'guidance',''));
      end loop;
    end loop;
    update public.employer_content set interview_set_id = catalog_id where id = item.id;
  end if;
  update public.employer_content set status = 'published',published_at = now() where id = item.id;
end;
$$;
revoke all on function public.publish_employer_content(uuid,uuid) from public,anon,authenticated;
grant execute on function public.publish_employer_content(uuid,uuid) to service_role;
commit;
