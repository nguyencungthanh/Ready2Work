-- One hour is a runtime policy; retain authored source material and old grades.
-- No scheduler is required: deadlines derive from immutable server timestamps.
begin;

-- Receipt time precedes AI grading. Historical rows remain null; their existing
-- grades are not rewritten or revalidated by this additive column.
alter table public.interview_answers add column submitted_at timestamptz;
alter table public.interview_answers alter column submitted_at set default now();

create or replace function public.guard_interview_answer_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare session_row public.interview_sessions%rowtype;
begin
  select * into session_row from public.interview_sessions where id = new.session_id for update;
  if not found or session_row.completed_at is not null then raise exception 'Interview is unavailable or complete'; end if;
  if tg_op = 'UPDATE' and (new.session_id is distinct from old.session_id or new.question_id is distinct from old.question_id) then
    raise exception 'An interview answer cannot change its question or session';
  end if;
  new.submitted_at := coalesce(new.submitted_at, clock_timestamp());
  if new.submitted_at < session_row.created_at or new.submitted_at >= session_row.created_at + interval '60 minutes'
     or new.submitted_at > clock_timestamp() then
    raise exception 'Interview deadline exceeded';
  end if;
  if not exists(select 1 from public.interview_questions q where q.id = new.question_id and q.set_id = session_row.set_id) then
    raise exception 'Question does not belong to this interview set';
  end if;
  if new.score is null or new.score < 0 or new.score > 100 then raise exception 'Invalid normalized interview score'; end if;
  return new;
end;
$$;

create function public.guard_practice_start_time()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'simulation_attempts' then
    if new.started_at is distinct from old.started_at then raise exception 'Practice start time is immutable'; end if;
  else
    if new.created_at is distinct from old.created_at then raise exception 'Practice start time is immutable'; end if;
    if old.completed_at is null and new.completed_at is not null and
       (new.completed_at < old.created_at or new.completed_at > old.created_at + interval '60 minutes' or new.completed_at > clock_timestamp()) then
      raise exception 'Invalid interview completion time';
    end if;
  end if;
  return new;
end;
$$;
create trigger simulation_attempts_guard_start before update on public.simulation_attempts
  for each row execute function public.guard_practice_start_time();
create trigger interview_sessions_guard_start before update on public.interview_sessions
  for each row execute function public.guard_practice_start_time();

-- Applies to the existing atomic RPC as well as direct privileged writes.
create function public.guard_simulation_submission_deadline()
returns trigger language plpgsql security definer set search_path = '' as $$
declare attempt_row public.simulation_attempts%rowtype;
begin
  if new.attempt_id is null then return new; end if;
  select * into attempt_row from public.simulation_attempts where id = new.attempt_id for update;
  if not found or new.user_id <> attempt_row.user_id or new.simulation_id <> attempt_row.simulation_id then
    raise exception 'Simulation attempt not found';
  end if;
  if new.submitted_at < attempt_row.started_at or new.submitted_at >= attempt_row.started_at + interval '60 minutes'
     or new.submitted_at > clock_timestamp() then
    raise exception 'Simulation deadline exceeded';
  end if;
  return new;
end;
$$;
create trigger simulation_submissions_guard_deadline before insert or update on public.simulation_submissions
  for each row execute function public.guard_simulation_submission_deadline();

-- The existing owner RLS policy scopes DELETE. Answers cascade from sessions.
grant delete on public.interview_sessions to authenticated;
commit;
