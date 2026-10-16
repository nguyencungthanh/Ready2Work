-- Objective timing, atomic grade persistence, and bounded candidate read models.
create table public.simulation_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  simulation_id uuid not null references public.simulations(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  submission_id uuid references public.simulation_submissions(id) on delete set null
);
create index simulation_attempts_owner_recent_idx on public.simulation_attempts(user_id, simulation_id, started_at desc);
alter table public.simulation_attempts enable row level security;
create policy "Candidates read own simulation attempts" on public.simulation_attempts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Candidates start own available simulation attempts" on public.simulation_attempts
  for insert to authenticated with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.simulations s where s.id = simulation_id and s.is_available
    )
  );
grant select on public.simulation_attempts to authenticated;
-- Clients cannot backdate a timer, close an attempt, or attach a forged grade.
grant insert(user_id, simulation_id) on public.simulation_attempts to authenticated;
grant all on public.simulation_attempts to service_role;

alter table public.simulation_submissions
  add column attempt_id uuid unique references public.simulation_attempts(id) on delete set null,
  add column actual_duration_seconds integer check (actual_duration_seconds >= 0);
create table public.simulation_submission_evaluations (
  submission_id uuid primary key references public.simulation_submissions(id) on delete cascade,
  details jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.simulation_submission_evaluations enable row level security;
-- Detailed checklist/answer-key grading is internal. Candidate-visible rows hold public criteria only.
grant all on public.simulation_submission_evaluations to service_role;

create function public.finalize_simulation_attempt(
  p_attempt_id uuid, p_user_id uuid, p_content text,
  p_overall_score integer, p_overall_band text, p_criterion_scores jsonb,
  p_private_details jsonb, p_submitted_at timestamptz
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  attempt public.simulation_attempts%rowtype;
  result_id uuid;
  duration_seconds integer;
begin
  select * into attempt from public.simulation_attempts where id = p_attempt_id for update;
  if not found or attempt.user_id <> p_user_id then
    raise exception 'Simulation attempt not found';
  end if;
  if attempt.submission_id is not null then return attempt.submission_id; end if;
  if p_submitted_at < attempt.started_at or p_submitted_at > now() or p_content = ''
    or p_overall_score is null or p_overall_score < 0 or p_overall_score > 100 then
    raise exception 'Invalid simulation evaluation';
  end if;
  duration_seconds := floor(extract(epoch from (p_submitted_at - attempt.started_at)))::integer;
  insert into public.simulation_submissions (
    user_id, simulation_id, attempt_id, content, overall_score, overall_band,
    criterion_scores, actual_duration_seconds, submitted_at
  ) values (
    p_user_id, attempt.simulation_id, attempt.id, p_content, p_overall_score,
    p_overall_band, p_criterion_scores, duration_seconds, p_submitted_at
  ) returning id into result_id;
  insert into public.simulation_submission_evaluations(submission_id, details)
    values(result_id, coalesce(p_private_details, '{}'::jsonb));
  update public.simulation_attempts set submitted_at = p_submitted_at, submission_id = result_id where id = attempt.id;
  return result_id;
end;
$$;
revoke all on function public.finalize_simulation_attempt(uuid, uuid, text, integer, text, jsonb, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.finalize_simulation_attempt(uuid, uuid, text, integer, text, jsonb, jsonb, timestamptz) to service_role;

create index simulation_submissions_latest_owner_task_idx
  on public.simulation_submissions(user_id, simulation_id, submitted_at desc);
create index interview_sessions_latest_completed_owner_set_idx
  on public.interview_sessions(user_id, set_id, completed_at desc) where completed_at is not null;
create index interview_sessions_recent_owner_idx
  on public.interview_sessions(user_id, created_at desc);
create view public.candidate_latest_simulation_submissions with (security_invoker = true) as
  select distinct on (user_id, simulation_id) * from public.simulation_submissions
  order by user_id, simulation_id, submitted_at desc, id desc;
create view public.candidate_completed_interview_sessions with (security_invoker = true) as
  select distinct on (user_id, set_id) * from public.interview_sessions
  where completed_at is not null
  order by user_id, set_id, completed_at desc, id desc;
grant select on public.candidate_latest_simulation_submissions,
  public.candidate_completed_interview_sessions to authenticated;

-- Lock the parent session for every answer write, serializing answer saves and
-- completion. Even a privileged writer cannot attach another set's question.
create function public.guard_interview_answer_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare session_row public.interview_sessions%rowtype;
begin
  select * into session_row from public.interview_sessions where id = new.session_id for update;
  if not found or session_row.completed_at is not null then raise exception 'Interview is unavailable or complete'; end if;
  if tg_op = 'UPDATE' and (new.session_id is distinct from old.session_id or new.question_id is distinct from old.question_id) then
    raise exception 'An interview answer cannot change its question or session';
  end if;
  if not exists(select 1 from public.interview_questions q where q.id = new.question_id and q.set_id = session_row.set_id) then
    raise exception 'Question does not belong to this interview set';
  end if;
  if new.score is null or new.score < 0 or new.score > 100 then raise exception 'Invalid normalized interview score'; end if;
  return new;
end;
$$;
create trigger interview_answers_guard_write before insert or update on public.interview_answers
  for each row execute function public.guard_interview_answer_write();

create function public.guard_interview_session_completion()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  expected_count integer;
  answered_count integer;
  round_count integer;
  normalized_rounds jsonb;
begin
  if new.user_id is distinct from old.user_id or new.set_id is distinct from old.set_id then
    raise exception 'An interview session cannot change owner or set';
  end if;
  if old.completed_at is not null and (new.completed_at is distinct from old.completed_at or
      new.overall_score is distinct from old.overall_score or new.round_scores is distinct from old.round_scores) then
    raise exception 'A completed interview evaluation is immutable';
  end if;
  if new.completed_at is not null and old.completed_at is null then
    select count(*), count(distinct round_number) into expected_count, round_count
      from public.interview_questions where set_id = old.set_id;
    select count(*) into answered_count from public.interview_answers a
      join public.interview_questions q on q.id = a.question_id and q.set_id = old.set_id
      where a.session_id = old.id and a.score between 0 and 100;
    if expected_count = 0 or round_count <> 3 or answered_count <> expected_count or
       (select count(*) from public.interview_answers where session_id = old.id) <> expected_count then
      raise exception 'Complete every question in all three rounds before finishing';
    end if;
    select jsonb_agg(jsonb_build_object('round', r.round_number, 'score', r.round_score,
      'questionCount', r.question_count) order by r.round_number) into normalized_rounds
    from (
      select q.round_number,
        round(sum(a.score::numeric * q.max_score) / sum(q.max_score))::integer as round_score,
        count(*) as question_count
      from public.interview_questions q join public.interview_answers a on a.question_id = q.id
      where q.set_id = old.set_id and a.session_id = old.id group by q.round_number
    ) r;
    new.round_scores := normalized_rounds;
    select round(avg((value->>'score')::numeric))::integer into new.overall_score
      from jsonb_array_elements(normalized_rounds);
  end if;
  return new;
end;
$$;
create trigger interview_sessions_guard_completion before update on public.interview_sessions
  for each row execute function public.guard_interview_session_completion();

create view public.candidate_latest_mentor_reviews with (security_invoker = true) as
  select distinct on (candidate_id, position_id) * from public.mentor_reviews
  order by candidate_id, position_id, created_at desc, id desc;
grant select on public.candidate_latest_mentor_reviews to authenticated;
create index mentor_reviews_latest_candidate_role_idx on public.mentor_reviews(candidate_id, position_id, created_at desc);
