import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const namespace = Buffer.from("7c0be9b45da656cf8f2432b9a61c647a", "hex");
export const migrationName = "20261016000200_import_prepared_content.sql";

/** RFC 4122 UUID v5; identity does not depend on input traversal order. */
export function stableId(kind, identity) {
  const bytes = createHash("sha1").update(namespace).update(`${kind}:${identity}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function sqlText(value) {
  if (value === null || value === undefined) return "null";
  // Standard SQL strings: escape apostrophes, never interpolate SQL identifiers.
  return `'${String(value).replaceAll("'", "''")}'`;
}
const sqlJson = (value) => `${sqlText(JSON.stringify(value))}::jsonb`;
const total = (items, key) => items.reduce((sum, item) => sum + Number(item[key] ?? 0), 0);
const normalizeName = (value) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const privateKeys = new Set([
  "benchmarkinsights", "answerkey", "referenceanswer", "standardformulareference",
  "gradingrubric", "rubric", "checklist", "hardconstraints", "scoringguideline",
  "scoringsourcenote", "gradernotes", "gradingnotes", "solution", "solutions",
  "expectedanswer", "expectedanswers", "modelanswer", "notes",
  "averagedailysaleswithoutoutlier", "averagedailysaleswithoutlier",
]);

/** Artifact facts may be public; worked solutions and grader commentary may not. */
export function publicArtifact(value) {
  if (Array.isArray(value)) return value.map(publicArtifact);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).filter(([key]) => !privateKeys.has(key.replace(/[^a-z0-9]/gi, "").toLowerCase()))
      .map(([key, item]) => [key, publicArtifact(item)]),
  );
  return value;
}

