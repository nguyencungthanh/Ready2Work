export interface RoadmapStepTemplate {
  stage: string;
  title: string;
  objective: string;
  resourceLabel?: string;
  resourceUrl?: string;
}

export interface CareerForRoadmap {
  title: string;
  industry: string;
  key_skills: string[];
  entry_roles: string[];
}

export const ROADMAP_STAGES = [
  "Explore",
  "Build foundations",
  "Build evidence",
  "Simulate work",
  "Prepare application",
  "Practice interviews",
  "Apply",
] as const;

/** Completion percentage, rounded. Empty roadmaps are 0 rather than NaN. */
export function completionPercent(steps: { completed: boolean }[]): number {
  if (steps.length === 0) return 0;
  return Math.round((steps.filter((s) => s.completed).length / steps.length) * 100);
}
