import "server-only";
import tasks from "@/data/task-rubrics.json";

export function simulationHasSourceTimeLimit(positionId: string | null | undefined): boolean {
  for (const industry of tasks.industries) {
    const task = industry.tasks.find((item) => item.position_id === positionId);
    if (task) return task.time_limit_source !== "not_specified";
  }
  return true;
}
