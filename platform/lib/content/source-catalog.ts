import "server-only";
import tasks from "@/data/task-rubrics.json";
import { sourceInterviewSlugs } from "./interview-catalog";

export function sourceSimulationSlugs(): string[] {
  return tasks.industries.flatMap((industry) => industry.tasks.map((task) => `r2w-${task.position_id.toLowerCase()}`));
}
export function isSourceSimulation(item: { slug: string }): boolean { return sourceSimulationSlugs().includes(item.slug); }
export function isSourceInterview(item: { slug: string }): boolean { return sourceInterviewSlugs().includes(item.slug); }
export function isCurrentDocumentOnlySource(referenceData: unknown): boolean {
  return Boolean(referenceData && typeof referenceData === "object" &&
    "source_version" in referenceData && referenceData.source_version === "20261017" &&
    "source_policy" in referenceData && referenceData.source_policy === "document_only" &&
    "content_revision" in referenceData && referenceData.content_revision === "20261017-doc-only");
}
export function isPublishedBusinessContent(item: { slug: string; is_available?: boolean }): boolean {
  // The publish RPC uses employer_content.id (UUID). Source revisions apply only to r2w content.
  return /^company-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.slug) && item.is_available === true;
}
