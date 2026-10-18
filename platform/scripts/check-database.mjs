// Isolated PostgreSQL engine. No network, Docker, or live Supabase writes.
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
import { buildPreparedContent, readPreparedSources } from "./import-content.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create schema storage;
  create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user::text) $$;
  create table storage.buckets(id text primary key, name text, public boolean default false, file_size_limit bigint);
  create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
  grant usage on schema public,auth,storage to anon,authenticated,service_role;
  grant execute on function auth.uid(),auth.role(),storage.foldername(text) to anon,authenticated,service_role;
  grant select,insert,delete on storage.objects to authenticated;
`);
try {
  const migrations = (await readdir(path.join(root, "supabase/migrations"))).filter((f) => f.endsWith(".sql")).sort();
  let legacySeeded = false;
  let oldQuestion;
  let oldAttempt;
  let oldSession;
  let previousSourceAttempt;
  let originalQuestions;
  let changedAssignmentAttempt;
  let unchangedAssignmentAttempt;
  let originalCompletedResults;
  let preservedInterviewQuestions, preservedInterviewSessions, preservedInterviewAnswers;
  for (const file of migrations) {
    if (file.startsWith("20261016") && !legacySeeded) {
      await db.exec(`
        insert into auth.users(id,email) values ('33333333-3333-4333-8333-333333333333','existing@example.test');
        insert into simulations(id,slug,industry,position_title,brief,task_instructions,rubric)
          values ('44444444-4444-4444-8444-444444444444','legacy-existing','IT','Existing task','Existing brief','Existing instructions',
            '[{"id":"accuracy","label":"Accuracy","description":"Internal reference","weight":100}]');
        insert into simulation_submissions(id,user_id,simulation_id,content,overall_score)
          values ('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333',
            '44444444-4444-4444-8444-444444444444','Existing work',70);
      `);
      legacySeeded = true;
    }
    if (file === "20261017000100_feedback_content.sql") {
      oldQuestion = (await db.query("select q.id,q.prompt,q.set_id from interview_questions q join interview_sets s on s.id=q.set_id where s.slug='r2w-qa-tester' order by q.position limit 1")).rows[0];
      oldSession = (await db.query("insert into interview_sessions(user_id,set_id) values ('33333333-3333-4333-8333-333333333333',$1) returning id", [oldQuestion.set_id])).rows[0];
      await db.query("insert into interview_answers(session_id,question_id,answer_text,score) values ($1,$2,'Historical source answer',70)", [oldSession.id,oldQuestion.id]);
      oldAttempt = (await db.query("insert into simulation_attempts(user_id,simulation_id) select '33333333-3333-4333-8333-333333333333',id from simulations where slug='r2w-it-03' returning id")).rows[0];
    }
    if (file === "20261017000300_document_only_catalog.sql") {
      previousSourceAttempt = (await db.query("insert into simulation_attempts(user_id,simulation_id) select '33333333-3333-4333-8333-333333333333',id from simulations where slug='r2w-it-03' returning id")).rows[0];
      originalQuestions = (await db.query("select id,set_id,position,prompt,reference_answer,grading_rubric from interview_questions order by id")).rows;
    }
    if (file === "20261019000100_simulation_source_refresh.sql") {
      changedAssignmentAttempt = (await db.query("insert into simulation_attempts(user_id,simulation_id) select '33333333-3333-4333-8333-333333333333',id from simulations where slug='r2w-kk-01' returning id")).rows[0];
      unchangedAssignmentAttempt = (await db.query("insert into simulation_attempts(user_id,simulation_id) select '33333333-3333-4333-8333-333333333333',id from simulations where slug='r2w-it-03' returning id")).rows[0];
      originalCompletedResults = (await db.query("select * from simulation_submissions order by id")).rows;
    }
    if (file === "20261019000300_interview_source_refresh.sql") {
      preservedInterviewQuestions = (await db.query("select * from interview_questions order by id")).rows;
      preservedInterviewSessions = (await db.query("select * from interview_sessions order by id")).rows;
      preservedInterviewAnswers = (await db.query("select * from interview_answers order by id")).rows;
    }
    try { await db.exec(await readFile(path.join(root, "supabase/migrations", file), "utf8")); }
    catch (error) { console.error(`Migration failed: ${file}`); throw error; }
    console.log(`Applied ${file}`);
  }
  await db.exec(await readFile(path.join(root, "supabase/seed.sql"), "utf8"));
  const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
  assert.equal((await one("select overall_score from simulation_submissions where id='55555555-5555-4555-8555-555555555555'")).overall_score, 70);
  assert.equal((await one("select email from profiles where id='33333333-3333-4333-8333-333333333333'")).email, "existing@example.test");
  assert.equal(Number((await one("select count(*) from simulations where slug like 'r2w-%'")).count), 15);
  assert.equal(Number((await one("select count(*) from interview_sets where slug like 'r2w-%20261017'")).count), 15);
  assert.equal(Number((await one("select count(*) from interview_sets where slug like 'r2w-%20261017' and not is_available")).count), 9);
  const sourceTasks = JSON.parse(await readFile(path.join(root, "data/task-rubrics.json"), "utf8")).industries.flatMap((industry) => industry.tasks);
  for (const task of sourceTasks) {
    const published = await one("select reference_data,is_available from simulations where slug=$1", [`r2w-${task.position_id.toLowerCase()}`]);
    assert.equal(published.reference_data.source_policy, task.source_policy);
    assert.equal(published.reference_data.content_revision, task.content_revision);
    assert.deepEqual(published.reference_data.public_materials, task.public_materials);
    assert.equal(published.is_available, true);
  }
  assert.equal(Number((await one("select count(*) from simulations where slug like 'r2w-%' and is_available")).count), 15);
  assert.equal(Number((await one("select count(*) from simulations where position_id is null and is_available and slug not like 'company-%' and slug <> 'legacy-existing'")).count), 0);
  assert.equal(Number((await one("select count(*) from interview_sets where position_id is null and is_available and slug not like 'company-%'")).count), 0);
  assert.deepEqual((await db.query("select id,set_id,position,prompt,reference_answer,grading_rubric from interview_questions where id=any($1::uuid[]) order by id", [originalQuestions.map(q => q.id)])).rows, originalQuestions);
  assert.deepEqual((await db.query("select * from interview_questions where id=any($1::uuid[]) order by id", [preservedInterviewQuestions.map(q => q.id)])).rows, preservedInterviewQuestions);
  assert.deepEqual((await db.query("select * from interview_sessions order by id")).rows, preservedInterviewSessions);
  assert.deepEqual((await db.query("select * from interview_answers order by id")).rows, preservedInterviewAnswers);
  const currentContent = buildPreparedContent(await readPreparedSources());
  const currentSlugs = currentContent.interviewSets.map(s => s.slug);
  assert.equal(Number((await one("select count(*) from interview_sets where slug=any($1::text[]) and is_available", [currentSlugs])).count), 15);
  assert.equal(Number((await one("select count(*) from interview_questions q join interview_sets s on s.id=q.set_id where s.slug=any($1::text[])", [currentSlugs])).count), 120);
  for (const expected of currentContent.questions) {
    const actual = await one("select id,position,round_number,max_score,prompt,guidance,keywords,rubric,grading_rubric,reference_answer from interview_questions where id=$1", [expected.id]);
    const fields = Object.fromEntries(Object.entries(expected).filter(([key]) => !["source_id", "set_slug"].includes(key)));
    assert.deepEqual(actual, fields);
  }
  // Complete the nine reviewed sets one by one against actual database guards.
  const reviewedSets = currentContent.interviewSets.filter(s => s.slug.endsWith('-20261019'));
  for (const set of reviewedSets) {
    const session = await one("insert into interview_sessions(user_id,set_id) values ('33333333-3333-4333-8333-333333333333',$1) returning id", [set.id]);
    const questions = currentContent.questions.filter(q => q.set_slug === set.slug);
    assert.deepEqual([1,2,3].map(round => questions.filter(q => q.round_number === round).length), [3,3,2]);
    for (const q of questions) await db.query("insert into interview_answers(session_id,question_id,answer_text,score) values ($1,$2,'Synthetic half-rubric answer',50)", [session.id, q.id]);
    await db.query("update interview_sessions set completed_at=now(),overall_score=1 where id=$1", [session.id]);
    const graded = await one("select overall_score,round_scores from interview_sessions where id=$1", [session.id]);
    assert.equal(graded.overall_score, 50);
    assert.ok(graded.round_scores.every(r => r.score === 50));
  }
  const beforeReplay = (await db.query("select * from interview_questions order by id")).rows;
  await db.exec(await readFile(path.join(root, "supabase/migrations/20261019000300_interview_source_refresh.sql"), "utf8"));
  assert.deepEqual((await db.query("select * from interview_questions order by id")).rows, beforeReplay);
  assert.ok((await one("select superseded_at from simulation_attempts where id=$1", [previousSourceAttempt.id])).superseded_at);
  await assert.rejects(db.query("select finalize_simulation_attempt($1,'33333333-3333-4333-8333-333333333333','Previous inputs',70,'Proficient','{}','{}',now())", [previousSourceAttempt.id]), /source changed/);
  assert.equal((await one("select prompt from interview_questions where id=$1", [oldQuestion.id])).prompt, oldQuestion.prompt);
  assert.equal(Number((await one("select count(*) from interview_answers where session_id=$1 and question_id=$2", [oldSession.id,oldQuestion.id])).count), 1);
  assert.equal((await one("select is_available from interview_sets where id=$1", [oldQuestion.set_id])).is_available, false);
  assert.ok((await one("select superseded_at from simulation_attempts where id=$1", [oldAttempt.id])).superseded_at);
  await assert.rejects(db.query("select finalize_simulation_attempt($1,'33333333-3333-4333-8333-333333333333','Old draft',70,'Proficient','{}','{}',now())", [oldAttempt.id]), /source changed/);
  assert.ok((await one("select superseded_at from simulation_attempts where id=$1", [changedAssignmentAttempt.id])).superseded_at);
  assert.equal((await one("select superseded_at from simulation_attempts where id=$1", [unchangedAssignmentAttempt.id])).superseded_at, null);
  assert.deepEqual((await db.query("select * from simulation_submissions order by id")).rows, originalCompletedResults);
  await assert.rejects(db.query("select finalize_simulation_attempt($1,'33333333-3333-4333-8333-333333333333','Old rubric',70,'Proficient','{}','{}',now())", [changedAssignmentAttempt.id]), /source changed/);
  // Reapplying the content refresh must not invalidate a new attempt on the current version.
  const newAttempt = (await db.query("insert into simulation_attempts(user_id,simulation_id) select '33333333-3333-4333-8333-333333333333',id from simulations where slug='r2w-kk-01' returning id")).rows[0];
  await db.exec(await readFile(path.join(root, "supabase/migrations/20261019000100_simulation_source_refresh.sql"), "utf8"));
  assert.equal((await one("select superseded_at from simulation_attempts where id=$1", [newAttempt.id])).superseded_at, null);
  const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
  await db.query("insert into auth.users(id,email) values ($1,'owner@example.test'),($2,'other@example.test')", [owner, other]);
  await db.query("insert into cv_analyses(user_id,position_id,position_title,result) values ($1,'IT-03','Data Analyst','{}')", [owner]);
  const setUser = async (id) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)", [id]);
    await db.exec("set role authenticated");
  };
  await setUser(owner);
  assert.equal(Number((await one("select count(*) from cv_analyses")).count), 1);
  await setUser(other);
  assert.equal(Number((await one("select count(*) from cv_analyses")).count), 0);
  const denied = async (sql, params = []) => {
    await assert.rejects(db.query(sql, params), /permission denied|row-level security/);
  };
  await denied("select grading_rubric from simulations");
  await denied("select reference_data from simulations");
  await denied("select reference_answer from interview_questions");
  await denied("update profiles set account_status='active' where id=$1", [other]);
  await denied("insert into cv_analyses(user_id,position_id,position_title,result) values ($1,'IT-03','Forged','{}')", [other]);
  await denied("insert into simulation_submissions(user_id,simulation_id,content,overall_score) select $1,id,'forged',100 from simulations limit 1", [other]);
  await denied("insert into role_applications(user_id,requested_role,status) values ($1,'employer_admin','approved')", [other]);
  await db.exec("reset role");
  // Source references must remain private after import; public metadata is usable.
  assert.equal(Number((await one("select count(*) from simulations where jsonb_array_length(grading_rubric)=0")).count), 0);
  assert.equal(Number((await one("select count(*) from simulations s, jsonb_array_elements(s.rubric) c where c ? 'description' or c ? 'checklist' or c ? 'answer_key'")).count), 0);
  const simulation = await one("select id from simulations where is_available order by slug limit 1");
  const interviewSet = await one("select id from interview_sets where is_available and slug like 'r2w-%20261017' order by slug limit 1");
  const foreignSet = await one("select id from interview_sets where id <> $1 order by slug limit 1", [interviewSet.id]);
  const questions = (await db.query("select id from interview_questions where set_id=$1 order by position", [interviewSet.id])).rows;
  const foreignQuestion = await one("select id from interview_questions where set_id=$1 limit 1", [foreignSet.id]);
  await setUser(owner);
  const session = await one("insert into interview_sessions(user_id,set_id) values ($1,$2) returning id", [owner, interviewSet.id]);
  const attempt = await one("insert into simulation_attempts(user_id,simulation_id) values ($1,$2) returning id", [owner, simulation.id]);
  await denied("insert into simulation_attempts(user_id,simulation_id,started_at) values ($1,$2,now()-interval '1 day')", [owner, simulation.id]);
  await db.query("insert into storage.objects(bucket_id,name) values ('candidate-cvs',$1)", [`${owner}/cv.txt`]);
  await setUser(other);
  assert.equal(Number((await one("select count(*) from interview_sessions")).count), 0);
  assert.equal(Number((await one("select count(*) from simulation_attempts")).count), 0);
  assert.equal(Number((await one("select count(*) from storage.objects")).count), 0);
  await denied("insert into storage.objects(bucket_id,name) values ('candidate-cvs',$1)", [`${owner}/stolen.txt`]);
  await db.exec("reset role");
  await assert.rejects(db.query("update interview_sessions set completed_at=now() where id=$1", [session.id]), /Complete every question/);
  await assert.rejects(db.query("insert into interview_answers(session_id,question_id,answer_text,score) values ($1,$2,'Foreign answer',80)", [session.id, foreignQuestion.id]), /does not belong/);
  for (const question of questions) await db.query("insert into interview_answers(session_id,question_id,answer_text,score) values ($1,$2,'Evidence based practice answer.',80)", [session.id, question.id]);
  await db.query("update interview_sessions set completed_at=now(),overall_score=1 where id=$1", [session.id]);
  const completed = await one("select overall_score,round_scores from interview_sessions where id=$1", [session.id]);
  assert.equal(completed.overall_score, 80);
  assert.equal(completed.round_scores.length, 3);
  assert.ok(completed.round_scores.every((round) => round.score === 80));
  await assert.rejects(db.query("update interview_answers set score=100 where session_id=$1", [session.id]), /complete/);
  await assert.rejects(db.query("update interview_sessions set overall_score=100 where id=$1", [session.id]), /immutable/);
  await db.query("select set_config('request.jwt.claim.role','service_role',false)");
  await db.exec("set role service_role");
  const finalize = `select finalize_simulation_attempt($1,$2,'Evidence-based submission',85,'Strong','{"criteria":[]}'::jsonb,'{"private":"grader-only"}'::jsonb,now()) as id`;
  const first = await one(finalize, [attempt.id, owner]);
  const replay = await one(finalize, [attempt.id, owner]);
  assert.equal(first.id, replay.id);
  assert.equal(Number((await one("select count(*) from simulation_submissions where attempt_id=$1", [attempt.id])).count), 1);
  await setUser(owner);
  assert.equal(Number((await one("select count(*) from candidate_latest_simulation_submissions")).count), 1);
  assert.equal(Number((await one("select count(*) from candidate_completed_interview_sessions")).count), 1);
  await denied("select * from simulation_submission_evaluations");
  await setUser(other);
  assert.equal(Number((await one("select count(*) from candidate_latest_simulation_submissions")).count), 0);
  assert.equal(Number((await one("select count(*) from candidate_completed_interview_sessions")).count), 0);
  await db.exec("reset role");
  // Exact deadlines are enforced even for privileged writes. AI may finish
  // after the deadline only when its server-recorded receipt was before it.
  const expiredSession = await one("insert into interview_sessions(user_id,set_id,created_at) values ($1,$2,now()-interval '61 minutes') returning id", [owner, interviewSet.id]);
  await assert.rejects(db.query("insert into interview_answers(session_id,question_id,answer_text,score) values ($1,$2,'Late answer',80)", [expiredSession.id, questions[0].id]), /deadline exceeded/);
  await assert.rejects(db.query("insert into interview_answers(session_id,question_id,answer_text,score,submitted_at) select $1,$2,'At boundary',80,created_at+interval '60 minutes' from interview_sessions where id=$1", [expiredSession.id, questions[0].id]), /deadline exceeded/);
  await db.query("insert into interview_answers(session_id,question_id,answer_text,score,submitted_at) select $1,$2,'Received in time, AI finished later',80,created_at+interval '59 minutes 59 seconds' from interview_sessions where id=$1", [expiredSession.id, questions[0].id]);
  await assert.rejects(db.query("update interview_sessions set created_at=now() where id=$1", [expiredSession.id]), /immutable/);
  const expiredAttempt = await one("insert into simulation_attempts(user_id,simulation_id,started_at) values ($1,$2,now()-interval '61 minutes') returning id", [owner, simulation.id]);
  await assert.rejects(db.query(finalize, [expiredAttempt.id, owner]), /deadline exceeded/);
  await assert.rejects(db.query("select finalize_simulation_attempt($1,$2,'Boundary',80,'Strong','{}','{}',(select started_at+interval '60 minutes' from simulation_attempts where id=$1))", [expiredAttempt.id, owner]), /deadline exceeded/);
  assert.equal(Number((await one("select count(*) from simulation_submissions where attempt_id=$1", [expiredAttempt.id])).count), 0);
  await db.query("select finalize_simulation_attempt($1,$2,'Received in time',80,'Strong','{}','{}',(select started_at+interval '59 minutes 59 seconds' from simulation_attempts where id=$1))", [expiredAttempt.id, owner]);
  await assert.rejects(db.query("update simulation_attempts set started_at=now() where id=$1", [expiredAttempt.id]), /immutable/);
  await setUser(owner);
  await denied("insert into interview_sessions(user_id,set_id,created_at) values ($1,$2,now())", [owner, interviewSet.id]);
  await setUser(other);
  assert.equal((await db.query("delete from interview_sessions where id=$1 returning id", [session.id])).rows.length, 0);
  await db.exec("reset role");
  assert.ok(Number((await one("select count(*) from interview_answers where session_id=$1", [session.id])).count)>0);
  await setUser(owner);
  assert.equal((await db.query("delete from interview_sessions where id=$1 returning id", [session.id])).rows.length, 1);
  assert.equal((await db.query("delete from interview_sessions where id=$1 returning id", [expiredSession.id])).rows.length, 1);
  assert.equal(Number((await one("select count(*) from candidate_completed_interview_sessions")).count), 0);
  await db.exec("reset role");
  assert.equal(Number((await one("select count(*) from interview_answers where session_id in ($1,$2)", [session.id, expiredSession.id])).count), 0);
  await assert.rejects(db.query("insert into interview_answers(session_id,question_id,answer_text,score) values ($1,$2,'Inflight after deletion',80)", [expiredSession.id, questions[0].id]), /unavailable/);
  await db.query("insert into company_profiles(user_id,name,industry,contact_name) values ($1,'Test Company','Technology','Test Owner')", [owner]);
  const rubric = await readFile(path.join(root, "public/templates/simulation-rubric.json"), "utf8");
  const draft = await one(`insert into employer_content(owner_id,kind,title,position_id,industry,assignment_path,rubric_path,assignment_name,rubric_name,assignment_data,rubric_data)
    values ($1,'simulation','A real company assignment','IT-03','Technology',$2,$3,'assignment.txt','rubric.json',$4::jsonb,$5::jsonb) returning id`,
    [owner,`${owner}/assignment.txt`,`${owner}/rubric.json`,JSON.stringify("Analyze the supplied customer records and propose improvements."),rubric]);
  await db.query("select set_config('request.jwt.claim.role','service_role',false)");
  await db.exec("set role service_role");
  await assert.rejects(db.query("select publish_employer_content($1,$2)", [draft.id, owner]), /Employer approval/);
  await db.query("insert into user_roles(user_id,role) values ($1,'employer_admin')", [owner]);
  await db.query("select publish_employer_content($1,$2)", [draft.id, owner]);
  await db.query("select publish_employer_content($1,$2)", [draft.id, owner]);
  const published = await one("select status,simulation_id from employer_content where id=$1", [draft.id]);
  assert.equal(published.status, "published");
  assert.equal(Number((await one("select count(*) from simulations where id=$1", [published.simulation_id])).count), 1);
  await setUser(other);
  assert.equal(Number((await one("select count(*) from employer_content")).count), 0);
  await denied("select publish_employer_content($1,$2)", [draft.id, owner]);
  console.log("Database checks passed: all migrations, content counts, account/storage isolation, private grading references, immutable three-round interviews, timed/idempotent submissions, RLS views and approved atomic business publication.");
} finally { await db.close(); }
