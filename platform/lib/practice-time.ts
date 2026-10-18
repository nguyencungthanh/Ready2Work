/** One wall-clock hour per simulation attempt or complete interview session. */
export const PRACTICE_MINUTES = 60;
export const PRACTICE_SECONDS = PRACTICE_MINUTES * 60;
export function practiceDeadline(startedAt: string): number {
  return new Date(startedAt).getTime() + PRACTICE_SECONDS * 1000;
}
export function practiceExpired(startedAt: string, now = Date.now()): boolean {
  const deadline = practiceDeadline(startedAt);
  return !Number.isFinite(deadline) || now >= deadline;
}
export function practiceRemaining(startedAt: string, now = Date.now()): number {
  const deadline = practiceDeadline(startedAt);
  return Number.isFinite(deadline) ? Math.max(0, Math.min(PRACTICE_SECONDS, Math.ceil((deadline - now) / 1000))) : 0;
}
export function formatPracticeTime(seconds: number): string {
  return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
