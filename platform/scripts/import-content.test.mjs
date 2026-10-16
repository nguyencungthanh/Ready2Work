import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildPreparedContent, readPreparedSources, renderMigration, publicArtifact, sqlText, stableId, businessTemplates, migrationName } from "./import-content.mjs";

const source = await readPreparedSources();
const content = buildPreparedContent(source);

test("prepared source has 15 matching profiles/tasks and preserves all 14 interview sets", () => {
  assert.deepEqual(content.validation.errors, []);
  assert.deepEqual(content.validation.counts, { profiles: 15, simulations: 15, interviewSets: 14, interviewQuestions: 88, incompleteInterviews: 3, checklistItems: 119, artifacts: 4 });
  assert.equal(new Set(content.simulations.map((item) => item.position_id)).size, 15);
  assert.ok(content.simulations.every((item) => item.is_available));
  assert.ok(content.interviewSets.every((item) => /^(TCNH|MKT|IT|KK|LOG)-\d{2}$/.test(item.position_id)));
});

test("three logistics sets are disabled with an explicit missing round explanation", () => {
  const disabled = content.interviewSets.filter((item) => !item.is_available);
  assert.deepEqual(disabled.map((item) => item.position_id).sort(), ["LOG-01", "LOG-02", "LOG-03"]);
  assert.ok(disabled.every((item) => item.unavailable_reason.includes("vòng 1")));
  assert.equal(content.questions.filter((item) => disabled.some((set) => item.set_slug === set.slug)).length, 6);
});

test("each task preserves full checklist scoring privately, with only rubric metadata public", () => {
  for (const simulation of content.simulations) {
    assert.equal(simulation.rubric.reduce((sum, item) => sum + item.maxScore, 0), 100);
    assert.deepEqual(simulation.rubric.map((item) => Object.keys(item).sort()), simulation.rubric.map(() => ["id", "label", "maxScore", "weight"]));
    assert.ok(simulation.grading_rubric.every((item) => JSON.parse(item.description).checklist.length > 0));
    assert.deepEqual(simulation.reference_data.rubric.map((item) => item.max_points), simulation.grading_rubric.map((item) => item.maxScore));
  }
});

test("raw task inputs are public while answer keys, solved formulas and insights remain private", () => {
  for (const simulation of content.simulations) {
    assert.doesNotMatch(simulation.task_instructions, /benchmark_insights|standard_formula_reference|answer_key|reference_answer|average_daily_sales_without_outlier|average_daily_sales_with_outlier|checklist_id/);
    for (const [id, artifact] of Object.entries(simulation.reference_data.artifacts)) assert.deepEqual(artifact, source.artifacts[id]);
  }
  const supplyChain = content.simulations.find((item) => item.position_id === "LOG-02");
  assert.ok(supplyChain.task_instructions.includes('"normal_sales_total_units": 86500'));
  assert.ok(supplyChain.reference_data.artifacts["LOG-02-DATA-01"].standard_formula_reference);
  const analyst = content.simulations.find((item) => item.position_id === "IT-03");
  assert.ok(analyst.reference_data.artifacts["IT-03-DATA-01"].benchmark_insights);
  assert.deepEqual(publicArtifact({ nested: [{ answer_key: "hidden", facts: [1, 2] }], referenceAnswer: "hidden" }), { nested: [{ facts: [1, 2] }] });
});

test("interview question and criterion maxima match original source instead of being replaced with percentages", () => {
  for (const [slug, set] of Object.entries(source.interviews)) for (const round of Object.values(set.rounds)) for (const question of round.questions) {
    const imported = content.questions.find((item) => item.set_slug === `r2w-${slug}` && item.source_id === question.id);
    assert.equal(imported.max_score, question.maxScore);
    assert.equal(imported.round_number, round.roundNumber);
    assert.deepEqual(imported.grading_rubric.map((item) => item.maxScore), question.scoringCriteria.map((item) => item.maxScore));
    assert.equal(imported.reference_answer, question.referenceAnswer);
    assert.equal(imported.guidance, "");
    assert.ok(imported.rubric.every((item) => !Object.hasOwn(item, "description")));
  }
  assert.equal(content.validation.warnings.filter((item) => item.kind === "round_normalization" && item.slug === "marketing-intern" && item.roundNumber === 2)[0].sourceMaxScore, 30);
});

test("validation flags a changed task criterion maximum, checklist total and interview score total", () => {
  const changed = structuredClone(source);
  changed.tasks.industries[0].tasks[0].rubric[0].max_points++;
  changed.interviews["ke-toan-vien"].rounds["1"].questions[0].scoringCriteria[0].maxScore++;
  const invalid = buildPreparedContent(changed);
  assert.ok(invalid.validation.errors.some((message) => message.includes("criterion maxima do not total 100")));
  assert.ok(invalid.validation.errors.some((message) => message.includes("checklist points do not match")));
  assert.ok(invalid.validation.errors.some((message) => message.includes("criterion maxima do not match question")));
  assert.throws(() => renderMigration(invalid), /validation failed/);
});

test("missing mandatory input disables the task without inventing replacement data", () => {
  const changed = structuredClone(source);
  delete changed.artifacts["TCNH-01-DATA-01"];
  const unavailable = buildPreparedContent(changed).simulations.find((item) => item.position_id === "TCNH-01");
  assert.equal(unavailable.is_available, false);
  assert.match(unavailable.unavailable_reason, /TCNH-01-DATA-01/);
  assert.deepEqual(unavailable.reference_data.artifacts, {});
});

test("UUIDs are reproducible, distinct per entity and independent of traversal order", () => {
  assert.equal(stableId("simulation", "IT-03"), stableId("simulation", "IT-03"));
  assert.notEqual(stableId("simulation", "IT-03"), stableId("interview-set", "IT-03"));
  assert.match(stableId("simulation", "IT-03"), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const reversed = structuredClone(source);
  reversed.tasks.industries.reverse();
  for (const original of content.simulations) assert.equal(buildPreparedContent(reversed).simulations.find((item) => item.slug === original.slug).id, original.id);
});

test("SQL safely quotes source strings and upserts without deleting catalog IDs or history", async () => {
  assert.equal(sqlText("O'Brien's \\ example"), "'O''Brien''s \\ example'");
  const sql = renderMigration(content);
  assert.doesNotMatch(sql, /\b(delete\s+from|truncate|drop\s+table)\b/i);
  assert.equal((sql.match(/on conflict \(slug\)/g) ?? []).length, 29);
  assert.equal((sql.match(/on conflict \(set_id, position\)/g) ?? []).length, 88);
  assert.match(sql, /set_id.*\nvalues \('[^']+', \(select id from public.interview_sets where slug/s);
  assert.equal(sql, await readFile(new URL(`../supabase/migrations/${migrationName}`, import.meta.url), "utf8"));
});

test("templates cover the same three rounds and have 100-point criterion weights", () => {
  const templates = businessTemplates();
  const assignment = templates["interview-assignment.json"];
  const rubric = templates["interview-rubric.json"];
  assert.deepEqual(assignment.rounds.map((round) => round.roundNumber), [1, 2, 3]);
  for (const round of assignment.rounds) {
    assert.equal(round.questions.reduce((sum, question) => sum + question.maxScore, 0), 100);
    assert.equal(rubric.find((item) => item.roundNumber === round.roundNumber).criteria.reduce((sum, criterion) => sum + criterion.weight, 0), 100);
  }
});
