import { describe, expect, it } from "vitest";
import { isCurrentDocumentOnlySource, isPublishedBusinessContent, isSourceInterview, isSourceSimulation, sourceSimulationSlugs } from "@/lib/content/source-catalog";
import { sourceInterviewSlugs } from "@/lib/content/interview-catalog";

const legacySimulations = ["audit-receivables-review", "cost-variance-analysis", "credit-appraisal-sme", "equity-valuation-note", "churn-dashboard-spec", "bug-triage-api", "inventory-optimisation", "shipment-delay-escalation", "brand-repositioning-brief", "campaign-launch-plan"];
const legacyInterviews = ["financial-analyst-general", "software-engineer-general", "commercial-bank-credit-round1", "product-company-data-round1", "big4-audit-round1", "3pl-operations-round1", "fmcg-brand-round1"];

describe("candidate source catalog boundaries", () => {
  it("exposes exactly three source simulation assignments per industry and fifteen source interview positions", () => {
    const simulations = sourceSimulationSlugs();
    expect(simulations).toHaveLength(15);
    expect(new Set(simulations).size).toBe(15);
    for (const industry of ["mkt", "it", "kk", "tcnh", "log"]) {
      expect(simulations.filter((slug) => slug.startsWith(`r2w-${industry}-`)).sort()).toEqual([1, 2, 3].map((number) => `r2w-${industry}-0${number}`));
    }
    expect(sourceInterviewSlugs()).toHaveLength(15);
    expect(sourceInterviewSlugs().every((slug) => isSourceInterview({ slug }))).toBe(true);
  });

  it("rejects all known old demo assignments, old interview versions and lookalike source slugs", () => {
    expect(legacySimulations.some((slug) => isSourceSimulation({ slug }))).toBe(false);
    expect([...legacyInterviews, "r2w-financial-analyst", "r2w-qa-tester", "r2w-software-engineer-20261017"].some((slug) => isSourceInterview({ slug }))).toBe(false);
    expect(isSourceSimulation({ slug: "r2w-it-04" })).toBe(false);
  });

  it("does not treat an old company-named demo as newly published company content", () => {
    for (const slug of legacyInterviews) expect(isPublishedBusinessContent({ slug, is_available: true })).toBe(false);
    expect(isPublishedBusinessContent({ slug: "company-fmcg-brand-round1", is_available: true })).toBe(false);
    const slug = "company-12345678-1234-1234-1234-123456789abc";
    expect(isPublishedBusinessContent({ slug, is_available: true })).toBe(true);
    expect(isPublishedBusinessContent({ slug, is_available: false })).toBe(false);
  });

  it("requires the exact document-only content revision rather than only a historical source version", () => {
    const current = { source_version: "20261017", source_policy: "document_only", content_revision: "20261017-doc-only" };
    expect(isCurrentDocumentOnlySource(current)).toBe(true);
    for (const value of [null, {}, { source_version: "20261017" }, { ...current, source_policy: "generated_supplement" }, { ...current, content_revision: "20261017" }]) {
      expect(isCurrentDocumentOnlySource(value)).toBe(false);
    }
  });
});
