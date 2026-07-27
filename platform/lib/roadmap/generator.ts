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

/**
 * Builds a staged roadmap from the chosen career. Rule-based rather than AI
 * generated so every step is traceable to the career record and the same
 * career always produces the same plan (plan section 12.3: rules select
 * milestones; AI only rephrases).
 */
export function buildRoadmap(career: CareerForRoadmap): RoadmapStepTemplate[] {
  const [primarySkill, secondarySkill] = career.key_skills;
  const entryRole = career.entry_roles[0] ?? career.title;

  const steps: RoadmapStepTemplate[] = [
    {
      stage: "Explore",
      title: `Understand what a ${career.title} actually does`,
      objective: `Read job postings and talk to someone working as a ${entryRole}. Write down five tasks that appear repeatedly.`,
    },
    {
      stage: "Explore",
      title: `Map the ${career.industry} landscape`,
      objective: "List ten employers hiring for this role and note what they ask for.",
    },
  ];

  if (primarySkill) {
    steps.push({
      stage: "Build foundations",
      title: `Learn the fundamentals of ${primarySkill.toLowerCase()}`,
      objective: `Complete an introductory course or book on ${primarySkill.toLowerCase()} and take notes you can revisit.`,
    });
  }
  if (secondarySkill) {
    steps.push({
      stage: "Build foundations",
      title: `Practise ${secondarySkill.toLowerCase()}`,
      objective: `Work through exercises until you can apply ${secondarySkill.toLowerCase()} without following a tutorial.`,
    });
  }

  steps.push(
    {
      stage: "Build evidence",
      title: "Produce one portfolio piece",
      objective: `Create something a hiring manager could look at: an analysis, a project, or a written case relevant to ${career.title}.`,
    },
    {
      stage: "Simulate work",
      title: "Complete a job simulation",
      objective: `Finish a ${career.industry} simulation and act on the feedback you receive.`,
      resourceLabel: "Go to Job Simulation",
      resourceUrl: "/simulations",
    },
    {
      stage: "Prepare application",
      title: "Tailor your CV to one real job posting",
      objective:
        "Rewrite your CV against a specific posting so each bullet maps to something the posting asks for.",
    },
    {
      stage: "Practice interviews",
      title: "Practise the interview",
      objective: `Answer a ${career.industry} interview set and review the feedback on structure and evidence.`,
      resourceLabel: "Go to Interview Practice",
      resourceUrl: "/interview",
    },
    {
      stage: "Apply",
      title: "Apply to five roles",
      objective: `Submit five applications for ${entryRole} positions and track where each one reaches.`,
    },
  );

  return steps;
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
