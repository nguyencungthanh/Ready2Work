export function readinessBadge(score: number): string {
  if (score < 60) return "Cần luyện tập thêm";
  if (score <= 80) return "Sẵn sàng ứng tuyển Junior";
  return "Xuất sắc / Sẵn sàng cho Global Company";
}

export function calculateReadiness(completion: number | null, interview: number | null, mentor: number | null) {
  const components = [
    { key: "simulation", label: "Hoàn thành mô phỏng", weight: 30, score: completion },
    { key: "interview", label: "AI Mock Interview", weight: 40, score: interview },
    { key: "mentor", label: "Mentor đánh giá", weight: 30, score: mentor },
  ];
  for (const component of components) {
    if (component.score !== null && (!Number.isFinite(component.score) || component.score < 0 || component.score > 100)) {
      throw new Error("Readiness inputs must use the 0–100 scale.");
    }
  }
  const complete = components.every((component) => component.score !== null);
  const weightedPoints = components.reduce((sum, component) => sum + (component.score ?? 0) * component.weight / 100, 0);
  const score = complete ? Math.round(weightedPoints) : null;
  return { components, score, weightedPoints: Math.round(weightedPoints * 10) / 10,
    badge: score === null ? "Chưa đủ dữ liệu đánh giá" : readinessBadge(score) };
}

/** The newest attempt for a task is the evidence shown everywhere. */
export function newestBy<T>(rows: T[], key: (row: T) => string): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const id = key(row);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
