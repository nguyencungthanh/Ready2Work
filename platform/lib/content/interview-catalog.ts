import "server-only";
import bank from "@/data/interview-bank.json";

/** Match the current authored source version while retaining old session records. */
export function sourceInterviewSlugs(): string[] {
  return Object.entries(bank).map(([slug, set]) => {
    const version = "contentVersion" in set && typeof set.contentVersion === "string" && /^\d+$/.test(set.contentVersion) ? `-${set.contentVersion}` : "";
    return `r2w-${slug}${version}`;
  });
}