export async function readPreparedSources(projectRoot = root) {
  const readJson = async (name) => JSON.parse(await readFile(join(projectRoot, "data", name), "utf8"));
  const [profiles, tasks, interviews] = await Promise.all([
    readJson("golden-profiles.json"), readJson("task-rubrics.json"), readJson("interview-bank.json"),
  ]);
  const artifacts = {};
  for (const industry of tasks.industries) for (const task of industry.tasks) {
    for (const artifact of task.input_artifacts ?? []) {
      try { artifacts[artifact.artifact_id] = await readJson(`task-artifacts/${artifact.artifact_id}.json`); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
    }
  }
  return { profiles, tasks, interviews, artifacts };
}

export function buildPreparedContent(source) {
  const errors = [];
  const warnings = [];
  const profiles = source.profiles.industries.flatMap((industry) => industry.positions.map((profile) => ({ ...profile, industry_name: industry.industry_name })));
  const profileById = new Map(profiles.map((profile) => [profile.position_id, profile]));
  const seenChecklistIds = new Set();
  const simulations = [];
  const interviewSets = [];
  const questions = [];

  for (const profile of profiles) {
    for (const skill of [...profile.hard_skills, ...profile.tools]) {
      if (!(skill.weight > 0 && skill.weight <= 5)) errors.push(`${profile.position_id}: invalid profile weight`);
      if (!skill.keywords?.length) errors.push(`${profile.position_id}: missing skill keywords`);
    }
  }

  for (const industry of source.tasks.industries) for (const task of industry.tasks) {
    if (!profileById.has(task.position_id)) errors.push(`${task.position_id}: task has no Golden Profile`);
    if (total(task.rubric, "max_points") !== 100) errors.push(`${task.position_id}: criterion maxima do not total 100`);
    const criterionIds = new Set();
    for (const criterion of task.rubric) {
      if (criterionIds.has(criterion.criterion_id)) errors.push(`${task.position_id}: duplicate criterion ${criterion.criterion_id}`);
      criterionIds.add(criterion.criterion_id);
      if (total(criterion.checklist, "points") !== criterion.max_points) errors.push(`${task.position_id}/${criterion.criterion_id}: checklist points do not match criterion maximum`);
      for (const item of criterion.checklist) {
        if (seenChecklistIds.has(item.checklist_id)) errors.push(`Duplicate checklist ${item.checklist_id}`);
        seenChecklistIds.add(item.checklist_id);
        if (!(item.points > 0)) errors.push(`${item.checklist_id}: checklist points must be positive`);
      }
    }
    const artifacts = Object.fromEntries((task.input_artifacts ?? []).filter((item) => source.artifacts[item.artifact_id]).map((item) => [item.artifact_id, source.artifacts[item.artifact_id]]));
    const missing = (task.input_artifacts ?? []).filter((item) => item.required && !artifacts[item.artifact_id]);
    const publicData = Object.values(artifacts).map(publicArtifact);
    const instructions = ["## Bối cảnh", task.context, "## Yêu cầu nhiệm vụ", ...task.requirements.map((requirement, index) => `${index + 1}. ${requirement}`)];
    if (publicData.length) instructions.push("## Dữ liệu đầu vào", ...publicData.map((artifact) => `### ${artifact.artifact_id}\n\n\`\`\`json\n${JSON.stringify(artifact, null, 2)}\n\`\`\``));
    const gradingRubric = task.rubric.map((criterion) => ({
      id: criterion.criterion_id, label: criterion.criterion_name,
      description: JSON.stringify({ checklist: criterion.checklist, hard_constraints: (task.hard_constraints ?? []).filter((constraint) => constraint.trigger_checklist_id?.startsWith(`${task.position_id}-${criterion.criterion_id}-`)) }),
      keywords: [], weight: criterion.max_points, maxScore: criterion.max_points,
    }));
    const unavailableReason = missing.length ? `Đề bài nguồn thiếu dữ liệu bắt buộc: ${missing.map((item) => item.artifact_id).join(", ")}.` : null;
    if (unavailableReason) warnings.push({ kind: "missing_artifact", positionId: task.position_id, message: unavailableReason });
    simulations.push({
      id: stableId("simulation", task.position_id), slug: `r2w-${task.position_id.toLowerCase()}`,
      industry: industry.industry_name, position_title: task.position_name, brief: task.context,
      task_instructions: instructions.join("\n\n"), estimated_minutes: task.time_limit_minutes, min_words: 120,
      position_id: task.position_id, is_available: missing.length === 0, unavailable_reason: unavailableReason,
      rubric: gradingRubric.map(({ id, label, weight, maxScore }) => ({ id, label, weight, maxScore })),
      grading_rubric: gradingRubric, reference_data: { ...task, artifacts },
    });
  }

  for (const [slug, set] of Object.entries(source.interviews).sort(([a], [b]) => a.localeCompare(b))) {
    const matches = profiles.filter((profile) => normalizeName(profile.position_name).includes(normalizeName(set.positionTitle)));
    if (matches.length !== 1) errors.push(`${slug}: expected one Golden Profile match, found ${matches.length}`);
    const profile = matches[0];
    const rounds = Object.values(set.rounds).sort((a, b) => a.roundNumber - b.roundNumber);
    const absentRounds = [1, 2, 3].filter((roundNumber) => !rounds.some((round) => round.roundNumber === roundNumber && round.questions.length));
    const reason = absentRounds.length ? `Bộ câu hỏi nguồn chưa có câu hỏi vòng ${absentRounds.join(", ")}. Cần bổ sung đủ ba vòng trước khi luyện tập.` : null;
    if (reason) warnings.push({ kind: "incomplete_interview", positionId: profile?.position_id, slug, message: reason });
    const setSlug = `r2w-${slug}`;
    interviewSets.push({ id: stableId("interview-set", slug), slug: setSlug, position_id: profile?.position_id ?? null,
      industry: profile?.industry_name ?? set.industryName, position_title: set.positionTitle,
      description: `Luyện phỏng vấn ${set.positionTitle} theo ba vòng: tổng quan, chuyên môn và tình huống. Mỗi vòng được quy đổi riêng về thang 100.`,
      is_available: absentRounds.length === 0, unavailable_reason: reason });
    let position = 0;
    for (const round of rounds) {
      const roundMaximum = total(round.questions, "maxScore");
      if (round.questions.length && roundMaximum !== 100) warnings.push({ kind: "round_normalization", slug, roundNumber: round.roundNumber, sourceMaxScore: roundMaximum, message: "Keep source maxima; normalize this round independently to 100." });
      for (const question of round.questions) {
        if (!(question.maxScore > 0 && question.maxScore <= 100)) errors.push(`${question.id}: invalid question maximum`);
        if (total(question.scoringCriteria, "maxScore") !== question.maxScore) errors.push(`${question.id}: criterion maxima do not match question maximum`);
        const criterionIds = new Set();
        for (const criterion of question.scoringCriteria) {
          if (criterionIds.has(criterion.id)) errors.push(`${question.id}: duplicate criterion ${criterion.id}`);
          criterionIds.add(criterion.id);
          if (!(criterion.maxScore > 0)) errors.push(`${question.id}/${criterion.id}: non-positive criterion maximum`);
        }
        const gradingRubric = question.scoringCriteria.map((criterion) => ({ id: criterion.id, label: criterion.name, description: criterion.description,
          keywords: [], weight: criterion.maxScore, maxScore: criterion.maxScore, skill: criterion.skill }));
        questions.push({ id: stableId("interview-question", `${slug}:${question.id}`), source_id: question.id, set_slug: setSlug,
          position: ++position, round_number: round.roundNumber, max_score: question.maxScore,
          prompt: question.questionText, guidance: "", keywords: [],
          rubric: gradingRubric.map(({ id, label, weight, maxScore }) => ({ id, label, weight, maxScore })),
          grading_rubric: gradingRubric, reference_answer: question.referenceAnswer ?? "" });
      }
    }
  }
  const counts = { profiles: profiles.length, simulations: simulations.length, interviewSets: interviewSets.length, interviewQuestions: questions.length,
    incompleteInterviews: interviewSets.filter((set) => !set.is_available).length, checklistItems: seenChecklistIds.size, artifacts: Object.keys(source.artifacts).length };
  for (const [name, expected] of Object.entries({ profiles: 15, simulations: 15, interviewSets: 14, incompleteInterviews: 3 })) {
    if (counts[name] !== expected) errors.push(`Expected ${expected} ${name}; found ${counts[name]}`);
  }
  if (new Set(simulations.map((item) => item.position_id)).size !== simulations.length) errors.push("Duplicate simulation position IDs");
  return { simulations, interviewSets, questions, validation: { counts, errors, warnings } };
}

export function renderMigration(content) {
  if (content.validation.errors.length) throw new Error(`Prepared content validation failed:\n${content.validation.errors.join("\n")}`);
  const rows = ["-- Generated by node scripts/import-content.mjs; edit source JSON, then regenerate.", "-- Additive, reproducible import. Existing catalog IDs and candidate history are retained.", "begin;", "set local standard_conforming_strings = on;", ""];
  for (const item of content.simulations) {
    const columns = ["id", "slug", "industry", "position_title", "brief", "task_instructions", "estimated_minutes", "min_words", "position_id", "is_available", "unavailable_reason", "rubric", "grading_rubric", "reference_data"];
    const values = columns.map((key) => ["rubric", "grading_rubric", "reference_data"].includes(key) ? sqlJson(item[key]) : typeof item[key] === "number" || typeof item[key] === "boolean" ? String(item[key]) : sqlText(item[key]));
    rows.push(`insert into public.simulations (${columns.join(", ")})\nvalues (${values.join(", ")})\non conflict (slug) do update set\n  ${columns.filter((key) => !["id", "slug"].includes(key)).map((key) => `${key} = excluded.${key}`).join(",\n  ")};\n`);
  }
  for (const item of content.interviewSets) {
    const columns = ["id", "slug", "industry", "position_title", "description", "position_id", "is_available", "unavailable_reason"];
    const values = columns.map((key) => typeof item[key] === "boolean" ? String(item[key]) : sqlText(item[key]));
    rows.push(`insert into public.interview_sets (${columns.join(", ")})\nvalues (${values.join(", ")})\non conflict (slug) do update set\n  ${columns.filter((key) => !["id", "slug"].includes(key)).map((key) => `${key} = excluded.${key}`).join(",\n  ")};\n`);
  }
  for (const item of content.questions) {
    const columns = ["id", "set_id", "position", "prompt", "guidance", "keywords", "round_number", "max_score", "rubric", "grading_rubric", "reference_answer"];
    const values = columns.map((key) => key === "set_id" ? `(select id from public.interview_sets where slug = ${sqlText(item.set_slug)})` : key === "keywords" ? "'{}'::text[]" : ["rubric", "grading_rubric"].includes(key) ? sqlJson(item[key]) : typeof item[key] === "number" ? String(item[key]) : sqlText(item[key]));
    rows.push(`insert into public.interview_questions (${columns.join(", ")})\nvalues (${values.join(", ")})\non conflict (set_id, position) do update set\n  ${columns.filter((key) => !["id", "set_id", "position"].includes(key)).map((key) => `${key} = excluded.${key}`).join(",\n  ")};\n`);
  }
  rows.push("commit;", "");
  return rows.join("\n");
}

export function businessTemplates() {
  const criteria = [
    { id: "accuracy", label: "Độ chính xác", description: "Phân tích và kết luận đúng, dựa trên dữ kiện được cung cấp.", weight: 60, keywords: [] },
    { id: "reasoning", label: "Lập luận và trình bày", description: "Lý giải rõ ràng, có bằng chứng và đề xuất hành động khả thi.", weight: 40, keywords: [] },
  ];
  return {
    "simulation-rubric.json": criteria,
    "interview-assignment.json": { rounds: [1, 2, 3].map((roundNumber) => ({ roundNumber, questions: [{
      prompt: ["Hãy giới thiệu một trải nghiệm phù hợp với vị trí bạn đang ứng tuyển.", "Hãy mô tả cách bạn kiểm tra tính chính xác của một kết quả công việc.", "Nếu hai công việc quan trọng cùng đến hạn, bạn sẽ sắp xếp và trao đổi như thế nào?"][roundNumber - 1],
      guidance: "Đánh giá câu trả lời theo tiêu chí đã cung cấp; không suy luận những trải nghiệm ứng viên không nêu.", maxScore: 100,
    }] })) },
    "interview-rubric.json": [1, 2, 3].map((roundNumber) => ({ roundNumber, questionIndex: 1, criteria })),
  };
}

async function main() {
  const content = buildPreparedContent(await readPreparedSources());
  if (content.validation.errors.length) throw new Error(content.validation.errors.join("\n"));
  const outputs = new Map([
    [join(root, "supabase/migrations", migrationName), renderMigration(content)],
    [join(root, "data/content-validation.json"), `${JSON.stringify(content.validation, null, 2)}\n`],
    ...Object.entries(businessTemplates()).map(([name, value]) => [join(root, "public/templates", name), `${JSON.stringify(value, null, 2)}\n`]),
  ]);
  if (process.argv.includes("--check")) {
    for (const [path, expected] of outputs) if (await readFile(path, "utf8") !== expected) throw new Error(`Generated content is stale: ${path}`);
  } else {
    for (const [path, value] of outputs) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, value); }
  }
  console.log(JSON.stringify({ ...content.validation.counts, errors: content.validation.errors.length, warnings: content.validation.warnings.length }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
