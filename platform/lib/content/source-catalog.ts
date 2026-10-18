import "server-only";
import tasks from "@/data/task-rubrics.json";
import { sourceInterviewSlugs } from "./interview-catalog";

export function sourceSimulationSlugs(): string[] {
  return tasks.industries.flatMap((industry) => industry.tasks.map((task) => `r2w-${task.position_id.toLowerCase()}`));
}
export function isSourceSimulation(item: { slug: string }): boolean { return sourceSimulationSlugs().includes(item.slug); }
export function isSourceInterview(item: { slug: string }): boolean { return sourceInterviewSlugs().includes(item.slug); }
export function isCurrentSourceRevision(referenceData: unknown): boolean {
  if (!referenceData || typeof referenceData !== "object" || !("position_id" in referenceData)) return false;
  const expected = tasks.industries.map((industry) => industry.tasks).flat().find((task) => task.position_id === referenceData.position_id);
  return Boolean(expected &&
    "source_version" in referenceData && referenceData.source_version === expected.source_version &&
    "source_policy" in referenceData && referenceData.source_policy === expected.source_policy &&
    "content_revision" in referenceData && referenceData.content_revision === expected.content_revision);
}
export function isPublishedBusinessContent(item: { slug: string; is_available?: boolean }): boolean {
  // The publish RPC uses employer_content.id (UUID). Source revisions apply only to r2w content.
  return /^company-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.slug) && item.is_available === true;
}
