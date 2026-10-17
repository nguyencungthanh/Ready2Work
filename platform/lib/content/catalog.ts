import "server-only";
import profiles from "@/data/golden-profiles.json";

export interface ProfileRequirement {
  skill?: string;
  tool?: string;
  name?: string;
  description?: string;
  required_level?: string;
  weight?: number;
  priority?: string;
  keywords?: string[];
  source_requirement_policy?: "core" | "common" | "conditional" | "advantage";
}
export interface GoldenProfile {
  position_id: string;
  position_name: string;
  industry_id: string;
  industry_name: string;
  goal?: string;
  hard_skills: ProfileRequirement[];
  tools: ProfileRequirement[];
  soft_skills: ProfileRequirement[];
  certifications: ProfileRequirement[];
}

// Immutable reference data stays in the server bundle, never in the browser.
const catalog = new Map<string, GoldenProfile>();
for (const industry of profiles.industries) {
  for (const position of industry.positions) {
    catalog.set(position.position_id, {
      ...position,
      industry_id: industry.industry_id,
      industry_name: industry.industry_name,
    } as GoldenProfile);
  }
}
export function getGoldenProfile(positionId: string): GoldenProfile | undefined {
  return catalog.get(positionId.toUpperCase());
}
export function listGoldenProfiles(): GoldenProfile[] {
  return [...catalog.values()];
}
export function publicPositionCatalog() {
  return listGoldenProfiles().map((p) => ({
    id: p.position_id, title: p.position_name, industry: p.industry_name,
  }));
}
