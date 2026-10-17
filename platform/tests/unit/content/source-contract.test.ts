import { describe, expect, it } from "vitest";
import bank from "@/data/interview-bank.json";
import source from "@/data/source/requirements-20261017.json";

type Paragraph = { text: string };
type SourceTable = { index: number; type: "table"; rows: Paragraph[][][] };
type SourceQuestion = { questionText: string; id: string };
type QuestionSet = { rounds: Record<string, { questions: SourceQuestion[] }> };
const sets = bank as unknown as Record<string, QuestionSet>;
const table = (index: number) => source.blocks.find((block) => block.index === index) as unknown as SourceTable;
const cell = (tableIndex: number, row: number, column = 0) => table(tableIndex).rows[row]![column]!.map((paragraph) => paragraph.text).join("\n");
const questionText = (text: string) => text.normalize("NFC").replace(/^\s*(?:V[23]-)?\d+\.\s*/, "").split(" · ")[0]!.replace(/\s+/g, " ").trim();

const sourceTables: Record<string, [number, number, number]> = {
  "business-analyst": [359, 361, 363],
  "qa-tester": [366, 368, 370],
  "data-analyst": [373, 375, 377],
  "ke-toan-vien": [405, 407, 409],
  "kiem-toan-vien": [413, 415, 417],
  "tro-ly-thue": [420, 422, 424],
  "credit-analyst": [446, 448, 452],
  "financial-analyst": [457, 459, 462],
  "risk-analyst": [465, 467, 470],
  "logistics-ops": [496, 498, 500],
  "supply-chain": [504, 506, 508],
  "purchasing": [511, 513, 516],
};
const marketingTables: Record<string, number> = {
  "marketing-intern": 308,
  "digital-marketing": 311,
  "content-marketing": 314,
};

describe("interview content matches the owner's source document", () => {
  it("contains exactly fifteen source positions and 120 unique questions with three source rounds per position", () => {
    expect(Object.keys(sets).sort()).toEqual([...Object.keys(sourceTables), ...Object.keys(marketingTables)].sort());
    const questions: SourceQuestion[] = [];
    for (const [slug, set] of Object.entries(sets)) {
      expect(Object.keys(set.rounds).sort(), slug).toEqual(["1", "2", "3"]);
      for (const [round, count] of [["1", 3], ["2", 3], ["3", 2]] as const) {
        expect(set.rounds[round]!.questions, `${slug}, vòng ${round}`).toHaveLength(count);
        questions.push(...set.rounds[round]!.questions);
      }
    }
    expect(questions).toHaveLength(120);
    expect(new Set(questions.map((question) => question.id)).size).toBe(120);
  });

  it("preserves every non-Marketing question from its exact source cell, including unusual source wording", () => {
    for (const [slug, tables] of Object.entries(sourceTables)) {
      for (const [roundIndex, tableIndex] of tables.entries()) {
        const round = sets[slug]!.rounds[String(roundIndex + 1)]!;
        const rows = table(tableIndex).rows.slice(1);
        expect(round.questions, `${slug}, source table ${tableIndex}`).toHaveLength(rows.length);
        rows.forEach((_, rowIndex) => {
          expect(questionText(round.questions[rowIndex]!.questionText), `${slug}, source table ${tableIndex}, row ${rowIndex + 1}`)
            .toBe(questionText(cell(tableIndex, rowIndex + 1)));
        });
      }
    }
  });

  it("uses Marketing's shared round-one questions and exact five specialist questions for each of its three positions", () => {
    for (const [slug, tableIndex] of Object.entries(marketingTables)) {
      const set = sets[slug]!;
      for (let index = 0; index < 3; index++) {
        expect(questionText(set.rounds["1"]!.questions[index]!.questionText), `${slug}, shared round 1, row ${index + 1}`)
          .toBe(questionText(cell(304, index + 1)));
      }
      const laterQuestions = [...set.rounds["2"]!.questions, ...set.rounds["3"]!.questions];
      for (let index = 0; index < 5; index++) {
        expect(questionText(laterQuestions[index]!.questionText), `${slug}, source table ${tableIndex}, row ${index + 1}`)
          .toBe(questionText(cell(tableIndex, index + 1)));
      }
    }
  });
});
