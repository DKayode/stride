import type { Milestone, Project, ProjectProgress } from '../types';

/**
 * Aggregate contribution of habits linked to a project (The Link, D7).
 * `fraction` is the 0..1 completion of those linked habits; `count` is how
 * many habits are linked. In D6 this is always absent / zero.
 */
export interface LinkedHabitContribution {
  count: number;
  fraction: number;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Return milestones sorted by their `sortOrder` (ascending), non-mutating. */
export function orderMilestones(milestones: readonly Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Compute a project's overall progress as a pure function of its milestones
 * and (optionally) its linked-habit contribution.
 *
 * Base progress:
 * - With milestones: the completed/total ratio.
 * - Without milestones: the project's manual progress fallback (D3 model).
 *
 * Linked-habit contribution (D7) is an explicit extension point: when present
 * and non-empty, linked-habit completion is blended in as an equally-weighted
 * component on top of the base. When absent or `count === 0` this is a no-op,
 * so D6 behaviour is exactly milestone/manual progress — D7 can supply real
 * contribution data without changing this function's shape.
 *
 * Mirrors `computeStreak`: pure, fully typed, and unit-tested.
 */
export function computeProjectProgress(
  project: Project,
  milestones: readonly Milestone[],
  options: { linkedHabits?: LinkedHabitContribution } = {},
): ProjectProgress {
  const milestonesTotal = milestones.length;
  const milestonesCompleted = milestones.reduce((n, m) => (m.completed ? n + 1 : n), 0);

  const base =
    milestonesTotal > 0 ? milestonesCompleted / milestonesTotal : clamp01(project.manualProgress);

  const linked = options.linkedHabits;
  const fraction =
    linked && linked.count > 0
      ? clamp01((base + clamp01(linked.fraction)) / 2)
      : clamp01(base);

  return {
    projectId: project.id,
    fraction,
    percent: Math.round(fraction * 100),
    milestonesTotal,
    milestonesCompleted,
    linkedHabits: linked?.count ?? 0,
  };
}
