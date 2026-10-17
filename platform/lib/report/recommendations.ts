interface Simulation { id: string; industry: string; position_id: string | null; is_available?: boolean }
interface Submission { simulation_id: string; overall_score: number | null }

/** Prefer the selected career, then related industries with recorded, graded work. */
export function recommendSimulations<T extends Simulation>(simulations: T[], submissions: Submission[], targetPositionId: string | null): T[] {
  const completedIds = new Set(submissions.filter((s) => s.overall_score !== null).map((s) => s.simulation_id));
  const target = simulations.filter((s) => targetPositionId !== null && s.position_id === targetPositionId);
  const industries = new Set(simulations.filter((s) => completedIds.has(s.id)).map((s) => s.industry));
  for (const simulation of target) industries.add(simulation.industry);
  const available = simulations.filter((s) => s.is_available !== false && !completedIds.has(s.id));
  return [
    ...available.filter((s) => targetPositionId !== null && s.position_id === targetPositionId),
    ...available.filter((s) => s.position_id !== targetPositionId && industries.has(s.industry)),
  ].slice(0, 4);
}
