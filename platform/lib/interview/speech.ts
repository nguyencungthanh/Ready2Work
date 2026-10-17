const ENGLISH_TERMS = [
  "Software Development Engineer in Test", "User Acceptance Testing", "Functional Requirement", "Non-functional Requirement",
  "Quality Assurance", "Quality Control", "Software Tester", "Business Analyst", "Financial Analyst", "Credit Analyst", "Risk Analyst", "Data Analyst",
  "Black-box testing", "White-box testing", "Black-box", "White-box", "Manual Testing", "Automation Testing", "Unit Testing", "Integration Testing", "System Testing",
  "Data Engineer", "Data Scientist", "Data Cleaning", "Data Visualization", "Data Quality", "Data Integrity", "Data Storytelling", "Change Request", "Impact Analysis",
  "Acceptance Criteria", "Expected Result", "Actual Result", "Steps to Reproduce", "Test Steps", "Scope Creep", "Code Coverage", "Pivot Table", "Power BI",
  "Functional", "Non-functional", "Stakeholder", "Workshop", "Elicitation", "Requirement", "Performance", "Security", "Availability", "Prototype", "Traceability", "Sign-off",
  "Reactive", "Proactive", "Testing", "Tester", "Bug", "Defect", "Manual", "Automation", "Unit", "Integration", "System", "Outlier", "Missing Data", "Insight",
  "INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL JOIN", "JOIN", "SELECT", "FROM", "WHERE", "SQL", "Excel", "Python", "VLOOKUP", "UAT", "BRD", "SRS", "QA", "SDET",
];

/** Preserve the exact question text; only select a voice for source-language spans. */
export function interviewSpeechSegments(prompt: string): { text: string; lang: "vi-VN" | "en-US" }[] {
  const english = ENGLISH_TERMS.sort((a, b) => b.length - a.length).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${english})(?![\\p{L}\\p{N}])`, "giu");
  const segments: { text: string; lang: "vi-VN" | "en-US" }[] = [];
  let offset = 0;
  for (const match of prompt.matchAll(pattern)) {
    const index = match.index!;
    if (index > offset) segments.push({ text: prompt.slice(offset, index), lang: "vi-VN" });
    segments.push({ text: match[0], lang: "en-US" });
    offset = index + match[0].length;
  }
  if (offset < prompt.length) segments.push({ text: prompt.slice(offset), lang: "vi-VN" });
  return segments;
}
