import { z } from "zod";

export const rubricCriterionSchema = z.object({
  id: z.string().min(1).max(100), label: z.string().min(1).max(250),
  description: z.string().min(1).max(3000), weight: z.number().positive().max(100),
  keywords: z.array(z.string().max(100)).max(50).default([]),
});
export const rubricSchema = z.array(rubricCriterionSchema).min(1).max(20)
  .refine((items) => new Set(items.map((i) => i.id)).size === items.length, "Mã tiêu chí không được trùng.")
  .refine((items) => Math.abs(items.reduce((sum, i) => sum + i.weight, 0) - 100) < 0.01, "Tổng trọng số phải bằng 100.");
export const interviewAssignmentSchema = z.object({
  rounds: z.array(z.object({
    roundNumber: z.number().int().min(1).max(3),
    questions: z.array(z.object({
      prompt: z.string().min(10).max(4000), guidance: z.string().max(4000).default(""),
      maxScore: z.number().int().positive().max(100),
    })).min(1).max(10),
  })).length(3).refine((rounds) => new Set(rounds.map((r) => r.roundNumber)).size === 3, "Cần đủ ba vòng khác nhau."),
});
export const interviewRubricSchema = z.array(z.object({
  roundNumber: z.number().int().min(1).max(3), questionIndex: z.number().int().min(1).max(10), criteria: rubricSchema,
})).min(3).max(30).refine((items) => new Set(items.map((r) => `${r.roundNumber}-${r.questionIndex}`)).size === items.length, "Không trùng bộ tiêu chí câu hỏi.");
